import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { writeLog } from "../services/log.service.js";

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

        const validUsername =
            username === process.env.ADMIN_USERNAME;

        const validPassword = process.env.ADMIN_PASSWORD_HASH
            ? await bcrypt.compare(
                password,
                process.env.ADMIN_PASSWORD_HASH
            )
            : false;

        if (!validUsername || !validPassword) {
            await writeLog({
                type: "authentication",
                level: "warning",
                source: "auth-controller",
                message: "Admin login failed",
                metadata: {
                    username: username.slice(0, 100),
                    ip: req.ip
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
            metadata: {
                username,
                ip: req.ip
            }
        });

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: {
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
        await writeLog({
            type: "authentication",
            level: "info",
            source: "auth-controller",
            message: "Admin logout requested",
            metadata: {
                username: req.user?.username || "unknown"
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
