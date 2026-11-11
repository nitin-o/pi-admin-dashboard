import { defineConfig } from "vite";
import path from "node:path";

const backend = "http://127.0.0.1:3000";

export default defineConfig({
    root: path.resolve("client"),
    server: {
        host: "127.0.0.1",
        port: 5173,
        proxy: {
            "/api": backend,
            "/login": backend,
            "/css": backend,
            "/js/login.js": backend
        }
    },
    build: {
        outDir: path.resolve("dist"),
        emptyOutDir: true
    }
});
