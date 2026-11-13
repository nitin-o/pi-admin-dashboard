import si from "systeminformation";

export async function getSystemOverview() {
    const [
        cpu,
        load,
        memory,
        disks,
        os,
        time,
        temperature
    ] = await Promise.all([
        si.cpu(),
        si.currentLoad(),
        si.mem(),
        si.fsSize(),
        si.osInfo(),
        si.time(),
        si.cpuTemperature()
    ]);

    return {
        hostname: os.hostname,
        platform: os.platform,
        distro: os.distro,
        architecture: os.arch,
        kernel: os.kernel,
        uptimeSeconds: time.uptime,
        cpu: {
            manufacturer: cpu.manufacturer,
            brand: cpu.brand,
            cores: cpu.cores,
            physicalCores: cpu.physicalCores,
            usagePercent: Number(load.currentLoad.toFixed(2)),
            temperatureCelsius: temperature.main || null
        },
        memory: {
            totalBytes: memory.total,
            usedBytes: memory.used,
            freeBytes: memory.free,
            usagePercent: Number(
                ((memory.used / memory.total) * 100).toFixed(2)
            )
        },
        disks: disks.map(disk => ({
            filesystem: disk.fs,
            mount: disk.mount,
            totalBytes: disk.size,
            usedBytes: disk.used,
            usagePercent: disk.use
        })),
        collectedAt: new Date().toISOString()
    };
}
