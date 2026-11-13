import { queryLogs } from "../services/log-query.service.js";
import {
    getLogTypes,
    getLogLevels
} from "../services/log.service.js";

import { writeLog } from "../services/log.service.js";

export async function getLogs(req, res) {
    try {
        const result = await queryLogs({
            type: req.query.type,
            level: req.query.level,
            search: req.query.search,
            source: req.query.source,
            from: req.query.from,
            to: req.query.to,
            page: req.query.page,
            limit: req.query.limit
        });

        res.status(200).json({
            success: true,
            ...result
        });
    } catch (error) {
        try {
            await writeLog({
                type: "backend",
                level: "error",
                source: "logs-controller",
                message: "Failed to retrieve logs",
                metadata: { error: error.message }
            });
        } catch {
            // Preserve the original API error.
        }

        res.status(400).json({
            success: false,
            message: error.message || "Unable to retrieve logs"
        });
    }
}

export function getLogMetadata(req, res) {
    res.status(200).json({
        success: true,
        types: getLogTypes(),
        levels: getLogLevels()
    });
}
