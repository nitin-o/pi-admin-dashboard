import { Router } from "express";
import {
    getLogs,
    getLogMetadata
} from "../controllers/log.controller.js";

const router = Router();

router.get("/", getLogs);
router.get("/metadata", getLogMetadata);

export default router;
