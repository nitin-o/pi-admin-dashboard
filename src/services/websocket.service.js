import { WebSocketServer, WebSocket } from "ws";
import jwt from "jsonwebtoken";
import { subscribeToLogs } from "./realtime.service.js";

export function attachWebSocket(server) {
    const wss = new WebSocketServer({
        noServer: true,
        maxPayload: 1024 * 1024
    });

    server.on("upgrade", (request, socket, head) => {
        const protocols = (
            request.headers["sec-websocket-protocol"] || ""
        )
            .split(",")
            .map(value => value.trim());

        const token = protocols[1];

        if (!protocols.includes("log-viewer") || !token) {
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
        }

        let user;

        try {
            user = jwt.verify(token, process.env.JWT_SECRET, {
                algorithms: ["HS256"]
            });
        } catch {
            socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
            socket.destroy();
            return;
        }

        wss.handleUpgrade(request, socket, head, ws => {
            ws.user = {
                id: user.sub,
                username: user.username,
                role: user.role
            };

            wss.emit("connection", ws, request);
        });
    });

    const unsubscribe = subscribeToLogs(entry => {
        const message = JSON.stringify({
            event: "new-log",
            data: entry
        });

        for (const client of wss.clients) {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        }
    });

    server.on("close", () => {
        unsubscribe();
        wss.close();
    });

    return wss;
}
