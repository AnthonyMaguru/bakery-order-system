import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

// These tests don't touch the database. Add DB-backed tests once the schema settles.
const app = createApp();

describe("API", () => {
  it("reports healthy", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: "ok" });
  });

  it("rejects order requests without credentials", async () => {
    const res = await request(app).get("/api/orders");
    expect(res.status).toBe(401);
  });

  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
  });
});
