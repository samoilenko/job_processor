export default class Inbox {
    #events: Array<{ type: string, payload: Record<string, unknown> }> = [];
    #signal: number = 0;

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
}