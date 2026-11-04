import { Router } from "express";
import { z } from "zod";
import { requireMember } from "../../lib/access.js";
import { badRequest, conflict, notFound } from "../../lib/http-error.js";
import { prisma, Prisma } from "../../lib/prisma.js";
import { requireAuth } from "../../middleware/auth.js";
import { findActiveBakery } from "../bakeries/bakeries.service.js";

const ReviewInput = z.object({
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().max(1000).optional(),
});

const ResponseInput = z.object({
  response: z.string().trim().min(1).max(1000),
});

export const bakeryReviewsRouter = Router();

bakeryReviewsRouter.get("/:bakeryId/reviews", async (req, res) => {
  const bakery = await findActiveBakery(req.params.bakeryId);
  const reviews = await prisma.bakeryReview.findMany({
    where: { bakeryId: bakery.id },
    select: {
      id: true,
      rating: true,
      body: true,
      response: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  res.json(reviews);
});

bakeryReviewsRouter.get("/:bakeryId/reviews/summary", async (req, res) => {
  const bakery = await findActiveBakery(req.params.bakeryId);
  const result = await prisma.bakeryReview.aggregate({
    where: { bakeryId: bakery.id },
    _avg: { rating: true },
    _count: { _all: true },
  });
  res.json({ averageRating: result._avg.rating, reviewCount: result._count._all });
});

bakeryReviewsRouter.post("/:bakeryId/reviews/:reviewId/response", requireAuth, requireMember(), async (req, res) => {
  const { response } = ResponseInput.parse(req.body);
  const review = await prisma.bakeryReview.findFirst({
    where: { id: req.params.reviewId, bakeryId: req.params.bakeryId },
    select: { id: true },
  });
  if (!review) throw notFound("Review");
  res.json(await prisma.bakeryReview.update({
    where: { id: review.id },
    data: { response },
    select: { id: true, rating: true, body: true, response: true, createdAt: true },
  }));
});

export const orderReviewsRouter = Router();
orderReviewsRouter.post("/:orderId/review", requireAuth, async (req, res) => {
  const { rating, body } = ReviewInput.parse(req.body);
  const order = await prisma.order.findUnique({ where: { id: req.params.orderId } });
  if (!order || order.customerId !== req.user!.id) throw notFound("Order");
  if (order.status !== "COMPLETED") throw badRequest("You can review an order after it is completed");
  if (await prisma.bakeryReview.findUnique({ where: { orderId: order.id }, select: { id: true } })) {
    throw conflict("You have already reviewed this order");
  }
  const review = await prisma.bakeryReview.create({
      data: { bakeryId: order.bakeryId, customerId: req.user!.id, orderId: order.id, rating, body },
      select: { id: true, rating: true, body: true, createdAt: true },
    }).catch((error: unknown) => {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw conflict("You have already reviewed this order");
      }
      throw error;
    });
  res.status(201).json(review);
});
