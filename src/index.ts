import http, { IncomingMessage, ServerResponse } from "http";
import container from './container.ts'
import requestListener from './http/requestListener.ts'

process.on('unhandledRejection', err => {
    console.error(err);
});

const { consoleLogger, jobOutbox, queue, jobProcessorInbox, jobProcessor, jobEventConsumer, jobInbox } = container;
const { firstLetterX, firstLetterXInbox, statisticConsumer, statisticInbox, jobNameLength, jobNameLengthInbox } = container;
const { argumentsCount, argumentsCountInbox, jobNameOutbox, firstLetterOutbox, argumentsCountOutbox } = container;
const { jobProcessorOutBox, averageTimeExecution, averageTimeExecutionInbox, averageTimeExecutionOutbox } = container;

jobOutbox.run().catch(consoleLogger.error);
jobProcessor.run().catch(consoleLogger.error);
jobEventConsumer.operate().catch(consoleLogger.error);
firstLetterX.run().catch(consoleLogger.error);
jobNameLength.run().catch(consoleLogger.error);
jobNameOutbox.run().catch(consoleLogger.error);
jobProcessorOutBox.run().catch(consoleLogger.error);
firstLetterOutbox.run().catch(consoleLogger.error);
argumentsCountOutbox.run().catch(consoleLogger.error);
argumentsCount.run().catch(consoleLogger.error);
statisticConsumer.run().catch(consoleLogger.error);
averageTimeExecution.run().catch(consoleLogger.error);
averageTimeExecutionOutbox.run().catch(consoleLogger.error);


queue.on('jobRegistered', (payload) => {
    jobProcessorInbox.add('jobRegistered', payload);
    firstLetterXInbox.add('jobRegistered', payload);
    statisticInbox.add('jobRegistered', payload);
    jobNameLengthInbox.add('jobRegistered', payload);
    argumentsCountInbox.add('jobRegistered', payload);
    averageTimeExecutionInbox.add('jobRegistered', payload);
});

queue.on('jobSuccessed', (payload) => {
    jobInbox.add('jobSuccessed', payload);
    firstLetterXInbox.add('jobSuccessed', payload);
    statisticInbox.add('jobSuccessed', payload);
    jobNameLengthInbox.add('jobSuccessed', payload);
    argumentsCountInbox.add('jobSuccessed', payload);
    averageTimeExecutionInbox.add('jobSuccessed', payload);
});
queue.on('jobFailed', (payload) => {
    jobInbox.add('jobFailed', payload);
    statisticInbox.add('jobFailed', payload);
    averageTimeExecutionInbox.add('jobFailed', payload);
});

queue.on('statisticCalculated', (payload) => {
    statisticInbox.add('statisticCalculated', payload);
});

const host = '127.0.0.1';
const port = 8000;

const server = http.createServer(requestListener(container));
server.listen(port, host, () => {
    console.log(`Server is running on http://${host}:${port}`);
});

process.on('SIGINT', () => {
    console.log("Received SIGINT. Shutting down...");
    jobOutbox.stop();
    jobProcessorInbox.stop();
    firstLetterXInbox.stop();
    jobInbox.stop();
    statisticInbox.stop();
    jobNameLengthInbox.stop();
    argumentsCountInbox.stop();
    jobNameOutbox.stop();
    firstLetterOutbox.stop();
    argumentsCountOutbox.stop();
    jobProcessorOutBox.stop();
    averageTimeExecutionOutbox.stop();
    averageTimeExecutionInbox.stop();

    server.close(() => {
        console.log("HTTP server closed.");
    });
});