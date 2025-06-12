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
    JOB_CRUSHED: string;
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

const getSupportedEvents = (events: Record<string, string>): JobProcessorEvents => {
    const requiredEvens = ['JOB_RETRIED', 'JOB_CRUSHED', 'JOB_COMPLETED', 'JOB_FAILED', 'JOB_RUNNING'];
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

    async #handleJob(event: { type: string, payload: Record<string, unknown> }) {
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
            this.#logger.info(`Job ${jobId}, attempt ${i + 1}`);

            this.#addToOutbox(this.#eventNames.JOB_RUNNING, { id: job.id });
            const response = await this.#runJob(job);
            const executionTime = Date.now() - attemptStartTime;
            if (response == STATUS_SUCCESS) {
                this.#addToOutbox(this.#eventNames.JOB_COMPLETED, { id: job.id, executionTime });
                return;
            } else if (response === STATUS_FAILED) {
                this.#addToOutbox(this.#eventNames.JOB_FAILED, { id: job.id, executionTime });
                return;
            }

            if (i == this.#maxRetries) {
                this.#addToOutbox(this.#eventNames.JOB_CRUSHED, { id: job.id, executionTime: Date.now() - startTime });
            } else {
                this.#addToOutbox(this.#eventNames.JOB_RETRIED, { id: job.id, executionTime: Date.now() - attemptStartTime });
                this.#logger.debug(`Wait a bit (${this.#retryDelay} ms) before trying one more time...`);
                await setTimeout(this.#retryDelay);
            }
        }
    }

    async #runJob(job: Job): Promise<Statuses> {
        try {
            const response = await this.#runner.run(job.name, job.args);
            if (response === 0) {
                return STATUS_SUCCESS;
            } else if (response === 1) {
                return STATUS_FAILED;
            }

            if (response !== STATUS_CRASHED) {
                this.#logger.error(`unexpected status: ${response}`, job);
            }

            return STATUS_CRASHED;
        } catch (e: unknown) {
            this.#logger.error(e, job);
            return STATUS_CRASHED;
        }
    }

    #addToOutbox(name: string, payload: { id: string, executionTime?: number }) {
        if (!this.#outbox.add(name, payload)) {
            this.#logger.error(`${name} has no subscribers`);
        }
    }
}
