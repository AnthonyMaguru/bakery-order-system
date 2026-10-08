import { notFound } from "../../lib/http-error.js";
import { notifyUser } from "../../lib/notifications.js";
import { prisma, type OrderStatus, type User } from "../../lib/prisma.js";
import type { CreateOrderInput, UpdatePaymentInput } from "./orders.schemas.js";

const customerSummary = { select: { id: true, name: true, phone: true, email: true } } as const;

const orderDetail = {
  customer: customerSummary,
  items: { include: { product: { select: { id: true, name: true } } } },
  images: true,
  quotations: { orderBy: { createdAt: "desc" } },
  comments: {
    orderBy: { createdAt: "asc" },
    include: { author: { select: { id: true, name: true, role: true } } },
  },
} as const;

const isStaff = (user: User) => user.role === "STAFF";

export function listOrders(user: User, status?: OrderStatus) {
  return prisma.order.findMany({
    where: { status, customerId: isStaff(user) ? undefined : user.id },
    include: { customer: customerSummary },
    orderBy: { dueDate: "asc" },
  });
}

// Customers can only see their own orders; anyone else's look like they don't exist.
export async function getOrder(user: User, id: string) {
  const order = await prisma.order.findUnique({ where: { id }, include: orderDetail });
  if (!order || (!isStaff(user) && order.customerId !== user.id)) throw notFound("Order");
  return order;
}

export function createOrder(user: User, input: CreateOrderInput) {
  const { items, inspirationImageUrls, ...fields } = input;
  return prisma.order.create({
    data: {
      ...fields,
      customerId: user.id,
      items: { create: items },
      images: { create: inspirationImageUrls.map((url) => ({ url })) },
    },
    include: orderDetail,
  });
}

export async function updateStatus(user: User, id: string, status: OrderStatus) {
  await getOrder(user, id);
  const order = await prisma.order.update({ where: { id }, data: { status }, include: orderDetail });
  void notifyUser(order.customerId, {
    title: "Order update",
    body: `Your order is now ${status.toLowerCase()}.`,
    orderId: id,
  });
  return order;
}

export async function addQuotation(user: User, id: string, amountUgx: number, note?: string) {
  const order = await getOrder(user, id);
  const quotation = await prisma.quotation.create({
    data: { orderId: id, amountUgx, note, createdById: user.id },
  });
  void notifyUser(order.customerId, {
    title: "Your quotation is ready",
    body: `UGX ${amountUgx.toLocaleString("en-UG")}`,
    orderId: id,
  });
  return quotation;
}

export async function updatePayment(user: User, id: string, payment: UpdatePaymentInput) {
  await getOrder(user, id);
  return prisma.order.update({ where: { id }, data: payment, include: orderDetail });
}

export async function addComment(user: User, id: string, body: string) {
  const order = await getOrder(user, id);
  const comment = await prisma.orderComment.create({
    data: { orderId: id, authorId: user.id, body },
    include: { author: { select: { id: true, name: true, role: true } } },
  });
  if (isStaff(user)) {
    void notifyUser(order.customerId, { title: "New message from the bakery", body, orderId: id });
  }
  return comment;
}
