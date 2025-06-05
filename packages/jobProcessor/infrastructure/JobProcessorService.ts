import JobService from "../../job/domain/Service";
import { IJobService, Job } from "../domain/jobProcessorTypes";

export default class JobProcessorService implements IJobService {
    #jobService: JobService;

    constructor(jobService: JobService) {
        this.#jobService = jobService;
    }

    async get(id: string): Promise<Job | undefined> {
        const job = await this.#jobService.get(id);
        if (!job) {
            return undefined;
        }

        return {
            id: job.id,
            name: job.name,
            args: job.arguments,
        };
    }
}