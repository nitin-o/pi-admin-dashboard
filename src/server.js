import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";

import systemRoutes from "./routes/system.routes.js";
import networkRoutes from "./routes/network.routes.js";
import authRoutes from "./routes/auth.routes.js";
import { requireAuth } from "./middleware/auth.middleware.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.set("trust proxy", "loopback");

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || "127.0.0.1";

const PUBLIC_DIR = path.join(__dirname, "../public");
const DIST_DIR = path.join(__dirname, "../dist");

app.use(helmet());
app.use(express.json({ limit: "10kb" }));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    standardHeaders: "draft-8",
    legacyHeaders: false
}));

// Public health endpoint
app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        application: "PI ADMIN DASHBOARD",
        timestamp: new Date().toISOString()
    });
});

// Public login page and assets
app.get("/login", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "login.html"));
});

app.use("/css", express.static(path.join(PUBLIC_DIR, "css")));

app.get("/js/login.js", (req, res) => {
    res.sendFile(path.join(PUBLIC_DIR, "js", "login.js"));
});

// Authentication API
app.use("/api/auth", authRoutes);

// Protect remaining routes and frontend
app.use(requireAuth);

// Existing protected APIs
app.use("/api/system", systemRoutes);
app.use("/api/network", networkRoutes);

// Vite production frontend
app.get("/", (req, res) => {
    res.sendFile(path.join(DIST_DIR, "index.html"));
});

app.use(express.static(DIST_DIR));

app.listen(PORT, HOST, () => {
    console.log(`PI ADMIN DASHBOARD running at http://${HOST}:${PORT}`);
});
