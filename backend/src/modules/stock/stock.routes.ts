import { Router } from "express";
import { z } from "zod";
import { requireMember } from "../../lib/access.js";
import { conflict, notFound } from "../../lib/http-error.js";
import { prisma, Prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { stockLevel } from "./stock-level.js";

// No defaults here, so PATCH only changes what it is sent.
const StockFields = z.object({
  name: z.string().trim().min(1).max(80),
  unit: z.string().trim().min(1).max(20),
  quantity: z.number().nonnegative(),
  lowAt: z.number().nonnegative().nullable(),
});
const StockInput = StockFields.extend({
  quantity: StockFields.shape.quantity.default(0),
  lowAt: StockFields.shape.lowAt.optional(),
});
const StockUpdate = StockFields.partial();

const withLinks = { options: { select: { id: true, name: true, isActive: true } } } as const;

type StockRow = Prisma.StockItemGetPayload<{ include: typeof withLinks }>;
const present = (item: StockRow) => ({ ...item, level: stockLevel(item) });

function duplicateName(err: unknown): never {
  if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
    throw conflict("You already have a stock item with that name");
  }
  throw err;
}

// Mounted at /api/bakeries. Stock is private to bakery staff.
export const stockRouter = Router();

stockRouter.use("/:bakeryId/stock", requireAuth, requireMember());

stockRouter.get("/:bakeryId/stock", async (req, res) => {
  const items = await prisma.stockItem.findMany({
    where: { bakeryId: req.params.bakeryId },
    orderBy: { name: "asc" },
    include: withLinks,
  });
  res.json(items.map(present));
});

stockRouter.post("/:bakeryId/stock", async (req, res) => {
  const data = StockInput.parse(req.body);
  const item = await prisma.stockItem
    .create({ data: { ...data, bakeryId: req.params.bakeryId }, include: withLinks })
    .catch(duplicateName);
  res.status(201).json(present(item));
});

stockRouter.patch("/:bakeryId/stock/:itemId", async (req, res) => {
  const data = StockUpdate.parse(req.body);
  const existing = await prisma.stockItem.findFirst({ where: { id: req.params.itemId, bakeryId: req.params.bakeryId } });
  if (!existing) throw notFound("Stock item");
  const item = await prisma.stockItem
    .update({ where: { id: existing.id }, data, include: withLinks })
    .catch(duplicateName);
  res.json(present(item));
});

// Linked options stay, just no longer tied to stock.
stockRouter.delete("/:bakeryId/stock/:itemId", async (req, res) => {
  const existing = await prisma.stockItem.findFirst({ where: { id: req.params.itemId, bakeryId: req.params.bakeryId } });
  if (!existing) throw notFound("Stock item");
  await prisma.stockItem.delete({ where: { id: existing.id } });
  res.status(204).end();
});
