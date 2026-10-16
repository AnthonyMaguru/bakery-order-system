import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config/env.js";
import { HttpError } from "../lib/http-error.js";

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    res.status(400).json({ error: "Validation failed", details: err.issues });
    return;
  }
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  // Errors from Express's body parsers, e.g. a photo over the size limit or broken JSON.
  if (err?.type === "entity.too.large") {
    res.status(413).json({ error: "That file is too big. Photos can be up to 2 MB" });
    return;
  }
  if (err?.expose && typeof err.status === "number" && err.status < 500) {
    res.status(err.status).json({ error: err.type === "entity.parse.failed" ? "The request body isn't valid JSON" : err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: isProduction ? "Internal server error" : String(err) });
};
