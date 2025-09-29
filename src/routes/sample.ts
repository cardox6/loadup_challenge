// src/routes/sample.ts

import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";

export default async function sample(app: FastifyInstance) {
    app.get("/sample/job-branch", async () => {
        const job = await prisma.job.findFirst({
            select: {
                id: true,
                companyId: true,
                title: true,
                templateId: true
            }});
        if (!job) return { message: "No job found" };

        const branch = await prisma.branch.findFirst({
            where: { companyId: job.companyId },
            select: {
                id: true,
                city: true,
                companyId: true
            }});
        if (!branch) return { message: "No branch found for job's company" };

        return { job, branch };
    });
}