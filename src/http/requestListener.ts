import { IncomingMessage, ServerResponse } from "http";
import getParsedBody from "./getParsedBody";
import ValidationError from "../../packages/job/domain/errors";
import { isHTTPError } from "./httpErrors";
import { type TContainer } from '../container'
import JobValueObject from "../../packages/job/domain/JobValueObject.ts";

const requestListener = (container: TContainer) => async (req: IncomingMessage, res: ServerResponse): Promise<void> => {
    const { jobService, consoleLogger, statisticService } = container;
    switch (req.url) {
        case "/jobs":
            switch (req.method) {
                case "POST":
                    if (req.headers["content-type"] === "application/json") {
                        try {
                            const payload = await getParsedBody<{ name: string, args?: string[] }>(req, consoleLogger);
                            const jobVO = new JobValueObject(payload.name, payload.args);
                            await jobService.create(jobVO);
                            res.writeHead(201);
                            res.end();
                        } catch (e: unknown) {
                            container.consoleLogger.error(e, `${req.method}: ${req.url} failed`);
                            if (isHTTPError(e)) {
                                res.writeHead(e.code)
                                res.end(e.message)
                            } else if (e && e instanceof ValidationError) {
                                res.writeHead(400)
                                res.end(e.message);
                            } else {
                                res.writeHead(500)
                                res.end("Internal server error");
                            }
                            return
                        }
                    } else {
                        res.writeHead(400);
                        res.end("Unsupported content type");
                    }
                    return
                case "GET":
                    const list = await jobService.getAll();
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(list));
                    return
                default:
                    res.writeHead(405);
                    res.end("Method Not Allowed");
                    return
            }
        case "/stats":
            switch (req.method) {
                case "GET":
                    const data = statisticService.get();
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(data));
                    return;
                default:
                    res.writeHead(405);
                    res.end("Method Not Allowed");
                    return
            }

        default:
            res.writeHead(405);
            res.end("Method Not Allowed");
    }
}

export default requestListener;