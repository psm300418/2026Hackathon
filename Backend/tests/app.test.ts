import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

describe("app", () => {
  it("returns health status", async () => {
    const response = await request(createApp()).get("/api/health");

    expect(response.status).toBe(200);
    expect(response.body.data.status).toBe("ok");
  });

  it("rejects protected profile route without token", async () => {
    const response = await request(createApp()).get("/api/profile/me");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects protected skin type submission without token", async () => {
    const response = await request(createApp())
      .post("/api/onboarding/skin-type/responses")
      .send({
        questionnaireVersion: "baumann_ko_rewrite_v1",
        responses: []
      });

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects protected user product route without token", async () => {
    const response = await request(createApp()).get("/api/user-products");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects protected product preset route without token", async () => {
    const response = await request(createApp()).get("/api/product-presets");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects protected product submission route without token", async () => {
    const response = await request(createApp()).post("/api/product-submissions");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("returns supported location options", async () => {
    const response = await request(createApp()).get("/api/profile/location-options");

    expect(response.status).toBe(200);
    expect(response.body.data.items.length).toBeGreaterThan(0);
  });

  it("rejects protected location route without token", async () => {
    const response = await request(createApp()).get("/api/profile/location");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects protected daily record route without token", async () => {
    const response = await request(createApp()).get("/api/daily-records");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects protected daily record trends route without token", async () => {
    const response = await request(createApp()).get("/api/daily-records/trends");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });

  it("rejects protected analysis route without token", async () => {
    const response = await request(createApp()).post("/api/analysis/run");

    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHORIZED");
  });
});
