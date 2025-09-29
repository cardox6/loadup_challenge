// src/lib/zodToJsonSchema.ts

/**
 * Predefined JSON schemas for Swagger documentation
 */

// Common parameter schemas
export const IdParams = {
    type: 'object',
    properties: {
        id: { type: 'string', description: 'Unique identifier' }
    },
    required: ['id']
};

// Query schemas
export const PaginationQuery = {
    type: 'object',
    properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25, description: 'Number of items to return' },
        offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of items to skip' },
        search: { type: 'string', description: 'Search term (optional)' }
    }
};

export const CompaniesQuery = {
    type: 'object',
    properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25, description: 'Number of items to return' },
        offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of items to skip' },
        search: { type: 'string', description: 'Search company name (optional)' }
    }
};

export const BranchesQuery = {
    type: 'object',
    properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25, description: 'Number of items to return' },
        offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of items to skip' },
        search: { type: 'string', description: 'Search branch name (optional)' },
        companyId: { type: 'string', description: 'Filter by company ID (optional)' }
    }
};

export const JobsQuery = {
    type: 'object',
    properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25, description: 'Number of items to return' },
        offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of items to skip' },
        search: { type: 'string', description: 'Search job title (optional)' },
        companyId: { type: 'string', description: 'Filter by company ID (optional)' }
    }
};

export const ApplicantsQuery = {
    type: 'object',
    properties: {
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25, description: 'Number of items to return' },
        offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of items to skip' },
        search: { type: 'string', description: 'Search applicant name or email (optional)' }
    }
};

export const MatchesQuery = {
    type: 'object',
    properties: {
        jobId: { type: 'string', description: 'Job ID to match against' },
        branchId: { type: 'string', description: 'Branch ID to match against' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 25, description: 'Number of candidates to return' },
        offset: { type: 'integer', minimum: 0, default: 0, description: 'Number of items to skip' },
        minScore: { type: 'number', minimum: 0, description: 'Minimum score threshold (optional)' }
    },
    required: ['jobId', 'branchId']
};

// Body schemas
export const CreateCompanyBody = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1, description: 'Company name' }
    },
    required: ['name']
};

export const CreateBranchBody = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1, description: 'Branch name' },
        companyId: { type: 'string', description: 'Company ID' },
        location: { type: 'string', description: 'Branch location' }
    },
    required: ['name', 'companyId', 'location']
};

export const CreateJobBody = {
    type: 'object',
    properties: {
        title: { type: 'string', minLength: 1, description: 'Job title' },
        companyId: { type: 'string', description: 'Company ID' },
        branchIds: { 
            type: 'array', 
            items: { type: 'string' }, 
            description: 'Array of branch IDs where this job is available' 
        }
    },
    required: ['title', 'companyId', 'branchIds']
};

export const CreateApplicantBody = {
    type: 'object',
    properties: {
        name: { type: 'string', minLength: 1, description: 'Full name' },
        email: { type: 'string', format: 'email', description: 'Email address' },
        location: { type: 'string', description: 'Applicant location' }
    },
    required: ['name', 'email', 'location']
};

/**
 * Helper to create route schema for Fastify/Swagger
 */
export function createRouteSchema(options: {
    body?: any;
    querystring?: any;
    params?: any;
    response?: Record<number, any>;
    tags?: string[];
    summary?: string;
    description?: string;
}) {
    return { schema: options };
}