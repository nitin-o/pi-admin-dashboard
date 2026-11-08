import { Router } from "express";
import rateLimit from "express-rate-limit";

import {
    login,
    logout,
    currentUser
} from "../controllers/auth.controller.js";

import { requireAuth } from "../middleware/auth.middleware.js";

const router = Router();

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 5,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    message: {
        status: "error",
        message: "Too many login attempts. Try again later."
    }
});

router.post("/login", loginLimiter, login);
router.post("/logout", requireAuth, logout);
router.get("/me", requireAuth, currentUser);

export default router;
