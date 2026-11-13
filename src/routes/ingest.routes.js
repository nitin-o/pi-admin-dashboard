import { Router } from "express";
import { ingestLog } from "../controllers/ingest.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/", requireAuth, ingestLog);

export default router;
