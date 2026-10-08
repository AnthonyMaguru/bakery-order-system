import { z } from "zod";

// Keep these lists in sync with the enums in prisma/schema.prisma.
export const ORDER_STATUSES = ["SUBMITTED", "CONFIRMED", "PREPARING", "READY", "COMPLETED", "CANCELLED"] as const;
export const PAYMENT_STATUSES = ["UNPAID", "DEPOSIT_PAID", "PAID"] as const;
export const PAYMENT_METHODS = ["CASH", "MOBILE_MONEY"] as const;

const OrderItemInput = z.object({
  productId: z.string().min(1),
  quantity: z.number().int().positive().default(1),
});

// Most custom fields are optional: the "unsure customer" persona can leave design details to the bakery.
export const CreateOrderInput = z.object({
  type: z.enum(["STANDARD", "CUSTOM", "BULK"]),
  occasion: z.string().max(100).optional(),
  flavour: z.string().max(100).optional(),
  icing: z.string().max(100).optional(),
  size: z.string().max(50).optional(),
  colours: z.string().max(200).optional(),
  theme: z.string().max(200).optional(),
  inscription: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  budgetUgx: z.number().int().nonnegative().optional(),
  dueDate: z.coerce.date(),
  fulfilment: z.enum(["PICKUP", "DELIVERY"]),
  deliveryAddress: z.string().max(300).optional(),
  items: z.array(OrderItemInput).default([]),
  inspirationImageUrls: z.array(z.string().url()).max(5).default([]),
});
export type CreateOrderInput = z.infer<typeof CreateOrderInput>;

export const UpdateStatusInput = z.object({
  status: z.enum(ORDER_STATUSES),
});

export const CreateQuotationInput = z.object({
  amountUgx: z.number().int().positive(),
  note: z.string().max(1000).optional(),
});

export const UpdatePaymentInput = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES),
  paymentMethod: z.enum(PAYMENT_METHODS).optional(),
  amountPaidUgx: z.number().int().nonnegative().optional(),
});
export type UpdatePaymentInput = z.infer<typeof UpdatePaymentInput>;

export const CreateCommentInput = z.object({
  body: z.string().trim().min(1).max(2000),
});

export const ListOrdersQuery = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
});
