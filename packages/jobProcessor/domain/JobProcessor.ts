import Inbox from "../infrastructure/Inbox";
import { IJobProcessorLogger, IJobRunner, IJobService, IOutBox, Job } from "./jobProcessorTypes";
import Semaphore from "../../utils/Semaphore"
import { setTimeout } from 'node:timers/promises';

const STATUS_SUCCESS = 0;
const STATUS_FAILED = 1;
const STATUS_CRASHED = 2;

type Statuses = typeof STATUS_SUCCESS | typeof STATUS_FAILED | typeof STATUS_CRASHED;

export type JobProcessorEvents = {
    JOB_RETRIED: string;
    JOB_CRASHED: string;
    JOB_COMPLETED: string;
    JOB_FAILED: string;
    JOB_RUNNING: string;
}

type JobProcessorParams = {
    inbox: Inbox,
    outbox: IOutBox,
    logger: IJobProcessorLogger,
    runner: IJobRunner,
    jobService: IJobService,
    maxRetries?: number,
    eventNames: JobProcessorEvents,
}

type Metadata = {
    metadata?: {
        correlationId?: string
    }
}

const getSupportedEvents = (events: Record<string, string>): JobProcessorEvents => {
    const requiredEvens = ['JOB_RETRIED', 'JOB_CRASHED', 'JOB_COMPLETED', 'JOB_FAILED', 'JOB_RUNNING'];
    for (const eventName of requiredEvens) {
        if (!(eventName in events))
            throw new Error(`${eventName} is required`);
    }

    return events as JobProcessorEvents;
};

export default class JobProcessor {
    #inbox: Inbox;
    #outbox: IOutBox;
    #semaphore: Semaphore;
    #logger: IJobProcessorLogger;
    #runner: IJobRunner;
    #jobService: IJobService;
    #maxRetries: number;
    #retryDelay: number = 3000; // ms
    #eventNames: JobProcessorEvents;

    constructor(params: JobProcessorParams) {
        this.#inbox = params.inbox;
        this.#outbox = params.outbox;
        this.#semaphore = new Semaphore();
        this.#logger = params.logger;
        this.#runner = params.runner;
        this.#jobService = params.jobService;
        this.#maxRetries = params.maxRetries ?? 2;
        this.#eventNames = getSupportedEvents(params.eventNames);
    }

    async run() {
        for await (const event of this.#inbox.getEvent()) {
            await this.#semaphore.take();
            this.#handleJob(event)
                .catch((e) => {
                    this.#logger.error(e, event);
                })
                .finally(() => this.#semaphore.return());
        }
    }

    async #handleJob(event: { type: string, payload: Record<string, unknown> & Metadata }) {
        const correlationId = event.payload.metadata?.correlationId;
        const jobId = event.payload.id as string;
        if (!jobId) {
            throw new Error(`event ${event.type} doesn't have id`);
        }

        const job = await this.#jobService.get(jobId);
        if (!job) {
            throw new Error(`Job #${jobId} not found`);
        }

        const startTime = Date.now();

        // one call is required, others are retries
        for (let i = 0; i <= this.#maxRetries; i++) {
            const attemptStartTime = Date.now();
            this.#logger.info(`${this.constructor.name}:\t Job ${jobId}, attempt ${i + 1}`, { correlationId });

            this.#addToOutbox(this.#eventNames.JOB_RUNNING, { id: job.id, metadata: { correlationId } });
            const response = await this.#runJob(job, { correlationId });
            const executionTime = Date.now() - attemptStartTime;
            if (response == STATUS_SUCCESS) {
                this.#addToOutbox(this.#eventNames.JOB_COMPLETED, {
                    id: job.id,
                    executionTime,
                    metadata: {
                        correlationId,
                    },
                });
                return;
            } else if (response === STATUS_FAILED) {
                this.#addToOutbox(this.#eventNames.JOB_FAILED, {
                    id: job.id,
                    executionTime,
                    metadata: {
                        correlationId,
                    },
                });
                return;
            }

            if (i == this.#maxRetries) {
                this.#addToOutbox(this.#eventNames.JOB_CRASHED, {
                    id: job.id,
                    executionTime: Date.now() - startTime,
                    metadata: {
                        correlationId,
                    }
                });
            } else {
                this.#addToOutbox(this.#eventNames.JOB_RETRIED, {
                    id: job.id,
                    executionTime: Date.now() - attemptStartTime,
                    metadata: {
                        correlationId,
                    }
                });
                this.#logger.debug(
                    `${this.constructor.name}:\t job \t${jobId} crushed. Wait a bit (${this.#retryDelay} ms) before trying one more time...`,
                    { correlationId }
                );
                await setTimeout(this.#retryDelay);
            }
        }
    }

    async #runJob(job: Job, metadata: Metadata['metadata']): Promise<Statuses> {
        const correlationId = metadata?.correlationId;
        try {
            const response = await this.#runner.run(job.name, job.args, { correlationId });
            if (response === STATUS_SUCCESS || response === STATUS_FAILED) {
                return response;
            }

            if (response !== STATUS_CRASHED) {
                this.#logger.error(`${this.constructor.name}:\t unexpected status: ${response}`, job, { correlationId });
            }

            return STATUS_CRASHED;
        } catch (e: unknown) {
            this.#logger.error(e, job);
            return STATUS_CRASHED;
        }
    }

    #addToOutbox(name: string, payload: { id: string, executionTime?: number } & Metadata) {
        const corelationId = payload.metadata?.correlationId;
        if (!this.#outbox.add(name, payload)) {
            this.#logger.error(`${this.constructor.name}:\t ${name} has no subscribers`, { corelationId });
        }
    }
}
