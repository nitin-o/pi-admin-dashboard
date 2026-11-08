import express from "express";
import { getNetworkStatsController } from "../controllers/network.controller.js";

const router = express.Router();

router.get("/", getNetworkStatsController);

export default router;
