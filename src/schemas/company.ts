// src/schemas/company.ts

import { z } from 'zod';

export const CreateCompany = z.object({
    name: z.string().trim().min(1, 'Name is required')
});

export const ListCompaniesQuery = z.object({
    search: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0)
});

export type CreateCompany = z.infer<typeof CreateCompany>;
export type ListCompaniesQuery = z.infer<typeof ListCompaniesQuery>;