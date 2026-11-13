import { writeLog, getLogTypes, getLogLevels } from "../services/log.service.js";

export async function ingestLog(req, res, next) {
    try {
        const {
            type,
            level,
            message,
            source,
            metadata
        } = req.body || {};

        if (
            typeof message !== "string" ||
            !message.trim() ||
            message.length > 5000
        ) {
            return res.status(400).json({
                success: false,
                message: "A valid log message is required (maximum 5000 characters)"
            });
        }

        if (!getLogTypes().includes(type)) {
            return res.status(400).json({
                success: false,
                message: "Invalid log category"
            });
        }

        if (!getLogLevels().includes(level)) {
            return res.status(400).json({
                success: false,
                message: "Invalid log level"
            });
        }

        if (
            metadata !== undefined &&
            (metadata === null || typeof metadata !== "object")
        ) {
            return res.status(400).json({
                success: false,
                message: "Metadata must be an object or array"
            });
        }

        const entry = await writeLog({
            type,
            level,
            message: message.trim(),
            source: typeof source === "string" ? source : "external",
            metadata: metadata || {},
            requestId: req.requestId || null
        });

        res.status(201).json({
            success: true,
            message: "Log stored successfully",
            log: entry
        });
    } catch (error) {
        next(error);
    }
}
