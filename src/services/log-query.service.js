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

function matches(value, filter) {
    if (filter === undefined || filter === null || filter === "") {
        return true;
    }

    return String(value ?? "")
        .toLowerCase()
        .includes(String(filter).toLowerCase());
}

export async function queryLogs(filters = {}) {
    const {
        type,
        level,
        search,
        from,
        to,
        source,
        ip,
        username,
        userId,
        device,
        platform,
        method,
        endpoint,
        statusCode,
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
        const metadata = entry.metadata || {};

        if (!Number.isFinite(timestamp)) return false;
        if (type && entry.type !== type) return false;
        if (level && entry.level !== level) return false;

        if (from) {
            const fromTime = Date.parse(from);
            if (Number.isFinite(fromTime) && timestamp < fromTime) return false;
        }

        if (to) {
            const toTime = Date.parse(to);
            if (Number.isFinite(toTime) && timestamp > toTime) return false;
        }

        if (!matches(entry.source, source)) return false;
        if (!matches(metadata.ip, ip) && !matches(metadata.realIp, ip)) return false;
        if (!matches(metadata.username, username)) return false;
        if (!matches(metadata.userId, userId)) return false;
        if (!matches(metadata.device, device)) return false;
        if (!matches(metadata.platform, platform)) return false;
        if (!matches(metadata.method, method)) return false;
        if (!matches(metadata.endpoint || metadata.path, endpoint)) return false;
        if (!matches(metadata.statusCode, statusCode)) return false;

        if (
            search &&
            !`${entry.message} ${entry.source} ${entry.type} ${JSON.stringify(metadata)}`
                .toLowerCase()
                .includes(String(search).toLowerCase())
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
