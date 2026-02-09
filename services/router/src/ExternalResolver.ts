import { NormalizedRequest } from '@companion/shared/types';
import { ResolvedAnswer, ResolutionResult } from '@companion/resolver-offline';

interface WeatherResponse {
  temperature: number;
  condition: string;
  location: string;
}

export class ExternalResolver {
  private readonly budget_ms = 350;
  private readonly timeout_ms = 250;

  async resolve(request: NormalizedRequest): Promise<ResolutionResult> {
    const start = Date.now();

    if (request.intent_hints.includes('weather')) {
      try {
        const weather = await this.fetchWeatherLive();
        return {
          answer: `Current weather in ${weather.location}: ${weather.condition}, ${weather.temperature}°C`,
          confidence: 0.95,
          source: 'external.wttr.in',
          timestamp_ms: Date.now(),
        };
      } catch (err) {
        return 'MISS';
      }
    }

    if (Date.now() - start > this.budget_ms) {
      return 'MISS';
    }

    return 'MISS';
  }

  private async fetchWeatherLive(): Promise<WeatherResponse> {
    // Using wttr.in free API (no key required)
    const response = await fetch('https://wttr.in/Stockton-on-Tees?format=j1', {
      signal: AbortSignal.timeout(this.timeout_ms),
    });

    if (!response.ok) throw new Error('Weather API failed');

    const data = await response.json();
    const current = data.current_condition[0];

    return {
      temperature: parseInt(current.temp_C),
      condition: current.weatherDesc[0].value,
      location: 'Stockton-on-Tees',
    };
  }
}
