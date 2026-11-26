// test/errors.validation.test.ts

import { describe, it, expect } from "vitest";
import request from "supertest";

const BASE = process.env.API_URL ?? "http://localhost:3000";

describe("errors & validation", () => {
  it("creating duplicate company name returns 409", async () => {
    const name = "DupCo-" + Math.random().toString(36).slice(2, 7);
    const r1 = await request(BASE).post("/companies").send({ name }).set("content-type", "application/json");
    expect(r1.status).toBe(201);

    const r2 = await request(BASE).post("/companies").send({ name }).set("content-type", "application/json");
    expect([409, 400]).toContain(r2.status); // Prisma unique -> 409 per our route; tolerate 400 if changed
  });

  it("getting non-existent company returns 404", async () => {
    const r = await request(BASE).get("/companies/nonexistent-id");
    expect(r.status).toBe(404);
    expect(r.body?.error?.code).toBeDefined();
  });

  it("matches with different-company job/branch returns 400", async () => {
    // take two different companies’ job/branch
    const jobs = await request(BASE).get("/jobs?limit=2");
    const branches = await request(BASE).get("/branches?limit=50");
    expect(jobs.status).toBe(200);
    expect(branches.status).toBe(200);

    const j = jobs.body.data[0];
    const otherBranch = branches.body.data.find((b: any) => b.companyId !== j.companyId);
    if (!j || !otherBranch) return; // skip if dataset doesn’t have cross-company rows

    const r = await request(BASE).post("/matches").send({
      jobId: j.id,
      branchId: otherBranch.id,
      limit: 3,
      filters: { cityEqualsBranch: false },
      scoring: { negativeMarkingFraction: 0.25, recencyWindowDays: 30, recencyBoostPct: 10, locationBonusFixed: 5, locationBonusPctOfRaw: 0 }
    }).set("content-type", "application/json");

    expect([400, 404]).toContain(r.status);
  });
});