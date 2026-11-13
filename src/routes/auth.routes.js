import { Router } from "express";
import {
    login,
    logout,
    currentUser
} from "../controllers/auth.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";
import { loginLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.post("/login", loginLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, currentUser);

export default router;
