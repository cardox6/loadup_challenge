// src/routes/jobs.ts

import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { parse } from '../lib/validate.js';
import { CreateJob, ListJobsQuery } from '../schemas/job.js';
import { HttpError } from '../lib/httpError.js';

export default async function jobs(app: FastifyInstance) {
    // Create job
    app.post("/jobs", async (req, reply) => {
        const body = parse(CreateJob, req.body);
        const company = await prisma.company.findUnique({ where: { id: body.companyId }, select: { id: true } });
        if (!company) throw new HttpError(400, "BAD_REQUEST", "Company ID is invalid");
        if (body.templateId) {
            const tpl = await prisma.assessmentTemplate.findUnique({ where: { id: body.templateId }, select: { id: true } });
            if (!tpl) throw new HttpError(400, "BAD_REQUEST", "Template ID is invalid");
        }
        const created = await prisma.job.create({ data: body });
        return reply.code(201).send(created);
    });

    // List (search + pagination)
    app.get("/jobs", async (req) => {
        const q = parse(ListJobsQuery, req.query);
        const where = {
            ...(q.companyId ? { companyId: q.companyId } : {}),
            ...(q.title ? { title: { contains: q.title, mode: "insensitive" as const } } : {})
        };
        const data = await prisma.job.findMany({
            where,
            orderBy: [{ createdAt: "desc"}, { id: "desc" }], 
            take: q.limit,
            skip: q.offset,
        });
        return { data, paging: { limit: q.limit, offset: q.offset } };
    });

    // Get by id
    app.get("/jobs/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const job = await prisma.job.findUnique({ where: { id } });
        if (!job) throw new HttpError(404, "NOT_FOUND", "Job not found");
        return job;
    });

    // Delete by id
    app.delete("/jobs/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        try { await prisma.job.delete({ where: { id } }); }
        catch { throw new HttpError(404, "NOT_FOUND", "Job not found"); }
        return reply.code(204).send();
    });
}