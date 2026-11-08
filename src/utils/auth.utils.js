import {
    randomBytes,
    scrypt as scryptCallback,
    timingSafeEqual,
    createHmac
} from "node:crypto";

import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);

export async function hashPassword(password) {
    const salt = randomBytes(16).toString("hex");

    const derivedKey = await scrypt(password, salt, 64);

    return `scrypt$${salt}$${derivedKey.toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
    const parts = storedHash.split("$");

    if (parts.length !== 3 || parts[0] !== "scrypt") {
        return false;
    }

    const [, salt, storedKey] = parts;

    if (!/^[a-f0-9]{32}$/i.test(salt) ||
        !/^[a-f0-9]{128}$/i.test(storedKey)) {
        return false;
    }

    const derivedKey = await scrypt(password, salt, 64);
    const expectedKey = Buffer.from(storedKey, "hex");

    return timingSafeEqual(derivedKey, expectedKey);
}

export function createSessionToken(username, secret) {
    const payload = {
        username,
        expiresAt: Date.now() + (8 * 60 * 60 * 1000)
    };

    const encodedPayload = Buffer
        .from(JSON.stringify(payload))
        .toString("base64url");

    const signature = createHmac("sha256", secret)
        .update(encodedPayload)
        .digest("base64url");

    return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token, secret) {
    try {
        if (typeof token !== "string" || typeof secret !== "string") {
            return null;
        }

        const parts = token.split(".");

        if (parts.length !== 2) {
            return null;
        }

        const [encodedPayload, providedSignature] = parts;

        const expectedSignature = createHmac("sha256", secret)
            .update(encodedPayload)
            .digest();

        const actualSignature = Buffer.from(providedSignature, "base64url");

        if (
            actualSignature.length !== expectedSignature.length ||
            !timingSafeEqual(actualSignature, expectedSignature)
        ) {
            return null;
        }

        const payload = JSON.parse(
            Buffer.from(encodedPayload, "base64url").toString("utf8")
        );

        if (
            typeof payload.username !== "string" ||
            typeof payload.expiresAt !== "number" ||
            payload.expiresAt <= Date.now()
        ) {
            return null;
        }

        return payload;
    } catch {
        return null;
    }
}
