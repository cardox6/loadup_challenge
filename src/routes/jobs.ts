// src/routes/jobs.ts

import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { parse } from '../lib/validate.js';
import { CreateJob, ListJobsQuery } from '../schemas/job.js';
import { HttpError } from '../lib/httpError.js';
import { createRouteSchema, CreateJobBody } from '../lib/zodToJsonSchema.js';

const includeBranchIds = {
    branches: { select: { branchId: true }, orderBy: { branchId: "asc" as const } }
};

function toJobResponse<T extends { branches: { branchId: string }[] }>({ branches, ...job }: T) {
    return { ...job, branchIds: branches.map(b => b.branchId) };
}

export default async function jobs(app: FastifyInstance) {
    // Create job
    app.post("/jobs", {
        ...createRouteSchema({
            body: CreateJobBody,
            tags: ['Jobs'],
            summary: 'Create a new job',
            description: 'Creates a job and offers it at one or more branches of its company'
        })
    }, async (req, reply) => {
        const { branchIds, ...job } = parse(CreateJob, req.body);

        const company = await prisma.company.findUnique({ where: { id: job.companyId }, select: { id: true } });
        if (!company) throw new HttpError(400, "BAD_REQUEST", "Company ID is invalid");
        if (job.templateId) {
            const tpl = await prisma.assessmentTemplate.findUnique({ where: { id: job.templateId }, select: { id: true } });
            if (!tpl) throw new HttpError(400, "BAD_REQUEST", "Template ID is invalid");
        }

        const branches = await prisma.branch.findMany({
            where: { id: { in: branchIds }, companyId: job.companyId },
            select: { id: true }
        });
        const validIds = new Set(branches.map(b => b.id));
        const invalidIds = branchIds.filter(id => !validIds.has(id));
        if (invalidIds.length > 0) {
            throw new HttpError(400, "BAD_REQUEST", "Every branch must belong to the job's company", {
                branchIds: invalidIds.map(id => `Not a branch of this company: ${id}`)
            });
        }

        const created = await prisma.job.create({
            data: { ...job, branches: { createMany: { data: branchIds.map(branchId => ({ branchId })) } } },
            include: includeBranchIds
        });
        return reply.code(201).send(toJobResponse(created));
    });

    // List (search + pagination)
    app.get("/jobs", async (req) => {
        const q = parse(ListJobsQuery, req.query);
        const where = {
            ...(q.companyId ? { companyId: q.companyId } : {}),
            ...(q.branchId ? { branches: { some: { branchId: q.branchId } } } : {}),
            ...(q.title ? { title: { contains: q.title, mode: "insensitive" as const } } : {})
        };
        const data = await prisma.job.findMany({
            where,
            include: includeBranchIds,
            orderBy: [{ createdAt: "desc"}, { id: "desc" }],
            take: q.limit,
            skip: q.offset,
        });
        return { data: data.map(toJobResponse), paging: { limit: q.limit, offset: q.offset } };
    });

    // Get by id
    app.get("/jobs/:id", async (req) => {
        const { id } = req.params as { id: string };
        const job = await prisma.job.findUnique({ where: { id }, include: includeBranchIds });
        if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
        return toJobResponse(job);
    });

    // Delete by id (its branch links are removed with it)
    app.delete("/jobs/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const job = await prisma.job.findUnique({ where: { id }, select: { id: true } });
        if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
        await prisma.job.delete({ where: { id } });
        return reply.code(204).send();
    });
}
