import { v4 } from 'uuid'
import { JobDTO } from './jodTypes';

export enum JobStatus {
    COMPLETED = 'completed',
    FAILED = 'failed',
    CRASHED = 'crashed',
    RETRIED = 'retried',
}

const QUEUED = 'queued'

export default class Job {
    id: string;
    name: string;
    arguments: string[];
    status: JobStatus | typeof QUEUED;

    constructor() {
        this.id = v4().replace(/-/g, '').slice(0, 10);
    }

    queued() {
        this.status = QUEUED;
    }

    toDTO(): JobDTO {
        return {
            id: this.id,
            name: this.name,
            arguments: this.arguments,
            status: this.status,
        };
    }
}
