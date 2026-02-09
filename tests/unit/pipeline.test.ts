import { describe, it, expect } from 'vitest';
import { Normalizer } from '../../services/gateway/src/middleware/normalize';
import { ContractRouter } from '../../services/router/src/ContractRouter';
import { OfflineResolver } from '../../services/resolver/offline/src/OfflineResolver';

describe('Phase 1-3 Pipeline', () => {
  it('should resolve time query offline', async () => {
    const normalized = Normalizer.normalize('what time is it');
    expect(normalized.intent_hints).toContain('time');

    const router = new ContractRouter();
    const contract = router.route(normalized, new Date(), null);
    expect(contract.path).toBe('OFFLINE');

    const resolver = new OfflineResolver();
    const result = await resolver.resolve(normalized);
    expect(result).not.toBe('MISS');
    if (result !== 'MISS') {
      expect(result.confidence).toBe(1.0);
      expect(result.source).toBe('offline.system_clock');
    }
  });

  it('should route weather to cache', () => {
    const normalized = Normalizer.normalize('what is the weather');
    expect(normalized.intent_hints).toContain('weather');

    const router = new ContractRouter();
    const contract = router.route(normalized, new Date(), null);
    expect(contract.path).toBe('SAFE_CACHE');
  });

  it('should deny private memory requests', () => {
    const normalized = Normalizer.normalize('what do you remember about me');
    
    const router = new ContractRouter();
    const contract = router.route(normalized, new Date(), null);
    expect(contract.path).toBe('DENY');
    expect(contract.risk_score).toBe(1.0);
  });
});
