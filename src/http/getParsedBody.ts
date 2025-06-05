import { IncomingMessage } from "http";
import { BadRequestError, ServerInternalError } from "./httpErrors";

const getParsedBody = <T>(req: IncomingMessage, consoleLogger: { error: (...args) => void }): Promise<T> => {
    return new Promise<T>((resolve, reject) => {
        const chunks: any[] = []
        req.on("data", (chunk: any) => {
            chunks.push(chunk);
        });
        req.on("error", (e: Error) => {
            reject(new ServerInternalError(e.message));
        });
        req.on("end", async () => {
            const body = Buffer.concat(chunks);
            try {
                resolve(JSON.parse(body.toString()));
            } catch (e) {
                consoleLogger.error(e);
                reject(new BadRequestError("request body must be valid JSON object"));
            }
        })
    });
}

export default getParsedBody;