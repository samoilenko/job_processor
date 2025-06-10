import EventEmitter from "events";
import { IStatisticLogger } from "../../domain/statisticTypes";
import JobService from "../../../job/domain/Service";
import Inbox from "../Inbox";
import Semaphore from "../../../utils/Semaphore"
import Outbox from "../Outbox";

const meetsCriteria = (args: string[], length: number): boolean => args.length > length;

export default class ArgumentsCount {
    #logger: IStatisticLogger
    #jobService: JobService
    #inbox: Inbox
    #outbox: Outbox
    #semaphore: Semaphore

    #totalJobs: number = 0;
    #succeed: number = 0;
    #matchCount: number = 0;
    #successMatchCount: number = 0;
    #desiredArgsLength: number;

    constructor(logger: IStatisticLogger, jobService: JobService, inbox: Inbox, outbox: Outbox, desiredArgsLength = 2) {
        this.#logger = logger;
        this.#jobService = jobService;
        this.#inbox = inbox;
        this.#outbox = outbox;
        this.#semaphore = new Semaphore();
        this.#desiredArgsLength = desiredArgsLength;
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
            if (meetsCriteria(job.arguments, this.#desiredArgsLength)) {
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
            if (meetsCriteria(job.arguments, this.#desiredArgsLength)) {
                this.#successMatchCount++;
            }
        }

        this.#outbox.add('statisticCalculated', {
            id: this.constructor.name,
            pattern: `Job args length > ${this.#desiredArgsLength}`,
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