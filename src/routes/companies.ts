
import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parse } from "../lib/validate.js";
import { CreateCompany, ListCompaniesQuery } from "../schemas/company.js";
import { HttpError } from "../lib/httpError.js";

export default async function companies(app: FastifyInstance) {
    // Create company
    app.post('/companies', async (req, reply) => {
        const body = parse(CreateCompany, req.body);
        try {
            const created = await prisma.company.create({ data: { name: body.name } });
            return reply.code(201).send(created);
        } catch (e: any) {
            if (e?.code === "P2002") throw new HttpError(409, "CONFLICT", "Company with this name already exists");
            throw e;
        }
    });

    // List (search + pagination)
    app.get("/companies", async (req) => {
        const q = parse(ListCompaniesQuery, req.query);
        const where = q.search ? { name: { contains: q.search, mode: "insensitive" as const } } : {};
        const data = await prisma.company.findMany({
            where,
            orderBy: [{ createdAt: "desc"}, { id: "desc" }],
            take: q.limit,
            skip: q.offset
        });
        return { data, paging: { limit: q.limit, offset: q.offset } };
    });

    // Get by id
    app.get("/companies/:id", async (req) => {
        const { id } = req.params as { id: string };
        const company = await prisma.company.findUnique({ where: { id } });
        if (!company) throw new HttpError(404, "NOT_FOUND", "Company not found");
        return company;
    });

    // Delete by id
    app.delete("/companies/:id", async (req, reply) => {
        const { id } = req.params as { id: string };
        try {
            await prisma.company.delete({ where: { id } });
            return reply.code(204).send();
        } catch {
            throw new HttpError(404, "NOT_FOUND", "Company not found");
        }
    });
}