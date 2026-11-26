// src/schemas/assessment.ts

import { z } from 'zod';

// Create an assessment template with items
export const CreateAssessmentTemplate = z.object({
    title: z.string().min(1, 'Title is required').max(200, 'Title too long'),
    profileKey: z.string().min(2, 'Profile key is required').max(100, 'Profile key too long'),
    items: z.array(z.object({
        text: z.string().min(4, 'Question text is required').max(500, 'Question text too long'),
        correctOption: z.number().int().min(0).max(3, 'Correct option must be between 0 and 3'),
        weight: z.number().int().min(1).max(10, 'Weight must be between 1 and 10').default(1)
    })).min(1, 'At least one assessment item is required')
});

export type CreateAssessmentTemplate = z.infer<typeof CreateAssessmentTemplate>;

// Create a submission for a template
export const CreateSubmission = z.object({
    applicantId: z.string().min(1, 'Applicant ID is required'),
    templateId: z.string().min(1, 'Template ID is required'),
    submittedAt: z.coerce.date().optional(),
    answers: z.array(z.object({
        itemId: z.string().min(1, 'Item ID is required'),
        chosenOption: z.number().int().min(0).max(3, 'Chosen option must be between 0 and 3')
    })).min(1, 'At least one answer is required').max(500, 'Too many answers')
        .superRefine((answers, ctx) => {
            // A repeated item would be scored once per repetition
            const seen = new Set<string>();
            answers.forEach((a, i) => {
                if (seen.has(a.itemId)) {
                    ctx.addIssue({ code: 'custom', message: 'This item is already answered in this submission', path: [i, 'itemId'] });
                }
                seen.add(a.itemId);
            });
        })
});

export type CreateSubmission = z.infer<typeof CreateSubmission>;