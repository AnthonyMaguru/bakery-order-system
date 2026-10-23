// Promotes an existing signed-in user to platform admin.
// Run once for a controlled operator account:
// npm run make-admin -- someone@example.com
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const [email] = process.argv.slice(2);
  if (!email) {
    console.error("Usage: npm run make-admin -- <email>");
    process.exitCode = 1;
    return;
  }

  const user = await prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" } },
    select: { id: true, email: true },
  });
  if (!user) {
    console.error(`No account uses ${email}. Sign in once, then run this again.`);
    process.exitCode = 1;
    return;
  }

  await prisma.user.update({ where: { id: user.id }, data: { role: "ADMIN" } });
  console.log(`${user.email ?? email} is now a platform admin.`);
}

main().finally(() => prisma.$disconnect());
