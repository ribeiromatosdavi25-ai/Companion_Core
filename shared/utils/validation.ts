import { ExecutionContract } from '../types';

export class ValidationUtils {
  static isValidContract(contract: unknown): contract is ExecutionContract {
    if (!contract || typeof contract !== 'object') return false;
    const c = contract as any;
    
    return (
      c.contract_version === '0.1' &&
      typeof c.time_anchor === 'object' &&
      ['OFFLINE', 'SAFE_CACHE', 'EXTERNAL_API', 'MODEL', 'DENY'].includes(c.path) &&
      typeof c.risk_score === 'number' &&
      typeof c.max_tokens === 'number' &&
      Array.isArray(c.allowed_tools) &&
      typeof c.confined_access === 'object' &&
      typeof c.fallback_id === 'string'
    );
  }

  static enforceTokenCeiling(requested: number, ceiling: number): number {
    return Math.min(requested, ceiling);
  }
}
