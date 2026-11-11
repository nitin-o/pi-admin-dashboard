import { getBackendLogs } from "../services/logs.service.js";

export async function getBackendLogsController(req, res) {
    try {
        const result = await getBackendLogs();

        const { date, level, source } = req.query;

        if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return res.status(400).json({
                success: false,
                message: "Invalid date. Use YYYY-MM-DD."
            });
        }

        if (date && Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
            return res.status(400).json({
                success: false,
                message: "Invalid calendar date."
            });
        }

        const allowedLevels = ["all", "info", "warning", "error"];
        const allowedSources = ["all", "journal", "access", "combined", "error"];

        if (level && !allowedLevels.includes(level)) {
            return res.status(400).json({
                success: false,
                message: "Invalid log level."
            });
        }

        if (source && !allowedSources.includes(source)) {
            return res.status(400).json({
                success: false,
                message: "Invalid log source."
            });
        }

        const logs = result.logs.filter(log => {
            const matchesDate = !date ||
                new Intl.DateTimeFormat("en-CA", {
                    timeZone: "Asia/Kolkata",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit"
                }).format(new Date(log.timestamp)) === date;

            const matchesLevel = !level || level === "all" ||
                log.level === level;

            const matchesSource = !source || source === "all" ||
                log.source === source;

            return matchesDate && matchesLevel && matchesSource;
        });

        res.json({
            success: true,
            service: result.service,
            timezone: result.timezone,
            total: result.total,
            filtered: logs.length,
            sources: result.sources,
            filters: {
                date: date || "all",
                level: level || "all",
                source: source || "all"
            },
            logs
        });
    } catch (error) {
        console.error("Backend logs error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve IoT Backend logs."
        });
    }
}
