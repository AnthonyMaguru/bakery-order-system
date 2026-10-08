import type { NextFunction, Request, Response } from "express";
import { env, isProduction } from "../config/env.js";
import { firebaseAuth } from "../lib/firebase.js";
import { forbidden, HttpError } from "../lib/http-error.js";
import { prisma, type Role } from "../lib/prisma.js";

interface Identity {
  uid: string;
  email?: string;
  name?: string;
  devRole?: Role;
}

async function identify<P>(req: Request<P>): Promise<Identity> {
  if (env.AUTH_DEV_BYPASS && !isProduction) {
    const devUser = req.header("x-dev-user");
    if (devUser) {
      return {
        uid: `dev:${devUser}`,
        name: devUser,
        devRole: req.header("x-dev-role") === "STAFF" ? "STAFF" : "CUSTOMER",
      };
    }
  }

  const token = req.header("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Missing bearer token");

  const auth = firebaseAuth();
  try {
    const decoded = await auth.verifyIdToken(token);
    return { uid: decoded.uid, email: decoded.email, name: decoded.name };
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

// Verifies the caller and attaches their User record as req.user, creating it on first sign-in.
// Both middlewares are generic so Express keeps the route's typed params (e.g. :id)
// in the handlers that follow them.
export async function requireAuth<P>(req: Request<P>, _res: Response, next: NextFunction) {
  const { uid, email, name, devRole } = await identify(req);
  req.user = await prisma.user.upsert({
    where: { firebaseUid: uid },
    update: devRole ? { role: devRole } : {},
    create: { firebaseUid: uid, email, name, role: devRole ?? "CUSTOMER" },
  });
  next();
}

export function requireStaff<P>(req: Request<P>, _res: Response, next: NextFunction) {
  if (req.user?.role !== "STAFF") throw forbidden();
  next();
}
