import express from 'express';
import { Normalizer } from './middleware/normalize';
import { ContractRouter } from '@companion/router';
import { OfflineResolver } from '@companion/resolver-offline';
import { SafeCacheResolver } from '@companion/resolver-cache';
import { ExternalResolver } from '@companion/resolver-external';
import { ModelOrchestrator } from '@companion/orchestrator';
import { CircuitBreaker, RateLimiter } from '@companion/shared/utils/circuit-breaker';
import { FallbackRegistry } from '@companion/shared/fallbacks/registry';
import { isValidDevToken, DevModeRequest } from '@companion/shared/types/DevMode';
import cors from 'cors';

const app = express();
app.use(cors());
app.use(express.json());

// Initialize components
const contractRouter = new ContractRouter();
const offlineResolver = new OfflineResolver();
const cacheResolver = new SafeCacheResolver();
const externalResolver = new ExternalResolver();
const modelOrchestrator = new ModelOrchestrator(process.env.ANTHROPIC_API_KEY || '');

// Circuit breakers
const claudeBreaker = new CircuitBreaker(5, 60000);
const externalBreaker = new CircuitBreaker(3, 30000);

// Rate limiters
const userLimiter = new RateLimiter(60, 60000);
const modelLimiter = new RateLimiter(10, 60000);

// Session state
const sessions = new Map<string, { start: Date; lastTurn: Date | null }>();

app.post('/api/query', async (req, res) => {
  const start_time = Date.now();
  const body: DevModeRequest = req.body;
  const session_id = body.session_id || 'default';

  try {
    // Rate limit check
    if (!userLimiter.isAllowed(session_id)) {
      return res.status(429).json({
        status: 'rate_limited',
        message: 'Too many requests',
      });
    }

    // Dev mode validation
    const devModeAllowed = body.dev_mode?.allow_external && 
                          isValidDevToken(body.dev_mode?.token);

    // Phase 1: Normalize
    const normalized = Normalizer.normalize(body.message || '');
    
    // Get/create session
    let session = sessions.get(session_id);
    if (!session) {
      session = { start: new Date(), lastTurn: null };
      sessions.set(session_id, session);
    }

    // Phase 2: Contract Router
    const contract = contractRouter.route(
      normalized,
      session.start,
      session.lastTurn,
      { devModeAllowed }
    );

    let result: any = null;

    // Phase 3: Fast Resolvers
    if (contract.path === 'OFFLINE') {
      result = await offlineResolver.resolve(normalized);
    } else if (contract.path === 'SAFE_CACHE') {
      result = await cacheResolver.resolve(normalized);
      
      // Escalate to external on cache miss
      if (result === 'MISS' && !externalBreaker.isOpen()) {
        try {
          result = await externalResolver.resolve(normalized);
          if (result !== 'MISS') {
            externalBreaker.recordSuccess();
            cacheResolver.set('weather:default', result.answer, result.confidence, 300000);
          }
        } catch (err) {
          externalBreaker.recordFailure();
        }
      }
    }

    // Phase 4: External API (dev mode only)
    if (contract.path === 'EXTERNAL_API' && !externalBreaker.isOpen()) {
      try {
        result = await externalResolver.resolve(normalized);
        if (result !== 'MISS') {
          externalBreaker.recordSuccess();
          // Cache for future non-dev requests
          cacheResolver.set('weather:default', result.answer, result.confidence, 300000);
        }
      } catch (err) {
        externalBreaker.recordFailure();
        result = 'MISS';
      }
    }

    // Phase 5: Model execution (disabled in dev mode for now)
    if (contract.path === 'MODEL' && !claudeBreaker.isOpen()) {
      if (!modelLimiter.isAllowed(session_id)) {
        contract.path = 'DENY';
        contract.fallback_id = 'FALLBACK_PUBLIC_SAFE';
      } else {
        // Model execution placeholder
        result = {
          answer: 'Model execution available in future releases.',
          confidence: 0.5,
          source: 'system.placeholder',
          timestamp_ms: Date.now(),
        };
      }
    }

    // Update session
    session.lastTurn = new Date();

    // Phase 6: Response delivery
    if (result && result !== 'MISS') {
      return res.json({
        status: 'resolved',
        path: contract.path,
        answer: result.answer,
        confidence: result.confidence,
        source: result.source,
        latency_ms: Date.now() - start_time,
        trace_id: normalized.trace_id,
        dev_mode: devModeAllowed,
      });
    }

    // Fallback
    const fallback = FallbackRegistry.get(contract.fallback_id);
    return res.json({
      status: 'fallback',
      path: contract.path,
      fallback_id: contract.fallback_id,
      answer: fallback.message,
      suggest_action: fallback.suggest_action,
      latency_ms: Date.now() - start_time,
      trace_id: normalized.trace_id,
    });

  } catch (error) {
    console.error('Query error:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Internal error',
      latency_ms: Date.now() - start_time,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    circuit_breakers: {
      claude: claudeBreaker.getState(),
      external: externalBreaker.getState(),
    },
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gateway listening on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
