// src/schemas/job.ts

import { z } from 'zod';

export const CreateJob = z.object({
    companyId: z.string().min(1, 'Company ID is required'),
    title: z.string().min(2).max(120),
    templateId: z.string().nullable().optional()
});

export const ListJobsQuery = z.object({
    companyId: z.string().optional(),
    title: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0)
});

export type CreateJob = z.infer<typeof CreateJob>;
export type ListJobsQuery = z.infer<typeof ListJobsQuery>;