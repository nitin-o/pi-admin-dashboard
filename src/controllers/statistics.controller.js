import { getLogStatistics } from "../services/log-statistics.service.js";

export async function getStatistics(req, res, next) {
    try {
        const statistics = await getLogStatistics();

        res.status(200).json({
            success: true,
            statistics
        });
    } catch (error) {
        next(error);
    }
}
