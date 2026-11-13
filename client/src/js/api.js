const API_BASE = "/api";
const TOKEN_KEY = "log_viewer_token";

export function getToken() {
    return sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
    sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(endpoint, options = {}) {
    const headers = {
        "Content-Type": "application/json",
        ...options.headers
    };

    const token = getToken();

    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    let response;

    try {
        response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });
    } catch {
        throw new Error("Unable to connect to the Log Viewer API.");
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        if (response.status === 401) {
            clearToken();
        }

        throw new Error(
            data.message || `Request failed with status ${response.status}`
        );
    }

    return data;
}

export async function login(username, password) {
    const data = await apiRequest("/auth/login", {
        method: "POST",
        body: JSON.stringify({ username, password })
    });

    if (!data.token) {
        throw new Error("Authentication token was not returned.");
    }

    saveToken(data.token);

    return data.user;
}

export async function logout() {
    try {
        await apiRequest("/auth/logout", {
            method: "POST"
        });
    } finally {
        clearToken();
    }
}

export async function getCurrentUser() {
    return apiRequest("/auth/me");
}

export async function getLogs(filters = {}) {
    const query = new URLSearchParams();

    for (const [key, value] of Object.entries(filters)) {
        if (value !== undefined && value !== null && value !== "") {
            query.set(key, String(value));
        }
    }

    return apiRequest(`/logs?${query.toString()}`);
}

export async function getLogMetadata() {
    return apiRequest("/logs/metadata");
}

export async function getStatistics() {
    return apiRequest("/statistics");
}

export async function getSystemStatus() {
    return apiRequest("/system");
}

export async function getNetworkStatus() {
    return apiRequest("/network");
}

export async function ingestLog(entry) {
    return apiRequest("/logs", {
        method: "POST",
        body: JSON.stringify(entry)
    });
}

export function connectLiveLogs(onLog, onStatus) {
    const token = getToken();

    if (!token) {
        throw new Error("Authentication token is missing.");
    }

    const socket = new WebSocket(
        `${location.protocol === "https:" ? "wss:" : "ws:"}//${location.host}/ws`,
        ["log-viewer", token]
    );

    socket.addEventListener("open", () => {
        onStatus?.("connected");
    });

    socket.addEventListener("message", event => {
        try {
            const payload = JSON.parse(event.data);

            if (payload.event === "new-log" && payload.data) {
                onLog?.(payload.data);
            }
        } catch {
            console.error("Invalid WebSocket message received.");
        }
    });

    socket.addEventListener("close", () => {
        onStatus?.("disconnected");
    });

    socket.addEventListener("error", () => {
        onStatus?.("error");
    });

    return socket;
}
