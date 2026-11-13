import { Router } from "express";
import { getNetworkStatus } from "../controllers/network.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

router.get("/", requireAuth, getNetworkStatus);

export default router;
