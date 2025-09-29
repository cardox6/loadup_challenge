// schemas/branch.ts

import { z } from 'zod';

export const CreateBranch = z.object({
    companyId: z.string().min(1, 'Company ID is required'),
    city: z.string().min(2).max(100),
});

export const ListBranchesQuery = z.object({
    companyId: z.string().optional(),
    city: z.string().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(25),
    offset: z.coerce.number().int().min(0).default(0)
});

export type CreateBranch = z.infer<typeof CreateBranch>;
export type ListBranchesQuery = z.infer<typeof ListBranchesQuery>;