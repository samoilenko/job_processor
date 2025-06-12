import http, { IncomingMessage, ServerResponse } from "http";
import container from './container.ts'
import requestListener from './http/requestListener.ts'
import setupSubscription from "./setupSubscriptions.ts";

process.on('unhandledRejection', err => {
    console.error(err);
});

const { consoleLogger, jobOutbox, queue, jobProcessorInbox, jobProcessor, jobEventConsumer, jobInbox } = container;
const { jobRobustness, jobRobustnessInbox, statisticConsumer, statisticInbox, jobNameLength, jobNameLengthInbox } = container;
const { vulnerabilitiesTracker, vulnerabilitiesTrackerInbox, jobNameOutbox, jobRobustnessOutbox, vulnerabilitiesTrackerOutbox } = container;
const { jobProcessorOutBox, averageTimeExecution, averageTimeExecutionInbox, averageTimeExecutionOutbox } = container;

jobOutbox.run().catch(consoleLogger.error);
jobProcessor.run().catch(consoleLogger.error);
jobEventConsumer.operate().catch(consoleLogger.error);
jobRobustness.run().catch(consoleLogger.error);
jobNameLength.run().catch(consoleLogger.error);
jobNameOutbox.run().catch(consoleLogger.error);
jobProcessorOutBox.run().catch(consoleLogger.error);
jobRobustnessOutbox.run().catch(consoleLogger.error);
vulnerabilitiesTrackerOutbox.run().catch(consoleLogger.error);
vulnerabilitiesTracker.run().catch(consoleLogger.error);
statisticConsumer.run().catch(consoleLogger.error);
averageTimeExecution.run().catch(consoleLogger.error);
averageTimeExecutionOutbox.run().catch(consoleLogger.error);

setupSubscription(container)

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
    jobRobustnessInbox.stop();
    jobInbox.stop();
    statisticInbox.stop();
    jobNameLengthInbox.stop();
    vulnerabilitiesTrackerInbox.stop();
    jobNameOutbox.stop();
    jobRobustnessOutbox.stop();
    vulnerabilitiesTrackerOutbox.stop();
    jobProcessorOutBox.stop();
    averageTimeExecutionOutbox.stop();
    averageTimeExecutionInbox.stop();

    server.close(() => {
        console.log("HTTP server closed.");
    });
});