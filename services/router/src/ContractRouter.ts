import { 
  ExecutionContract, 
  NormalizedRequest, 
  ExecutionPath 
} from '@companion/shared/types';
import { TimeUtils } from '@companion/shared/utils/time';

export class ContractRouter {
  route(
    request: NormalizedRequest,
    sessionStart: Date,
    lastTurn: Date | null
  ): ExecutionContract {
    const path = this.determinePath(request);
    const risk_score = this.computeRisk(request);

    return {
      contract_version: '0.1',
      time_anchor: {
        now_iso: TimeUtils.nowISO(),
        session_age_s: TimeUtils.deltaSeconds(sessionStart),
        last_turn_delta_s: lastTurn ? TimeUtils.deltaSeconds(lastTurn) : 0,
      },
      path,
      risk_score,
      max_tokens: path === 'MODEL' ? 2048 : 0,
      allowed_tools: ['none'],
      confined_access: {
        allowed: false,
        allowed_rpcs: [],
      },
      fallback_id: this.selectFallback(path, risk_score),
      trace: {
        decision_reason: this.explainDecision(path, request),
      },
    };
  }

  private determinePath(request: NormalizedRequest): ExecutionPath {
    // Offline-first heuristic
    if (this.isOfflineCapable(request)) return 'OFFLINE';
    if (this.isCacheablePublic(request)) return 'SAFE_CACHE';
    if (this.requiresPrivateData(request)) return 'DENY';
    
    return 'MODEL';
  }

  private isOfflineCapable(request: NormalizedRequest): boolean {
    return request.intent_hints.includes('time');
  }

  private isCacheablePublic(request: NormalizedRequest): boolean {
    return request.intent_hints.includes('weather');
  }

  private requiresPrivateData(request: NormalizedRequest): boolean {
    return request.intent_hints.includes('memory');
  }

  private computeRisk(request: NormalizedRequest): number {
    if (this.requiresPrivateData(request)) return 1.0;
    return 0.0;
  }

  private selectFallback(path: ExecutionPath, risk: number): any {
    if (risk >= 0.8) return 'FALLBACK_DENY_PRIVATE';
    if (path === 'SAFE_CACHE') return 'FALLBACK_STALE_CACHE';
    return 'FALLBACK_PUBLIC_SAFE';
  }

  private explainDecision(path: ExecutionPath, request: NormalizedRequest): string {
    return `router.${path.toLowerCase()}.${request.intent_hints[0] || 'default'}`;
  }
}
