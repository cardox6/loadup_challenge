// src/routes/sample.ts

import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

export default async function sample(app: FastifyInstance) {
    app.get("/sample/job-branch", async () => {
        const link = await prisma.jobBranch.findFirst({
            where: { job: { templateId: { not: null } } },
            select: {
                job: { select: { id: true, companyId: true, title: true, templateId: true } },
                branch: { select: { id: true, city: true, companyId: true } }
            }
        });
        if (!link) return { message: "No job with an assessment is offered at a branch yet" };
        return link;
    });
}
