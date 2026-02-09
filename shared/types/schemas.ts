import { z } from 'zod';

export const ClaudeOutputSchema = z.object({
  status: z.enum(['OK', 'DEGRADED', 'REFUSE', 'NOOP']),
  answer: z.string(),
  confidence: z.number().min(0).max(1),
  needs_escalation: z.boolean(),
  notes: z.object({
    reasoning_brief: z.string(),
    assumptions: z.array(z.string()),
    safe_alternatives: z.array(z.string()),
  }),
});

export type ClaudeOutput = z.infer<typeof ClaudeOutputSchema>;
