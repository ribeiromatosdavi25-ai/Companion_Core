import { createHash } from 'crypto';

export class HashUtils {
  static sha256(input: string): string {
    return createHash('sha256').update(input).digest('hex');
  }

  static generateTraceId(): string {
    return `trace_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`;
  }
}
