import { IStatisticLogger } from "../../domain/statisticTypes";
import JobService from "../../../job/domain/Service";
import Inbox from "../Inbox";
import Semaphore from "../../../utils/Semaphore"
import Outbox from "../Outbox";
import { QUEUE_EVENTS } from '../config';

const meetsCriteria = (name: string): boolean => name.startsWith('X');

export default class JobRobustness {
    #logger: IStatisticLogger
    #jobService: JobService
    #inbox: Inbox
    #semaphore: Semaphore
    #outbox: Outbox

    #completedJobs: number = 0;
    #failedJobs: number = 0;
    #crashedJobs: number = 0;

    constructor(logger: IStatisticLogger, jobService: JobService, inbox: Inbox, outbox: Outbox) {
        this.#logger = logger;
        this.#jobService = jobService;
        this.#inbox = inbox;
        this.#outbox = outbox;
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

    async #handle(event: { type: string, payload: Record<string, unknown> }) {
        if (event.type !== QUEUE_EVENTS.JOB_COMPLETED && event.type !== QUEUE_EVENTS.JOB_CRASHED && event.type !== QUEUE_EVENTS.JOB_FAILED) {
            return;
        }
        this.#logger.debug(`${this.constructor.name}: \t get event ${event.type}`);

        const job = await this.#getJob(event.payload.id as string);
        if (!job) {
            this.#logger.error(`${this.constructor.name}:\t Job not found`, event);
            return;
        }

        if (event.type === QUEUE_EVENTS.JOB_COMPLETED) {
            this.#completedJobs++;
        }

        if (event.type === QUEUE_EVENTS.JOB_FAILED) {
            this.#failedJobs++;
        }

        if (event.type === QUEUE_EVENTS.JOB_CRASHED) {
            this.#crashedJobs++
        }

        const percent = this.#calculatedPercent();
        this.#outbox.add(QUEUE_EVENTS.STATISTIC_CALCULATED, {
            id: this.constructor.name,
            pattern: "Job robustness",
            completed: this.#completedJobs,
            failed: this.#failedJobs,
            crashed: this.#crashedJobs,
            percent: `${percent}%`,
            status: this.#getStatus(percent),
        });
    }

    #getStatus(percent: number): string {
        if (percent > 90) {
            return 'You are doing great';
        }

        if (percent > 70) {
            return 'Not bad, but you can do better'
        }

        if (percent < 40) {
            return 'Are you kidding, everything is on fire';
        }

        return 'fix something to increase statistic...';
    }

    #calculatedPercent(): number {
        if (!this.#crashedJobs)
            return 0;

        const percent = (this.#completedJobs + this.#failedJobs) / this.#crashedJobs;
        return Math.round(percent * 100) / 100;
    }

    async #getJob(jobId: string) {
        if (!jobId) {
            this.#logger.error(`${this.constructor.name}:\t Job id is empty`);
            return;
        }

        const job = this.#jobService.get(jobId);
        if (!job) {
            this.#logger.error(`${this.constructor.name}:\t Job '${jobId} not found'`);
            return;
        }

        return job;
    }
}