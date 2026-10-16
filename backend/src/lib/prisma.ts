import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "../config/env.js";
import { PrismaClient } from "../../generated/prisma/client.js";

export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});

export { Prisma } from "../../generated/prisma/client.js";
export type {
  Bakery,
  MemberRole,
  OrderStatus,
  OrderType,
  PaymentStatus,
  ProductCategory,
  Role,
  User,
} from "../../generated/prisma/client.js";
