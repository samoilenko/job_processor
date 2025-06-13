import Job from "./Job"

export interface IJobLogger {
    error(...args: unknown[]): void
    debug(...args: unknown[]): void
}

export interface IJobOutBox {
    add(type: string, payload: Record<string, unknown>)
}

export interface IJobInBox {
    add(type: string, payload: Record<string, unknown>)
    getEvent(pollDelayMs?: number): AsyncGenerator<{ type: string; payload: Record<string, unknown> }>
}

export interface IJobStorage {
    save(job: Job): Promise<void>
    get(id: string): Promise<Job | undefined>
    getAll(): Promise<Array<Job>>;
}

export type JobDTO = {
    id: string;
    name: string;
    arguments: string[];
    status: string;
}

export type Metadata = {
    correlationId?: string;
}