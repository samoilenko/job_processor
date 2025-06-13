import { IStatisticLogger, Metadata } from "../../domain/statisticTypes";
import JobService from "../../../job/domain/Service";
import Inbox from "../Inbox";
import Semaphore from "../../../utils/Semaphore"
import Outbox from "../Outbox";
import { QUEUE_EVENTS } from '../config';

const calculateAverageTimeExecution = (timeExecution: number, count: number): number => {
    return Math.round(timeExecution / count);
}

export default class AverageTimeExecution {
    #logger: IStatisticLogger
    #jobService: JobService
    #inbox: Inbox
    #outbox: Outbox;
    #semaphore: Semaphore

    #totalJobs: number = 0;
    #succeed: number = 0;
    #failed: number = 0;
    #failedTotalExecutionTime = 0;
    #successTotalExecutionTime = 0;

    constructor(params: { logger: IStatisticLogger, jobService: JobService, inbox: Inbox, outbox: Outbox }) {
        this.#logger = params.logger;
        this.#jobService = params.jobService;
        this.#inbox = params.inbox;
        this.#outbox = params.outbox;
        this.#semaphore = new Semaphore();
    }

    async run() {
        for await (const event of this.#inbox.getEvent()) {
            await this.#semaphore.take();
            this.#handle(event)
                .catch((e) => {
                    this.#logger.error(e, event);
                })
                .finally(() => this.#semaphore.return());
        }
    }

    async #handle(event: { type: string, payload: Record<string, unknown> & Metadata }) {
        const correlationId = event.payload.metadata?.correlationId;
        if (event.type === QUEUE_EVENTS.JOB_REGISTERED) {
            const job = await this.#getJob(event.payload.id as string, { correlationId });
            if (!job) {
                this.#logger.error(`${this.constructor.name}:\t Job not found`, event, { correlationId });
                return;
            }
            this.#totalJobs++
        }

        if (event.type === QUEUE_EVENTS.JOB_COMPLETED) {
            const job = await this.#getJob(event.payload.id as string, { correlationId });
            if (!job) {
                this.#logger.error(`${this.constructor.name}:\t Job not found`, event, { correlationId });
                return;
            }

            const executionTime: number | undefined = event.payload.executionTime as number | undefined;
            if (executionTime === undefined) {
                this.#logger.error(`${this.constructor.name}:\t Event doesn't have execution time`, event, { correlationId });
                return;
            }

            this.#successTotalExecutionTime += executionTime
            this.#succeed++
        }

        if (event.type === QUEUE_EVENTS.JOB_FAILED) {
            const job = await this.#getJob(event.payload.id as string, { correlationId });
            if (!job) {
                this.#logger.error(`${this.constructor.name}:\t Job not found`, event, { correlationId });
                return;
            }
            const executionTime: number | undefined = event.payload.executionTime as number | undefined;
            if (executionTime === undefined) {
                this.#logger.error(`${this.constructor.name}:\t Event doesn't have execution time`, event, { correlationId });
                return;
            }

            this.#failedTotalExecutionTime += executionTime
            this.#failed++
        }

        const successAverageTime = calculateAverageTimeExecution(this.#successTotalExecutionTime, this.#succeed);
        const failedAverageTime = calculateAverageTimeExecution(this.#failedTotalExecutionTime, this.#succeed);
        this.#outbox.add(QUEUE_EVENTS.STATISTIC_CALCULATED, {
            id: this.constructor.name,
            pattern: 'Average time execution',
            successJobs: `${this.#succeed}/${this.#totalJobs} ${successAverageTime}ms`,
            failedJobs: `${this.#failed}/${this.#totalJobs} ${failedAverageTime}ms`,
            metadata: {
                correlationId,
            }
        });
        this.#logger.debug(`${this.constructor.name}:\t Average time execution statistic calculated`, { correlationId });
    }

    async #getJob(jobId: string, metadata: Metadata['metadata']) {
        const correlationId = metadata?.correlationId;
        if (!jobId) {
            this.#logger.error(`${this.constructor.name}:\t Job id is empty`, { correlationId });
            return;
        }

        const job = this.#jobService.get(jobId);
        if (!job) {
            this.#logger.error(`${this.constructor.name}:\t Job '${jobId} not found'`, { correlationId });
            return;
        }

        return job;
    }
}