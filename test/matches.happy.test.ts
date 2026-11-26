// test/matches.test.ts

import { describe, it, expect } from "vitest";
import request from "supertest";

const BASE = process.env.API_URL ?? "http://localhost:3000";

async function getJobAndOfferingBranch() {
  // only a job with an assessment can be ranked
  const jr = await request(BASE).get("/sample/job-branch");
  if (jr.status !== 200 || !jr.body?.job) throw new Error("No rankable job found");

  return { jobId: jr.body.job.id, branchId: jr.body.branch.id };
}

describe("matches (happy path)", () => {
  it("returns ranked candidates with explanations", async () => {
    const { jobId, branchId } = await getJobAndOfferingBranch();

    const r = await request(BASE)
      .post("/matches")
      .set("content-type", "application/json")
      .send({
        jobId,
        branchId,
        limit: 5,
        filters: { cityEqualsBranch: false },
        scoring: {
          negativeMarkingFraction: 0.25,
          recencyWindowDays: 30,
          recencyBoostPct: 10,
          locationBonusFixed: 5,
          locationBonusPctOfRaw: 0
        }
      });

    expect(r.status).toBe(200);
    expect(Array.isArray(r.body)).toBe(true);
    if (r.body.length) {
      const c = r.body[0];
      expect(c).toHaveProperty("applicantId");
      expect(typeof c.total).toBe("number");
      expect(c).toHaveProperty("explanation");
      expect(c.explanation).toHaveProperty("negativeMarkingFraction");
      // sanity check on deterministic fields presence
      expect(c).toHaveProperty("raw");
      expect(c).toHaveProperty("lastSubmissionAt");
    }
  });
});