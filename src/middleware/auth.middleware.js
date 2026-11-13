import jwt from "jsonwebtoken";
import { writeLog } from "../services/log.service.js";

export async function requireAuth(req, res, next) {
    const authorization = req.headers.authorization || "";
    const token = authorization.startsWith("Bearer ")
        ? authorization.slice(7)
        : null;

    if (!token) {
        return res.status(401).json({
            success: false,
            message: "Authentication required",
            requestId: req.requestId || null
        });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET, {
            algorithms: ["HS256"]
        });

        req.user = {
            id: payload.sub,
            username: payload.username,
            role: payload.role
        };

        next();
    } catch (error) {
        try {
            await writeLog({
                type: "authentication",
                level: "warning",
                source: "auth-middleware",
                message: "Authentication token rejected",
                requestId: req.requestId || null,
                metadata: {
                    reason: error.name === "TokenExpiredError"
                        ? "expired_token"
                        : "invalid_token",
                    path: req.path
                }
            });
        } catch (loggingError) {
            console.error("Authentication logging failed:", loggingError.message);
        }

        return res.status(401).json({
            success: false,
            message: "Invalid or expired authentication token",
            requestId: req.requestId || null
        });
    }
}
