import si from "systeminformation";

export async function getNetworkStats() {
    const interfaces = await si.networkInterfaces();

    const activeInterfaces = interfaces
        .filter(item => !item.internal && item.operstate === "up")
        .map(item => ({
            name: item.iface,
            type: item.type,
            ip4: item.ip4,
            ip6: item.ip6,
            status: item.operstate,
            speed: item.speed
        }));

    const networkTraffic = await Promise.all(
        activeInterfaces.map(async item => {
            try {
                const stats = await si.networkStats(item.name);
                const current = Array.isArray(stats) ? stats[0] : stats;

                return {
                    name: item.name,
                    download: current?.rx_sec ?? 0,
                    upload: current?.tx_sec ?? 0
                };
            } catch {
                return {
                    name: item.name,
                    download: 0,
                    upload: 0
                };
            }
        })
    );

    const tailscaleInterfaces = activeInterfaces.filter(item =>
        item.name.toLowerCase().includes("tailscale")
    );

    let internet = false;

    try {
        const result = await si.inetChecksite("https://www.google.com");
        internet = result.ok === true;
    } catch {
        internet = false;
    }

    return {
        internet,
        interfaces: activeInterfaces,
        traffic: networkTraffic,
        tailscale: {
            detected: tailscaleInterfaces.length > 0,
            interfaces: tailscaleInterfaces.map(item => item.name)
        }
    };
}
