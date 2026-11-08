import { verifySessionToken } from "../utils/auth.utils.js";

export function requireAuth(req, res, next) {
    const secret = process.env.SESSION_SECRET;

    if (!secret || secret.length < 32) {
        return res.status(500).json({
            status: "error",
            message: "Authentication is not configured."
        });
    }

    const cookies = req.headers.cookie || "";

    const sessionCookie = cookies
        .split(";")
        .map(cookie => cookie.trim())
        .find(cookie => cookie.startsWith("pi_admin_session="));

    const token = sessionCookie
        ? sessionCookie.substring("pi_admin_session=".length)
        : null;

    const session = token
        ? verifySessionToken(token, secret)
        : null;

    if (!session) {
        if (req.originalUrl.startsWith("/api/")) {
            return res.status(401).json({
                status: "error",
                message: "Authentication required."
            });
        }

        return res.redirect("/login");
    }

    req.auth = session;

    next();
}

