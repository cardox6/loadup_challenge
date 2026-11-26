// src/schemas/match.ts

import { z } from 'zod';

export const MatchRequest = z.object({
    jobId: z.string().min(1, 'Job ID is required'),
    branchId: z.string().min(1, 'Branch ID is required'),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    filters: z.object({
        cityEqualsBranch: z.boolean().default(false)
    }).default({ cityEqualsBranch: false }),
    scoring: z.object({
        negativeMarkingFraction: z.number().min(0).max(1).default(0.25),
        recencyWindowDays: z.number().int().min(0).default(30),
        recencyBoostPct: z.number().min(0).max(100).default(10),
        locationBonusFixed: z.number().min(0).max(100).default(5),
        locationBonusPctOfRaw: z.number().min(0).max(100).default(0)
    }).default({
        negativeMarkingFraction: 0.25,
        recencyWindowDays: 30,
        recencyBoostPct: 10,
        locationBonusFixed: 5,
        locationBonusPctOfRaw: 0
    })
});
export type MatchRequest = z.infer<typeof MatchRequest>;

export const TopCandidatesQuery = z.object({
    branchId: z.string({ error: 'branchId is required' }).min(1, 'branchId is required'),
    limit: z.coerce.number().int().min(1).max(100).default(5)
});
export type TopCandidatesQuery = z.infer<typeof TopCandidatesQuery>;