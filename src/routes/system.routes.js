import { Router } from "express";
import { getSystemStatus } from "../controllers/system.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getSystemStatus);

export default router;
