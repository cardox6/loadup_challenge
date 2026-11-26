// src/server.ts

import Fastify from 'fastify';
import dotenv from 'dotenv';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { randomUUID } from 'crypto';
import { errorHandler } from './lib/errorHandler.js';

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
app.register((await import("./routes/branches.js")).default);
app.register((await import("./routes/jobs.js")).default);
app.register((await import("./routes/applicants.js")).default);
app.register((await import("./routes/assessment-templates.js")).default);
app.register((await import("./routes/submissions.js")).default);
app.register((await import("./routes/sample.js")).default);
app.register((await import("./routes/matches.js")).default);
app.register((await import("./routes/top-candidates.js")).default);
app.register((await import("./routes/stats.js")).default);

// Error handler
app.setErrorHandler(errorHandler);

const PORT = Number(process.env.PORT) || 3000;
app.listen({ port: PORT, host: '0.0.0.0' }).then(() => {
    console.log(`🚀 Server listening on http://localhost:${PORT}/docs`);
})