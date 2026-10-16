import type { OrderStatus, OrderType, PaymentStatus } from "../../lib/prisma.js";

// Pure rules for how an order moves through its life, kept apart from the database
// so they are easy to test.
//
//   STANDARD:      SUBMITTED → CONFIRMED (by staff) → PREPARING → READY → COMPLETED
//   CUSTOM, BULK:  SUBMITTED → QUOTED (staff send a quote) → CONFIRMED (customer accepts) → ...
//   Any open order can be CANCELLED; customers only until the bakery starts making it.

const label = (status: OrderStatus) => status.toLowerCase();

// The single step staff may take from each status with the status endpoint.
const NEXT_BY_STAFF: Partial<Record<OrderStatus, OrderStatus>> = {
  CONFIRMED: "PREPARING",
  PREPARING: "READY",
  READY: "COMPLETED",
};

// Why staff can't move the order to `to`, or null when they can.
export function staffStatusError(order: { status: OrderStatus; type: OrderType }, to: OrderStatus): string | null {
  if (order.status === to) return `The order is already ${label(to)}`;
  if (to === "CANCELLED") return "Use cancel instead, so the customer is told why";
  if (to === "QUOTED") return "Send a quote instead";
  if (order.status === "SUBMITTED" && to === "CONFIRMED") {
    return order.type === "STANDARD" ? null : "Custom and bulk orders are confirmed when the customer accepts your quote";
  }
  if (NEXT_BY_STAFF[order.status] === to) return null;
  return `An order that is ${label(order.status)} can't be moved to ${label(to)}`;
}

const FINISHED: OrderStatus[] = ["COMPLETED", "CANCELLED"];
const CUSTOMER_CAN_CANCEL: OrderStatus[] = ["SUBMITTED", "QUOTED", "CONFIRMED"];

export function cancelError(status: OrderStatus, by: "CUSTOMER" | "BAKERY"): string | null {
  if (FINISHED.includes(status)) return `The order is already ${label(status)}`;
  if (by === "CUSTOMER" && !CUSTOMER_CAN_CANCEL.includes(status)) {
    return "The bakery has already started on this order. Please call them to cancel";
  }
  return null;
}

export const canQuote = (status: OrderStatus) => status === "SUBMITTED" || status === "QUOTED";

export const canRecordPayment = (status: OrderStatus) =>
  status === "CONFIRMED" || status === "PREPARING" || status === "READY" || status === "COMPLETED";

export function paymentStatusFor(total: number | null, paid: number): PaymentStatus {
  if (paid <= 0) return "UNPAID";
  if (total !== null && paid >= total) return "PAID";
  return "DEPOSIT_PAID";
}

// Orders that may still need the bakery's attention before they are due.
export const OPEN_STATUSES: OrderStatus[] = ["SUBMITTED", "QUOTED", "CONFIRMED", "PREPARING"];
