import dotenv from "dotenv";
dotenv.config();

import path from "path";
import express from "express";
import { createServer as createViteServer } from "vite";
import { initSqlServer } from "./src/db";
import { createApp } from "./server/app";

const app = createApp();

async function startServer() {
  await initSqlServer();

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  let port = parseInt(process.env.PORT || "1555", 10);

  function listen(targetPort: number) {
    const server = app.listen(targetPort, "0.0.0.0", () => {
      console.log(`Procurement Order Tracker server listening on port ${targetPort}`);
    });

    server.on("error", (err: any) => {
      if (err.code === "EADDRINUSE") {
        console.warn(`[Port ${targetPort} in use, trying ${targetPort + 1}...]`);
        listen(targetPort + 1);
      } else {
        console.error("Server error:", err);
      }
    });
  }

  listen(port);
}

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception thrown:", err);
});

// Keep process active in background
setInterval(() => { }, 1000 * 60 * 60);

startServer();
