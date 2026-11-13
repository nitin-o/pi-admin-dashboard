import { Router } from "express";
import { getStatistics } from "../controllers/statistics.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getStatistics);

export default router;
