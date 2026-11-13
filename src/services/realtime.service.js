import { EventEmitter } from "node:events";

const logEvents = new EventEmitter();

logEvents.setMaxListeners(100);

export function publishLog(entry) {
    logEvents.emit("new-log", entry);
}

export function subscribeToLogs(callback) {
    logEvents.on("new-log", callback);

    return () => {
        logEvents.off("new-log", callback);
    };
}
