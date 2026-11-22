import express from "express";
import path from "path";
import fs from "fs";

import usersRoutes from "./routes/usersRoutes";
import suppliersRoutes from "./routes/suppliersRoutes";
import localOrdersRoutes from "./routes/localOrdersRoutes";
import localDeliveriesRoutes from "./routes/localDeliveriesRoutes";
import foreignOrdersRoutes from "./routes/foreignOrdersRoutes";
import foreignExpeditionsRoutes from "./routes/foreignExpeditionsRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import financialDocsRoutes from "./routes/financialDocsRoutes";
import { capexRoutes } from "./routes/capexRoutes";
import { dbExplorerRoutes } from "./routes/dbExplorerRoutes";
import { procurementTendersRoutes } from "./routes/procurementTendersRoutes";
import { stockRoutes } from "./routes/stockRoutes";
import { productionRoutes } from "./routes/productionRoutes";

export function createApp() {
  const app = express();

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Logo asset handler
  app.get("/logo.jpg", (req, res) => {
    const logoRoot = path.join(process.cwd(), "logo.jpg");
    const logoPublic = path.join(process.cwd(), "public", "logo.jpg");

    if (fs.existsSync(logoRoot)) {
      return res.sendFile(logoRoot);
    }
    if (fs.existsSync(logoPublic)) {
      return res.sendFile(logoPublic);
    }

    res.setHeader("Content-Type", "image/svg+xml");
    res.send(`
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 100" width="300" height="100">
        <rect width="100%" height="100%" fill="#ffffff" rx="8"/>
        <rect x="20" y="20" width="35" height="8" rx="2" fill="#72BF44"/>
        <rect x="20" y="32" width="35" height="8" rx="2" fill="#72BF44"/>
        <rect x="20" y="44" width="35" height="8" rx="2" fill="#72BF44"/>
        <text x="70" y="62" font-family="Arial, sans-serif" font-weight="900" font-size="42" fill="#1E40AF">sēnsus</text>
        <text x="70" y="80" font-family="Arial, sans-serif" font-weight="600" font-size="12" fill="#64748B" letter-spacing="1">SPA PROCUREMENT</text>
      </svg>
    `);
  });

  // Mount API Routers
  app.use("/api/auth", usersRoutes);
  app.use("/api/users", usersRoutes);
  app.use("/api/suppliers", suppliersRoutes);
  app.use("/api/local-orders", localOrdersRoutes);
  app.use("/api/local-deliveries", localDeliveriesRoutes);
  app.use("/api/foreign-orders", foreignOrdersRoutes);
  app.use("/api/foreign-expeditions", foreignExpeditionsRoutes);
  app.use("/api/capex", capexRoutes);
  app.use("/api/db-explorer", dbExplorerRoutes);
  app.use("/api", procurementTendersRoutes);
  app.use("/api", stockRoutes);
  app.use("/api", productionRoutes);
  app.use("/api", financialDocsRoutes);
  app.use("/api", dashboardRoutes);

  return app;
}

