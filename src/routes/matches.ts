// src/routes/matches.ts
import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parse } from "../lib/validate.js";
import { MatchRequest } from "../schemas/match.js";
import { matchCandidates } from "../services/matching.js";
import { createRouteSchema } from "../lib/zodToJsonSchema.js";

const MatchRequestBody = {
  type: 'object',
  properties: {
    jobId: { type: 'string', description: 'Job ID to match candidates for' },
    branchId: { type: 'string', description: 'Branch ID to match candidates for' },
    limit: { type: 'integer', minimum: 1, maximum: 100, default: 25, description: 'Maximum number of candidates to return' },
    filters: {
      type: 'object',
      properties: {
        cityEqualsBranch: { type: 'boolean', default: false, description: 'Only match candidates from the same city as branch' }
      }
    },
    scoring: {
      type: 'object',
      properties: {
        negativeMarkingFraction: { type: 'number', minimum: 0, maximum: 1, default: 0.25, description: 'Penalty fraction for wrong answers (0-1)' },
        recencyWindowDays: { type: 'integer', minimum: 0, default: 30, description: 'Days within which submissions get recency boost' },
        recencyBoostPct: { type: 'number', minimum: 0, maximum: 100, default: 10, description: 'Percentage boost for recent submissions (0-100)' },
        locationBonusFixed: { type: 'number', minimum: 0, maximum: 100, default: 5, description: 'Fixed points bonus for location match' },
        locationBonusPctOfRaw: { type: 'number', minimum: 0, maximum: 100, default: 0, description: 'Percentage of raw score as location bonus (0-100)' }
      }
    }
  },
  required: ['jobId', 'branchId']
};

const MatchResponse = {
  type: 'array',
  items: {
    type: 'object',
    properties: {
      applicantId: { type: 'string' },
      total: { type: 'number' },
      raw: { type: 'number' },
      negativePenalty: { type: 'number' },
      recencyBoost: { type: 'number' },
      locationBonus: { type: 'number' },
      lastSubmissionAt: { type: 'string', format: 'date-time' },
      explanation: { type: 'object', additionalProperties: true }
    }
  }
};

export default async function matches(app: FastifyInstance) {
  app.post("/matches", {
    ...createRouteSchema({
      body: MatchRequestBody,
      tags: ['Matching'],
      summary: 'Match candidates to job position',
      description: 'Find and rank candidates for a specific job at a branch using configurable scoring algorithm',
      response: {
        200: MatchResponse
      }
    })
  }, async (req, reply) => {
    const { jobId, branchId, limit, filters, scoring } = parse(MatchRequest, req.body);

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
  });
}