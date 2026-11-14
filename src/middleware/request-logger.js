import { randomUUID } from "node:crypto";
import { writeLog } from "../services/log.service.js";

function getClientDetails(req) {
    const userAgent = req.get("user-agent") || "unknown";

    let device = "unknown";
    let platform = "unknown";

    if (/android/i.test(userAgent)) {
        platform = "Android";
    } else if (/iphone|ipad|ipod/i.test(userAgent)) {
        platform = "iOS";
    } else if (/windows/i.test(userAgent)) {
        platform = "Windows";
    } else if (/macintosh|mac os/i.test(userAgent)) {
        platform = "macOS";
    } else if (/linux/i.test(userAgent)) {
        platform = "Linux";
    }

    if (/mobile|android|iphone/i.test(userAgent)) {
        device = "mobile";
    } else if (/tablet|ipad/i.test(userAgent)) {
        device = "tablet";
    } else if (userAgent !== "unknown") {
        device = "desktop";
    }

    return { userAgent, device, platform };
}

export function requestLogger(req, res, next) {
    const requestId = randomUUID();
    const startedAt = process.hrtime.bigint();

    req.requestId = requestId;
    res.setHeader("X-Request-ID", requestId);

    const originalUrl = req.originalUrl;
    const endpoint = req.path;

    res.on("finish", () => {
        const durationMs =
            Number(process.hrtime.bigint() - startedAt) / 1_000_000;

        const statusCode = res.statusCode;

        const level =
            statusCode >= 500 ? "error" :
            statusCode >= 400 ? "warning" :
            "info";

        const client = getClientDetails(req);
        const user = req.user || {};

        writeLog({
            type: "api",
            level,
            source: "http-server",
            message: `${req.method} ${endpoint} ${statusCode}`,
            requestId,
            metadata: {
                userId: user.id || null,
                username: user.username || "anonymous",
                userRole: user.role || "anonymous",
                ip: req.ip || "unknown",
                realIp: req.ip || "unknown",
                userAgent: client.userAgent,
                device: client.device,
                platform: client.platform,
                method: req.method,
                endpoint,
                path: endpoint,
                statusCode,
                durationMs: Number(durationMs.toFixed(2)),
                hostname: process.env.HOSTNAME || "unknown",
                service: "log-viewer"
            }
        }).catch(error => {
            console.error("Request logging failed:", error.message);
        });
    });

    next();
}
