import { NormalizedRequest } from '@companion/shared/types';
import { HashUtils } from '@companion/shared/utils/hash';

export class Normalizer {
  static normalize(rawMessage: string): NormalizedRequest {
    const text = rawMessage.trim();
    const language = this.detectLanguage(text);
    const intent_hints = this.extractIntentHints(text);

    return {
      request_hash: HashUtils.sha256(text),
      trace_id: HashUtils.generateTraceId(),
      text,
      language,
      intent_hints,
      timestamp_ms: Date.now(),
    };
  }

  private static detectLanguage(text: string): string {
    // Simple heuristic; expand as needed
    return 'en';
  }

  private static extractIntentHints(text: string): string[] {
    const hints: string[] = [];
    const lower = text.toLowerCase();

    if (/\b(weather|forecast|temperature)\b/.test(lower)) hints.push('weather');
    if (/\b(time|clock|timezone)\b/.test(lower)) hints.push('time');
    if (/\b(remember|recall|memory)\b/.test(lower)) hints.push('memory');

    return hints;
  }
}
