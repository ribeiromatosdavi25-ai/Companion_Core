export type ExecutionPath = 
  | 'OFFLINE' 
  | 'SAFE_CACHE' 
  | 'EXTERNAL_API' 
  | 'MODEL' 
  | 'DENY';

export type FallbackId = 
  | 'FALLBACK_PUBLIC_SAFE'
  | 'FALLBACK_STALE_CACHE'
  | 'FALLBACK_EXTERNAL_DOWN'
  | 'FALLBACK_DENY_PRIVATE';

export interface TimeAnchor {
  now_iso: string;
  session_age_s: number;
  last_turn_delta_s: number;
}

export interface ConfinedAccess {
  allowed: boolean;
  allowed_rpcs: string[];
}

export interface ExecutionContract {
  contract_version: '0.1';
  time_anchor: TimeAnchor;
  path: ExecutionPath;
  risk_score: number;
  max_tokens: number;
  allowed_tools: string[];
  confined_access: ConfinedAccess;
  fallback_id: FallbackId;
  trace: {
    decision_reason: string;
  };
}
