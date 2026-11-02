import express, { Router, type Request } from "express";
import { env } from "../../config/env.js";
import { HttpError, notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { detectImageType } from "./image-type.js";

// The app compresses photos to a few hundred KB, so 2 MB leaves plenty of room.
export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024;
const DAILY_LIMIT = 40;

// Where clients fetch an upload from. PUBLIC_API_URL wins when the API sits behind a proxy.
function uploadUrl(req: Request, id: string) {
  let host = req.get("host") || "localhost:4000";
  if (host.includes("10.0.2.2")) {
    host = `localhost:${process.env.PORT || 4000}`;
  }
  const base = env.PUBLIC_API_URL ?? `${req.protocol}://${host}/api`;
  return `${base.replace(/\/$/, "")}/uploads/${id}`;
}

// Mounted at /api/uploads.
export const uploadsRouter = Router();

// The body is the image itself (Content-Type image/jpeg, image/png or image/webp), not a form.
// Returns { id, url }. Put the url in inspirationImageUrls, designImageUrl or a product's imageUrl.
uploadsRouter.post("/", requireAuth, express.raw({ type: () => true, limit: MAX_UPLOAD_BYTES }), async (req, res) => {
  const data = req.body instanceof Buffer ? req.body : Buffer.alloc(0);
  if (data.length === 0) throw new HttpError(400, "Send the photo as the request body");
  const contentType = detectImageType(data);
  if (!contentType) throw new HttpError(415, "Only JPEG, PNG and WebP photos can be uploaded");

  const since = new Date(Date.now() - 24 * 3600_000);
  const today = await prisma.upload.count({ where: { ownerId: req.user!.id, createdAt: { gte: since } } });
  if (today >= DAILY_LIMIT) throw new HttpError(429, "You've uploaded a lot of photos today. Please try again tomorrow");

  const upload = await prisma.upload.create({
    data: { ownerId: req.user!.id, contentType, size: data.length, data },
    select: { id: true },
  });
  res.status(201).json({ id: upload.id, url: uploadUrl(req, upload.id) });
});

// Public, like a Firebase Storage download link: the id is long and random, and the
// photos are of cakes. Cached for a year because an upload never changes.
uploadsRouter.get("/:id", async (req, res) => {
  const upload = await prisma.upload.findUnique({ where: { id: req.params.id }, select: { data: true, contentType: true } });
  if (!upload) throw notFound("Photo");
  res.set({
    "Content-Type": upload.contentType,
    "Cache-Control": "public, max-age=31536000, immutable",
    // Helmet's default would stop the dashboard (another origin) from showing the image.
    "Cross-Origin-Resource-Policy": "cross-origin",
  });
  res.send(Buffer.from(upload.data));
});
