import { NormalizedRequest } from '@companion/shared/types';
import { ResolvedAnswer, ResolutionResult } from '@companion/resolver-offline';

interface CacheEntry {
  answer: string;
  confidence: number;
  cached_at_ms: number;
  ttl_ms: number;
}

export class SafeCacheResolver {
  private readonly budget_ms = 80;
  private cache: Map<string, CacheEntry> = new Map();

  async resolve(request: NormalizedRequest): Promise<ResolutionResult> {
    const start = Date.now();

    // Weather queries - cacheable
    if (request.intent_hints.includes('weather')) {
      const cached = this.getFromCache('weather:default');
      if (cached) return cached;
    }

    // Budget check
    if (Date.now() - start > this.budget_ms) {
      return 'MISS';
    }

    return 'MISS';
  }

  private getFromCache(key: string): ResolvedAnswer | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const age_ms = Date.now() - entry.cached_at_ms;
    const is_stale = age_ms > entry.ttl_ms;

    if (is_stale) {
      // Return stale data with disclosure
      return {
        answer: `${entry.answer} (cached ${Math.floor(age_ms / 1000)}s ago)`,
        confidence: entry.confidence * 0.7,
        source: 'cache.stale',
        timestamp_ms: Date.now(),
      };
    }

    return {
      answer: entry.answer,
      confidence: entry.confidence,
      source: 'cache.fresh',
      timestamp_ms: Date.now(),
    };
  }

  set(key: string, answer: string, confidence: number, ttl_ms: number): void {
    this.cache.set(key, {
      answer,
      confidence,
      cached_at_ms: Date.now(),
      ttl_ms,
    });
  }
}
