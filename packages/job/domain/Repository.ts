import Job from "./Job.ts";
import { IJobLogger, IJobStorage } from "./jodTypes.ts";

export default class JobRepository {
    #storage: IJobStorage;
    #logger: IJobLogger

    constructor(storage: IJobStorage, logger: IJobLogger) {
        this.#storage = storage;
        this.#logger = logger;
    }

    async save(job: Job) {
        try {
            await this.#storage.save(job)
        } catch (e) {
            this.#logger.error(e, job.name);

            throw new Error("Can't save job");
        }
    }

    async get(id: string): Promise<Job | undefined> {
        return this.#storage.get(id);
    }

    async getAll() {
        return this.#storage.getAll();
    }
}
