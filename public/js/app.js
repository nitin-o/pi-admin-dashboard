// =====================================
// SERVER HEALTH
// =====================================

const connectionStatus = document.getElementById("connectionStatus");
const serverStatus = document.getElementById("serverStatus");
const lastChecked = document.getElementById("lastChecked");
const statusDot = document.querySelector(".status-dot");

async function checkServer() {
    try {
        const response = await fetch("/api/health", {
            cache: "no-store"
        });

        if (!response.ok) throw new Error("Server unavailable");

        const data = await response.json();

        connectionStatus.textContent = "Connected";
        serverStatus.textContent = "ONLINE";
        serverStatus.style.color = "#22c55e";
        statusDot.style.background = "#22c55e";
        statusDot.style.boxShadow = "0 0 10px #22c55e";

        lastChecked.textContent =
            `Application: ${data.application} | Last checked: ${new Date(data.timestamp).toLocaleString()}`;

    } catch (error) {
        connectionStatus.textContent = "Disconnected";
        serverStatus.textContent = "OFFLINE";
        serverStatus.style.color = "#ef4444";
        statusDot.style.background = "#ef4444";
        statusDot.style.boxShadow = "0 0 10px #ef4444";

        lastChecked.textContent = "Unable to connect to the API server.";
    }
}

checkServer();
setInterval(checkServer, 10000);


// =====================================
// LIVE SYSTEM MONITOR
// =====================================

const cpuUsage = document.getElementById("cpuUsage");
const cpuModel = document.getElementById("cpuModel");
const ramUsage = document.getElementById("ramUsage");
const ramDetails = document.getElementById("ramDetails");
const cpuTemperature = document.getElementById("cpuTemperature");
const diskUsage = document.getElementById("diskUsage");
const diskDetails = document.getElementById("diskDetails");
const systemUptime = document.getElementById("systemUptime");

function formatBytes(bytes) {
    if (!Number.isFinite(bytes)) return "--";

    const gb = bytes / (1024 ** 3);
    return `${gb.toFixed(2)} GB`;
}

function formatUptime(seconds) {
    if (!Number.isFinite(seconds)) return "--";

    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${days}d ${hours}h ${minutes}m`;
}

async function loadSystemStats() {
    try {
        const response = await fetch("/api/system", {
            cache: "no-store"
        });

        if (!response.ok) throw new Error("System API unavailable");

        const result = await response.json();

        if (!result.success) throw new Error("System data unavailable");

        const data = result.data;

        cpuUsage.textContent = `${data.cpu.usage}%`;
        cpuModel.textContent = data.cpu.model || "Processor information unavailable";

        ramUsage.textContent = `${data.memory.usage}%`;
        ramDetails.textContent =
            `${formatBytes(data.memory.used)} used / ${formatBytes(data.memory.total)}`;

        cpuTemperature.textContent =
            Number.isFinite(data.temperature)
                ? `${data.temperature.toFixed(1)}°C`
                : "N/A";

        const disks = data.disk || [];
        if (disks.length > 0) {
            const mainDisk = disks[0];
            diskUsage.textContent = `${mainDisk.usage.toFixed(1)}%`;
            diskDetails.textContent =
                `${mainDisk.mount} · ${formatBytes(mainDisk.used)} / ${formatBytes(mainDisk.total)}`;
        } else {
            diskUsage.textContent = "N/A";
            diskDetails.textContent = "Disk information unavailable";
        }

        systemUptime.textContent = formatUptime(data.uptime);

    } catch (error) {
        console.error("System Monitor:", error);
        cpuUsage.textContent = "N/A";
        ramUsage.textContent = "N/A";
        cpuTemperature.textContent = "N/A";
        diskUsage.textContent = "N/A";
        systemUptime.textContent = "N/A";
        cpuModel.textContent = "Unable to load system data";
    }
}

loadSystemStats();
setInterval(loadSystemStats, 5000);


// =====================================
// SIDEBAR NAVIGATION
// =====================================

const mainContent = document.querySelector(".main-content");

const pageDescriptions = {
    "System Monitor": "CPU, RAM, temperature and disk usage monitoring.",
    "Network": "Wi-Fi, IP address, network interfaces and connectivity.",
    "Services": "View and manage approved Raspberry Pi system services.",
    "System Logs": "View system and application logs.",
    "Security": "Authentication, access control and security status.",
    "Settings": "Dashboard configuration and preferences."
};

document.querySelectorAll(".nav-link").forEach(link => {
    link.addEventListener("click", event => {
        event.preventDefault();

        const pageName = link.textContent.trim().replace(/^[^\w]+/, "").trim();

        document.querySelectorAll(".nav-link").forEach(item => {
            item.classList.remove("active");
        });

        link.classList.add("active");

        if (link.getAttribute("href") === "/") {
            location.reload();
            return;
        }

        if (link.getAttribute("href") === "#system") {
            document.getElementById("system-monitor")?.scrollIntoView({
                behavior: "smooth",
                block: "start"
            });
            return;
        }

        const description = pageDescriptions[pageName];

        if (!description) return;

        mainContent.replaceChildren();

        const section = document.createElement("section");
        section.className = "coming-soon";

        const label = document.createElement("p");
        label.className = "eyebrow";
        label.textContent = "PI ADMIN MANAGEMENT";

        const heading = document.createElement("h2");
        heading.textContent = pageName;

        const message = document.createElement("p");
        message.textContent = description;

        const status = document.createElement("p");
        status.className = "page-status";
        status.textContent = "This module is under development.";

        section.append(label, heading, message, status);
        mainContent.appendChild(section);
    });
});


// =====================================
// LIVE NETWORK MONITOR
// =====================================

function formatNetworkSpeed(bytes) {
    if (!Number.isFinite(bytes)) return "0 B/s";

    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(2)} MB/s`;
    }

    if (bytes >= 1024) {
        return `${(bytes / 1024).toFixed(2)} KB/s`;
    }

    return `${bytes.toFixed(0)} B/s`;
}

async function loadNetworkStats() {
    try {
        const response = await fetch("/api/network", {
            cache: "no-store"
        });

        if (!response.ok) throw new Error("Network API unavailable");

        const result = await response.json();

        if (!result.success) throw new Error("Network data unavailable");

        const data = result.data;
        const interfaces = data.interfaces || [];
        const traffic = data.traffic || [];

        document.getElementById("internetStatus").textContent =
            data.internet ? "ONLINE" : "OFFLINE";

        document.getElementById("interfaceCount").textContent =
            interfaces.length;

        const wifi = interfaces.find(item =>
            item.type === "wireless" ||
            item.name.toLowerCase().includes("wi-fi") ||
            item.name.toLowerCase().includes("wlan")
        );

        document.getElementById("wifiStatus").textContent =
            wifi ? "CONNECTED" : "NOT DETECTED";

        document.getElementById("wifiAddress").textContent =
            wifi ? `${wifi.name} · ${wifi.ip4 || "IP unavailable"}` :
            "No active Wi-Fi interface";

        document.getElementById("tailscaleStatus").textContent =
            data.tailscale?.detected ? "DETECTED" : "NOT DETECTED";

        document.getElementById("tailscaleDetails").textContent =
            data.tailscale?.interfaces?.join(", ") || "No Tailscale interface found";

        const totalDownload = traffic.reduce(
            (sum, item) => sum + (Number(item.download) || 0), 0
        );

        const totalUpload = traffic.reduce(
            (sum, item) => sum + (Number(item.upload) || 0), 0
        );

        document.getElementById("downloadSpeed").textContent =
            formatNetworkSpeed(totalDownload);

        document.getElementById("uploadSpeed").textContent =
            formatNetworkSpeed(totalUpload);

        const container = document.getElementById("networkInterfaces");
        container.replaceChildren();

        if (interfaces.length === 0) {
            const message = document.createElement("p");
            message.textContent = "No active network interfaces found.";
            container.appendChild(message);
        }

        interfaces.forEach(item => {
            const card = document.createElement("article");
            card.className = "info-card";

            const name = document.createElement("p");
            name.textContent = item.name;

            const status = document.createElement("h3");
            status.textContent = item.status.toUpperCase();

            const details = document.createElement("span");
            details.textContent =
                `IPv4: ${item.ip4 || "N/A"} · Type: ${item.type || "Unknown"}`;

            card.append(name, status, details);
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Network Monitor:", error);

        document.getElementById("internetStatus").textContent = "N/A";
        document.getElementById("interfaceCount").textContent = "N/A";
        document.getElementById("wifiStatus").textContent = "N/A";
        document.getElementById("tailscaleStatus").textContent = "N/A";
        document.getElementById("downloadSpeed").textContent = "N/A";
        document.getElementById("uploadSpeed").textContent = "N/A";
    }
}

loadNetworkStats();
setInterval(loadNetworkStats, 5000);
