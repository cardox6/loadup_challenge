// src/server.ts

import Fastify from 'fastify';
import dotenv from 'dotenv';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { randomUUID } from 'crypto';
import { errorBody, HttpError } from './lib/httpError';

dotenv.config();

const isProd = process.env.NODE_ENV === 'production';

const app = Fastify({
  logger: isProd
    ? { level: process.env.LOG_LEVEL || 'info' }
    : { level: 'info', transport: { target: 'pino-pretty', options: { colorize: true, translateTime: "SYS:standard" } } }
});

// Correlation ID - fallback to random UUID if not provided -> avoid missing requests
app.addHook("onRequest", async (req) => {
    req.id = (req.headers['x-request-id'] as string) || req.id || randomUUID();
});


// Swagger-OpenAPI
app.register(swagger, {
    openapi: {
        info: {
            title: "LoadUp Challenge API",
            version: "1.0.0"
        }
    }
});

app.register(swaggerUi, {
    routePrefix: "/docs",
    uiConfig: {
        docExpansion: "list",
    }
});

// Routes
app.register((await import("./routes/health.js")).default);
app.register((await import("./routes/companies.js")).default);


// Error handler
app.setErrorHandler((err, req, reply) => {
    if (err instanceof HttpError) {
        app.log.warn({ err, rid: req.id }, "client error");
        return reply.code(err.status).send(errorBody(err));
    }
    app.log.error({ err, rid: req.id }, "server error");
    return reply.code(500).send({ error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error" } });
});

const PORT = Number(process.env.PORT) || 3000;
app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
    console.log(`🚀 Server listening on http://localhost:${PORT}/docs`);
})