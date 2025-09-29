// test/matches.test.ts

import { describe, it, expect } from "vitest";
import request from "supertest";

const BASE = "http://localhost:3000";

async function getJobAndBranchFromSameCompany() {
  // get one job
  const jr = await request(BASE).get("/jobs?limit=1");
  if (jr.status !== 200 || !jr.body?.data?.length) throw new Error("No jobs found");
  const job = jr.body.data[0];

  // find a branch with same companyId
  const br = await request(BASE).get(`/branches?companyId=${job.companyId}&limit=1`);
  if (br.status !== 200 || !br.body?.data?.length) throw new Error("No branch found for job.companyId");
  const branch = br.body.data[0];

  return { jobId: job.id, branchId: branch.id };
}

describe("matches (happy path)", () => {
  it("returns ranked candidates with explanations", async () => {
    const { jobId, branchId } = await getJobAndBranchFromSameCompany();

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