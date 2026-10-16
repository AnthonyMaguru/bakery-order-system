// Makes a signed-in user the owner of a bakery, e.g. the first staff member once real
// Firebase sign-in is on: npm run make-owner -- someone@example.com sweet-crumbs
// The person must have signed in to the app or dashboard once, so their account exists.
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const [email, slug] = process.argv.slice(2);
  if (!email || !slug) {
    console.error("Usage: npm run make-owner -- <email> <bakery slug>");
    process.exitCode = 1;
    return;
  }
  const user = await prisma.user.findFirst({ where: { email: { equals: email, mode: "insensitive" } } });
  if (!user) {
    console.error(`No account uses ${email}. Sign in once with it, then run this again.`);
    process.exitCode = 1;
    return;
  }
  const bakery = await prisma.bakery.findUnique({ where: { slug } });
  if (!bakery) {
    const slugs = (await prisma.bakery.findMany({ select: { slug: true } })).map((b) => b.slug);
    console.error(`No bakery called ${slug}. Bakeries: ${slugs.join(", ") || "none yet"}`);
    process.exitCode = 1;
    return;
  }
  await prisma.bakeryMember.upsert({
    where: { bakeryId_userId: { bakeryId: bakery.id, userId: user.id } },
    update: { role: "OWNER" },
    create: { bakeryId: bakery.id, userId: user.id, role: "OWNER" },
  });
  console.log(`${email} is now an owner of ${bakery.name}.`);
}

main().finally(() => prisma.$disconnect());
