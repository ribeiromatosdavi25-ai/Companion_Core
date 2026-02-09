import express from 'express';
import { Normalizer } from './middleware/normalize';
import { ContractRouter } from '@companion/router';
import { OfflineResolver } from '@companion/resolver-offline';
import { SafeCacheResolver } from '@companion/resolver-cache';

const app = express();
app.use(express.json());

// Initialize components
const contractRouter = new ContractRouter();
const offlineResolver = new OfflineResolver();
const cacheResolver = new SafeCacheResolver();

// Session state (in-memory for MVP)
const sessions = new Map<string, { start: Date; lastTurn: Date | null }>();

app.post('/api/query', async (req, res) => {
  const start_time = Date.now();
  
  try {
    // Phase 1: Normalize
    const normalized = Normalizer.normalize(req.body.message || '');
    
    // Get or create session
    const session_id = req.body.session_id || 'default';
    let session = sessions.get(session_id);
    if (!session) {
      session = { start: new Date(), lastTurn: null };
      sessions.set(session_id, session);
    }

    // Phase 2: Contract Router
    const contract = contractRouter.route(
      normalized,
      session.start,
      session.lastTurn
    );

    let result: any = null;

    // Phase 3: Fast Resolvers
    if (contract.path === 'OFFLINE') {
      result = await offlineResolver.resolve(normalized);
    } else if (contract.path === 'SAFE_CACHE') {
      result = await cacheResolver.resolve(normalized);
    }

    // Update session
    session.lastTurn = new Date();

    // Build response
    if (result && result !== 'MISS') {
      return res.json({
        status: 'resolved',
        path: contract.path,
        answer: result.answer,
        confidence: result.confidence,
        source: result.source,
        latency_ms: Date.now() - start_time,
        trace_id: normalized.trace_id,
      });
    }

    // Fallback
    return res.json({
      status: 'fallback',
      path: contract.path,
      fallback_id: contract.fallback_id,
      answer: 'I cannot answer that right now.',
      latency_ms: Date.now() - start_time,
      trace_id: normalized.trace_id,
    });

  } catch (error) {
    return res.status(500).json({
      status: 'error',
      message: 'Internal error',
      latency_ms: Date.now() - start_time,
    });
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Gateway listening on port ${PORT}`);
});
