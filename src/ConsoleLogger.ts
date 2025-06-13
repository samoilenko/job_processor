type Context = {
    correlationId?: string
}

const isContext = (arg: unknown): arg is Context => typeof arg === 'object' &&
    arg !== null &&
    'correlationId' in arg;

const getContextInfo = (context: Context) => context.correlationId ? `\t CorrelationId: ${context.correlationId}` : '';

const formatArguments = (args: unknown[]): unknown[] => {
    if (!args.length) {
        return args;
    }

    const last = args[args.length - 1];
    const context = asContext(last);
    if (context) {
        args[args.length - 1] = getContextInfo(context)
    }

    return args;
}

const asContext = (arg: unknown): Context | undefined => isContext(arg) ? arg : undefined;
export default class ConsoleLogger {
    error(...args: unknown[]) {
        console.error(...formatArguments(args));
    }

    info(...args: unknown[]) {
        console.info(...formatArguments(args));
    }

    debug(...args: unknown[]) {
        console.debug(...formatArguments(args));
    }
}