// src/routes/matches.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parse } from "../lib/validate.js";
import { MatchRequest } from "../schemas/match.js";
import { HttpError } from "../lib/httpError.js";
import { matchCandidates } from "../services/matching.js";

export default async function matches(app: FastifyInstance) {
  app.post("/matches", async (req, reply) => {
    const { jobId, branchId, limit, filters, scoring } = parse(MatchRequest, req.body);

    try {
      const results = await matchCandidates(prisma, {
        jobId,
        branchId,
        limit,
        negativeMarkingFraction: scoring.negativeMarkingFraction,
        recencyWindowDays: scoring.recencyWindowDays,
        recencyBoostPct: scoring.recencyBoostPct,
        locationBonusFixed: scoring.locationBonusFixed,
        locationBonusPctOfRaw: scoring.locationBonusPctOfRaw,
        cityEqualsBranch: filters.cityEqualsBranch
      });
      return reply.send(results);
    } catch (e: any) {
      if (e?.message === "NOT_FOUND")     throw new HttpError(404, "NOT_FOUND", "Job or Branch not found");
      if (e?.message === "DIFF_COMPANY")  throw new HttpError(400, "BAD_REQUEST", "Job and Branch must belong to same company");
      if (e?.message === "NO_TEMPLATE")   throw new HttpError(400, "BAD_REQUEST", "Job has no templateId configured");
      throw e;
    }
  });
}