import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { writeLog } from "../services/log.service.js";

function getClientDetails(req) {
    const userAgent = req.get("user-agent") || "unknown";

    let platform = "unknown";
    let device = "unknown";

    if (/android/i.test(userAgent)) platform = "Android";
    else if (/iphone|ipad|ipod/i.test(userAgent)) platform = "iOS";
    else if (/windows/i.test(userAgent)) platform = "Windows";
    else if (/macintosh|mac os/i.test(userAgent)) platform = "macOS";
    else if (/linux/i.test(userAgent)) platform = "Linux";

    if (/ipad|tablet/i.test(userAgent)) device = "tablet";
    else if (/mobile|android|iphone/i.test(userAgent)) device = "mobile";
    else if (userAgent !== "unknown") device = "desktop";

    return {
        ip: req.ip || "unknown",
        realIp: req.ip || "unknown",
        userAgent,
        device,
        platform,
        method: req.method,
        endpoint: `${req.baseUrl}${req.path}`,
        requestId: req.requestId || null
    };
}

export async function login(req, res, next) {
    try {
        const { username, password } = req.body || {};

        if (
            typeof username !== "string" ||
            typeof password !== "string" ||
            !username.trim() ||
            !password ||
            password.length > 256
        ) {
            return res.status(400).json({
                success: false,
                message: "Valid username and password are required"
            });
        }

        const validUsername = username === process.env.ADMIN_USERNAME;

        const validPassword = process.env.ADMIN_PASSWORD_HASH
            ? await bcrypt.compare(password, process.env.ADMIN_PASSWORD_HASH)
            : false;

        const client = getClientDetails(req);

        if (!validUsername || !validPassword) {
            await writeLog({
                type: "authentication",
                level: "warning",
                source: "auth-controller",
                message: "Admin login failed",
                requestId: req.requestId || null,
                metadata: {
                    username: username.slice(0, 100),
                    userId: null,
                    userRole: "anonymous",
                    event: "login_failed",
                    statusCode: 401,
                    ...client
                }
            });

            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const token = jwt.sign(
            {
                username,
                role: "admin"
            },
            process.env.JWT_SECRET,
            {
                subject: "admin",
                algorithm: "HS256",
                expiresIn: process.env.JWT_EXPIRES_IN || "1h"
            }
        );

        await writeLog({
            type: "authentication",
            level: "info",
            source: "auth-controller",
            message: "Admin login successful",
            requestId: req.requestId || null,
            metadata: {
                userId: "admin",
                username,
                userRole: "admin",
                event: "login_success",
                statusCode: 200,
                ...client
            }
        });

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
                id: "admin",
                username,
                role: "admin"
            }
        });
    } catch (error) {
        next(error);
    }
}

export async function logout(req, res, next) {
    try {
        const client = getClientDetails(req);

        await writeLog({
            type: "authentication",
            level: "info",
            source: "auth-controller",
            message: "Admin logout requested",
            requestId: req.requestId || null,
            metadata: {
                userId: req.user?.id || null,
                username: req.user?.username || "unknown",
                userRole: req.user?.role || "unknown",
                event: "logout",
                statusCode: 200,
                ...client
            }
        });

        res.json({
            success: true,
            message: "Logout successful. Discard the access token."
        });
    } catch (error) {
        next(error);
    }
}

export function currentUser(req, res) {
    res.json({
        success: true,
        user: req.user
    });
}

