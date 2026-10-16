import cors from "cors";
import express from "express";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/error-handler.js";
import { bakeriesRouter } from "./modules/bakeries/bakeries.routes.js";
import { builderRouter } from "./modules/builder/builder.routes.js";
import { bakeryOrdersRouter, ordersRouter } from "./modules/orders/orders.routes.js";
import { productsRouter } from "./modules/products/products.routes.js";
import { stockRouter } from "./modules/stock/stock.routes.js";
import { uploadsRouter } from "./modules/uploads/uploads.routes.js";
import { usersRouter } from "./modules/users/users.routes.js";
import { bakeryApplicationsRouter } from "./modules/bakery-applications/bakery-applications.routes.js";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGINS.split(",").map((o) => o.trim()) }));
  app.use(express.json({ limit: "1mb" }));
  if (env.NODE_ENV !== "test") app.use(morgan("dev"));

  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/users", usersRouter);
  app.use("/api/bakery-applications", bakeryApplicationsRouter);
  app.use("/api/orders", ordersRouter);
  app.use("/api/uploads", uploadsRouter);
  // Everything that belongs to one bakery lives under /api/bakeries/:bakeryId.
  app.use("/api/bakeries", productsRouter, builderRouter, stockRouter, bakeryOrdersRouter, bakeriesRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.use(errorHandler);

  return app;
}
