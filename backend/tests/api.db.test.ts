import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { addDays, dayKey } from "../src/lib/dates.js";
import { prisma } from "../src/lib/prisma.js";

// Full ordering flows against a real database. Needs a migrated and seeded database:
//   npx prisma migrate deploy && npm run db:seed && RUN_DB_TESTS=1 npm test
// CI does this with a PostgreSQL service. Uses the dev auth bypass, so AUTH_DEV_BYPASS must be true.

const app = createApp();
const api = request(app);
const run = Date.now().toString(36);

const customer = { "x-dev-user": `customer-${run}` };
const staff = { "x-dev-user": "dev-staff", "x-dev-role": "STAFF" };
const otherBakeryStaff = { "x-dev-user": `mama-${run}`, "x-dev-role": "STAFF", "x-dev-bakery": "mamas-oven" };

const TZ = "Africa/Kampala";
// A due time in the bakery's timezone, e.g. 2:00 pm on 2026-11-07 in Kampala.
const at = (day: string, time = "14:00") => `${day}T${time}:00+03:00`;

interface Day {
  date: string;
  status: string;
}

describe.skipIf(!process.env.RUN_DB_TESTS)("API with a database", () => {
  let bakeryId: string;
  let optionIds: Record<string, string>;
  let goldLeafId: string;
  let goldLeafStockId: string;
  let productId: string;
  let productPrice: number;
  let customDay: string;
  let readyMadeDay: string;
  let originalLimit: number;

  beforeAll(async () => {
    const bakery = await api.get("/api/bakeries/sweet-crumbs");
    expect(bakery.status).toBe(200);
    bakeryId = bakery.body.id;

    const builder = await api.get(`/api/bakeries/${bakeryId}/builder`);
    optionIds = Object.fromEntries(
      builder.body.flatMap((g: { options: { id: string; name: string }[] }) => g.options.map((o) => [o.name, o.id])),
    );

    const groups = await api.get(`/api/bakeries/${bakeryId}/option-groups`).set(staff);
    const gold = groups.body
      .flatMap((g: { options: { id: string; name: string; stockItemId: string }[] }) => g.options)
      .find((o: { name: string }) => o.name === "Edible gold leaf");
    goldLeafId = gold.id;
    goldLeafStockId = gold.stockItemId;

    const products = await api.get(`/api/bakeries/${bakeryId}/products?category=CAKE`);
    productId = products.body[0].id;
    productPrice = products.body[0].price;

    // Two open days, far enough out for both notice periods.
    const calendar = await api.get(`/api/bakeries/${bakeryId}/availability?days=60`);
    const open = (calendar.body as Day[]).filter((d) => d.status === "OPEN").map((d) => d.date);
    customDay = open[10]!;
    readyMadeDay = open[11]!;

    const settings = await api.get(`/api/bakeries/${bakeryId}/settings`).set(staff);
    originalLimit = settings.body.customCakesPerDay;
  });

  afterAll(async () => {
    await api.patch(`/api/bakeries/${bakeryId}`).set(staff).send({ customCakesPerDay: originalLimit });
    await api.patch(`/api/bakeries/${bakeryId}/stock/${goldLeafStockId}`).set(staff).send({ quantity: 0 });
    await prisma.$disconnect();
  });

  describe("finding a bakery", () => {
    it("lists bakeries that deliver to an area", async () => {
      const ntinda = await api.get("/api/bakeries?area=ntinda");
      expect(ntinda.body.map((b: { slug: string }) => b.slug).sort()).toEqual(["mamas-oven", "sweet-crumbs"]);
      const kyanja = await api.get("/api/bakeries?area=Kyanja");
      expect(kyanja.body.map((b: { slug: string }) => b.slug)).toEqual(["sweet-crumbs"]);
      expect(kyanja.body[0].cakesFrom).toBe(60000);
      expect(kyanja.body[0].nextCustomDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("finds a bakery's products by its slug, and 404s for unknown bakeries", async () => {
      expect((await api.get("/api/bakeries/sweet-crumbs/products")).body.length).toBeGreaterThan(0);
      expect((await api.get("/api/bakeries/no-such-bakery/products")).status).toBe(404);
      expect((await api.get("/api/bakeries/no-such-bakery/builder")).status).toBe(404);
    });

    it("keeps capacity rules private", async () => {
      const res = await api.get("/api/bakeries/sweet-crumbs");
      expect(res.body.customCakesPerDay).toBeUndefined();
      expect((await api.get(`/api/bakeries/${bakeryId}/settings`)).status).toBe(401);
    });

    it("hides builder options whose stock ran out", async () => {
      expect(optionIds["Pearls"]).toBeDefined();
      expect(optionIds["Edible gold leaf"]).toBeUndefined();
    });

    it("marks closed days in the calendar", async () => {
      const res = await api.get(`/api/bakeries/${bakeryId}/availability?days=14`);
      const sundays = (res.body as Day[]).filter((d) => new Date(`${d.date}T00:00:00Z`).getUTCDay() === 0);
      expect(sundays.every((d) => d.status === "CLOSED")).toBe(true);
    });
  });

  describe("a ready-made order", () => {
    let orderId: string;
    const clientRequestId = `ready-${run}`;

    it("is priced straight away and isn't saved twice when the app retries", async () => {
      const body = {
        bakeryId,
        clientRequestId,
        type: "STANDARD",
        dueDate: at(readyMadeDay),
        fulfilment: "DELIVERY",
        deliveryArea: "ntinda",
        deliveryAddress: "Plot 12, Ntinda",
        items: [{ productId, quantity: 1 }],
      };
      const first = await api.post("/api/orders").set(customer).send(body);
      expect(first.status).toBe(201);
      expect(first.body.total).toBe(productPrice + 5000);
      expect(first.body.deliveryArea).toBe("Ntinda");
      orderId = first.body.id;

      const retry = await api.post("/api/orders").set(customer).send(body);
      expect(retry.status).toBe(200);
      expect(retry.body.id).toBe(orderId);

      const changedRetry = await api.post("/api/orders").set(customer).send({ ...body, deliveryAddress: "A different address" });
      expect(changedRetry.status).toBe(409);
    });

    it("rejects areas the bakery doesn't deliver to", async () => {
      const res = await api.post("/api/orders").set(customer).send({
        bakeryId,
        type: "STANDARD",
        dueDate: at(readyMadeDay),
        fulfilment: "DELIVERY",
        deliveryArea: "Entebbe",
        deliveryAddress: "Somewhere",
        items: [{ productId }],
      });
      expect(res.status).toBe(400);
    });

    it("can be confirmed by staff but not by the customer", async () => {
      expect((await api.patch(`/api/orders/${orderId}/status`).set(customer).send({ status: "CONFIRMED" })).status).toBe(403);
      const res = await api.patch(`/api/orders/${orderId}/status`).set(staff).send({ status: "CONFIRMED" });
      expect(res.status).toBe(200);
      expect(res.body.status).toBe("CONFIRMED");
    });

    it("can't be cancelled by the customer once it is being made", async () => {
      await api.patch(`/api/orders/${orderId}/status`).set(staff).send({ status: "PREPARING" });
      expect((await api.post(`/api/orders/${orderId}/cancel`).set(customer).send({})).status).toBe(409);
      expect((await api.post(`/api/orders/${orderId}/cancel`).set(staff).send({})).status).toBe(400);
      const res = await api.post(`/api/orders/${orderId}/cancel`).set(staff).send({ reason: "Oven broke down" });
      expect(res.body.status).toBe("CANCELLED");
      expect(res.body.cancelledBy).toBe("BAKERY");
    });
  });

  describe("a custom order from the cake builder", () => {
    let orderId: string;
    const design = ["Round", "2 tiers", "2 kg", "Vanilla", "Blush pink", "Pearls", "Fresh flowers"];

    it("is saved with an estimate from the bakery's prices", async () => {
      const res = await api.post("/api/orders").set(customer).send({
        bakeryId,
        type: "CUSTOM",
        occasion: "Birthday",
        inscription: "Happy 5th Birthday Amara",
        budget: 120000,
        dueDate: at(customDay),
        fulfilment: "PICKUP",
        optionIds: design.map((name) => optionIds[name]),
      });
      expect(res.status).toBe(201);
      expect(res.body.estimate).toBe(165000);
      expect(res.body.total).toBeNull();
      expect(res.body.selections).toHaveLength(7);
      orderId = res.body.id;
    });

    it("refuses options that are out of stock or from the same single-choice group", async () => {
      const base = { bakeryId, type: "CUSTOM", dueDate: at(customDay), fulfilment: "PICKUP" };
      const gold = await api.post("/api/orders").set(customer).send({ ...base, optionIds: [...design.map((n) => optionIds[n]), goldLeafId] });
      expect(gold.status).toBe(400);
      const twoSizes = await api.post("/api/orders").set(customer).send({ ...base, optionIds: [optionIds["1 kg"], optionIds["2 kg"]] });
      expect(twoSizes.status).toBe(400);
    });

    it("needs the customer to accept a quote before it is confirmed", async () => {
      expect((await api.patch(`/api/orders/${orderId}/status`).set(staff).send({ status: "CONFIRMED" })).status).toBe(409);

      const first = await api.post(`/api/orders/${orderId}/quotations`).set(staff).send({ amount: 170000 });
      const second = await api.post(`/api/orders/${orderId}/quotations`).set(staff).send({ amount: 165000, note: "Delivery included" });
      expect(second.status).toBe(201);

      // Accepting the older quote fails, so a price change isn't missed.
      expect((await api.post(`/api/orders/${orderId}/accept-quote`).set(customer).send({ quotationId: first.body.id })).status).toBe(409);
      expect((await api.post(`/api/orders/${orderId}/accept-quote`).set(staff).send({ quotationId: second.body.id })).status).toBe(403);

      const accepted = await api.post(`/api/orders/${orderId}/accept-quote`).set(customer).send({ quotationId: second.body.id });
      expect(accepted.status).toBe(200);
      expect(accepted.body.status).toBe("CONFIRMED");
      expect(accepted.body.total).toBe(165000);
    });

    it("keeps a payment history and works out the payment status", async () => {
      const deposit = await api.post(`/api/orders/${orderId}/payments`).set(staff).send({ amount: 80000, method: "MOBILE_MONEY" });
      expect(deposit.body.paymentStatus).toBe("DEPOSIT_PAID");
      expect((await api.post(`/api/orders/${orderId}/payments`).set(staff).send({ amount: 100000, method: "CASH" })).status).toBe(400);

      const rest = await api.post(`/api/orders/${orderId}/payments`).set(staff).send({ amount: 85000, method: "CASH" });
      expect(rest.body.paymentStatus).toBe("PAID");
      expect(rest.body.amountPaid).toBe(165000);

      const corrected = await api.delete(`/api/orders/${orderId}/payments/${rest.body.payments[0].id}`).set(staff);
      expect(corrected.body.paymentStatus).toBe("DEPOSIT_PAID");
      expect(corrected.body.amountPaid).toBe(80000);
    });

    it("marks messages from the bakery", async () => {
      await api.post(`/api/orders/${orderId}/comments`).set(customer).send({ body: "Can the writing be gold?" });
      await api.post(`/api/orders/${orderId}/comments`).set(staff).send({ body: "Yes, it's included" });
      const res = await api.get(`/api/orders/${orderId}/comments`).set(customer);
      expect(res.body.map((c: { fromBakery: boolean }) => c.fromBakery)).toEqual([false, true]);
    });

    it("is invisible to another bakery's staff", async () => {
      expect((await api.get(`/api/orders/${orderId}`).set(otherBakeryStaff)).status).toBe(404);
      expect((await api.get(`/api/bakeries/${bakeryId}/orders`).set(otherBakeryStaff)).status).toBe(403);
    });

    it("shows up in the bakery's order list and search", async () => {
      const order = await api.get(`/api/orders/${orderId}`).set(customer);
      const list = await api.get(`/api/bakeries/${bakeryId}/orders?q=BK${order.body.number}`).set(staff);
      expect(list.body.map((o: { id: string }) => o.id)).toEqual([orderId]);
      const summary = await api.get(`/api/bakeries/${bakeryId}/orders/summary`).set(staff);
      expect(summary.body.counts.CONFIRMED).toBeGreaterThanOrEqual(1);
    });
  });

  describe("photo uploads", () => {
    // A real 1 by 1 pixel PNG.
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==", "base64");

    it("stores a photo and serves it back to any page", async () => {
      const res = await api.post("/api/uploads").set(customer).set("Content-Type", "image/png").send(png);
      expect(res.status).toBe(201);
      expect(res.body.url).toMatch(/\/api\/uploads\/[a-z0-9]+$/);

      const photo = await api.get(`/api/uploads/${res.body.id}`).buffer(true).parse((r, done) => {
        const chunks: Buffer[] = [];
        r.on("data", (c: Buffer) => chunks.push(c));
        r.on("end", () => done(null, Buffer.concat(chunks)));
      });
      expect(photo.status).toBe(200);
      expect(photo.headers["content-type"]).toBe("image/png");
      expect(photo.headers["cross-origin-resource-policy"]).toBe("cross-origin");
      expect(Buffer.compare(photo.body as Buffer, png)).toBe(0);
    });

    it("refuses files that aren't photos, are too big, or come from no one", async () => {
      const text = await api.post("/api/uploads").set(customer).set("Content-Type", "image/png").send(Buffer.from("not really a picture"));
      expect(text.status).toBe(415);
      const big = await api.post("/api/uploads").set(customer).set("Content-Type", "image/jpeg").send(Buffer.alloc(3 * 1024 * 1024, 0xff));
      expect(big.status).toBe(413);
      expect(big.body.error).toMatch(/2 MB/);
      expect((await api.post("/api/uploads").set("Content-Type", "image/png").send(png)).status).toBe(401);
      expect((await api.get("/api/uploads/missing")).status).toBe(404);
    });

    it("lets an order use the photo link", async () => {
      const upload = await api.post("/api/uploads").set(customer).set("Content-Type", "image/png").send(png);
      const order = await api.post("/api/orders").set(customer).send({
        bakeryId,
        type: "CUSTOM",
        dueDate: at(readyMadeDay),
        fulfilment: "PICKUP",
        notes: "Like the photo please",
        inspirationImageUrls: [upload.body.url],
        designImageUrl: upload.body.url,
      });
      expect(order.status).toBe(201);
      expect(order.body.images[0].url).toBe(upload.body.url);
    });
  });

  describe("bakery setup", () => {
    it("stops taking custom orders on a full day", async () => {
      const booked = (await api.get(`/api/bakeries/${bakeryId}/availability?from=${customDay}&days=1`)).body[0].booked;
      await api.patch(`/api/bakeries/${bakeryId}`).set(staff).send({ customCakesPerDay: booked });
      const res = await api.post("/api/orders").set(customer).send({
        bakeryId,
        type: "CUSTOM",
        dueDate: at(customDay),
        fulfilment: "PICKUP",
        notes: "Anything chocolate",
      });
      expect(res.status).toBe(409);
      expect(res.body.error).toMatch(/fully booked/);
    });

    it("shows an option again when its stock is restocked", async () => {
      await api.patch(`/api/bakeries/${bakeryId}/stock/${goldLeafStockId}`).set(staff).send({ quantity: 3 });
      const builder = await api.get(`/api/bakeries/${bakeryId}/builder`);
      const names = builder.body.flatMap((g: { options: { name: string }[] }) => g.options.map((o) => o.name));
      expect(names).toContain("Edible gold leaf");
    });

    it("lets only owners change settings, and keeps one payment method", async () => {
      expect((await api.patch(`/api/bakeries/${bakeryId}`).set(customer).send({ deliveryFee: 1 })).status).toBe(403);
      const res = await api.patch(`/api/bakeries/${bakeryId}`).set(staff).send({ acceptsCash: false, acceptsMobileMoney: false });
      expect(res.status).toBe(400);
    });

    it("won't accept due dates in the past", async () => {
      const yesterday = addDays(dayKey(new Date(), TZ), -1);
      const res = await api.post("/api/orders").set(customer).send({
        bakeryId,
        type: "STANDARD",
        dueDate: at(yesterday),
        fulfilment: "PICKUP",
        items: [{ productId }],
      });
      expect(res.status).toBe(409);
    });
  });
});
