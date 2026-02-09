import { ExecutionContract, ClaudeOutput, ClaudeOutputSchema } from '@companion/shared/types';
import Anthropic from '@anthropic-ai/sdk';

export class ModelOrchestrator {
  private client: Anthropic;
  private readonly budget_ms = 1200;

  constructor(apiKey: string) {
    this.client = new Anthropic({ apiKey });
  }

  async execute(
    contract: ExecutionContract,
    userQuery: string,
    safeContext: Record<string, any> = {}
  ): Promise<ClaudeOutput> {
    if (contract.path !== 'MODEL') {
      return {
        status: 'NOOP',
        answer: '',
        confidence: 0,
        needs_escalation: false,
        notes: {
          reasoning_brief: 'Contract path is not MODEL',
          assumptions: [],
          safe_alternatives: [],
        },
      };
    }

    const start = Date.now();
    
    try {
      const response = await this.client.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: contract.max_tokens,
        temperature: 0.3,
        system: this.buildSystemPrompt(contract),
        messages: [{
          role: 'user',
          content: this.buildUserPrompt(userQuery, safeContext, contract),
        }],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Expected text response');
      }

      const parsed = JSON.parse(content.text);
      const validated = ClaudeOutputSchema.parse(parsed);

      // Budget check
      if (Date.now() - start > this.budget_ms) {
        throw new Error('Execution timeout');
      }

      return validated;

    } catch (error) {
      // Single repair retry on schema failure
      if (error instanceof Error && error.message.includes('parse')) {
        return this.repairRetry(contract, userQuery, safeContext);
      }
      throw error;
    }
  }

  private async repairRetry(
    contract: ExecutionContract,
    userQuery: string,
    safeContext: Record<string, any>
  ): Promise<ClaudeOutput> {
    // Simplified retry with strict schema reminder
    const response = await this.client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 250,
      system: 'Output ONLY valid JSON matching ClaudeOutput schema. No markdown, no backticks.',
      messages: [{
        role: 'user',
        content: `Previous output was invalid. Respond with valid JSON only.\n\nQuery: ${userQuery}`,
      }],
    });

    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Invalid response type');
    
    return ClaudeOutputSchema.parse(JSON.parse(content.text));
  }

  private buildSystemPrompt(contract: ExecutionContract): string {
    return `You are a bounded component in a deterministic system.

EXECUTION CONTRACT:
- Path: ${contract.path}
- Max tokens: ${contract.max_tokens}
- Confined access: ${contract.confined_access.allowed ? 'ALLOWED' : 'DENIED'}
- Time anchor: ${contract.time_anchor.now_iso}

RULES:
1. Output ONLY valid JSON matching ClaudeOutput schema
2. No markdown formatting, no backticks
3. If confined_access.allowed=false, NEVER mention private/personal data
4. Set needs_escalation=true if query requires unavailable data
5. Keep answer concise (≤1200 chars)
6. Cite time_anchor for time-sensitive responses

OUTPUT SCHEMA:
{
  "status": "OK|DEGRADED|REFUSE|NOOP",
  "answer": "string",
  "confidence": 0.0-1.0,
  "needs_escalation": boolean,
  "notes": {
    "reasoning_brief": "string",
    "assumptions": ["string"],
    "safe_alternatives": ["string"]
  }
}`;
  }

  private buildUserPrompt(
    query: string,
    safeContext: Record<string, any>,
    contract: ExecutionContract
  ): string {
    return `USER QUERY: ${query}

SAFE CONTEXT: ${JSON.stringify(safeContext, null, 2)}

Respond with valid JSON only.`;
  }
}
