// src/routes/top-candidates.ts

import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parse } from "../lib/validate.js";
import { TopCandidatesQuery } from "../schemas/match.js";
import { matchCandidates } from "../services/matching.js";

export default async function topCandidates(app: FastifyInstance) {
  app.get("/jobs/:id/top-candidates", async (req) => {
    const { id } = req.params as { id: string };
    const { branchId, limit } = parse(TopCandidatesQuery, req.query);

    return matchCandidates(prisma, {
      jobId: id,
      branchId,
      limit,
      negativeMarkingFraction: 0.25,
      recencyWindowDays: 30,
      recencyBoostPct: 10,
      locationBonusFixed: 5,
      locationBonusPctOfRaw: 0,
      cityEqualsBranch: false
    });
  });
}
