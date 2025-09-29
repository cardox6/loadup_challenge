// src/schemas/applicant.ts

import { z } from 'zod';

export const CreateApplicant = z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(120, 'Name too long'),
    email: z.string().email('Invalid email format'),
    city: z.string().min(2, 'City must be at least 2 characters').max(100, 'City name too long').optional().nullable(),
});

export const ListApplicantsQuery = z.object({
    q: z.string().optional(),
    city: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0)
});

export type CreateApplicant = z.infer<typeof CreateApplicant>;
export type ListApplicantsQuery = z.infer<typeof ListApplicantsQuery>;