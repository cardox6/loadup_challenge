// src/routes/stats.ts

import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

export default async function stats(app: FastifyInstance) {
  app.get("/stats", async () => {
    const [
      companies,
      branches,
      jobs,
      applicants,
      templates,
      items,
      submissions,
      answers
    ] = await Promise.all([
      prisma.company.count(),
      prisma.branch.count(),
      prisma.job.count(),
      prisma.applicant.count(),
      prisma.assessmentTemplate.count(),
      prisma.assessmentItem.count(),
      prisma.submission.count(),
      prisma.submissionAnswer.count()
    ]);

    return {
      companies,
      branches,
      jobs,
      applicants,
      templates,
      items,
      submissions,
      answers
    };
  });
}