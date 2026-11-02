import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("AI Cake Generator API", () => {
  const app = createApp();

  it("validates request body and requires prompt", async () => {
    const res = await request(app).post("/api/ai/generate-cake").send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/describe the cake/i);
  });

  it("generates and stores an artisanal cake concept", async () => {
    const res = await request(app).post("/api/ai/generate-cake").send({
      prompt: "Two-tier lavender cake with golden berries",
      occasion: "Birthday",
      flavour: "Vanilla Lavender",
    });

    expect(res.status).toBe(201);
    expect(res.body.id).toBeDefined();
    expect(res.body.url).toMatch(/\/uploads\//);
    expect(res.body.prompt).toContain("lavender");
    expect(res.body.isDemo).toBe(true); // Since no live OPENAI_API_KEY is configured in test env

    // Test that the image is actually served via /api/uploads/:id
    const imageRes = await request(app).get(`/api/uploads/${res.body.id}`);
    expect(imageRes.status).toBe(200);
    expect(imageRes.header["content-type"]).toMatch(/image\/(jpeg|png)/);
    expect(Number(imageRes.header["content-length"])).toBeGreaterThan(1000);
  });
});
