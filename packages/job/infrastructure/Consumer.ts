import Semaphore from "../../utils/Semaphore";
import { IJobInBox, IJobLogger } from "../domain/jodTypes";
import JobService from "../domain/Service";
import { JobStatus } from "../domain/Job";
import { QUEUE_EVENTS } from './config'

const getJobStatusByEventType = (eventType: string) => {
    if (eventType === QUEUE_EVENTS.JOB_FAILED) {
        return JobStatus.FAILED;
    } else if (eventType === QUEUE_EVENTS.JOB_COMPLETED) {
        return JobStatus.COMPLETED;
    } else if (eventType === QUEUE_EVENTS.JOB_RETRIED) {
        return JobStatus.RETRIED;
    } else if (eventType === QUEUE_EVENTS.JOB_RUNNING) {
        return JobStatus.RUNNING;
    } else if (eventType === QUEUE_EVENTS.JOB_CRASHED) {
        return JobStatus.CRASHED;
    }

    throw new Error(`Unsupported event type: ${eventType}`);
};

export default class Consumer {
    #semaphore: Semaphore;
    #inbox: IJobInBox;
    #jobService: JobService;
    #logger: IJobLogger

    constructor(inbox: IJobInBox, jobService: JobService, logger: IJobLogger) {
        this.#inbox = inbox;
        this.#semaphore = new Semaphore();
        this.#jobService = jobService;
        this.#logger = logger;
    }

    async operate() {
        for await (const event of this.#inbox.getEvent()) {
            await this.#semaphore.take();
            this.#handleJob(event)
                .catch((e) => {
                    this.#logger.error(e, event);
                })
                .finally(() => this.#semaphore.return());
        }
    }

    async #handleJob(event) {
        const jobId = event.payload.id as string;
        if (!jobId) {
            throw new Error(`${event.type} doesn't have job id`);
        }

        const newStatus = getJobStatusByEventType(event.type)
        await this.#jobService.changeStatus(jobId, newStatus);
    }
}