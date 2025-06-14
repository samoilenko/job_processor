import { TContainer } from "./container";

export enum QUEUE_EVENTS {
    JOB_RETRIED = 'jobRetried',
    JOB_CRASHED = 'jobCrashed',
    JOB_COMPLETED = 'jobCompleted',
    JOB_FAILED = 'jobFailed',
    JOB_RUNNING = 'jobRunning',
    JOB_REGISTERED = 'jobRegistered',

    STATISTIC_CALCULATED = 'statisticCalculated',
}

const setupSubscription = (container: TContainer) => {
    const { queue, jobProcessorInbox, jobInbox, jobRobustnessInbox, statisticInbox } = container;
    const { vulnerabilitiesTrackerInbox, averageTimeExecutionInbox } = container;

    queue.on(QUEUE_EVENTS.JOB_RUNNING, (payload) => {
        jobInbox.add(QUEUE_EVENTS.JOB_RUNNING, payload);
    })

    queue.on(QUEUE_EVENTS.JOB_RETRIED, (payload) => {
        jobInbox.add(QUEUE_EVENTS.JOB_RETRIED, payload);
    })

    queue.on(QUEUE_EVENTS.JOB_CRASHED, (payload) => {
        jobInbox.add(QUEUE_EVENTS.JOB_CRASHED, payload);
        jobRobustnessInbox.add(QUEUE_EVENTS.JOB_CRASHED, payload);
    })

    queue.on(QUEUE_EVENTS.JOB_REGISTERED, (payload) => {
        jobProcessorInbox.add(QUEUE_EVENTS.JOB_REGISTERED, payload);
        statisticInbox.add(QUEUE_EVENTS.JOB_REGISTERED, payload);
        vulnerabilitiesTrackerInbox.add(QUEUE_EVENTS.JOB_REGISTERED, payload);
        averageTimeExecutionInbox.add(QUEUE_EVENTS.JOB_REGISTERED, payload);
    });

    queue.on(QUEUE_EVENTS.JOB_COMPLETED, (payload) => {
        jobInbox.add(QUEUE_EVENTS.JOB_COMPLETED, payload);
        jobRobustnessInbox.add(QUEUE_EVENTS.JOB_COMPLETED, payload);
        statisticInbox.add(QUEUE_EVENTS.JOB_COMPLETED, payload);
        averageTimeExecutionInbox.add(QUEUE_EVENTS.JOB_COMPLETED, payload);
    });
    queue.on(QUEUE_EVENTS.JOB_FAILED, (payload) => {
        jobInbox.add(QUEUE_EVENTS.JOB_FAILED, payload);
        statisticInbox.add(QUEUE_EVENTS.JOB_FAILED, payload);
        averageTimeExecutionInbox.add(QUEUE_EVENTS.JOB_FAILED, payload);
        jobRobustnessInbox.add(QUEUE_EVENTS.JOB_FAILED, payload);
    });

    queue.on(QUEUE_EVENTS.STATISTIC_CALCULATED, (payload) => {
        statisticInbox.add(QUEUE_EVENTS.STATISTIC_CALCULATED, payload);
    });
}

export default setupSubscription;