export interface HTTPError {
    code: number;
    message: string;
}

export class ServerInternalError extends Error implements HTTPError {
    code: number = 500;
}

export class BadRequestError extends Error implements HTTPError {
    code: number = 400;
}


export const isHTTPError = (e: any): e is HTTPError => {
    return (
        typeof e === "object" &&
        e !== null &&
        typeof e.code === "number" &&
        typeof e.message === "string"
    );
}
