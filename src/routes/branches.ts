// src/routes/branches.ts

import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { parse } from '../lib/validate.js';
import { CreateBranch, ListBranchesQuery } from '../schemas/branch.js';
import { HttpError } from '../lib/httpError.js';

export default async function branches(app: FastifyInstance) {
    // Create branch
    app.post("/branches", async (req, reply) => {
        const body = parse(CreateBranch, req.body);
        const exists = await prisma.company.findUnique({ where: { id: body.companyId }, select: { id: true } });
        if (!exists) throw new HttpError(400, "BAD_REQUEST", "Company ID is invalid");
        const created = await prisma.branch.create({ data: body });
        return reply.code(201).send(created);
    });

    // List (search + pagination)
    app.get("/branches", async (req) => {
        const q = parse(ListBranchesQuery, req.query);
        const where = {
            ...(q.companyId ? { companyId: q.companyId } : {}),
            ...(q.city ? { city: { contains: q.city, mode: "insensitive" as const } } : {})
        };
        const data = await prisma.branch.findMany({
            where,
            orderBy: [{ createdAt: "desc"}, { id: "desc" }], 
            take: q.limit,
            skip: q.offset
        });
        return { data, paging: { limit: q.limit, offset: q.offset } };
    });

    // Get by id
    app.get("/branches/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        const branch = await prisma.branch.findUnique({ where: { id } });
        if (!branch) throw new HttpError(404, "NOT_FOUND", "Branch not found");
        return branch;
    });

    // Delete by id
    app.delete("/branches/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        try {
            await prisma.branch.delete({ where: { id } });
        } catch {
            throw new HttpError(404, "NOT_FOUND", "Branch not found");
        }
        return reply.code(204).send();
    });
}