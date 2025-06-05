import ValidationError from "./errors";

class jobVO {
    #name: string;
    #args: string[];

    constructor(name: string, args?: string[]) {
        if (!name) {
            throw new ValidationError('job name must be not empty string');
        }
        this.#name = name;

        if (args === undefined) {
            this.#args = [];
        } else if (!Array.isArray(args)) {
            throw new ValidationError('job args must be array');
        } else if (!args.every(a => typeof a === "string" && a.length > 0)) {
            throw new ValidationError('job args must not empty string array');
        } else {
            this.#args = args;
        }
    }

    get name() {
        return this.#name;
    }

    get args() {
        return this.#args;
    }
}

export default jobVO;