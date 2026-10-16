import { isMember } from "../../lib/access.js";
import { addDays, dateFromKey } from "../../lib/dates.js";
import { badRequest, conflict, forbidden, notFound } from "../../lib/http-error.js";
import { formatMoney } from "../../lib/money.js";
import { notifyBakery, notifyUser } from "../../lib/notifications.js";
import { prisma, Prisma, type OrderStatus, type User } from "../../lib/prisma.js";
import { assertDueDateAvailable } from "../bakeries/availability.service.js";
import { findActiveBakery, sameText } from "../bakeries/bakeries.service.js";
import { loadGroups } from "../builder/builder.service.js";
import { resolveSelections, type ResolvedSelection } from "../builder/selection.js";
import {
  canQuote,
  canRecordPayment,
  cancelError,
  OPEN_STATUSES,
  paymentStatusFor,
  staffStatusError,
} from "./order-rules.js";
import type { BakeryOrdersQuery, CreateOrderInput, PaymentInput } from "./orders.schemas.js";

const customerSummary = { select: { id: true, name: true, phone: true, email: true } } as const;

const orderDetail = {
  bakery: { select: { id: true, slug: true, name: true, phone: true, currency: true, mobileMoneyNumber: true } },
  customer: customerSummary,
  items: { include: { product: { select: { id: true, name: true, imageUrl: true } } } },
  selections: true,
  images: true,
  quotations: { orderBy: { createdAt: "desc" } },
  payments: { orderBy: { createdAt: "desc" }, include: { recordedBy: { select: { id: true, name: true } } } },
  comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { id: true, name: true } } } },
} as const;

const orderSummary = {
  bakery: { select: { id: true, slug: true, name: true } },
  customer: customerSummary,
  items: { include: { product: { select: { id: true, name: true } } } },
  quotations: { orderBy: { createdAt: "desc" }, take: 1 },
} as const;

const isUniqueClash = (err: unknown) => err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002";

// ---------------------------------------------------------------------------
// Reading
// ---------------------------------------------------------------------------

export function listCustomerOrders(user: User, status?: OrderStatus) {
  return prisma.order.findMany({
    where: { customerId: user.id, status },
    include: orderSummary,
    orderBy: { dueDate: "asc" },
  });
}

export function listBakeryOrders(bakeryId: string, { status, from, to, q }: BakeryOrdersQuery) {
  const number = q?.match(/^(?:BK)?(\d+)$/i)?.[1];
  return prisma.order.findMany({
    where: {
      bakeryId,
      status,
      // Widened by a day; staff filter on local days, and the dashboard shows exact times.
      dueDate: {
        gte: from ? dateFromKey(addDays(from, -1)) : undefined,
        lt: to ? dateFromKey(addDays(to, 2)) : undefined,
      },
      OR: q
        ? [
            { customer: { name: { contains: q, mode: "insensitive" } } },
            { customer: { phone: { contains: q } } },
            ...(number ? [{ number: Number(number) }] : []),
          ]
        : undefined,
    },
    include: orderSummary,
    orderBy: { dueDate: "asc" },
  });
}

// Counts for the dashboard's tabs, and orders due soon that nobody has touched.
export async function bakeryOrderSummary(bakeryId: string) {
  const now = Date.now();
  const [byStatus, needsAttention] = await Promise.all([
    prisma.order.groupBy({ by: ["status"], where: { bakeryId }, _count: true }),
    prisma.order.count({
      where: {
        bakeryId,
        status: { in: OPEN_STATUSES },
        dueDate: { lt: new Date(now + 48 * 3600_000) },
        updatedAt: { lt: new Date(now - 24 * 3600_000) },
      },
    }),
  ]);
  return { counts: Object.fromEntries(byStatus.map((s) => [s.status, s._count])), needsAttention };
}

// Customers see their own orders; bakery staff see their bakery's. Others get a 404,
// so order ids can't be probed.
async function loadForUser(user: User, id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderDetail });
  if (!order) throw notFound("Order");
  const isCustomer = order.customerId === user.id;
  const isStaff = await isMember(user, order.bakeryId);
  if (!isCustomer && !isStaff) throw notFound("Order");
  return { order, isCustomer, isStaff };
}

export async function getOrder(user: User, id: string) {
  return (await loadForUser(user, id)).order;
}

async function loadForStaff(user: User, id: string) {
  const loaded = await loadForUser(user, id);
  if (!loaded.isStaff) throw forbidden();
  return loaded.order;
}

// ---------------------------------------------------------------------------
// Placing an order
// ---------------------------------------------------------------------------

function findRetry(user: User, clientRequestId: string) {
  return prisma.order.findUnique({
    where: { customerId_clientRequestId: { customerId: user.id, clientRequestId } },
    include: orderDetail,
  });
}

export async function createOrder(user: User, input: CreateOrderInput) {
  // The app resends an order that was queued while offline; return the one already saved.
  if (input.clientRequestId) {
    const existing = await findRetry(user, input.clientRequestId);
    if (existing) return { order: existing, created: false };
  }

  const bakery = await findActiveBakery(input.bakeryId);

  let deliveryArea: string | null = null;
  let deliveryFee = 0;
  if (input.fulfilment === "PICKUP") {
    if (!bakery.pickupAvailable) throw badRequest(`${bakery.name} only delivers. Choose delivery instead`);
  } else {
    deliveryArea = bakery.deliveryAreas.find((a) => sameText(a, input.deliveryArea ?? "")) ?? null;
    if (!deliveryArea) throw badRequest(`${bakery.name} doesn't deliver to ${input.deliveryArea || "that area"}`);
    if (!input.deliveryAddress) throw badRequest("Add the delivery address");
    deliveryFee = bakery.deliveryFee;
  }

  const productIds = [...new Set(input.items.map((i) => i.productId))];
  const products = await prisma.product.findMany({ where: { id: { in: productIds }, bakeryId: bakery.id, isActive: true } });
  if (products.length !== productIds.length) throw badRequest("A product in this order is no longer available");
  const productById = new Map(products.map((p) => [p.id, p]));

  if (input.type === "STANDARD") {
    if (!input.items.length) throw badRequest("Add at least one product");
    if (input.optionIds.length) throw badRequest("Ready-made orders can't include builder choices. Send it as a custom order");
  }

  let selections: ResolvedSelection[] = [];
  let estimate: number | null = null;
  if (input.optionIds.length) {
    ({ selections, estimate } = resolveSelections(await loadGroups(bakery.id, "CAKE"), input.optionIds));
  }

  // Ready-made orders have a known price. Custom and bulk ones wait for a quote.
  const total =
    input.type === "STANDARD"
      ? input.items.reduce((sum, i) => sum + productById.get(i.productId)!.price * i.quantity, 0) + deliveryFee
      : null;

  const { bakeryId: _bakeryId, items, optionIds: _optionIds, inspirationImageUrls, deliveryArea: _area, ...fields } = input;
  try {
    const order = await prisma.$transaction(async (tx) => {
      await assertDueDateAvailable(tx, bakery, input.dueDate, {
        usesCapacity: input.type !== "STANDARD",
        leadTimeDays: Math.max(0, ...products.map((p) => p.leadTimeDays)),
      });
      return tx.order.create({
        data: {
          ...fields,
          deliveryAddress: input.fulfilment === "DELIVERY" ? input.deliveryAddress : null,
          bakeryId: bakery.id,
          customerId: user.id,
          currency: bakery.currency,
          deliveryArea,
          deliveryFee,
          estimate,
          total,
          items: {
            create: items.map((i) => ({ productId: i.productId, quantity: i.quantity, unitPrice: productById.get(i.productId)!.price })),
          },
          selections: { create: selections },
          images: { create: inspirationImageUrls.map((url) => ({ url })) },
        },
        include: orderDetail,
      });
    });
    void notifyBakery(bakery.id, {
      title: input.type === "STANDARD" ? "New order" : "New order to quote",
      body: `BK${order.number} from ${user.name ?? "a customer"}`,
      orderId: order.id,
    });
    return { order, created: true };
  } catch (err) {
    // Two copies of the same queued order arrived at once; the other one won.
    if (input.clientRequestId && isUniqueClash(err)) {
      const existing = await findRetry(user, input.clientRequestId);
      if (existing) return { order: existing, created: false };
    }
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Moving an order along
// ---------------------------------------------------------------------------

const statusMessages: Partial<Record<OrderStatus, (pickup: boolean) => string>> = {
  CONFIRMED: () => "The bakery confirmed your order.",
  PREPARING: () => "Your cake is being made.",
  READY: (pickup) => (pickup ? "Your cake is ready to collect." : "Your cake is ready and on its way soon."),
  COMPLETED: () => "Your order is complete. Enjoy!",
};

export async function updateStatus(user: User, id: string, status: OrderStatus) {
  const order = await loadForStaff(user, id);
  const error = staffStatusError(order, status);
  if (error) throw conflict(error);
  const updated = await prisma.order.update({ where: { id }, data: { status }, include: orderDetail });
  const message = statusMessages[status];
  if (message) {
    void notifyUser(order.customerId, { title: `Order BK${order.number}`, body: message(order.fulfilment === "PICKUP"), orderId: id });
  }
  return updated;
}

export async function addQuotation(user: User, id: string, amount: number, note?: string) {
  const order = await loadForStaff(user, id);
  if (!canQuote(order.status)) throw conflict("Quotes can only be sent before the order is confirmed");
  const [quotation] = await prisma.$transaction([
    prisma.quotation.create({ data: { orderId: id, amount, note, createdById: user.id } }),
    prisma.order.update({ where: { id }, data: { status: "QUOTED" } }),
  ]);
  void notifyUser(order.customerId, {
    title: "Your quote is ready",
    body: `${order.bakery.name}: ${formatMoney(amount, order.currency)}`,
    orderId: id,
  });
  return quotation;
}

export async function acceptQuote(user: User, id: string, quotationId: string) {
  const { order, isCustomer } = await loadForUser(user, id);
  if (!isCustomer) throw forbidden();
  if (order.status !== "QUOTED") throw conflict("There's no quote waiting for an answer on this order");
  const latest = order.quotations[0];
  if (!latest || latest.id !== quotationId) {
    throw conflict("The bakery has sent a newer quote. Please look at it before accepting");
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.quotation.update({ where: { id: latest.id }, data: { acceptedAt: new Date() } });
    return tx.order.update({
      where: { id },
      data: { status: "CONFIRMED", total: latest.amount, paymentStatus: paymentStatusFor(latest.amount, order.amountPaid) },
      include: orderDetail,
    });
  });
  void notifyBakery(order.bakeryId, {
    title: "Quote accepted",
    body: `BK${order.number}: ${formatMoney(latest.amount, order.currency)}`,
    orderId: id,
  });
  return updated;
}

// The customer cancels their own order; staff cancel any order of their bakery and must say why.
export async function cancelOrder(user: User, id: string, reason?: string) {
  const { order, isCustomer, isStaff } = await loadForUser(user, id);
  const by = isCustomer ? "CUSTOMER" : "BAKERY";
  if (by === "BAKERY" && !isStaff) throw forbidden();
  if (by === "BAKERY" && !reason) throw badRequest("Tell the customer why the order is cancelled");
  const error = cancelError(order.status, by);
  if (error) throw conflict(error);

  const updated = await prisma.order.update({
    where: { id },
    data: { status: "CANCELLED", cancelledBy: by, cancelReason: reason },
    include: orderDetail,
  });
  const notification = {
    title: `Order BK${order.number} cancelled`,
    body: reason ?? (by === "CUSTOMER" ? "The customer cancelled." : "The bakery cancelled."),
    orderId: id,
  };
  void (by === "CUSTOMER" ? notifyBakery(order.bakeryId, notification) : notifyUser(order.customerId, notification));
  return updated;
}

// ---------------------------------------------------------------------------
// Payments (records only; money is never taken through the system)
// ---------------------------------------------------------------------------

async function refreshPaymentTotals(tx: Prisma.TransactionClient, orderId: string, total: number | null) {
  const { _sum } = await tx.payment.aggregate({ where: { orderId }, _sum: { amount: true } });
  const amountPaid = _sum.amount ?? 0;
  return tx.order.update({
    where: { id: orderId },
    data: { amountPaid, paymentStatus: paymentStatusFor(total, amountPaid) },
    include: orderDetail,
  });
}

export async function addPayment(user: User, id: string, payment: PaymentInput) {
  const order = await loadForStaff(user, id);
  if (!canRecordPayment(order.status)) throw conflict("Payments can be recorded once the order is confirmed");
  if (order.total !== null && order.amountPaid + payment.amount > order.total) {
    throw badRequest(`That's more than the ${formatMoney(order.total - order.amountPaid, order.currency)} still owed`);
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.payment.create({ data: { ...payment, orderId: id, recordedById: user.id } });
    return refreshPaymentTotals(tx, id, order.total);
  });
  void notifyUser(order.customerId, {
    title: "Payment recorded",
    body: `${order.bakery.name} received ${formatMoney(payment.amount, order.currency)}.`,
    orderId: id,
  });
  return updated;
}

// For correcting a payment entered by mistake.
export async function deletePayment(user: User, id: string, paymentId: string) {
  const order = await loadForStaff(user, id);
  if (!order.payments.some((p) => p.id === paymentId)) throw notFound("Payment");
  return prisma.$transaction(async (tx) => {
    await tx.payment.delete({ where: { id: paymentId } });
    return refreshPaymentTotals(tx, id, order.total);
  });
}

// ---------------------------------------------------------------------------
// Messages
// ---------------------------------------------------------------------------

export async function listComments(user: User, id: string) {
  return (await loadForUser(user, id)).order.comments;
}

export async function addComment(user: User, id: string, body: string) {
  const { order, isCustomer } = await loadForUser(user, id);
  const fromBakery = !isCustomer;
  const comment = await prisma.orderComment.create({
    data: { orderId: id, authorId: user.id, body, fromBakery },
    include: { author: { select: { id: true, name: true } } },
  });
  if (fromBakery) {
    void notifyUser(order.customerId, { title: `Message from ${order.bakery.name}`, body, orderId: id });
  } else {
    void notifyBakery(order.bakeryId, { title: `Message about BK${order.number}`, body, orderId: id });
  }
  return comment;
}
