import { Pattern } from "./statisticTypes";

const formatPatterns = (patterns: Map<string, Pattern>) => {
    const res: Pattern[] = [];
    for (const pattern of patterns.values()) {
        res.push(pattern);
    }

    return res;
}

export default class StatisticService {
    #totalJobs: number = 0;
    #totalFailedJobs: number = 0;
    #totalSuccessJobs: number = 0;
    #patterns: Map<string, Pattern> = new Map();

    get() {
        return {
            totalJobs: this.#totalJobs,
            totalFailedJobs: this.#totalFailedJobs,
            totalSuccessJobs: this.#totalSuccessJobs,
            patterns: formatPatterns(this.#patterns)
        }
    }

    set(patternId: string, pattern: Pattern) {
        this.#patterns.set(patternId, pattern);
    }

    increaseTotalJobs() {
        this.#totalJobs++;
    }

    increaseFailedJobs() {
        this.#totalFailedJobs++;
    }

    increaseSuccessJobs() {
        this.#totalSuccessJobs++;
    }
}