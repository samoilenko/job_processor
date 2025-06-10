import Inbox from "../infrastructure/Inbox";
import { IJobProcessorLogger, IJobRunner, IJobService, IOutBox } from "./jobProcessorTypes";
import Semaphore from "../../utils/Semaphore"

export default class JobProcessor {
    #inbox: Inbox;
    #outbox: IOutBox;
    #semaphore: Semaphore;
    #logger: IJobProcessorLogger;
    #runner: IJobRunner;
    #jobService: IJobService;

    constructor(params: { inbox: Inbox, outbox: IOutBox, logger: IJobProcessorLogger, runner: IJobRunner, jobService: IJobService }) {
        this.#inbox = params.inbox;
        this.#outbox = params.outbox;
        this.#semaphore = new Semaphore();
        this.#logger = params.logger;
        this.#runner = params.runner;
        this.#jobService = params.jobService;
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

        try {
            const response = await this.#runner.run(job.name, job.args);
            if (response == 0) {
                if (!this.#outbox.add('jobSuccessed', { id: job.id })) {
                    this.#logger.error('jobSuccessed has no subscribers');
                }
            } else if (response === 1) {
                if (!this.#outbox.add('jobFailed', { id: job.id })) {
                    this.#logger.error('jobFailed has no subscribers');
                }
            }
        } catch (e) {
            if (!this.#outbox.add('jobFailed', { id: job.id })) {
                this.#logger.error('jobFailed has no subscribers');
            }

            throw e;
        }
    }
}
