import "dotenv/config";
import express from "express";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import path from "node:path";
import { fileURLToPath } from "node:url";
import systemRoutes from "./routes/system.routes.js";
import networkRoutes from "./routes/network.routes.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(helmet());
app.use(express.json({ limit: "10kb" }));

app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 100,
    standardHeaders: "draft-8",
    legacyHeaders: false
}));

app.get("/api/health", (req, res) => {
    res.json({
        status: "online",
        application: "PI ADMIN DASHBOARD",
        timestamp: new Date().toISOString()
    });
});

app.use("/api/system", systemRoutes);
app.use("/api/network", networkRoutes);

app.use(express.static(path.join(__dirname, "../public")));

app.listen(PORT, () => {
    console.log(`PI ADMIN DASHBOARD running at http://localhost:${PORT}`);
});
