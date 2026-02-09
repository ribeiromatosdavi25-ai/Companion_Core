import { FallbackId } from '../types';

export interface FallbackResponse {
  message: string;
  suggest_action?: string;
}

export class FallbackRegistry {
  private static fallbacks: Record<FallbackId, FallbackResponse> = {
    FALLBACK_PUBLIC_SAFE: {
      message: 'I can provide general information on this topic.',
      suggest_action: 'Try rephrasing your question.',
    },
    FALLBACK_STALE_CACHE: {
      message: 'Showing cached information (may be outdated).',
      suggest_action: 'Refresh for latest data.',
    },
    FALLBACK_EXTERNAL_DOWN: {
      message: 'External service temporarily unavailable.',
      suggest_action: 'Try again in a few moments.',
    },
    FALLBACK_DENY_PRIVATE: {
      message: 'I cannot access private information.',
      suggest_action: 'Ask about general topics instead.',
    },
  };

  static get(id: FallbackId): FallbackResponse {
    return this.fallbacks[id];
  }
}
