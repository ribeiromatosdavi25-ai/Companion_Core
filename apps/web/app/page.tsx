'use client';

import { useState } from 'react';

const DEV_MODE_TOKEN = 'devmode2606';

interface QueryResponse {
  status: string;
  path?: string;
  answer: string;
  confidence?: number;
  source?: string;
  latency_ms: number;
  trace_id?: string;
  dev_mode?: boolean;
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
      const response = await fetch('http://localhost:3000/api/query', {
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
      setResponses(prev => [...prev, data]);
      setMessage('');
    } catch (error) {
      console.error('Query failed:', error);
      setResponses(prev => [...prev, {
        status: 'error',
        answer: 'Failed to connect to backend',
        latency_ms: 0,
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 p-8">
      <div className="max-w-3xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Companion System</h1>
          <p className="text-gray-400">Offline-first · Deterministic · Bounded</p>
        </header>

        {/* Dev Mode Toggle */}
        <div className="mb-6 p-4 bg-gray-900 rounded-lg border border-gray-800">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={devMode}
              onChange={(e) => setDevMode(e.target.checked)}
              className="w-5 h-5 accent-blue-500"
            />
            <div>
              <span className="font-medium">Dev Mode</span>
              <span className="text-sm text-gray-400 ml-2">
                (Allow external APIs · Token: {DEV_MODE_TOKEN})
              </span>
            </div>
          </label>
        </div>

        {/* Query Input */}
        <div className="mb-8">
          <div className="flex gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendQuery()}
              placeholder="What time is it? / What's the weather today?"
              className="flex-1 px-4 py-3 bg-gray-900 border border-gray-800 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
            />
            <button
              onClick={sendQuery}
              disabled={loading || !message.trim()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-800 disabled:text-gray-600 rounded-lg font-medium transition-colors"
            >
              {loading ? 'Sending...' : 'Send'}
            </button>
          </div>
        </div>

        {/* Response History */}
        <div className="space-y-4">
          {responses.map((resp, idx) => (
            <div key={idx} className="p-6 bg-gray-900 rounded-lg border border-gray-800">
              <div className="flex items-start justify-between mb-3">
                <div className="flex gap-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    resp.status === 'resolved' ? 'bg-green-900 text-green-300' :
                    resp.status === 'fallback' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-red-900 text-red-300'
                  }`}>
                    {resp.status}
                  </span>
                  {resp.path && (
                    <span className="px-2 py-1 text-xs rounded bg-gray-800 text-gray-400">
                      {resp.path}
                    </span>
                  )}
                  {resp.dev_mode && (
                    <span className="px-2 py-1 text-xs rounded bg-blue-900 text-blue-300">
                      DEV MODE
                    </span>
                  )}
                </div>
                <span className="text-xs text-gray-500">{resp.latency_ms}ms</span>
              </div>
              
              <p className="text-lg mb-3">{resp.answer}</p>
              
              <div className="flex gap-4 text-sm text-gray-500">
                {resp.source && <span>Source: {resp.source}</span>}
                {resp.confidence !== undefined && (
                  <span>Confidence: {(resp.confidence * 100).toFixed(0)}%</span>
                )}
                {resp.trace_id && <span className="font-mono text-xs">{resp.trace_id}</span>}
              </div>
            </div>
          ))}
        </div>

        {responses.length === 0 && (
          <div className="text-center py-12 text-gray-600">
            <p>No queries yet. Try asking:</p>
            <div className="mt-4 space-y-2">
              <button
                onClick={() => setMessage('What time is it?')}
                className="block mx-auto px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded transition-colors"
              >
                "What time is it?"
              </button>
              <button
                onClick={() => {
                  setMessage('What is the weather today in Stockton-on-Tees?');
                  setDevMode(true);
                }}
                className="block mx-auto px-4 py-2 bg-gray-900 hover:bg-gray-800 rounded transition-colors"
              >
                "What's the weather?" (enable dev mode first)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
