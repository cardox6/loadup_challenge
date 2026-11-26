// test/stats.test.ts

import { describe, it, expect } from "vitest";
import request from "supertest";

const BASE = process.env.API_URL ?? "http://localhost:3000";

describe("health & stats", () => {
  it("GET /health returns ok", async () => {
    const r = await request(BASE).get("/health");
    expect(r.status).toBe(200);
    expect(r.body).toEqual({ ok: true });
  });

  it("GET /stats returns counts", async () => {
    const r = await request(BASE).get("/stats");
    expect(r.status).toBe(200);
    expect(r.body).toHaveProperty("companies");
    expect(r.body).toHaveProperty("applicants");
  });
});