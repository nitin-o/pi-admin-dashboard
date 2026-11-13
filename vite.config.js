import { defineConfig } from "vite";
import path from "node:path";

const backend = "http://127.0.0.1:3000";

export default defineConfig({
    root: path.resolve("client"),

    server: {
        host: "127.0.0.1",
        port: 5173,
        strictPort: true,

        proxy: {
            "/api": {
                target: backend,
                changeOrigin: true
            },

            "/ws": {
                target: "ws://127.0.0.1:3000",
                ws: true
            }
        }
    },

    build: {
        outDir: path.resolve("dist"),
        emptyOutDir: true
    }
});
