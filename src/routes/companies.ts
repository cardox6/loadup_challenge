
import { FastifyInstance } from "fastify";
import { prisma } from "../db.js";
import { parse } from "../lib/validate.js";
import { CreateCompany, ListCompaniesQuery } from "../schemas/company.js";
import { HttpError } from "../lib/httpError.js";
import { createRouteSchema, CreateCompanyBody, CompaniesQuery, IdParams } from "../lib/zodToJsonSchema.js";

export default async function companies(app: FastifyInstance) {
    // Create company
    app.post("/companies", {
        ...createRouteSchema({
            body: CreateCompanyBody,
            tags: ['Companies'],
            summary: 'Create a new company',
            description: 'Creates a new company with the provided name',
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        })
    }, async (req, reply) => {
        const body = parse(CreateCompany, req.body);
        const existing = await prisma.company.findUnique({ where: { name: body.name }, select: { id: true } });
        if (existing) throw new HttpError(409, "CONFLICT", "Company with this name already exists");
        const created = await prisma.company.create({ data: { name: body.name } });
        return reply.code(201).send(created);
    });

    // List (search + pagination)
    app.get("/companies", {
        ...createRouteSchema({
            querystring: CompaniesQuery,
            tags: ['Companies'],
            summary: 'List companies',
            description: 'Get a paginated list of companies with optional search',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    name: { type: 'string' },
                                    createdAt: { type: 'string', format: 'date-time' },
                                    updatedAt: { type: 'string', format: 'date-time' }
                                }
                            }
                        },
                        paging: {
                            type: 'object',
                            properties: {
                                limit: { type: 'integer' },
                                offset: { type: 'integer' }
                            }
                        }
                    }
                }
            }
        })
    }, async (req) => {
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
    app.get("/companies/:id", {
        ...createRouteSchema({
            params: IdParams,
            tags: ['Companies'],
            summary: 'Get company by ID',
            description: 'Retrieve a specific company by its unique identifier',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        name: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        })
    }, async (req) => {
        const { id } = req.params as { id: string };
        const company = await prisma.company.findUnique({ where: { id } });
        if (!company) throw new HttpError(404, "NOT_FOUND", "Company not found");
        return company;
    });

    // Delete by id
    app.delete("/companies/:id", {
        ...createRouteSchema({
            params: IdParams,
            tags: ['Companies'],
            summary: 'Delete company',
            description: 'Delete a company by its unique identifier',
            response: {
                204: {
                    type: 'null',
                    description: 'Company deleted successfully'
                }
            }
        })
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const company = await prisma.company.findUnique({
            where: { id },
            select: { _count: { select: { branches: true, jobs: true } } }
        });
        if (!company) throw new HttpError(404, "NOT_FOUND", "Company not found");
        const { branches, jobs } = company._count;
        if (branches > 0 || jobs > 0) {
            throw new HttpError(409, "CONFLICT", `Company still has ${branches} branch(es) and ${jobs} job(s). Delete those first.`);
        }
        await prisma.company.delete({ where: { id } });
        return reply.code(204).send();
    });
}