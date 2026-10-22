import request from "supertest";
import { describe, expect, it } from "vitest";
import { parseEnv } from "../src/config/env.js";
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

  it("rejects unauthenticated access to bakery applications", async () => {
    const res = await request(app).get("/api/bakery-applications");
    expect(res.status).toBe(401);
  });

  it("returns JSON 404 for unknown routes", async () => {
    const res = await request(app).get("/api/nope");
    expect(res.status).toBe(404);
  });

  it("rejects dev auth bypass in production", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        PORT: "4000",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        CORS_ORIGINS: "http://localhost:5173",
        AUTH_DEV_BYPASS: "true",
      } as NodeJS.ProcessEnv),
    ).toThrow(/AUTH_DEV_BYPASS.*production/i);
  });

  it("rejects unsafe production origins", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        PORT: "4000",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        CORS_ORIGINS: "http://dashboard.example.com",
        PUBLIC_API_URL: "https://api.example.com/api",
        AUTH_DEV_BYPASS: "false",
      } as NodeJS.ProcessEnv),
    ).toThrow(/CORS_ORIGINS.*HTTPS/i);
  });

  it("requires a public HTTPS API URL in production", () => {
    expect(() =>
      parseEnv({
        NODE_ENV: "production",
        PORT: "4000",
        DATABASE_URL: "postgresql://user:pass@localhost:5432/db",
        CORS_ORIGINS: "https://dashboard.example.com",
        AUTH_DEV_BYPASS: "false",
      } as NodeJS.ProcessEnv),
    ).toThrow(/PUBLIC_API_URL.*HTTPS/i);
  });
});
