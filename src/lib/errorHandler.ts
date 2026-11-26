// src/lib/errorHandler.ts

import type { FastifyError, FastifyReply, FastifyRequest } from 'fastify';
import { Prisma } from '../generated/prisma/index.js';
import { errorBody, HttpError } from './httpError.js';

const CODE_BY_STATUS: Record<number, string> = {
    400: 'BAD_REQUEST',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    413: 'PAYLOAD_TOO_LARGE',
    415: 'UNSUPPORTED_MEDIA_TYPE'
};

function fromRouteSchema(err: FastifyError): HttpError {
    const fields: Record<string, string[]> = {};
    for (const issue of err.validation ?? []) {
        const path = issue.instancePath.slice(1).replaceAll('/', '.');
        const missing = (issue.params as { missingProperty?: string }).missingProperty;
        const key = missing ? (path ? `${path}.${missing}` : missing) : path || '_';
        (fields[key] ||= []).push(issue.message ?? 'Invalid value');
    }
    return new HttpError(400, 'BAD_REQUEST', 'Validation failed', fields);
}

// Routes check these conditions first. This covers the race where the data
// changes between that check and the write.
function fromPrisma(err: Prisma.PrismaClientKnownRequestError): HttpError | null {
    switch (err.code) {
        case 'P2002': return new HttpError(409, 'CONFLICT', 'A record with these values already exists');
        case 'P2003': return new HttpError(409, 'CONFLICT', 'A related record is missing or still in use');
        case 'P2025': return new HttpError(404, 'NOT_FOUND', 'Record not found');
        default: return null;
    }
}

function toHttpError(err: FastifyError): HttpError | null {
    if (err instanceof HttpError) return err;
    if (err.validation) return fromRouteSchema(err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) return fromPrisma(err);
    // Fastify's own client errors, such as malformed JSON
    if (typeof err.statusCode === 'number' && err.statusCode >= 400 && err.statusCode < 500) {
        return new HttpError(err.statusCode, CODE_BY_STATUS[err.statusCode] ?? 'CLIENT_ERROR', err.message);
    }
    return null;
}

export function errorHandler(err: FastifyError, req: FastifyRequest, reply: FastifyReply) {
    const httpError = toHttpError(err);
    if (httpError) {
        req.log.warn({ err, rid: req.id }, 'client error');
        return reply.code(httpError.status).send(errorBody(httpError));
    }
    req.log.error({ err, rid: req.id }, 'server error');
    return reply.code(500).send({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Internal server error' } });
}
