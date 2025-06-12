export default class ConsoleLogger {
    error(...args: unknown[]) {
        console.error(...args);
    }

    info(...args: unknown[]) {
        console.info(...args);
    }

    debug(...args: unknown[]) {
        console.debug(...args);
    }
}