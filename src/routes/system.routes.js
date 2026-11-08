import express from "express";
import { getSystemStatsController } from "../controllers/system.controller.js";

const router = express.Router();

router.get("/", getSystemStatsController);

export default router;
