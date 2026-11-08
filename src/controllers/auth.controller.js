import { verifyPassword, createSessionToken } from "../utils/auth.utils.js";

export async function login(req, res) {
    try {
        const { username, password } = req.body || {};

        const adminUsername = process.env.ADMIN_USERNAME;
        const passwordHash = process.env.ADMIN_PASSWORD_HASH;
        const sessionSecret = process.env.SESSION_SECRET;

        if (!adminUsername || !passwordHash || !sessionSecret ||
            sessionSecret.length < 32) {
            return res.status(500).json({
                status: "error",
                message: "Authentication configuration is incomplete."
            });
        }

        if (typeof username !== "string" ||
            typeof password !== "string" ||
            username.length > 100 ||
            password.length > 1024) {
            return res.status(400).json({
                status: "error",
                message: "Invalid login request."
            });
        }

        const passwordOK = await verifyPassword(password, passwordHash);

        if (username !== adminUsername || !passwordOK) {
            return res.status(401).json({
                status: "error",
                message: "Invalid username or password."
            });
        }

        const token = createSessionToken(username, sessionSecret);

        res.cookie("pi_admin_session", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            path: "/",
            maxAge: 8 * 60 * 60 * 1000
        });

        return res.json({
            status: "success",
            message: "Login successful."
        });
    } catch (error) {
        console.error("Login error:", error.message);

        return res.status(500).json({
            status: "error",
            message: "Unable to process login."
        });
    }
}

export function logout(req, res) {
    res.clearCookie("pi_admin_session", {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        path: "/"
    });

    return res.json({
        status: "success",
        message: "Logged out successfully."
    });
}

export function currentUser(req, res) {
    return res.json({
        status: "success",
        username: req.auth.username
    });
}
