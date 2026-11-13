
import si from "systeminformation";

export async function getNetworkOverview() {
    const [interfaces, stats] = await Promise.all([
        si.networkInterfaces(),
        si.networkStats()
    ]);

    const statsByInterface = new Map(
        stats.map(item => [item.iface, item])
    );

    const groupedInterfaces = new Map();

    for (const item of interfaces) {
        // Hide loopback interfaces.
        if (item.internal) continue;

        const name = item.iface;
        const existing = groupedInterfaces.get(name);

        const networkStats = statsByInterface.get(name) || {};

        const current = {
            name,
            type: item.type || existing?.type || "virtual",
            ip4: item.ip4 || existing?.ip4 || "",
            ip6: item.ip6 || existing?.ip6 || "",
            mac: item.mac || existing?.mac || "",
            internal: false,
            virtual: item.virtual ?? existing?.virtual ?? false,
            operationalStatus:
                item.operstate === "up" || existing?.operationalStatus === "up"
                    ? "up"
                    : item.operstate || existing?.operationalStatus || "unknown",
            speedMbps: item.speed || existing?.speedMbps || null,
            rxBytes: networkStats.rx_bytes ?? existing?.rxBytes ?? null,
            txBytes: networkStats.tx_bytes ?? existing?.txBytes ?? null,
            rxErrors: networkStats.rx_errors ?? existing?.rxErrors ?? null,
            txErrors: networkStats.tx_errors ?? existing?.txErrors ?? null
        };

        groupedInterfaces.set(name, current);
    }

    return {
        interfaces: [...groupedInterfaces.values()],
        collectedAt: new Date().toISOString()
    };
}
