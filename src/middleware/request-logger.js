
import { randomUUID } from "node:crypto";
import { writeLog } from "../services/log.service.js";

export function requestLogger(req, res, next) {
    const requestId = randomUUID();
    const startedAt = process.hrtime.bigint();

    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);

    // Preserve the original URL before Express router processing.
    const originalUrl = req.originalUrl;

    res.on("finish", () => {
        const durationMs =
            Number(process.hrtime.bigint() - startedAt) / 1_000_000;

        const status = res.statusCode;

        const level =
            status >= 500 ? "error" :
            status >= 400 ? "warning" :
            "info";

        writeLog({
            type: "api",
            level,
            source: "http-server",
            message: `${req.method} ${originalUrl} ${status}`,
            requestId,
            metadata: {
                method: req.method,
                path: originalUrl,
                statusCode: status,
                durationMs: Number(durationMs.toFixed(2)),
                ip: req.ip,
                userAgent: req.get("user-agent") || "unknown"
            }
        }).catch(error => {
            console.error("Request logging failed:", error.message);
        });
    });

    next();
}
