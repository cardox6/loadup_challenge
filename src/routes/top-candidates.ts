// src/routes/top-candidates.ts

import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { matchCandidates } from "../services/matching.js";
import { HttpError } from "../lib/httpError.js";

export default async function topCandidates(app: FastifyInstance) {
  app.get("/jobs/:id/top-candidates", async (req) => {
    const { id } = req.params as { id: string };
    const { branchId, limit = "5" } = req.query as { branchId?: string; limit?: string };
    if (!branchId) throw new HttpError(400, "BAD_REQUEST", "branchId is required");

    try {
      return await matchCandidates(prisma, {
        jobId: id,
        branchId,
        limit: Number(limit),
        negativeMarkingFraction: 0.25,
        recencyWindowDays: 30,
        recencyBoostPct: 10,
        locationBonusFixed: 5,
        locationBonusPctOfRaw: 0,
        cityEqualsBranch: false
      });
    } catch (e: any) {
      if (e?.message === "NOT_FOUND") throw new HttpError(404, "NOT_FOUND", "Job or Branch not found");
      if (e?.message === "DIFF_COMPANY") throw new HttpError(400, "BAD_REQUEST", "Job and Branch must belong to same company");
      if (e?.message === "NO_TEMPLATE") throw new HttpError(400, "BAD_REQUEST", "Job has no templateId configured");
      throw e;
    }
  });
}