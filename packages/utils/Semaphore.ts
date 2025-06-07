export default class Semaphore {
    #counter: number;
    #queue: (() => void)[] = [];

    constructor(counter?: number) {
        this.#counter = counter ?? 10;
    }

    async take() {
        if (this.#counter > 0) {
            this.#counter--;
            return;
        }

        await new Promise<void>(resolve => {
            this.#queue.push(() => {
                this.#counter--;
                resolve();
            });
        });
    }

    return() {
        this.#counter++;

        if (this.#queue.length > 0) {
            const resolve = this.#queue.shift();
            resolve?.();
        }
    }
}