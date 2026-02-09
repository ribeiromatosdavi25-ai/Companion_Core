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
        const weather = await this.fetchWeather('default');
        return {
          answer: `Weather: ${weather.condition}, ${weather.temperature}°C in ${weather.location}`,
          confidence: 0.9,
          source: 'external.weather_api',
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

  private async fetchWeather(location: string): Promise<WeatherResponse> {
    // Mock implementation - replace with actual API
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          temperature: 18,
          condition: 'Partly cloudy',
          location: 'London',
        });
      }, 100);
    });
  }
}
