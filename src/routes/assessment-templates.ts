// src/routes/assessment-templates.ts 

import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parse } from "../lib/validate.js";
import { CreateAssessmentTemplate } from "../schemas/assessment.js";
import { HttpError } from "../lib/httpError.js";

export default async function assessmentTemplates(app: FastifyInstance) {
    // Create assessment template
    app.post("/assessment-templates", async (req, reply) => {
        const body = parse(CreateAssessmentTemplate, req.body);

        // Check for unique profileKey
        const existing = await prisma.assessmentTemplate.findFirst({ 
            where: { profileKey: body.profileKey },
            select: { id: true }
        });
        if (existing) {
            throw new HttpError(409, "CONFLICT", "Assessment template with this profile key already exists");
        }

        const created = await prisma.assessmentTemplate.create({ 
            data: {
                title: body.title,
                profileKey: body.profileKey,
                items: {
                    create: body.items.map(i => ({
                        text: i.text,
                        correctOption: i.correctOption,
                        weight: i.weight ?? 1
                    }))
                }
            } 
        });
        return reply.code(201).send(created);
    });

    // Get assessment template with items
    app.get("/assessment-templates/:id", async (req) => {
        const { id } = req.params as { id: string };
        
        const template = await prisma.assessmentTemplate.findUnique({
            where: { id },
            include: {
                items: {
                    select: {
                        id: true,
                        text: true,
                        correctOption: true,
                        weight: true
                    }
                }
            }
        });
        
        if (!template) throw new HttpError(404, "NOT_FOUND", "Assessment template not found");
        return template;
    });
}