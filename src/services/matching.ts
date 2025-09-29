// src/services/matching.ts

import type { PrismaClient } from "../generated/prisma/index.js";

export type MatchParams = {
  jobId: string;
  branchId: string;
  limit: number;
  negativeMarkingFraction: number;
  recencyWindowDays: number;
  recencyBoostPct: number;
  locationBonusFixed: number;
  locationBonusPctOfRaw: number;
  cityEqualsBranch?: boolean;
};

export async function matchCandidates(prisma: PrismaClient, p: MatchParams) {
  const neg = Math.max(0, Math.min(1, p.negativeMarkingFraction));
  const recencyDays = Math.max(0, p.recencyWindowDays);
  const recencyPct = Math.max(0, Math.min(100, p.recencyBoostPct));
  const locFixed = Math.max(0, p.locationBonusFixed);
  const locPct = Math.max(0, Math.min(100, p.locationBonusPctOfRaw));

  const job = await prisma.job.findUnique({ where: { id: p.jobId }, select: { templateId: true, companyId: true } });
  const branch = await prisma.branch.findUnique({ where: { id: p.branchId }, select: { city: true, companyId: true } });
  if (!job || !branch) throw new Error("NOT_FOUND");
  if (job.companyId !== branch.companyId) throw new Error("DIFF_COMPANY");
  if (!job.templateId) throw new Error("NO_TEMPLATE");

  const params: any[] = [
    p.branchId,
    job.templateId,
    neg,
    recencyDays,
    recencyPct,
    locFixed,
    locPct
  ];
  const whereCity = p.cityEqualsBranch ? "WHERE a.city = $8" : "";
  if (p.cityEqualsBranch) params.push(branch.city);
  params.push(p.limit);

  const sql = `
    WITH branch_ctx AS (
      SELECT b."id" AS branch_id, b.city AS branch_city
      FROM "Branch" b WHERE b."id" = $1
    ),
    latest_submission AS (
      SELECT s."id", s."applicantId", s."templateId", s."submittedAt",
             ROW_NUMBER() OVER (PARTITION BY s."applicantId" ORDER BY s."submittedAt" DESC, s."id" DESC) AS rn
      FROM "Submission" s WHERE s."templateId" = $2
    ),
    chosen_submissions AS (
      SELECT ls."id", ls."applicantId", ls."submittedAt"
      FROM latest_submission ls WHERE ls.rn = 1
    ),
    agg AS (
      SELECT
        cs."applicantId",
        cs."submittedAt" AS last_submission_at,
        SUM(CASE WHEN sa."isCorrect" THEN sa."itemWeight" ELSE 0 END)::numeric AS correct_weight,
        SUM(CASE WHEN NOT sa."isCorrect" THEN sa."itemWeight" ELSE 0 END)::numeric AS wrong_weight
      FROM chosen_submissions cs
      JOIN "SubmissionAnswer" sa ON sa."submissionId" = cs."id"
      GROUP BY cs."applicantId", cs."submittedAt"
    ),
    base_scores AS (
      SELECT
        a."id" AS applicant_id,
        agg.last_submission_at,
        agg.correct_weight,
        agg.wrong_weight,
        (agg.correct_weight - $3 * agg.wrong_weight) AS raw_score,
        CASE WHEN agg.last_submission_at >= (NOW() - ($4 || ' days')::interval)
             THEN (agg.correct_weight - $3 * agg.wrong_weight) * ($5 / 100.0)
             ELSE 0 END AS recency_boost,
        CASE WHEN a.city IS NOT NULL AND a.city = bc.branch_city
             THEN $6 + ((agg.correct_weight - $3 * agg.wrong_weight) * ($7 / 100.0))
             ELSE 0 END AS location_bonus,
        (a.city IS NOT NULL AND a.city = bc.branch_city) AS location_matched
      FROM agg
      JOIN "Applicant" a ON a."id" = agg."applicantId"
      JOIN branch_ctx bc ON TRUE
      ${whereCity}
    ),
    final_scores AS (
      SELECT
        applicant_id, last_submission_at, correct_weight, wrong_weight,
        raw_score, recency_boost, location_bonus,
        (raw_score + recency_boost + location_bonus) AS total
      FROM base_scores
    )
    SELECT
      applicant_id AS "applicantId",
      total,
      raw_score AS raw,
      GREATEST(0, $3 * wrong_weight) AS negative_penalty,
      recency_boost,
      location_bonus,
      last_submission_at AS "lastSubmissionAt",
      correct_weight,
      wrong_weight,
      location_matched AS "locationMatched"
    FROM final_scores
    ORDER BY total DESC, raw DESC, last_submission_at DESC, applicant_id ASC
    LIMIT $${params.length}
  `;

  const rows = await prisma.$queryRawUnsafe<any[]>(sql, ...params);
  return rows.map(r => ({
    applicantId: r.applicantId,
    total: Number(r.total),
    raw: Number(r.raw),
    negativePenalty: Number(r.negative_penalty),
    recencyBoost: Number(r.recency_boost),
    locationBonus: Number(r.location_bonus),
    lastSubmissionAt: new Date(r.lastSubmissionAt).toISOString(),
    explanation: {
      correctWeight: Number(r.correct_weight),
      wrongWeight: Number(r.wrong_weight),
      negativeMarkingFraction: neg,
      recencyApplied: Number(r.recency_boost) > 0,
      recencyWindowDays: recencyDays,
      recencyBoostPct: recencyPct,
      locationMatched: !!r.locationMatched,
      locationBonusFixed: locFixed,
      locationBonusPctOfRaw: locPct
    }
  }));
}