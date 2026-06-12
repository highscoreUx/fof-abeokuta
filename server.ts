import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import "dotenv/config";
import { ensurePlatformBootstrap } from "./src/server/bootstrap";
import { setIO } from "./src/server/socket/io";
import { registerSocketHandlers } from "./src/server/socket/handlers";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME ?? "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(async () => {
  try {
    await ensurePlatformBootstrap();
  } catch (error) {
    console.error("[bootstrap] Failed to initialize platform data:", error);
    process.exit(1);
  }

  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url ?? "", true);
    handle(req, res, parsedUrl);
  });

  const io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.NEXT_PUBLIC_APP_URL ?? `http://localhost:${port}`,
      methods: ["GET", "POST"],
      credentials: true,
    },
    path: "/socket.io",
  });

  setIO(io);
  registerSocketHandlers(io);

  httpServer.listen(port, hostname, () => {
    console.log(`> FOF Event Platform ready on http://${hostname}:${port}`);
  });
}).catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
