import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../..");

const LOG_DIR = path.resolve(
    projectRoot,
    process.env.LOG_DIR || "storage/logs"
);

const TYPES = [
    "frontend", "backend", "api", "error",
    "warning", "info", "debug", "authentication",
    "database", "system", "raspberry-pi", "security"
];

const LEVELS = ["debug", "info", "warning", "error"];

export async function queryLogs(filters = {}) {
    const {
        type,
        level,
        search,
        from,
        to,
        source,
        page = 1,
        limit = 50
    } = filters;

    const safePage = Math.max(1, Number.parseInt(page, 10) || 1);
    const safeLimit = Math.min(200, Math.max(1, Number.parseInt(limit, 10) || 50));

    if (type && !TYPES.includes(type)) {
        throw new Error("Invalid log type");
    }

    if (level && !LEVELS.includes(level)) {
        throw new Error("Invalid log level");
    }

    const entries = [];

    let files = [];

    try {
        files = await fs.readdir(LOG_DIR);
    } catch (error) {
        if (error.code !== "ENOENT") throw error;
    }

    const logFiles = files
        .filter(file => /^\d{4}-\d{2}-\d{2}\.jsonl$/.test(file))
        .sort()
        .reverse()
        .slice(0, 366);

    for (const file of logFiles) {
        const content = await fs.readFile(path.join(LOG_DIR, file), "utf8");

        for (const line of content.split(/\r?\n/)) {
            if (!line.trim()) continue;

            try {
                entries.push(JSON.parse(line));
            } catch {
                // Ignore malformed individual log entries.
            }
        }
    }

    const filtered = entries.filter(entry => {
        const timestamp = Date.parse(entry.timestamp);

        if (!Number.isFinite(timestamp)) return false;

        if (type && entry.type !== type) return false;
        if (level && entry.level !== level) return false;

        if (from && timestamp < Date.parse(from)) return false;
        if (to && timestamp > Date.parse(to)) return false;

        if (
            search &&
            !`${entry.message} ${entry.source} ${entry.type}`
                .toLowerCase()
                .includes(String(search).toLowerCase())
        ) return false;

        if (
            source &&
            !entry.source.toLowerCase().includes(String(source).toLowerCase())
        ) return false;

        return true;
    });

    filtered.sort((a, b) =>
        Date.parse(b.timestamp) - Date.parse(a.timestamp)
    );

    const total = filtered.length;
    const start = (safePage - 1) * safeLimit;

    return {
        logs: filtered.slice(start, start + safeLimit),
        pagination: {
            page: safePage,
            limit: safeLimit,
            total,
            totalPages: Math.ceil(total / safeLimit)
        }
    };
}
