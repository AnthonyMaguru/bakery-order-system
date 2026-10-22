import type { NextFunction, Request, Response } from "express";
import { env, isProduction } from "../config/env.js";
import { firebaseAuth } from "../lib/firebase.js";
import { HttpError } from "../lib/http-error.js";
import { prisma, type User } from "../lib/prisma.js";

interface Identity {
  uid: string;
  email?: string;
  name?: string;
  dev?: { role: "CUSTOMER" | "STAFF" | "ADMIN"; bakerySlug: string };
}

// Seeded by prisma/seed.ts; dev staff join it unless `x-dev-bakery` names another bakery.
const DEFAULT_DEV_BAKERY = "sweet-crumbs";

function hasCredentials<P>(req: Request<P>) {
  return Boolean(req.header("authorization") || (env.AUTH_DEV_BYPASS && !isProduction && req.header("x-dev-user")));
}

async function identify<P>(req: Request<P>): Promise<Identity> {
  if (env.AUTH_DEV_BYPASS && !isProduction) {
    const devUser = req.header("x-dev-user");
    if (devUser) {
      const role = req.header("x-dev-role");
      return {
        uid: `dev:${devUser}`,
        name: devUser,
        dev: {
          role: role === "STAFF" || role === "ADMIN" ? role : "CUSTOMER",
          bakerySlug: req.header("x-dev-bakery") ?? DEFAULT_DEV_BAKERY,
        },
      };
    }
  }

  const token = req.header("authorization")?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new HttpError(401, "Missing bearer token");

  const auth = firebaseAuth();
  try {
    const decoded = await auth.verifyIdToken(token, isProduction);
    return { uid: decoded.uid, email: decoded.email, name: decoded.name };
  } catch {
    throw new HttpError(401, "Invalid or expired token");
  }
}

async function loadUser({ uid, email, name, dev }: Identity): Promise<User> {
  const role = dev?.role === "ADMIN" ? "ADMIN" : "CUSTOMER";
  const user = await prisma.user.upsert({
    where: { firebaseUid: uid },
    update: dev ? { role } : {},
    create: { firebaseUid: uid, email, name, role },
  });
  // Dev staff are made owners of the bakery they name, so every dashboard screen works locally.
  if (dev?.role === "STAFF") {
    const bakery = await prisma.bakery.findUnique({ where: { slug: dev.bakerySlug }, select: { id: true } });
    if (bakery) {
      await prisma.bakeryMember.upsert({
        where: { bakeryId_userId: { bakeryId: bakery.id, userId: user.id } },
        update: {},
        create: { bakeryId: bakery.id, userId: user.id, role: "OWNER" },
      });
    }
  }
  return user;
}

// Verifies the caller and attaches their User record as req.user, creating it on first sign-in.
// Generic so Express keeps the route's typed params (e.g. :id) in the handlers that follow.
export async function requireAuth<P>(req: Request<P>, _res: Response, next: NextFunction) {
  req.user = await loadUser(await identify(req));
  next();
}

// For public routes that show more to signed-in staff. Bad credentials still fail.
export async function optionalAuth<P>(req: Request<P>, _res: Response, next: NextFunction) {
  if (hasCredentials(req)) req.user = await loadUser(await identify(req));
  next();
}
