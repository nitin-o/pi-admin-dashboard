import { writeLog } from "../services/log.service.js";

export function notFoundHandler(req, res, next) {
    res.status(404).json({
        success: false,
        message: "API route not found",
        requestId: req.requestId || null
    });
}

export async function errorHandler(error, req, res, next) {
    const statusCode = Number(error.status || error.statusCode) || 500;

    try {
        await writeLog({
            type: "error",
            level: statusCode >= 500 ? "error" : "warning",
            source: "express-error-handler",
            message: error.message || "Unexpected server error",
            requestId: req.requestId || null,
            metadata: {
                statusCode,
                method: req.method,
                path: req.path,
                errorName: error.name || "Error"
            }
        });
    } catch (loggingError) {
        console.error("Error logging failed:", loggingError.message);
    }

    if (res.headersSent) {
        return next(error);
    }

    res.status(statusCode).json({
        success: false,
        message: statusCode >= 500
            ? "Internal server error"
            : error.message,
        requestId: req.requestId || null
    });
}
