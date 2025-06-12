import EventEmitter from "events";
import { IJobProcessorLogger } from "../domain/jobProcessorTypes";

export default class Outbox {
    #events: Array<{ type: string, payload: Record<string, unknown> }> = [];
    #signal: number = 0;
    #queue: EventEmitter;
    #logger: IJobProcessorLogger;

    constructor(queue: EventEmitter, logger: IJobProcessorLogger) {
        this.#queue = queue;
        this.#logger = logger;
    }

    stop() {
        this.#signal = 1;
    }

    async add(type: string, payload: Record<string, unknown>) {
        this.#events.push({ type, payload });
    }

    async *getEvent(pollDelayMs = 100) {
        while (true) {
            if (this.#signal === 1)
                return;

            if (this.#events.length === 0) {
                await new Promise(res => setTimeout(res, pollDelayMs));
                continue;
            }

            yield this.#events.shift()!;
        }
    }

    async run() {
        for await (const event of this.getEvent()) {
            if (!this.#queue.emit(event.type, event.payload)) {
                this.#logger.error(`${this.constructor.name}:\t Event ${event.type} doesn't have subscribers`);
            }
        }
    }
}