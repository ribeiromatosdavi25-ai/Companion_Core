import { NormalizedRequest } from '@companion/shared/types';

export interface ResolvedAnswer {
  answer: string;
  confidence: number;
  source: string;
  timestamp_ms: number;
}

export type ResolutionResult = ResolvedAnswer | 'MISS';

export class OfflineResolver {
  private readonly budget_ms = 80;

  async resolve(request: NormalizedRequest): Promise<ResolutionResult> {
    const start = Date.now();

    // Time queries - fully offline
    if (request.intent_hints.includes('time')) {
      const answer = this.resolveTime();
      if (answer) return answer;
    }

    // Budget check
    if (Date.now() - start > this.budget_ms) {
      return 'MISS';
    }

    return 'MISS';
  }

  private resolveTime(): ResolvedAnswer {
    const now = new Date();
    return {
      answer: `Current time: ${now.toLocaleTimeString()} on ${now.toLocaleDateString()}`,
      confidence: 1.0,
      source: 'offline.system_clock',
      timestamp_ms: Date.now(),
    };
  }
}
