import { getSystemOverview } from "../services/system.service.js";

export async function getSystemStatus(req, res, next) {
    try {
        const system = await getSystemOverview();

        res.status(200).json({
            success: true,
            system
        });
    } catch (error) {
        next(error);
    }
}
