import type { NextFunction, Request, Response } from "express";
import { forbidden, notFound } from "./http-error.js";
import { prisma, type MemberRole, type User } from "./prisma.js";

// Platform admins can act as staff of any bakery.
export async function isMember(user: User | undefined, bakeryId: string, roles?: MemberRole[]) {
  if (!user) return false;
  if (user.role === "ADMIN") return true;
  const member = await prisma.bakeryMember.findUnique({
    where: { bakeryId_userId: { bakeryId, userId: user.id } },
    select: { role: true },
  });
  return Boolean(member && (!roles || roles.includes(member.role)));
}

export async function assertMember(user: User | undefined, bakeryId: string, roles?: MemberRole[]) {
  if (!(await isMember(user, bakeryId, roles))) throw forbidden();
}

// Route guard for /bakeries/:bakeryId/... staff endpoints. Use after requireAuth.
export function requireMember(...roles: MemberRole[]) {
  return async <P extends { bakeryId: string }>(req: Request<P>, _res: Response, next: NextFunction) => {
    const bakery = await prisma.bakery.findUnique({ where: { id: req.params.bakeryId }, select: { id: true } });
    if (!bakery) throw notFound("Bakery");
    await assertMember(req.user, bakery.id, roles.length ? roles : undefined);
    next();
  };
}
