import { getNetworkOverview } from "../services/network.service.js";

export async function getNetworkStatus(req, res, next) {
    try {
        const network = await getNetworkOverview();

        res.status(200).json({
            success: true,
            network
        });
    } catch (error) {
        next(error);
    }
}
