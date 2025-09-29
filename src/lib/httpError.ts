// src/lib/httpError.ts

export class HttpError extends Error {
    constructor(
        public status: number,
        public code: string,
        message: string,
        public fields?: Record<string, string[]>
    ) {
        super(message);
    }
}

export const errorBody = (e: HttpError) => ({
    error: {
        code: e.code,
        message: e.message,
        ...(e.fields ? { fields: e.fields } : {} )
    }
});