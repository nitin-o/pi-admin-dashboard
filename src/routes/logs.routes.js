import express from "express";
import { getBackendLogsController } from "../controllers/logs.controller.js";

const router = express.Router();

router.get("/", getBackendLogsController);

export default router;
