import "./style.css";

const app = document.querySelector("#app");

const TIMEZONE = "Asia/Kolkata";

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function getLocalDate(timestamp) {
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).formatToParts(new Date(timestamp));

    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

function formatDay(date) {
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: TIMEZONE,
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
    }).format(new Date(`${date}T12:00:00+05:30`));
}

function formatTime(timestamp) {
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: TIMEZONE,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    }).format(new Date(timestamp));
}

function formatFullTimestamp(timestamp) {
    return new Intl.DateTimeFormat("en-IN", {
        timeZone: TIMEZONE,
        dateStyle: "medium",
        timeStyle: "medium",
        hour12: false
    }).format(new Date(timestamp));
}

async function initialize() {
    try {
        const response = await fetch("/api/auth/me", {
            method: "GET",
            credentials: "same-origin"
        });

        if (!response.ok) {
            window.location.replace("/login");
            return;
        }

        await response.json();

        app.innerHTML = `
            <header class="topbar">
                <div class="brand">
                    <span class="brand-logo">π</span>
                    <span class="brand-name">PI ADMIN</span>
                </div>
                <button id="logoutButton" type="button">LOGOUT</button>
            </header>

            <main class="logs-container">
                <section class="logs-heading">
                    <div>
                        <div class="eyebrow">SERVICE MONITORING</div>
                        <h1>IoT Backend Logs</h1>
                        <p class="service-name">iot-backend.service</p>
                    </div>
                    <button id="refreshButton" class="refresh-button" type="button">
                        ↻ REFRESH
                    </button>
                </section>

                <section class="stats-grid">
                    <article class="stat-card">
                        <span>Total Logs</span>
                        <strong id="totalCount">—</strong>
                    </article>
                    <article class="stat-card error-stat">
                        <span>Errors</span>
                        <strong id="errorCount">—</strong>
                    </article>
                    <article class="stat-card warning-stat">
                        <span>Warnings</span>
                        <strong id="warningCount">—</strong>
                    </article>
                    <article class="stat-card info-stat">
                        <span>Info</span>
                        <strong id="infoCount">—</strong>
                    </article>
                </section>

                <section class="filter-panel">
                    <div class="filter-field">
                        <label for="dateFilter">SELECT DATE</label>
                        <input id="dateFilter" type="date">
                    </div>

                    <div class="filter-field">
                        <label for="levelFilter">SEVERITY</label>
                        <select id="levelFilter">
                            <option value="all">All levels</option>
                            <option value="info">INFO</option>
                            <option value="warning">WARNING</option>
                            <option value="error">ERROR</option>
                        </select>
                    </div>

                    <div class="filter-field">
                        <label for="sourceFilter">LOG SOURCE</label>
                        <select id="sourceFilter">
                            <option value="all">All sources</option>
                            <option value="journal">System Journal</option>
                            <option value="access">Access Log</option>
                            <option value="combined">Combined Log</option>
                            <option value="error">Error Log</option>
                        </select>
                    </div>

                    <button id="clearFilters" class="clear-button" type="button">
                        CLEAR FILTERS
                    </button>
                </section>

                <section class="logs-toolbar">
                    <div>
                        <h2>Log Activity</h2>
                        <p id="resultInfo">Loading logs...</p>
                    </div>
                    <span class="timezone-label">IST · Asia/Kolkata</span>
                </section>

                <div id="logsStatus" class="logs-status" role="status">
                    Loading backend logs...
                </div>

                <section id="logsList" class="logs-list"></section>
            </main>
        `;

        document.querySelector("#logoutButton").addEventListener("click", logout);

        document.querySelector("#refreshButton").addEventListener("click", loadLogs);

        document.querySelector("#dateFilter").addEventListener("change", loadLogs);
        document.querySelector("#levelFilter").addEventListener("change", loadLogs);
        document.querySelector("#sourceFilter").addEventListener("change", loadLogs);

        document.querySelector("#clearFilters").addEventListener("click", () => {
            document.querySelector("#dateFilter").value = "";
            document.querySelector("#levelFilter").value = "all";
            document.querySelector("#sourceFilter").value = "all";
            loadLogs();
        });

        await loadLogs();
    } catch (error) {
        app.textContent = "Unable to connect to PI ADMIN server.";
        console.error("Initialization error:", error);
    }
}

async function loadLogs() {
    const refreshButton = document.querySelector("#refreshButton");
    const status = document.querySelector("#logsStatus");
    const list = document.querySelector("#logsList");

    if (!refreshButton || !status || !list) return;

    refreshButton.disabled = true;
    refreshButton.textContent = "↻ LOADING...";
    status.textContent = "Loading logs from Raspberry Pi...";
    status.hidden = false;
    list.innerHTML = "";

    const params = new URLSearchParams();

    const date = document.querySelector("#dateFilter").value;
    const level = document.querySelector("#levelFilter").value;
    const source = document.querySelector("#sourceFilter").value;

    if (date) params.set("date", date);
    if (level !== "all") params.set("level", level);
    if (source !== "all") params.set("source", source);

    try {
        const response = await fetch(`/api/logs?${params.toString()}`, {
            method: "GET",
            credentials: "same-origin",
            headers: { Accept: "application/json" }
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            throw new Error(result.message || "Unable to load logs.");
        }

        renderLogs(result);
    } catch (error) {
        status.textContent = error.message || "Unable to load logs.";
        status.className = "logs-status error-message";
        console.error("Logs loading error:", error);
    } finally {
        refreshButton.disabled = false;
        refreshButton.textContent = "↻ REFRESH";
    }
}

function renderLogs(result) {
    const status = document.querySelector("#logsStatus");
    const list = document.querySelector("#logsList");

    const logs = result.logs || [];

    document.querySelector("#totalCount").textContent =
        Number(result.filtered).toLocaleString("en-IN");

    document.querySelector("#errorCount").textContent =
        logs.filter(log => log.level === "error").length.toLocaleString("en-IN");

    document.querySelector("#warningCount").textContent =
        logs.filter(log => log.level === "warning").length.toLocaleString("en-IN");

    document.querySelector("#infoCount").textContent =
        logs.filter(log => log.level === "info").length.toLocaleString("en-IN");

    document.querySelector("#resultInfo").textContent =
        `${logs.length.toLocaleString("en-IN")} matching entries · ${result.total.toLocaleString("en-IN")} total available`;

    if (!logs.length) {
        status.hidden = false;
        status.className = "logs-status";
        status.textContent = "No logs found for the selected filters.";
        list.innerHTML = "";
        return;
    }

    status.hidden = true;

    const groups = new Map();

    for (const log of logs) {
        const date = getLocalDate(log.timestamp);

        if (!groups.has(date)) groups.set(date, []);
        groups.get(date).push(log);
    }

    list.innerHTML = [...groups.entries()].map(([date, entries]) => `
        <section class="day-group">
            <div class="day-heading">
                <div>
                    <h3>${escapeHTML(formatDay(date))}</h3>
                    <span>${escapeHTML(date)}</span>
                </div>
                <span class="day-count">${entries.length} entries</span>
            </div>

            <div class="day-entries">
                ${entries.map(log => `
                    <article class="log-entry">
                        <div class="log-time">
                            <strong>${escapeHTML(formatTime(log.timestamp))}</strong>
                            <span>${escapeHTML(formatFullTimestamp(log.timestamp))}</span>
                        </div>

                        <div class="log-content">
                            <div class="log-meta">
                                <span class="severity ${escapeHTML(log.level)}">
                                    ${escapeHTML(log.level.toUpperCase())}
                                </span>
                                <span class="source-tag">${escapeHTML(log.source)}</span>
                                ${log.pid ? `<span class="pid-tag">PID ${escapeHTML(log.pid)}</span>` : ""}
                            </div>
                            <p>${escapeHTML(log.message)}</p>
                        </div>
                    </article>
                `).join("")}
            </div>
        </section>
    `).join("");
}

async function logout() {
    const button = document.querySelector("#logoutButton");
    button.disabled = true;
    button.textContent = "SIGNING OUT...";

    try {
        const response = await fetch("/api/auth/logout", {
            method: "POST",
            credentials: "same-origin"
        });

        if (!response.ok) throw new Error("Logout failed.");

        window.location.replace("/login");
    } catch (error) {
        button.disabled = false;
        button.textContent = "LOGOUT";
        console.error(error);
        alert("Unable to logout. Please try again.");
    }
}

initialize();
