import Job, { JobStatus } from "./Job.ts";
import jobVO from "./JobValueObject.ts";
import JobRepository from "./Repository.ts";
import { IJobLogger, IJobOutBox, JobDTO, Metadata } from "./jodTypes.ts";

const isValidStatus = (status: unknown): boolean => typeof status === 'string' &&
    (Object.values(JobStatus) as string[]).includes(status);

export default class JobService {
    #repository: JobRepository
    #logger: IJobLogger;
    #outbox: IJobOutBox;

    constructor(params: { repository: JobRepository, logger: IJobLogger, outbox: IJobOutBox }) {
        this.#repository = params.repository;
        this.#logger = params.logger;
        this.#outbox = params.outbox;
    }

    async create(payload: jobVO, metadata: Metadata = {}) {
        const correlationId = metadata.correlationId;
        try {
            const job = new Job();
            job.name = payload.name;
            job.arguments = payload.args;
            job.queued();

            await this.#repository.save(job);
            await this.#outbox.add("jobRegistered", {
                id: job.id,
                status: job.status,
                metadata: {
                    correlationId,
                }
            });
            this.#logger.debug(`${this.constructor.name}:\t job ${job.id} created.`, { correlationId });
        } catch (e) {
            this.#logger.error(`${this.constructor.name}:\t Can't register job ${jobVO.name}.`, { correlationId });
            throw e;
        }
    }

    async get(id: string): Promise<JobDTO | undefined> {
        const job = await this.#repository.get(id);
        if (!job) {
            return undefined;
        }

        return job.toDTO();
    }

    async getAll() {
        const list = await this.#repository.getAll()
        return list.map(job => job.toDTO());
    }

    async changeStatus(id: string, status: JobStatus) {
        const job = await this.#repository.get(id);
        if (!job) {
            throw new Error(`${id} not found`);
        }

        if (!isValidStatus(status)) {
            throw new Error(`Unknown status: ${status}`);
        }

        job.status = status;
        await this.#repository.save(job);
    }
}
