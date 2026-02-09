export interface NormalizedRequest {
  request_hash: string;
  trace_id: string;
  text: string;
  language: string;
  intent_hints: string[];
  timestamp_ms: number;
}
