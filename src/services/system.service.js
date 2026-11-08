import si from "systeminformation";

export async function getSystemStats() {
    const [cpu, memory, temperature, disk, time] = await Promise.all([
        si.currentLoad(),
        si.mem(),
        si.cpuTemperature(),
        si.fsSize(),
        si.time()
    ]);

    return {
        cpu: {
            usage: Number(cpu.currentLoad.toFixed(1)),
            model: (await si.cpu()).brand
        },
        memory: {
            total: memory.total,
            used: memory.used,
            free: memory.available,
            usage: Number(((memory.used / memory.total) * 100).toFixed(1))
        },
        temperature: temperature.main,
        disk: disk.map(item => ({
            filesystem: item.fs,
            mount: item.mount,
            total: item.size,
            used: item.used,
            usage: item.use
        })),
        uptime: time.uptime
    };
}
