import { IStatisticLogger } from "../../domain/statisticTypes";
import JobService from "../../../job/domain/Service";
import Inbox from "../Inbox";
import Semaphore from "../../../utils/Semaphore"
import Outbox from "../Outbox";

const meetsCriteria = (name: string, length: number): boolean => name.length > length;

export default class JobNameLength {
    #logger: IStatisticLogger
    #jobService: JobService
    #inbox: Inbox
    #outbox: Outbox;
    #semaphore: Semaphore

    #totalJobs: number = 0;
    #succeed: number = 0;
    #matchCount: number = 0;
    #successMatchCount: number = 0;
    #desiredNameLength: number;

    constructor(params: { logger: IStatisticLogger, jobService: JobService, inbox: Inbox, outbox: Outbox, desiredNameLength?: number }) {
        this.#logger = params.logger;
        this.#jobService = params.jobService;
        this.#inbox = params.inbox;
        this.#outbox = params.outbox;
        this.#semaphore = new Semaphore();
        this.#desiredNameLength = params.desiredNameLength ?? 5;
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
        if (event.type === 'jobRegistered') {
            const job = await this.#getJob(event.payload.id as string);
            if (!job) {
                this.#logger.error(`Job not found`, event);
                return;
            }
            this.#totalJobs++
            if (meetsCriteria(job.name, this.#desiredNameLength)) {
                this.#matchCount++;
            }
        }

        if (event.type === 'jobSuccessed') {
            const job = await this.#getJob(event.payload.id as string);
            if (!job) {
                this.#logger.error(`Job not found`, event);
                return;
            }

            this.#succeed++
            if (meetsCriteria(job.name, this.#desiredNameLength)) {
                this.#successMatchCount++;
            }
        }

        this.#outbox.add('statisticCalculated', {
            id: this.constructor.name,
            pattern: `Job name length > ${this.#desiredNameLength}`,
            matchCount: this.#matchCount,
            successRate: Math.round((this.#successMatchCount / this.#totalJobs) * 100) / 100,
        });
    }

    async #getJob(jobId: string) {
        if (!jobId) {
            this.#logger.error('Job id is empty');
            return;
        }

        const job = this.#jobService.get(jobId);
        if (!job) {
            this.#logger.error(`Job '${jobId} not found'`);
            return;
        }

        return job;
    }
}