import Job from "./Job.ts";
import jobVO from "./JobValueObject.ts";
import JobRepository from "./Repository.ts";
import { IJobLogger, IJobOutBox, JobDTO, IJobInBox } from "./jodTypes.ts";

export enum JobStatus {
    SUCCESS = 'succeed',
    FAILED = 'failed',
    CRASHED = 'crashed',
    RETRIED = 'retried',
}

export default class JobService {
    #repository: JobRepository
    #logger: IJobLogger;
    #outbox: IJobOutBox;

    constructor(params: { repository: JobRepository, logger: IJobLogger, outbox: IJobOutBox }) {
        this.#repository = params.repository;
        this.#logger = params.logger;
        this.#outbox = params.outbox;
    }

    async create(payload: jobVO) {
        try {
            const job = new Job();
            job.name = payload.name;
            job.arguments = payload.args;
            job.queued();

            await this.#repository.save(job);
            await this.#outbox.add("jobRegistered", { id: job.id, status: job.status });
        } catch (e) {
            this.#logger.error(`Can't register job ${jobVO.name}`);
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

    async changeStatus(id: string, status: string) {
        const job = await this.#repository.get(id);
        if (!job) {
            throw new Error(`${id} not found`);
        }

        if (status === JobStatus.FAILED) {
            job.failed();
        } else if (status === JobStatus.SUCCESS) {
            job.success();
        } else if (status === JobStatus.CRASHED) {
            job.crashed();
        } else if (status === JobStatus.RETRIED) {
            job.retried();
        } else {
            throw new Error(`Unknown status: ${status}`);
        }

        await this.#repository.save(job);
    }
}
