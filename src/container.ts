import ConsoleLogger from './ConsoleLogger.ts'
import JobStorage from '../packages/job/infrastructure/Storage.ts'
import JobService from '../packages/job/domain/Service.ts'
import JobRepository from '../packages/job/domain/Repository.ts'
import JobOutbox from '../packages/job/infrastructure/Outbox.ts';
import JobInbox from '../packages/job/infrastructure/Inbox.ts';
import JobEventConsumer from '../packages/job/infrastructure/Consumer.ts';
import EventEmitter from "events";

import JobProcessor from '../packages/jobProcessor/domain/JobProcessor.ts'
import JobProcessorInbox from '../packages/jobProcessor/infrastructure/Inbox.ts'
import JobProcessorOutBox from '../packages/jobProcessor/infrastructure/Outbox.ts'
import JobRunner from '../packages/jobProcessor/infrastructure/JobRunner.ts'
import JobProcessorService from '../packages/jobProcessor/infrastructure/JobProcessorService.ts'

import FirstLetterX from '../packages/statistic/infrastructure/workers/FirstLetterX.ts'
import StatisticInbox from '../packages/statistic/infrastructure/Inbox.ts'
import StatisticOutbox from '../packages/statistic/infrastructure/Outbox.ts'
import StatisticConsumer from '../packages/statistic/infrastructure/StatisticConsumer.ts'
import StatisticService from '../packages/statistic/domain/StatisticService.ts'
import JobNameLength from '../packages/statistic/infrastructure/workers/JobNameLength.ts';
import ArgumentsCount from '../packages/statistic/infrastructure/workers/ArgumentsCount.ts';
import AverageTimeExecution from '../packages/statistic/infrastructure/workers/AverageTimeExecution.ts';

import { QUEUE_EVENTS } from './setupSubscriptions.ts';

const queue = new EventEmitter();

const consoleLogger = new ConsoleLogger();
const jobStorage = new JobStorage();
const jobRepository = new JobRepository(jobStorage, consoleLogger);
const jobOutbox = new JobOutbox(queue, consoleLogger);
const jobInbox = new JobInbox();
const jobService = new JobService({
    repository: jobRepository,
    logger: consoleLogger,
    outbox: jobOutbox,
});

const jobEventConsumer = new JobEventConsumer(jobInbox, jobService, consoleLogger);

const jobProcessorOutBox = new JobProcessorOutBox(queue, consoleLogger);
const jobProcessorInbox = new JobProcessorInbox();
const jobRunner = new JobRunner();
const jobProcessor = new JobProcessor({
    inbox: jobProcessorInbox,
    outbox: jobProcessorOutBox,
    jobService: new JobProcessorService(jobService),
    logger: consoleLogger,
    runner: jobRunner,
    eventNames: QUEUE_EVENTS,
});

const firstLetterOutbox = new StatisticOutbox(queue, consoleLogger);
const firstLetterXInbox = new StatisticInbox();
const firstLetterX = new FirstLetterX(consoleLogger, jobService, firstLetterXInbox, firstLetterOutbox);

const jobNameOutbox = new StatisticOutbox(queue, consoleLogger);
const jobNameLengthInbox = new StatisticInbox();
const jobNameLength = new JobNameLength({
    logger: consoleLogger,
    jobService,
    inbox: jobNameLengthInbox,
    outbox: jobNameOutbox,
});

const argumentsCountOutbox = new StatisticOutbox(queue, consoleLogger);
const argumentsCountInbox = new StatisticInbox();
const argumentsCount = new ArgumentsCount(consoleLogger, jobService, argumentsCountInbox, argumentsCountOutbox);

const averageTimeExecutionOutbox = new StatisticOutbox(queue, consoleLogger);
const averageTimeExecutionInbox = new StatisticInbox();
const averageTimeExecution = new AverageTimeExecution({
    logger: consoleLogger,
    jobService,
    inbox: averageTimeExecutionInbox,
    outbox: averageTimeExecutionOutbox
});

const statisticInbox = new StatisticInbox();
const statisticService = new StatisticService();
const statisticConsumer = new StatisticConsumer(statisticInbox, statisticService);

const container = {
    consoleLogger,
    jobService,
    jobOutbox,
    queue,
    jobProcessor,
    jobProcessorInbox,
    jobProcessorOutBox,
    jobInbox,
    jobEventConsumer,

    firstLetterX,
    firstLetterXInbox,
    firstLetterOutbox,

    jobNameLength,
    jobNameLengthInbox,
    jobNameOutbox,

    argumentsCount,
    argumentsCountInbox,
    argumentsCountOutbox,

    averageTimeExecutionOutbox,
    averageTimeExecutionInbox,
    averageTimeExecution,

    statisticService,
    statisticConsumer,
    statisticInbox,
};

export type TContainer = typeof container;

export default container;