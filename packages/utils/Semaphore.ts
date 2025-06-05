import EventEmitter from "events";

export default class Semaphore extends EventEmitter {
    #counter: number;

    constructor(counter?: number) {
        super();

        this.#counter = counter ?? 10;
    }

    async take() {
        if (this.#counter > 0) {
            this.#counter--;
            return;
        }

        await new Promise<void>(resolve => {
            this.once('returned', () => {
                this.#counter--;
                resolve();
            });
        });
    }

    return() {
        this.#counter++;
        this.emit('returned');
    }
}