import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { createServer } from "node:http";

import authRoutes from "./routes/auth.routes.js";
import logRoutes from "./routes/log.routes.js";
import ingestRoutes from "./routes/ingest.routes.js";
import systemRoutes from "./routes/system.routes.js";
import networkRoutes from "./routes/network.routes.js";
import statisticsRoutes from "./routes/statistics.routes.js";

import { requestLogger } from "./middleware/request-logger.js";
import {
    notFoundHandler,
    errorHandler
} from "./middleware/error-handler.js";

import { attachWebSocket } from "./services/websocket.service.js";

const app = express();
const server = createServer(app);

app.disable("x-powered-by");

app.use(helmet());

const allowedOrigins = (process.env.CORS_ORIGIN || "")
    .split(",")
    .map(origin => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin(origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            return callback(null, true);
        }

        return callback(new Error("Origin not allowed by CORS"));
    }
}));

app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: false, limit: "1mb" }));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: "draft-8",
    legacyHeaders: false
}));

app.use(requestLogger);

app.get("/api/health", (req, res) => {
    res.status(200).json({
        success: true,
        message: "Log Viewer API is running",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/auth", authRoutes);
app.use("/api/logs", logRoutes);
app.use("/api/logs", ingestRoutes);
app.use("/api/system", systemRoutes);
app.use("/api/network", networkRoutes);
app.use("/api/statistics", statisticsRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

attachWebSocket(server);

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT) || 3000;

if (!process.env.JWT_SECRET || !process.env.ADMIN_USERNAME ||
    !process.env.ADMIN_PASSWORD_HASH) {
    throw new Error("JWT_SECRET and Admin credentials must be configured.");
}

server.listen(PORT, HOST, () => {
    console.log(`Log Viewer API running at http://${HOST}:${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || "development"}`);
});

function shutdown(signal) {
    console.log(`${signal} received. Shutting down server...`);

    server.close(error => {
        if (error) {
            console.error("Server shutdown failed:", error);
            process.exitCode = 1;
        }
    });

    setTimeout(() => process.exit(1), 10000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
