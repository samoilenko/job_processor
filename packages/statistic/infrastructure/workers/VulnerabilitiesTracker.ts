import { IStatisticLogger, Metadata } from "../../domain/statisticTypes";
import JobService from "../../../job/domain/Service";
import Inbox from "../Inbox";
import Semaphore from "../../../utils/Semaphore"
import Outbox from "../Outbox";
import { QUEUE_EVENTS } from '../config';

const meetsCriteria = (args: string[]): boolean => args.some((arg: string) => arg.indexOf('secret') !== -1);

export default class VulnerabilitiesTracker {
    #logger: IStatisticLogger
    #jobService: JobService
    #inbox: Inbox
    #outbox: Outbox
    #semaphore: Semaphore

    #totalJobs: number = 0;
    #jobsWithVulnerabilities: number = 0;

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

    async #handle(event: { type: string, payload: Record<string, unknown> & Metadata }) {
        if (event.type !== QUEUE_EVENTS.JOB_REGISTERED) {
            return;
        }
        const correlationId = event.payload.metadata?.correlationId;

        const job = await this.#getJob(event.payload.id as string, { correlationId });
        if (!job) {
            this.#logger.error(`${this.constructor.name}:\t Job not found`, event, { correlationId });
            return;
        }
        this.#logger.debug(`${this.constructor.name}:\t get an event \t ${event.type} jobId: \t ${job.id}`, { correlationId });
        this.#totalJobs++
        if (meetsCriteria(job.arguments)) {
            this.#jobsWithVulnerabilities++
        }

        this.#outbox.add(QUEUE_EVENTS.STATISTIC_CALCULATED, {
            id: this.constructor.name,
            pattern: 'Jobs with vulnerabilities',
            totalCount: this.#totalJobs,
            withVulnerabilities: this.#jobsWithVulnerabilities,
            metadata: {
                correlationId,
            },
        });
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