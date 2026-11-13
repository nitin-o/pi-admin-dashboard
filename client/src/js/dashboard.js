import {
    getLogs,
    getLogMetadata,
    getStatistics,
    getSystemStatus,
    getNetworkStatus,
    logout,
    connectLiveLogs
} from "./api.js";

let currentPage = 1;
let pageLimit = 10;
let currentFilters = {};
let socket = null;
let refreshTimer = null;
let categories = [];
let levels = [];
let currentSection = "overview";

const categoryNames = {
    frontend: "Frontend",
    backend: "Backend",
    api: "API",
    error: "Error",
    warning: "Warning",
    info: "Info",
    debug: "Debug",
    authentication: "Authentication",
    database: "Database",
    system: "System",
    "raspberry-pi": "Raspberry Pi",
    security: "Security"
};

function escapeHTML(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[char]);
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleString();
}

function formatBytes(bytes) {
    if (!Number.isFinite(Number(bytes))) return "—";

    const value = Number(bytes);

    if (value < 1024) return `${value} B`;
    if (value < 1024 ** 2) return `${(value / 1024).toFixed(1)} KB`;
    if (value < 1024 ** 3) return `${(value / 1024 ** 2).toFixed(1)} MB`;

    return `${(value / 1024 ** 3).toFixed(2)} GB`;
}

function showValue(value, suffix = "") {
    return Number.isFinite(Number(value))
        ? `${Number(value).toFixed(1)}${suffix}`
        : "Unavailable";
}

function setStatus(status) {
    const element = document.getElementById("connection-status");

    if (!element) return;

    const labels = {
        connected: "Live Connected",
        disconnected: "Live Disconnected",
        error: "Connection Error"
    };

    element.className = `status status-${status}`;
    element.innerHTML = `
        <span class="status-dot"></span>
        ${labels[status] || "Connecting"}
    `;
}

function renderShell(app) {
    app.innerHTML = `
        <div class="app-layout">
            <aside class="sidebar">
                <div class="brand">LOG VIEWER <span>· SENTINEL</span></div>

                <div class="nav-label">MONITORING</div>
                <nav aria-label="Main navigation">
                    <button class="nav-item active" data-section="overview">▦ Overview</button>
                    <button class="nav-item" data-section="logs">☷ All Logs</button>
                    <button class="nav-item" data-section="system">▤ System Monitor</button>
                    <button class="nav-item" data-section="network">⌁ Network Monitor</button>
                </nav>

                <div class="nav-label">ACCOUNT</div>
                <button class="nav-item" id="logout-button">↪ Sign Out</button>
            </aside>

            <main class="main-content">
                <header class="topbar">
                    <div>
                        <h1 id="page-title">Overview</h1>
                        <p class="subtitle">Centralized Log Monitoring Console</p>
                    </div>

                    <div id="connection-status" class="status">
                        <span class="status-dot"></span>
                        Connecting
                    </div>
                </header>

                <section id="dashboard-content">
                    <div class="loading-screen">
                        <div class="loader"></div>
                        <p>Loading monitoring data...</p>
                    </div>
                </section>
            </main>
        </div>
    `;

    app.querySelectorAll("[data-section]").forEach(button => {
        button.addEventListener("click", () => {
            currentSection = button.dataset.section;

            app.querySelectorAll("[data-section]").forEach(item => {
                item.classList.toggle("active", item === button);
            });

            renderSection();
        });
    });

    document.getElementById("logout-button").addEventListener("click", async () => {
        if (!confirm("Are you sure you want to sign out?")) return;

        stopDashboard();

        try {
            await logout();
        } finally {
            window.location.reload();
        }
    });
}

function renderOverview() {
    return `
        <div class="stats-grid">
            <article class="stat-card">
                <div class="stat-label">Total Logs</div>
                <div class="stat-value" id="stat-total">—</div>
            </article>

            <article class="stat-card">
                <div class="stat-label">Last 24 Hours</div>
                <div class="stat-value" id="stat-recent">—</div>
            </article>

            <article class="stat-card">
                <div class="stat-label">Warnings</div>
                <div class="stat-value" id="stat-warnings">—</div>
            </article>

            <article class="stat-card">
                <div class="stat-label">Errors</div>
                <div class="stat-value" id="stat-errors">—</div>
            </article>
        </div>

        <div class="content-grid">
            <section class="panel">
                <h2>Recent Logs</h2>
                <div class="toolbar">
                    <input id="log-search" type="search" placeholder="Search logs...">
                    <select id="log-type">
                        <option value="">All Categories</option>
                    </select>
                    <select id="log-level">
                        <option value="">All Levels</option>
                    </select>
                    <button class="secondary-button" id="filter-button">Filter</button>
                </div>

                <div id="logs-table"></div>
                <div class="pagination" id="pagination"></div>
            </section>

            <section class="panel">
                <h2>Logs by Category</h2>
                <div class="category-list" id="category-list"></div>
            </section>
        </div>

        <section class="panel">
            <h2>System Overview</h2>
            <div class="system-grid" id="system-overview">
                <div class="empty-state">Loading system information...</div>
            </div>
        </section>
    `;
}

function renderLogsPage() {
    return `
        <section class="panel">
            <h2>Log Explorer</h2>
            <div class="toolbar">
                <input id="log-search" type="search" placeholder="Search logs...">
                <select id="log-type">
                    <option value="">All Categories</option>
                </select>
                <select id="log-level">
                    <option value="">All Levels</option>
                </select>
                <button class="secondary-button" id="filter-button">Apply Filters</button>
            </div>
            <div id="logs-table"></div>
            <div class="pagination" id="pagination"></div>
        </section>
    `;
}

function renderSystemPage() {
    return `
        <section class="panel">
            <h2>System Information</h2>
            <div class="system-grid" id="system-overview">
                <div class="empty-state">Loading system information...</div>
            </div>
        </section>
        <section class="panel" style="margin-top:18px">
            <h2>Disk Information</h2>
            <div class="table-wrap" id="disk-table"></div>
        </section>
    `;
}

function renderNetworkPage() {
    return `
        <section class="panel">
            <h2>Network Interfaces</h2>
            <div class="table-wrap" id="network-table">
                <div class="empty-state">Loading network information...</div>
            </div>
        </section>
    `;
}

async function renderSection() {
    const content = document.getElementById("dashboard-content");
    const titles = {
        overview: "Overview",
        logs: "All Logs",
        system: "System Monitor",
        network: "Network Monitor"
    };

    document.getElementById("page-title").textContent =
        titles[currentSection] || "Overview";

    if (currentSection === "overview") {
        content.innerHTML = renderOverview();
        bindFilters();
        await Promise.allSettled([
            loadStatistics(),
            loadLogs(),
            loadSystem()
        ]);
    } else if (currentSection === "logs") {
        content.innerHTML = renderLogsPage();
        bindFilters();
        await loadLogs();
    } else if (currentSection === "system") {
        content.innerHTML = renderSystemPage();
        await loadSystem();
    } else if (currentSection === "network") {
        content.innerHTML = renderNetworkPage();
        await loadNetwork();
    }
}

async function loadStatistics() {
    try {
        const response = await getStatistics();
        const stats = response.statistics;

        document.getElementById("stat-total").textContent = stats.total ?? 0;
        document.getElementById("stat-recent").textContent = stats.recent24Hours ?? 0;
        document.getElementById("stat-warnings").textContent =
            stats.byLevel?.warning ?? 0;
        document.getElementById("stat-errors").textContent =
            stats.byLevel?.error ?? 0;

        const categoryList = document.getElementById("category-list");

        if (categoryList) {
            categoryList.innerHTML = categories.map(type => `
                <div class="category-row">
                    <span>${escapeHTML(categoryNames[type] || type)}</span>
                    <span class="category-count">${Number(stats.byType?.[type] ?? 0)}</span>
                </div>
            `).join("");
        }
    } catch (error) {
        showSectionError("category-list", error.message);
    }
}

function bindFilters() {
    const typeSelect = document.getElementById("log-type");
    const levelSelect = document.getElementById("log-level");

    if (!typeSelect || !levelSelect) return;

    typeSelect.innerHTML = `
        <option value="">All Categories</option>
        ${categories.map(type => `
            <option value="${escapeHTML(type)}">${escapeHTML(categoryNames[type] || type)}</option>
        `).join("")}
    `;

    levelSelect.innerHTML = `
        <option value="">All Levels</option>
        ${levels.map(level => `
            <option value="${escapeHTML(level)}">${escapeHTML(level.toUpperCase())}</option>
        `).join("")}
    `;

    document.getElementById("filter-button").addEventListener("click", () => {
        currentPage = 1;

        currentFilters = {
            type: typeSelect.value,
            level: levelSelect.value,
            search: document.getElementById("log-search").value.trim()
        };

        loadLogs();
    });
}

async function loadLogs() {
    try {
        const response = await getLogs({
            ...currentFilters,
            page: currentPage,
            limit: pageLimit
        });

        const logs = response.logs || [];
        const pagination = response.pagination || {};
        const table = document.getElementById("logs-table");

        if (!table) return;

        if (!logs.length) {
            table.innerHTML = '<div class="empty-state">No logs found.</div>';
        } else {
            table.innerHTML = `
                <div class="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Time</th>
                                <th>Category</th>
                                <th>Level</th>
                                <th>Source</th>
                                <th>Message</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${logs.map(log => `
                                <tr>
                                    <td>${escapeHTML(formatDate(log.timestamp))}</td>
                                    <td>${escapeHTML(categoryNames[log.type] || log.type)}</td>
                                    <td><span class="level level-${escapeHTML(log.level)}">${escapeHTML(log.level)}</span></td>
                                    <td>${escapeHTML(log.source)}</td>
                                    <td class="message-cell" title="${escapeHTML(log.message)}">${escapeHTML(log.message)}</td>
                                </tr>
                            `).join("")}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const page = Number(pagination.page || currentPage);
        const totalPages = Number(pagination.totalPages || 0);
        const total = Number(pagination.total || 0);
        const paginationElement = document.getElementById("pagination");

        if (paginationElement) {
            paginationElement.innerHTML = `
                <span>${total} logs · Page ${page} of ${totalPages}</span>
                <div>
                    <button class="secondary-button" id="previous-page" ${page <= 1 ? "disabled" : ""}>Previous</button>
                    <button class="secondary-button" id="next-page" ${page >= totalPages ? "disabled" : ""}>Next</button>
                </div>
            `;

            document.getElementById("previous-page").addEventListener("click", () => {
                currentPage = Math.max(1, currentPage - 1);
                loadLogs();
            });

            document.getElementById("next-page").addEventListener("click", () => {
                currentPage += 1;
                loadLogs();
            });
        }
    } catch (error) {
        showSectionError("logs-table", error.message);
    }
}


async function loadSystem() {
    try {
        const response = await getSystemStatus();
        const system = response.system || response;
        const cpu = system.cpu || {};
        const memory = system.memory || {};
        const disks = system.disks || [];

        const items = [
            ["Hostname", system.hostname],
            ["Operating System", `${system.distro || system.platform || "—"} ${system.architecture || ""}`],
            ["Kernel", system.kernel],
            ["CPU", cpu.brand || cpu.manufacturer],
            ["CPU Cores", cpu.cores],
            ["CPU Usage", showValue(cpu.usagePercent, "%")],
            ["Memory Usage", showValue(memory.usagePercent, "%")],
            ["Total Memory", formatBytes(memory.totalBytes)],
            ["System Uptime", system.uptimeSeconds ? `${(system.uptimeSeconds / 3600).toFixed(1)} hours` : "—"],
            ["CPU Temperature", showValue(cpu.temperatureCelsius, " °C")]
        ];

        const overview = document.getElementById("system-overview");

        if (overview) {
            overview.innerHTML = items.map(([label, value]) => `
                <div class="system-item">
                    <span>${escapeHTML(label)}</span>
                    <strong>${escapeHTML(value ?? "—")}</strong>
                </div>
            `).join("");
        }

        const diskTable = document.getElementById("disk-table");

        if (diskTable) {
            diskTable.innerHTML = `
                <table>
                    <thead>
                        <tr>
                            <th>Filesystem</th>
                            <th>Mount</th>
                            <th>Size</th>
                            <th>Used</th>
                            <th>Usage</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${disks.map(disk => `
                            <tr>
                                <td>${escapeHTML(disk.filesystem)}</td>
                                <td>${escapeHTML(disk.mount)}</td>
                                <td>${escapeHTML(formatBytes(disk.totalBytes))}</td>
                                <td>${escapeHTML(formatBytes(disk.usedBytes))}</td>
                                <td>${escapeHTML(showValue(disk.usagePercent, "%"))}</td>
                            </tr>
                        `).join("")}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        showSectionError("system-overview", error.message);
    }
}



async function loadNetwork() {
    try {
        const response = await getNetworkStatus();
        const network = response.network || response;
        const interfaces = network.interfaces || [];
        const table = document.getElementById("network-table");

        if (!table) return;

        if (interfaces.length === 0) {
            table.innerHTML = `
                <div class="empty-state">
                    No network interfaces found.
                </div>
            `;
            return;
        }

        table.innerHTML = `
            <table>
                <thead>
                    <tr>
                        <th>Interface</th>
                        <th>Type</th>
                        <th>IPv4</th>
                        <th>IPv6</th>
                        <th>Status</th>
                        <th>Speed</th>
                        <th>Received</th>
                        <th>Sent</th>
                    </tr>
                </thead>
                <tbody>
                    ${interfaces.map(item => `
                        <tr>
                            <td>${escapeHTML(item.name)}</td>
                            <td>${escapeHTML(item.type)}</td>
                            <td>${escapeHTML(item.ip4)}</td>
                            <td>${escapeHTML(item.ip6)}</td>
                            <td>${escapeHTML(item.operationalStatus)}</td>
                            <td>${escapeHTML(showValue(item.speedMbps, " Mbps"))}</td>
                            <td>${escapeHTML(formatBytes(item.rxBytes))}</td>
                            <td>${escapeHTML(formatBytes(item.txBytes))}</td>
                        </tr>
                    `).join("")}
                </tbody>
            </table>
        `;
    } catch (error) {
        showSectionError("network-table", error.message);
    }
}


function showSectionError(id, message) {
    const element = document.getElementById(id);

    if (element) {
        element.innerHTML = `
            <div class="empty-state">Unable to load data: ${escapeHTML(message)}</div>
        `;
    }
}

function handleLiveLog(log) {
    // Ignore API request logs generated by this server.
    // They are refreshed through the normal dashboard interval.
    if (
        log?.type === "api" &&
        log?.source === "http-server"
    ) {
        return;
    }

    // Refresh only for actual application logs.
    if (currentSection === "overview" || currentSection === "logs") {
        loadLogs();
        loadStatistics();
    }
}

function stopDashboard() {
    if (socket) {
        socket.close();
        socket = null;
    }

    if (refreshTimer) {
        clearInterval(refreshTimer);
        refreshTimer = null;
    }
}

export async function startDashboard(app) {
    stopDashboard();
    currentPage = 1;
    currentFilters = {};

    renderShell(app);

    try {
        const metadata = await getLogMetadata();

        categories = metadata.types || [];
        levels = metadata.levels || [];

        await renderSection();

        socket = connectLiveLogs(
            handleLiveLog,
            setStatus
        );

        refreshTimer = setInterval(() => {
            if (currentSection === "overview" || currentSection === "logs") {
                loadLogs();
                loadStatistics();
            }

            if (currentSection === "system") loadSystem();
            if (currentSection === "network") loadNetwork();
        }, 15000);
    } catch (error) {
        showSectionError("dashboard-content", error.message);
    }
}
