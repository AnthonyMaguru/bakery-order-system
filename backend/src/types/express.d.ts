import type { User } from "../lib/prisma.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

export {};
