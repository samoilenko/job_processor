import { v4 } from 'uuid'
import { JobDTO } from './jodTypes';

export default class Job {
    id: string;
    name: string;
    arguments: string[];
    status: string;

    constructor() {
        this.id = v4().replace(/-/g, '').slice(0, 10);
    }

    queued() {
        this.status = "queued";
    }

    success() {
        this.status = "completed";
    }

    failed() {
        this.status = "failed";
    }

    retried() {
        this.status = "retried";
    }

    crashed() {
        this.status = "crashed";
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
