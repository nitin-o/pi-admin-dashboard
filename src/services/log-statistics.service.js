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

export async function getLogStatistics() {
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

    const byType = Object.fromEntries(TYPES.map(type => [type, 0]));
    const byLevel = Object.fromEntries(LEVELS.map(level => [level, 0]));

    let total = 0;
    let recent24Hours = 0;
    const now = Date.now();
    const recentErrors = [];

    for (const file of logFiles) {
        const content = await fs.readFile(path.join(LOG_DIR, file), "utf8");

        for (const line of content.split(/\r?\n/)) {
            if (!line.trim()) continue;

            let entry;

            try {
                entry = JSON.parse(line);
            } catch {
                continue;
            }

            const timestamp = Date.parse(entry.timestamp);

            if (!Number.isFinite(timestamp)) continue;

            total++;

            if (Object.hasOwn(byType, entry.type)) {
                byType[entry.type]++;
            }

            if (Object.hasOwn(byLevel, entry.level)) {
                byLevel[entry.level]++;
            }

            if (timestamp >= now - 24 * 60 * 60 * 1000) {
                recent24Hours++;
            }

            if (entry.level === "error" && recentErrors.length < 10) {
                recentErrors.push(entry);
            }
        }
    }

    return {
        total,
        recent24Hours,
        byType,
        byLevel,
        recentErrors,
        collectedAt: new Date().toISOString()
    };
}
