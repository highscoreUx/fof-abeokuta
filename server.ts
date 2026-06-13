import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { Server as SocketIOServer } from "socket.io";
import "dotenv/config";
import { recoverQuizTimers } from "./src/server/games/quizEngine";
import { ensurePlatformBootstrap } from "./src/server/bootstrap";
import { startEmailQueueConsumer } from "./src/server/email-worker";
import { setIO } from "./src/server/socket/io";
import { registerSocketHandlers } from "./src/server/socket/handlers";

const dev = process.env.NODE_ENV !== "production";
/** Always bind all interfaces in containers. Do not use OS HOSTNAME (Render sets it to the pod id). */
const bindHost = process.env.BIND_HOST ?? "0.0.0.0";
const port = parseInt(process.env.PORT ?? "3000", 10);

const app = next({ dev, hostname: bindHost, port });
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

  try {
    await recoverQuizTimers(io);
  } catch (error) {
    console.warn("[startup] Quiz timer recovery skipped:", error);
  }

  try {
    await startEmailQueueConsumer();
  } catch (error) {
    console.warn("[startup] Email queue consumer skipped:", error);
  }

  httpServer.listen(port, bindHost, () => {
    const publicUrl = process.env.NEXT_PUBLIC_APP_URL;
    console.log(`> FOF Event Platform listening on ${bindHost}:${port}`);
    if (publicUrl) console.log(`> Public URL: ${publicUrl}`);
  });
}).catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
