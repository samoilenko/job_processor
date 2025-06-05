import EventEmitter from "events";
import { IStatisticLogger } from "../../domain/statisticTypes";
import JobService from "../../../job/domain/Service";
import Inbox from "../Inbox";
import Semaphore from "../../../utils/Semaphore"
import Outbox from "../Outbox";

const meetCriteria = (name: string): boolean => name.startsWith('X');

export default class FirstLetterX {
    #logger: IStatisticLogger
    #jobService: JobService
    #inbox: Inbox
    #semaphore: Semaphore
    #outbox: Outbox

    #totalJobs: number = 0;
    #succeed: number = 0;
    #matchCount: number = 0;
    #successMatchCount: number = 0;

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
        if (event.type === 'jobRegistered') {
            const job = await this.#getJob(event.payload.id as string);
            if (!job) {
                this.#logger.error(`Job not found`, event);
                return;
            }
            this.#totalJobs++;
            if (meetCriteria(job.name)) {
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
            if (meetCriteria(job.name)) {
                this.#successMatchCount++;
            }
        }

        this.#outbox.add('statisticCalculated', {
            id: this.constructor.name,
            pattern: "first letter x",
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