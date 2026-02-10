'use client';

import { useState, useRef, useEffect } from 'react';

const DEV_MODE_TOKEN = 'devmode2606';
const GATEWAY_URL = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';

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

interface Message {
  role: 'user' | 'assistant';
  content: string;
  meta?: QueryResponse;
  timestamp: Date;
}

export default function Home() {
  const [input, setInput] = useState('');
  const [devMode, setDevMode] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
  };

  const sendQuery = async () => {
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    setLoading(true);

    try {
      const response = await fetch(`${GATEWAY_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: trimmed,
          session_id: 'web-session-1',
          dev_mode: devMode ? { token: DEV_MODE_TOKEN, allow_external: true } : undefined,
        }),
      });

      const data: QueryResponse = await response.json();
      const assistantMsg: Message = {
        role: 'assistant',
        content: data.answer,
        meta: data,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Connection failed. Is the gateway running on port 3000?',
        meta: { status: 'error', answer: '', latency_ms: 0 },
        timestamp: new Date(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendQuery();
    }
  };

  const clearChat = () => setMessages([]);

  const formatTime = (d: Date) =>
    d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const statusColor = (status?: string) => {
    if (status === 'resolved') return '#22c55e';
    if (status === 'fallback') return '#eab308';
    if (status === 'error') return '#ef4444';
    return '#6b7280';
  };

  return (
    <div className="chat-root">
      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-header">
          <span className="logo-text">udia</span>
          <button className="icon-btn" onClick={() => setSidebarOpen(false)} title="Close">
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <button className="new-chat-btn" onClick={clearChat}>
          <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path d="M12 5v14M5 12h14"/>
          </svg>
          Nueva conversación
        </button>

        <div className="sidebar-section">
          <span className="sidebar-label">Sistema</span>
          <div className="dev-toggle">
            <label className="toggle-row">
              <div className="toggle-switch">
                <input
                  type="checkbox"
                  checked={devMode}
                  onChange={e => setDevMode(e.target.checked)}
                />
                <span className="toggle-track" />
              </div>
              <div>
                <div className="toggle-title">Dev Mode</div>
                <div className="toggle-sub">APIs externas habilitadas</div>
              </div>
            </label>
          </div>
        </div>

        <div className="sidebar-footer">
          <div className="gateway-status">
            <span className="status-dot" />
            <span>Gateway · localhost:3000</span>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && <div className="overlay" onClick={() => setSidebarOpen(false)} />}

      {/* Main */}
      <div className="main">
        {/* Top bar */}
        <header className="topbar">
          <button className="icon-btn" onClick={() => setSidebarOpen(true)} title="Menu">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M3 12h18M3 6h18M3 18h18"/>
            </svg>
          </button>
          <div className="topbar-brand">
            <span className="logo-text">udia</span>
            <span className="topbar-model">Companion Core</span>
          </div>
          {devMode && <span className="dev-badge">DEV</span>}
        </header>

        {/* Messages */}
        <div className="messages-area">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="empty-logo">udia</div>
              <p className="empty-tagline">Tu asistente de IA. Siempre disponible.</p>
              <div className="suggestions">
                {[
                  '¿Qué hora es?',
                  '¿Cuál es el estado del sistema?',
                  '¿Qué puedes hacer?',
                ].map(s => (
                  <button key={s} className="suggestion-chip" onClick={() => {
                    setInput(s);
                    inputRef.current?.focus();
                  }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`message-row message-row--${msg.role}`}>
              <div className={`bubble bubble--${msg.role}`}>
                <p>{msg.content}</p>
                {msg.role === 'assistant' && msg.meta && (
                  <div className="meta-row">
                    <span
                      className="meta-status"
                      style={{ color: statusColor(msg.meta.status) }}
                    >
                      ● {msg.meta.status}
                    </span>
                    {msg.meta.path && <span className="meta-tag">{msg.meta.path}</span>}
                    {msg.meta.source && <span className="meta-tag">{msg.meta.source}</span>}
                    {msg.meta.confidence !== undefined && (
                      <span className="meta-tag">{(msg.meta.confidence * 100).toFixed(0)}%</span>
                    )}
                    <span className="meta-latency">{msg.meta.latency_ms}ms</span>
                    <span className="meta-time">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
                {msg.role === 'user' && (
                  <div className="meta-row meta-row--right">
                    <span className="meta-time">{formatTime(msg.timestamp)}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="message-row message-row--assistant">
              <div className="bubble bubble--assistant bubble--loading">
                <span className="dot-1" />
                <span className="dot-2" />
                <span className="dot-3" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="input-area">
          <div className="input-box">
            <textarea
              ref={inputRef}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Escribe tu mensaje... (Enter para enviar)"
              rows={1}
              disabled={loading}
              className="input-textarea"
            />
            <button
              onClick={sendQuery}
              disabled={loading || !input.trim()}
              className="send-btn"
              title="Enviar"
            >
              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                <path d="M22 2L11 13M22 2L15 22l-4-9-9-4 20-7z"/>
              </svg>
            </button>
          </div>
          <p className="input-hint">Shift+Enter para nueva línea · Enter para enviar</p>
        </div>
      </div>

      <style jsx>{`
        /* ── Reset & Root ── */
        .chat-root {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          background: #0a0a0a;
          color: #e8e8e8;
          font-family: 'Geist', 'SF Pro Display', -apple-system, BlinkMacSystemFont, sans-serif;
        }

        /* ── Sidebar ── */
        .sidebar {
          position: fixed;
          top: 0;
          left: 0;
          height: 100vh;
          width: 260px;
          background: #111111;
          border-right: 1px solid #1e1e1e;
          display: flex;
          flex-direction: column;
          transform: translateX(-100%);
          transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          z-index: 50;
        }
        .sidebar--open {
          transform: translateX(0);
        }
        .overlay {
          position: fixed;
          inset: 0;
          background: rgba(0,0,0,0.5);
          z-index: 40;
        }
        .sidebar-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 16px 16px;
          border-bottom: 1px solid #1e1e1e;
        }
        .logo-text {
          font-size: 22px;
          font-weight: 800;
          letter-spacing: -0.5px;
          color: #ffffff;
        }
        .new-chat-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          margin: 12px 12px 0;
          padding: 10px 14px;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 8px;
          color: #e8e8e8;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .new-chat-btn:hover { background: #222; }
        .sidebar-section {
          padding: 20px 16px 0;
          flex: 1;
        }
        .sidebar-label {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #555;
          display: block;
          margin-bottom: 10px;
        }
        .dev-toggle {
          background: #161616;
          border: 1px solid #222;
          border-radius: 8px;
          padding: 12px;
        }
        .toggle-row {
          display: flex;
          align-items: center;
          gap: 12px;
          cursor: pointer;
        }
        .toggle-switch { position: relative; width: 36px; height: 20px; flex-shrink: 0; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-track {
          position: absolute;
          inset: 0;
          background: #2a2a2a;
          border-radius: 10px;
          transition: background 0.2s;
        }
        .toggle-track::after {
          content: '';
          position: absolute;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #888;
          top: 3px;
          left: 3px;
          transition: all 0.2s;
        }
        .toggle-switch input:checked ~ .toggle-track { background: #1d4ed8; }
        .toggle-switch input:checked ~ .toggle-track::after {
          background: #fff;
          transform: translateX(16px);
        }
        .toggle-title { font-size: 13px; font-weight: 500; color: #e8e8e8; }
        .toggle-sub { font-size: 11px; color: #555; margin-top: 1px; }
        .sidebar-footer {
          padding: 16px;
          border-top: 1px solid #1e1e1e;
        }
        .gateway-status {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 11px;
          color: #555;
        }
        .status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #22c55e;
          box-shadow: 0 0 6px #22c55e88;
          flex-shrink: 0;
        }

        /* ── Main ── */
        .main {
          flex: 1;
          display: flex;
          flex-direction: column;
          min-width: 0;
          height: 100vh;
        }

        /* ── Topbar ── */
        .topbar {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          border-bottom: 1px solid #1a1a1a;
          background: #0a0a0a;
          flex-shrink: 0;
        }
        .topbar-brand {
          display: flex;
          align-items: baseline;
          gap: 10px;
          flex: 1;
        }
        .topbar-model {
          font-size: 12px;
          color: #444;
          letter-spacing: 0.02em;
        }
        .dev-badge {
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.1em;
          color: #60a5fa;
          background: #1e3a5f;
          border: 1px solid #2563eb44;
          border-radius: 4px;
          padding: 2px 7px;
        }
        .icon-btn {
          background: none;
          border: none;
          color: #666;
          cursor: pointer;
          padding: 6px;
          border-radius: 6px;
          display: flex;
          align-items: center;
          transition: color 0.15s, background 0.15s;
        }
        .icon-btn:hover { color: #e8e8e8; background: #1a1a1a; }

        /* ── Messages ── */
        .messages-area {
          flex: 1;
          overflow-y: auto;
          padding: 24px 0;
          scroll-behavior: smooth;
        }
        .messages-area::-webkit-scrollbar { width: 4px; }
        .messages-area::-webkit-scrollbar-track { background: transparent; }
        .messages-area::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }

        /* ── Empty State ── */
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 80px 24px 40px;
          text-align: center;
          min-height: 40vh;
        }
        .empty-logo {
          font-size: 52px;
          font-weight: 800;
          letter-spacing: -2px;
          color: #ffffff;
          margin-bottom: 12px;
        }
        .empty-tagline {
          font-size: 15px;
          color: #555;
          margin-bottom: 32px;
        }
        .suggestions {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          justify-content: center;
        }
        .suggestion-chip {
          padding: 8px 16px;
          background: #141414;
          border: 1px solid #242424;
          border-radius: 20px;
          color: #888;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .suggestion-chip:hover {
          background: #1a1a1a;
          border-color: #333;
          color: #ddd;
        }

        /* ── Message Rows ── */
        .message-row {
          display: flex;
          padding: 4px 16px;
          max-width: 800px;
          margin: 0 auto;
          width: 100%;
        }
        .message-row--user { justify-content: flex-end; }
        .message-row--assistant { justify-content: flex-start; }

        .bubble {
          max-width: 72%;
          padding: 12px 16px;
          border-radius: 16px;
          font-size: 15px;
          line-height: 1.6;
        }
        .bubble p { margin: 0; white-space: pre-wrap; word-break: break-word; }
        .bubble--user {
          background: #1d4ed8;
          color: #ffffff;
          border-bottom-right-radius: 4px;
        }
        .bubble--assistant {
          background: #141414;
          color: #e8e8e8;
          border: 1px solid #1e1e1e;
          border-bottom-left-radius: 4px;
        }

        /* Loading dots */
        .bubble--loading {
          display: flex;
          align-items: center;
          gap: 5px;
          padding: 16px 18px;
        }
        .bubble--loading span {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #444;
          display: inline-block;
          animation: bounce 1.2s infinite ease-in-out;
        }
        .dot-1 { animation-delay: 0s; }
        .dot-2 { animation-delay: 0.2s; }
        .dot-3 { animation-delay: 0.4s; }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); opacity: 0.4; }
          40% { transform: translateY(-6px); opacity: 1; }
        }

        /* Meta row */
        .meta-row {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-top: 8px;
          flex-wrap: wrap;
        }
        .meta-row--right { justify-content: flex-end; }
        .meta-status { font-size: 11px; font-weight: 500; }
        .meta-tag {
          font-size: 10px;
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          border-radius: 4px;
          padding: 1px 6px;
          color: #666;
          font-family: 'SF Mono', 'Fira Code', monospace;
        }
        .meta-latency { font-size: 10px; color: #444; margin-left: auto; }
        .meta-time { font-size: 10px; color: #444; }

        /* ── Input ── */
        .input-area {
          padding: 16px;
          border-top: 1px solid #141414;
          background: #0a0a0a;
          flex-shrink: 0;
        }
        .input-box {
          display: flex;
          align-items: flex-end;
          gap: 10px;
          background: #111111;
          border: 1px solid #222;
          border-radius: 14px;
          padding: 10px 10px 10px 16px;
          max-width: 800px;
          margin: 0 auto;
          transition: border-color 0.2s;
        }
        .input-box:focus-within { border-color: #333; }
        .input-textarea {
          flex: 1;
          background: transparent;
          border: none;
          outline: none;
          color: #e8e8e8;
          font-size: 15px;
          line-height: 1.5;
          resize: none;
          font-family: inherit;
          max-height: 160px;
          overflow-y: auto;
        }
        .input-textarea::placeholder { color: #444; }
        .input-textarea::-webkit-scrollbar { width: 3px; }
        .input-textarea::-webkit-scrollbar-thumb { background: #222; }
        .send-btn {
          width: 36px;
          height: 36px;
          border-radius: 9px;
          background: #1d4ed8;
          border: none;
          color: #fff;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s, opacity 0.15s;
        }
        .send-btn:hover:not(:disabled) { background: #2563eb; }
        .send-btn:disabled { background: #1a1a1a; color: #333; cursor: not-allowed; }
        .input-hint {
          text-align: center;
          font-size: 11px;
          color: #333;
          margin: 8px auto 0;
          max-width: 800px;
        }
      `}</style>
    </div>
  );
}
