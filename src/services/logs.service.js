import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";

const execFileAsync = promisify(execFile);

const BACKEND_LOG_DIR = "/home/kali/Projects/backend/logs";
const JOURNAL_UNIT = "iot-backend.service";

function getPriority(priority) {
    const levels = {
        "0": "error",
        "1": "error",
        "2": "error",
        "3": "error",
        "4": "warning",
        "5": "info",
        "6": "info",
        "7": "info"
    };

    return levels[String(priority)] || "info";
}

function parseTimestamp(value) {
    if (!value) return null;

    const timestamp = new Date(value);
    return Number.isNaN(timestamp.getTime())
        ? null
        : timestamp.toISOString();
}

function parseJournalLine(line, index) {
    try {
        const entry = JSON.parse(line);
        const milliseconds = Number(entry.__REALTIME_TIMESTAMP) / 1000;
        const timestamp = Number.isFinite(milliseconds)
            ? new Date(milliseconds).toISOString()
            : null;

        if (!timestamp) return null;

        return {
            id: entry.__CURSOR || `journal-${index}`,
            source: "journal",
            level: getPriority(entry.PRIORITY),
            timestamp,
            message: String(entry.MESSAGE ?? ""),
            service: JOURNAL_UNIT,
            pid: entry._PID ? String(entry._PID) : null
        };
    } catch {
        return null;
    }
}

function parseApplicationLine(line, source, index) {
    if (!line.trim()) return null;

    try {
        const entry = JSON.parse(line);
        const message = String(entry.message ?? line);

        const isoMatch = message.match(
            /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})/
        );

        const timestamp = parseTimestamp(
            isoMatch?.[0] || entry.timestamp
        );

        if (!timestamp) return null;

        const rawLevel = String(entry.level || "info").toLowerCase();

        return {
            id: `${source}-${index}`,
            source,
            level: rawLevel === "warn" ? "warning" :
                ["error", "fatal"].includes(rawLevel) ? "error" :
                rawLevel === "warning" ? "warning" : "info",
            timestamp,
            message,
            service: JOURNAL_UNIT,
            pid: null
        };
    } catch {
        const match = line.match(
            /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))/
        );

        const timestamp = parseTimestamp(match?.[1]);
        if (!timestamp) return null;

        return {
            id: `${source}-${index}`,
            source,
            level: source === "error" ? "error" : "info",
            timestamp,
            message: line,
            service: JOURNAL_UNIT,
            pid: null
        };
    }
}

async function readApplicationLog(filename, source) {
    try {
        const content = await readFile(
            `${BACKEND_LOG_DIR}/${filename}`,
            "utf8"
        );

        return content
            .split(/\r?\n/)
            .map((line, index) => parseApplicationLine(line, source, index))
            .filter(Boolean);
    } catch (error) {
        if (error.code === "ENOENT") return [];
        throw error;
    }
}

export async function getBackendLogs() {
    const { stdout } = await execFileAsync(
        "journalctl",
        [
            `--unit=${JOURNAL_UNIT}`,
            "--output=json",
            "--no-pager",
            "--all"
        ],
        {
            encoding: "utf8",
            timeout: 30000,
            maxBuffer: 100 * 1024 * 1024,
            windowsHide: true
        }
    );

    const journalLogs = stdout
        .split(/\r?\n/)
        .map((line, index) => parseJournalLine(line, index))
        .filter(Boolean);

    const [accessLogs, combinedLogs, errorLogs] = await Promise.all([
        readApplicationLog("access.log", "access"),
        readApplicationLog("combined.log", "combined"),
        readApplicationLog("error.log", "error")
    ]);

    const logs = [
        ...journalLogs,
        ...accessLogs,
        ...combinedLogs,
        ...errorLogs
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return {
        service: JOURNAL_UNIT,
        timezone: "Asia/Kolkata",
        total: logs.length,
        sources: {
            journal: journalLogs.length,
            access: accessLogs.length,
            combined: combinedLogs.length,
            error: errorLogs.length
        },
        logs
    };
}
