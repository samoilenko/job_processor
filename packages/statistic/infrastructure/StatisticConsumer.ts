import Inbox from "./Inbox";
import StatisticService from "../domain/StatisticService";
import { Pattern } from "../domain/statisticTypes";
import { QUEUE_EVENTS } from './config';

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
        if (event.type === QUEUE_EVENTS.JOB_REGISTERED) {
            this.#statisticService.increaseTotalJobs();
        } else if (event.type === QUEUE_EVENTS.JOB_COMPLETED) {
            this.#statisticService.increaseSuccessJobs();
        } else if (event.type === QUEUE_EVENTS.JOB_FAILED) {
            this.#statisticService.increaseFailedJobs();
        } else if (event.type === QUEUE_EVENTS.STATISTIC_CALCULATED) {
            const payload = event.payload as Pattern & { id: string };
            const { id, ...pattern } = payload;
            this.#statisticService.set(id, pattern);
        }
    }
}