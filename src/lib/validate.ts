// src/lib/validate.ts

import { z, ZodError } from 'zod';
import { HttpError } from './httpError';

export function parse<T>(schema: z.ZodType<T>, data: unknown): T {
    try {
        return schema.parse(data) as T;
    } catch (e) {
        if (e instanceof ZodError) {
            const fields: Record<string, string[]> = {};
            for (const issue of e.issues) {
                const key = issue.path.length ? issue.path.join('.') : '_';
                (fields[key] ||= []).push(issue.message);
            }
            throw new HttpError(400, 'BAD_REQUEST', 'Validation failed', fields);
        }
        throw e;
    }
}