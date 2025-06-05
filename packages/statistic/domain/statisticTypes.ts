export interface IStatisticLogger {
    error(...args: unknown[]): void
}

export type Pattern = {
    pattern: string;
    matchCount: number;
    successRate: number;
}
