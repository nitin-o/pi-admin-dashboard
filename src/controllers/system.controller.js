import { getSystemStats } from "../services/system.service.js";

export async function getSystemStatsController(req, res) {
    try {
        const stats = await getSystemStats();

        res.json({
            success: true,
            device: "PI ADMIN",
            data: stats
        });
    } catch (error) {
        console.error("System monitor error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve system information."
        });
    }
}
