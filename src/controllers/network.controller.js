import { getNetworkStats } from "../services/network.service.js";

export async function getNetworkStatsController(req, res) {
    try {
        const stats = await getNetworkStats();

        res.json({
            success: true,
            device: "PI ADMIN",
            data: stats
        });
    } catch (error) {
        console.error("Network monitor error:", error.message);

        res.status(500).json({
            success: false,
            message: "Unable to retrieve network information."
        });
    }
}
