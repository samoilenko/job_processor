export interface IJobProcessorLogger {
    error(...args): void
}

export interface IJobRunner {
    run(jobName: string, args: string[]): Promise<number>
}

export type Job = {
    id: string;
    name: string;
    args: string[];
}

export interface IJobService {
    get(id: string): Promise<Job | undefined>
}

export interface IOutBox {
    add(type: string, payload: Record<string, unknown>)
}

