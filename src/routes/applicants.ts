// src/routes/applicants.ts

import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { parse } from '../lib/validate.js';
import { CreateApplicant, ListApplicantsQuery } from '../schemas/applicant.js';
import { HttpError } from '../lib/httpError.js';

export default async function applicants(app: FastifyInstance) {
    // Create applicant
    app.post("/applicants", async (req, reply) => {
        const body = parse(CreateApplicant, req.body);
        try {
            const created = await prisma.applicant.create({ data: { ...body, city: body.city ?? null } });
            return reply.code(201).send(created);
        } catch (e: any) {
            if (e?.code === "P2002") throw new HttpError(409, "CONFLICT", "Applicant with this email already exists");
            throw e;
        }
    });

    // List (search + pagination)
    app.get("/applicants", async (req) => {
        const q = parse(ListApplicantsQuery, req.query);
        const where = {
            AND: [
                q.city ? { city: { equals: q.city, mode: "insensitive" as const } } : {},
                q.q ? {
                    OR: [
                        { name: { contains: q.q, mode: "insensitive" as const } },
                        { email: { contains: q.q, mode: "insensitive" as const } },
                        { city: { contains: q.q, mode: "insensitive" as const } }
                    ]
                } : {},
            ]
        };
        const data = await prisma.applicant.findMany({
            where,
            orderBy: [{ createdAt: "desc"}, { id: "desc" }],
            take: q.limit,
            skip: q.offset
        });
        return { data, paging: { limit: q.limit, offset: q.offset } };
    });

    // Get by id
    app.get("/applicants/:id", async (req) => {
        const { id } = req.params as { id: string };
        const a = await prisma.applicant.findUnique({ where: { id } });
        if (!a) throw new HttpError(404, "NOT_FOUND", "Applicant not found");
        return a;
    });

    // Delete by id
    app.delete("/applicants/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        try { await prisma.applicant.delete({ where: { id } }); }
        catch { throw new HttpError(404, "NOT_FOUND", "Applicant not found"); }
        return reply.code(204).send();
    });
}