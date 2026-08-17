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
});
