'use client';

import { useState } from 'react';

const DEV_MODE_TOKEN = 'devmode2606';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

interface QueryResponse {
  status: string;
  path?: string;
  answer: string;
  confidence?: number;
  source?: string;
  latency_ms: number;
  trace_id?: string;
  dev_mode?: boolean;
  suggest_action?: string;
}

export default function Home() {
  const [message, setMessage] = useState('');
  const [devMode, setDevMode] = useState(false);
  const [responses, setResponses] = useState<QueryResponse[]>([]);
  const [loading, setLoading] = useState(false);

  const sendQuery = async () => {
    if (!message.trim()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          session_id: 'web-session-1',
          dev_mode: devMode ? {
            token: DEV_MODE_TOKEN,
            allow_external: true,
          } : undefined,
        }),
      });

      const data: QueryResponse = await response.json();
      setResponses(prev => [data, ...prev]);
      setMessage('');
    } catch (error) {
      console.error('Query failed:', error);
      setResponses(prev => [{
        status: 'error',
        answer: 'Failed to connect to backend. Check API_URL configuration.',
        latency_ms: 0,
      }, ...prev]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <header className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
            Companion System
          </h1>
          <p className="text-gray-400">Offline-first · Deterministic · Bounded</p>
          <div className="mt-2 text-xs text-gray-600 font-mono">
            API: {API_URL}
          </div>
        </header>

        <div className="mb-6 p-4 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <div className="relative">
              <input
                type="checkbox"
                checked={devMode}
                onChange={(e) => setDevMode(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-700 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </div>
            <div>
              <span className="font-medium">Dev Mode</span>
              <span className="text-sm text-gray-400 ml-2">(External API access)</span>
            </div>
          </label>
        </div>

        <div className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !loading && sendQuery()}
              placeholder="What time is it? / What's the weather today?"
              className="flex-1 px-4 py-3 bg-gray-900/50 backdrop-blur border border-gray-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-gray-600"
              disabled={loading}
            />
            <button
              onClick={sendQuery}
              disabled={loading || !message.trim()}
              className="px-8 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 disabled:from-gray-800 disabled:to-gray-800 disabled:text-gray-600 rounded-xl font-medium transition-all"
            >
              {loading ? '...' : 'Send'}
            </button>
          </div>
        </div>

        <div className="mb-8 flex flex-wrap gap-2">
          <button
            onClick={() => setMessage('What time is it?')}
            className="px-4 py-2 bg-gray-900/30 hover:bg-gray-900/50 border border-gray-800 rounded-lg text-sm"
          >
            Time
          </button>
          <button
            onClick={() => {
              setMessage('What is the weather today in Stockton-on-Tees?');
              setDevMode(true);
            }}
            className="px-4 py-2 bg-gray-900/30 hover:bg-gray-900/50 border border-gray-800 rounded-lg text-sm"
          >
            Weather
          </button>
        </div>

        <div className="space-y-4">
          {responses.map((resp, idx) => (
            <div key={idx} className="p-6 bg-gray-900/50 backdrop-blur rounded-xl border border-gray-800">
              <div className="flex items-start justify-between mb-3 flex-wrap gap-2">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                    resp.status === 'resolved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                    resp.status === 'fallback' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                    'bg-red-500/10 text-red-400 border border-red-500/20'
                  }`}>
                    {resp.status.toUpperCase()}
                  </span>
                  {resp.path && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      {resp.path}
                    </span>
                  )}
                  {resp.dev_mode && (
                    <span className="px-3 py-1 text-xs font-medium rounded-full bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      DEV
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500 font-mono">{resp.latency_ms}ms</span>
              </div>
              <p className="text-lg mb-3">{resp.answer}</p>
              {resp.suggest_action && (
                <p className="text-sm text-gray-400 mb-3">→ {resp.suggest_action}</p>
              )}
              <div className="flex gap-4 text-xs text-gray-500 flex-wrap">
                {resp.source && <span className="font-mono">source: {resp.source}</span>}
                {resp.confidence !== undefined && <span>confidence: {(resp.confidence * 100).toFixed(0)}%</span>}
              </div>
            </div>
          ))}
        </div>

        {responses.length === 0 && (
          <div className="text-center py-16 text-gray-600">
            <div className="text-6xl mb-4">💬</div>
            <p className="text-lg mb-6">No queries yet</p>
            <p className="text-sm">Try the quick actions above</p>
          </div>
        )}
      </div>
    </div>
  );
}
