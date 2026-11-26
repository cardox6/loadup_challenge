// src/routes/submissions.ts

import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parse } from "../lib/validate.js";
import { CreateSubmission } from "../schemas/assessment.js";
import { HttpError } from "../lib/httpError.js";

export default async function submissions(app: FastifyInstance) {
    // Create submission
    app.post("/submissions", async (req, reply) => {
        const body = parse(CreateSubmission, req.body);

        // Validate applicant and template exist
        const [applicant, template] = await Promise.all([
            prisma.applicant.findUnique({ where: { id: body.applicantId }, select: { id: true } }),
            prisma.assessmentTemplate.findUnique({ where: { id: body.templateId }, select: { id: true } })
        ]);
        if (!applicant) throw new HttpError(400, "BAD_REQUEST", "Applicant ID is invalid");
        if (!template) throw new HttpError(400, "BAD_REQUEST", "Template ID is invalid");

        // Fetch template items to validate answers
        const items = await prisma.assessmentItem.findMany({ 
            where: { templateId: body.templateId },
            select: { id: true, correctOption: true, weight: true }
        });
        if (items.length === 0) throw new HttpError(400, "BAD_REQUEST", "Assessment template has no items");

        // Validate each answer refers to a valid item in the template
        const itemMap = new Map(items.map(i => [i.id, i]));
        for (const a of body.answers) {
            if (!itemMap.has(a.itemId)) {
                throw new HttpError(400, "BAD_REQUEST", `Answer contains invalid item ID: ${a.itemId}`);
            }
        }

        // Create submission, snapshot isCorrect + itemWeight
        const submittedAt = body.submittedAt ?? new Date();

        const answersData = body.answers.map(a => {
            const meta = itemMap.get(a.itemId)!;
            return {
                itemId: a.itemId,
                chosenOption: a.chosenOption,
                isCorrect: a.chosenOption === meta.correctOption,
                itemWeight: meta.weight
            };
        });

        // One nested write, so the submission and its answers are saved together or not at all
        const submission = await prisma.submission.create({
            data: {
                applicantId: body.applicantId,
                templateId: body.templateId,
                submittedAt,
                answers: { createMany: { data: answersData } }
            }
        });

        const correctWeight = answersData.reduce((s, x) => s + (x.isCorrect ? x.itemWeight : 0), 0);
        const wrongWeight = answersData.reduce((s, x) => s + (!x.isCorrect ? x.itemWeight : 0), 0);

        return reply.code(201).send({
            id: submission.id,
            applicantId: submission.applicantId,
            templateId: submission.templateId,
            submittedAt: submission.submittedAt,
            summary: { answered: answersData.length, correctWeight, wrongWeight }
        });
    });
}