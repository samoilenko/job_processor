import Job from "../domain/Job.ts";
import { IJobStorage } from "../domain/jodTypes.ts";

class Storage implements IJobStorage {
    #jobs: Map<string, Job> = new Map();

    async save(job: Job): Promise<void> {
        this.#jobs.set(job.id, job);
    }
    async get(id: string): Promise<Job | undefined> {
        return this.#jobs.get(id);
    }

    async getAll(): Promise<Array<Job>> {
        const jobs: Job[] = [];
        const list = this.#jobs.values();
        for (const item of list) {
            jobs.push(item);
        }

        return jobs;
    }
}

export default Storage;