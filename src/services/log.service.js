import fs from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { publishLog } from "./realtime.service.js";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(currentDir, "../..");

const LOG_DIR = path.resolve(
    projectRoot,
    process.env.LOG_DIR || "storage/logs"
);

const LOG_TYPES = [
    "frontend",
    "backend",
    "api",
    "error",
    "warning",
    "info",
    "debug",
    "authentication",
    "database",
    "system",
    "raspberry-pi",
    "security"
];

const LOG_LEVELS = ["debug", "info", "warning", "error"];

const SECRET_KEY_PATTERN =
    /password|token|secret|authorization|cookie|api[-_]?key|credential/i;

function redact(value, depth = 0) {
    if (depth > 8) return "[MAX_DEPTH]";

    if (Array.isArray(value)) {
        return value.slice(0, 100).map(item => redact(item, depth + 1));
    }

    if (value && typeof value === "object") {
        const result = {};

        for (const [key, item] of Object.entries(value).slice(0, 100)) {
            result[key] = SECRET_KEY_PATTERN.test(key)
                ? "[REDACTED]"
                : redact(item, depth + 1);
        }

        return result;
    }

    if (typeof value === "string") {
        return value.slice(0, 10000);
    }

    if (
        value === null ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return value;
    }

    return String(value).slice(0, 1000);
}

export async function writeLog({
    type = "backend",
    level = "info",
    message,
    source = "log-viewer",
    metadata = {},
    requestId = null
} = {}) {
    if (!LOG_TYPES.includes(type)) {
        throw new Error(`Invalid log type: ${type}`);
    }

    if (!LOG_LEVELS.includes(level)) {
        throw new Error(`Invalid log level: ${level}`);
    }

    if (typeof message !== "string" || !message.trim()) {
        throw new Error("Log message is required");
    }

    const timestamp = new Date().toISOString();

    const entry = {
        id: randomUUID(),
        timestamp,
        type,
        level,
        source: String(source).slice(0, 100),
        message: message.slice(0, 5000),
        requestId,
        metadata: redact(metadata)
    };

    const date = timestamp.slice(0, 10);
    const filePath = path.join(LOG_DIR, `${date}.jsonl`);

    await fs.mkdir(LOG_DIR, { recursive: true });
    await fs.appendFile(filePath, `${JSON.stringify(entry)}\n`, "utf8");
    publishLog(entry);

    return entry;
}

export function getLogTypes() {
    return [...LOG_TYPES];
}

export function getLogLevels() {
    return [...LOG_LEVELS];
}


