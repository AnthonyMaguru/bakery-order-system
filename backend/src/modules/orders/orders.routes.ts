import { Router } from "express";
import { requireAuth, requireStaff } from "../../middleware/auth.js";
import {
  CreateCommentInput,
  CreateOrderInput,
  CreateQuotationInput,
  ListOrdersQuery,
  UpdatePaymentInput,
  UpdateStatusInput,
} from "./orders.schemas.js";
import * as orders from "./orders.service.js";

export const ordersRouter = Router();

ordersRouter.use(requireAuth);

ordersRouter.get("/", async (req, res) => {
  const { status } = ListOrdersQuery.parse(req.query);
  res.json(await orders.listOrders(req.user!, status));
});

ordersRouter.post("/", async (req, res) => {
  const input = CreateOrderInput.parse(req.body);
  res.status(201).json(await orders.createOrder(req.user!, input));
});

ordersRouter.get("/:id", async (req, res) => {
  res.json(await orders.getOrder(req.user!, req.params.id));
});

ordersRouter.patch("/:id/status", requireStaff, async (req, res) => {
  const { status } = UpdateStatusInput.parse(req.body);
  res.json(await orders.updateStatus(req.user!, req.params.id, status));
});

ordersRouter.post("/:id/quotations", requireStaff, async (req, res) => {
  const { amountUgx, note } = CreateQuotationInput.parse(req.body);
  res.status(201).json(await orders.addQuotation(req.user!, req.params.id, amountUgx, note));
});

ordersRouter.patch("/:id/payment", requireStaff, async (req, res) => {
  const payment = UpdatePaymentInput.parse(req.body);
  res.json(await orders.updatePayment(req.user!, req.params.id, payment));
});

ordersRouter.get("/:id/comments", async (req, res) => {
  const order = await orders.getOrder(req.user!, req.params.id);
  res.json(order.comments);
});

ordersRouter.post("/:id/comments", async (req, res) => {
  const { body } = CreateCommentInput.parse(req.body);
  res.status(201).json(await orders.addComment(req.user!, req.params.id, body));
});
