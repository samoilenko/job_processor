import Inbox from "./Inbox";
import StatisticService from "../domain/StatisticService";
import { Pattern } from "../domain/statisticTypes";

export default class StatisticConsumer {
    #inbox: Inbox;
    #statisticService: StatisticService;

    constructor(inbox: Inbox, statisticService: StatisticService) {
        this.#inbox = inbox;
        this.#statisticService = statisticService;
    }

    async run() {
        for await (const event of this.#inbox.getEvent()) {
            this.#handle(event)
        }
    }

    async #handle(event: { type: string, payload: Record<string, unknown> }) {
        if (event.type === 'jobRegistered') {
            this.#statisticService.increaseTotalJobs();
        } else if (event.type === 'jobSuccessed') {
            this.#statisticService.increaseSuccessJobs();
        } else if (event.type === 'jobFailed') {
            this.#statisticService.increaseFailedJobs();
        } else if (event.type === 'statisticCalculated') {
            const payload = event.payload as Pattern & { id: string};
            const { id, ...pattern } = payload;
            this.#statisticService.set(id, pattern);
        }
    }
}