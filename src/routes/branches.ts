// src/routes/branches.ts

import { FastifyInstance } from 'fastify';
import { prisma } from '../db.js';
import { parse } from '../lib/validate.js';
import { CreateBranch, ListBranchesQuery } from '../schemas/branch.js';
import { HttpError } from '../lib/httpError.js';
import { createRouteSchema, CreateBranchBody, BranchesQuery, IdParams } from '../lib/zodToJsonSchema.js';

export default async function branches(app: FastifyInstance) {
    // Create branch
    app.post("/branches", {
        ...createRouteSchema({
            body: CreateBranchBody,
            tags: ['Branches'],
            summary: 'Create a new branch',
            description: 'Creates a new branch for a company in a given city',
            response: {
                201: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        city: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        })
    }, async (req, reply) => {
        const body = parse(CreateBranch, req.body);
        const exists = await prisma.company.findUnique({ where: { id: body.companyId }, select: { id: true } });
        if (!exists) throw new HttpError(400, "BAD_REQUEST", "Company ID is invalid");
        const created = await prisma.branch.create({ data: body });
        return reply.code(201).send(created);
    });

    // List (search + pagination)
    app.get("/branches", {
        ...createRouteSchema({
            querystring: BranchesQuery,
            tags: ['Branches'],
            summary: 'List branches',
            description: 'Get a paginated list of branches with optional filtering by company or city',
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
                                    companyId: { type: 'string' },
                                    city: { type: 'string' },
                                    createdAt: { type: 'string', format: 'date-time' }
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
    app.get("/branches/:id", {
        ...createRouteSchema({
            params: IdParams,
            tags: ['Branches'],
            summary: 'Get branch by ID',
            description: 'Retrieve a specific branch by its unique identifier',
            response: {
                200: {
                    type: 'object',
                    properties: {
                        id: { type: 'string' },
                        companyId: { type: 'string' },
                        city: { type: 'string' },
                        createdAt: { type: 'string', format: 'date-time' }
                    }
                }
            }
        })
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        const branch = await prisma.branch.findUnique({ where: { id } });
        if (!branch) throw new HttpError(404, "NOT_FOUND", "Branch not found");
        return branch;
    });

    // Delete by id
    app.delete("/branches/:id", {
        ...createRouteSchema({
            params: IdParams,
            tags: ['Branches'],
            summary: 'Delete branch',
            description: 'Delete a branch by its unique identifier',
            response: {
                204: {
                    type: 'null',
                    description: 'Branch deleted successfully'
                }
            }
        })
    }, async (req, reply) => {
        const { id } = req.params as { id: string };
        try {
            await prisma.branch.delete({ where: { id } });
        } catch {
            throw new HttpError(404, "NOT_FOUND", "Branch not found");
        }
        return reply.code(204).send();
    });
}