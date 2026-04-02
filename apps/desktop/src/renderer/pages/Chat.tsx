import React, { useEffect, useRef, useState } from 'react';
import type { ChatAnswer } from '../pocket.js';
import { formatCurrency, formatDate } from '../utils/format.js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  answer?: ChatAnswer;
  timestamp: string;
}

const SUGGESTED = [
  'How much did I spend on groceries this month?',
  'What are my recurring payments?',
  'Compare this month to last month',
  'What new merchants appeared recently?',
  'What are my largest expenses?',
  'What are my top merchants?',
];

export function Chat(): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (question: string) => {
    if (!question.trim() || loading) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: question.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const answer = await window.pocket.insights.chat(question);
      const assistantMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: answer.text,
        answer,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: 'assistant',
        text: 'An error occurred while processing your question.',
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void sendMessage(input); }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 24px' }}>
        <h1 style={{ margin: 0, fontSize: 18, fontWeight: 700 }}>Financial Chat</h1>
        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
          Ask questions about your accepted, normalized transaction data. All answers are grounded in local data.
        </p>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {messages.length === 0 && (
          <div style={{ maxWidth: 640, margin: '40px auto 0', textAlign: 'center' }}>
            <p style={{ fontSize: 15, color: '#374151', marginBottom: 20 }}>Try asking one of these questions:</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => void sendMessage(q)}
                  style={{
                    background: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: 8,
                    padding: '10px 16px',
                    fontSize: 13,
                    color: '#374151',
                    cursor: 'pointer',
                    textAlign: 'left',
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <ChatBubble key={msg.id} msg={msg} />
        ))}

        {loading && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#1d4ed8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', flexShrink: 0 }}>
              P
            </div>
            <div style={{ background: '#fff', borderRadius: '12px 12px 12px 4px', padding: '12px 16px', border: '1px solid #e5e7eb', color: '#9ca3af', fontSize: 13, fontStyle: 'italic' }}>
              Querying your data...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: '#fff', borderTop: '1px solid #e5e7eb', padding: '14px 24px' }}>
        <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', gap: 10 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your finances..."
            aria-label="Chat input"
            disabled={loading}
            style={{
              flex: 1,
              border: '1px solid #d1d5db',
              borderRadius: 8,
              padding: '10px 14px',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={() => void sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
            style={{
              padding: '10px 20px',
              background: '#1d4ed8',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              fontSize: 14,
              fontWeight: 600,
              cursor: loading || !input.trim() ? 'default' : 'pointer',
              opacity: loading || !input.trim() ? 0.5 : 1,
            }}
          >
            Send
          </button>
        </div>
        <div style={{ maxWidth: 800, margin: '6px auto 0', fontSize: 11, color: '#9ca3af' }}>
          Chat is read-only and queries only accepted, normalized data — never raw import files.
        </div>
      </div>
    </div>
  );
}

function ChatBubble({ msg }: { msg: Message }) {
  const [showSources, setShowSources] = useState(false);
  const isUser = msg.role === 'user';

  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start', flexDirection: isUser ? 'row-reverse' : 'row' }}>
      {/* Avatar */}
      <div style={{
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        background: isUser ? '#374151' : '#1d4ed8',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: '#fff', fontWeight: 700,
      }}>
        {isUser ? 'U' : 'P'}
      </div>

      {/* Bubble */}
      <div style={{ maxWidth: 640 }}>
        <div style={{
          background: isUser ? '#1d4ed8' : '#fff',
          color: isUser ? '#fff' : '#111827',
          borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
          padding: '12px 16px',
          border: isUser ? 'none' : '1px solid #e5e7eb',
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}>
          {msg.text}
        </div>

        {/* Uncertainty */}
        {msg.answer?.uncertainty && (
          <div style={{ marginTop: 6, fontSize: 12, color: '#92400e', background: '#fef3c7', borderRadius: 6, padding: '4px 10px' }}>
            Note: {msg.answer.uncertainty}
          </div>
        )}

        {/* Sources */}
        {msg.answer && msg.answer.sources.length > 0 && (
          <div style={{ marginTop: 6 }}>
            <button
              onClick={() => setShowSources((s) => !s)}
              style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#6b7280', padding: '0 2px' }}
            >
              {showSources ? 'Hide' : 'Show'} {msg.answer.sources.length} source transaction{msg.answer.sources.length > 1 ? 's' : ''}
            </button>
            {showSources && (
              <div style={{ marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 }}>
                {msg.answer.sources.map((s, i) => (
                  <div key={i} style={{ background: '#f9fafb', borderRadius: 6, padding: '6px 12px', fontSize: 12, color: '#374151', border: '1px solid #e5e7eb', display: 'flex', gap: 10 }}>
                    <span style={{ color: '#9ca3af', fontFamily: 'monospace' }}>{formatDate(s.date)}</span>
                    <span style={{ flex: 1 }}>{s.description}</span>
                    <span style={{ fontWeight: 700, color: s.amount < 0 ? '#dc2626' : '#16a34a' }}>
                      {formatCurrency(s.amount, s.currency)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Query plan (debug, subtle) */}
        {msg.answer && (
          <div style={{ marginTop: 4, fontSize: 11, color: '#d1d5db' }}>
            {msg.answer.queryPlan.humanReadable}
          </div>
        )}
      </div>
    </div>
  );
}
