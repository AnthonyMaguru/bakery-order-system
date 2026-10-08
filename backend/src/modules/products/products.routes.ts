import { Router } from "express";
import { z } from "zod";
import { notFound } from "../../lib/http-error.js";
import { prisma } from "../../lib/prisma.js";
import { requireAuth, requireStaff } from "../../middleware/auth.js";

const ProductInput = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(1000).optional(),
  category: z.string().min(1).max(50),
  basePriceUgx: z.number().int().nonnegative().optional(),
  imageUrl: z.string().url().optional(),
  isActive: z.boolean().optional(),
});

export const productsRouter = Router();

// Public so the app can show the catalogue before sign-in.
productsRouter.get("/", async (_req, res) => {
  res.json(await prisma.product.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }));
});

productsRouter.post("/", requireAuth, requireStaff, async (req, res) => {
  const data = ProductInput.parse(req.body);
  res.status(201).json(await prisma.product.create({ data }));
});

productsRouter.patch("/:id", requireAuth, requireStaff, async (req, res) => {
  const data = ProductInput.partial().parse(req.body);
  const existing = await prisma.product.findUnique({ where: { id: req.params.id } });
  if (!existing) throw notFound("Product");
  res.json(await prisma.product.update({ where: { id: req.params.id }, data }));
});
