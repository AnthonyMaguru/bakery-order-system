import { Router } from "express";
import { requireMember } from "../../lib/access.js";
import { requireAuth } from "../../middleware/auth.js";
import {
  AcceptQuoteInput,
  BakeryOrdersQuery,
  CancelInput,
  CreateCommentInput,
  CreateOrderInput,
  CreateQuotationInput,
  ListOrdersQuery,
  PaymentInput,
  UpdateStatusInput,
} from "./orders.schemas.js";
import * as orders from "./orders.service.js";

// Mounted at /api/orders.
export const ordersRouter = Router();

ordersRouter.use(requireAuth);

// The signed-in customer's own orders.
ordersRouter.get("/", async (req, res) => {
  const { status } = ListOrdersQuery.parse(req.query);
  res.json(await orders.listCustomerOrders(req.user!, status));
});

// 201 for a new order, 200 when the same clientRequestId was already saved.
ordersRouter.post("/", async (req, res) => {
  const { order, created } = await orders.createOrder(req.user!, CreateOrderInput.parse(req.body));
  res.status(created ? 201 : 200).json(order);
});

ordersRouter.get("/:id", async (req, res) => {
  res.json(await orders.getOrder(req.user!, req.params.id));
});

ordersRouter.patch("/:id/status", async (req, res) => {
  const { status } = UpdateStatusInput.parse(req.body);
  res.json(await orders.updateStatus(req.user!, req.params.id, status));
});

ordersRouter.post("/:id/quotations", async (req, res) => {
  const { amount, note } = CreateQuotationInput.parse(req.body);
  res.status(201).json(await orders.addQuotation(req.user!, req.params.id, amount, note));
});

ordersRouter.post("/:id/accept-quote", async (req, res) => {
  const { quotationId } = AcceptQuoteInput.parse(req.body);
  res.json(await orders.acceptQuote(req.user!, req.params.id, quotationId));
});

ordersRouter.post("/:id/cancel", async (req, res) => {
  const { reason } = CancelInput.parse(req.body);
  res.json(await orders.cancelOrder(req.user!, req.params.id, reason));
});

ordersRouter.post("/:id/payments", async (req, res) => {
  res.status(201).json(await orders.addPayment(req.user!, req.params.id, PaymentInput.parse(req.body)));
});

ordersRouter.delete("/:id/payments/:paymentId", async (req, res) => {
  res.json(await orders.deletePayment(req.user!, req.params.id, req.params.paymentId));
});

ordersRouter.get("/:id/comments", async (req, res) => {
  res.json(await orders.listComments(req.user!, req.params.id));
});

ordersRouter.post("/:id/comments", async (req, res) => {
  const { body } = CreateCommentInput.parse(req.body);
  res.status(201).json(await orders.addComment(req.user!, req.params.id, body));
});

// Mounted at /api/bakeries: a bakery's orders, for its staff.
export const bakeryOrdersRouter = Router();

bakeryOrdersRouter.get("/:bakeryId/orders", requireAuth, requireMember(), async (req, res) => {
  res.json(await orders.listBakeryOrders(req.params.bakeryId, BakeryOrdersQuery.parse(req.query)));
});

bakeryOrdersRouter.get("/:bakeryId/orders/summary", requireAuth, requireMember(), async (req, res) => {
  res.json(await orders.bakeryOrderSummary(req.params.bakeryId));
});
