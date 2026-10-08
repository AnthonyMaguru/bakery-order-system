// Sample data for local development: `npm run db:seed`
import { prisma } from "../src/lib/prisma.js";

const products = [
  { name: "Vanilla sponge cake", category: "cake", basePriceUgx: 60000, description: "Classic vanilla, 1 kg" },
  { name: "Chocolate fudge cake", category: "cake", basePriceUgx: 75000, description: "Rich chocolate, 1 kg" },
  { name: "Red velvet cake", category: "cake", basePriceUgx: 85000, description: "With cream cheese icing, 1 kg" },
  { name: "Cupcakes (box of 6)", category: "add-on", basePriceUgx: 25000 },
  { name: "Number candles", category: "add-on", basePriceUgx: 5000 },
];

async function main() {
  if ((await prisma.product.count()) === 0) {
    await prisma.product.createMany({ data: products });
  }

  // Matches VITE_DEV_USER=dev-staff in dashboard/.env.example (dev auth bypass prefixes ids with "dev:").
  await prisma.user.upsert({
    where: { firebaseUid: "dev:dev-staff" },
    update: { role: "STAFF" },
    create: { firebaseUid: "dev:dev-staff", name: "Dev Staff", role: "STAFF" },
  });

  console.log("Seeded products and a dev staff user");
}

main().finally(() => prisma.$disconnect());
