import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { ChatAnswer } from '../pocket.js';
import { formatCurrency, formatDate } from '../utils/format.js';
import {
  Chip,
  PageHeader,
  PrimaryButton,
  QuietCard,
  SecondaryButton,
  WorkspacePage,
} from '../components/Workspace.js';
import { theme } from '../theme.js';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  answer?: ChatAnswer;
  timestamp: string;
}

const SUGGESTED = [
  'Summarize this month in plain language',
  'How much did I spend on groceries this month?',
  'What changed versus last month?',
  'What recurring payments do I have?',
  'Which merchants are new or suspicious?',
  'What are my largest non-recurring expenses?',
];

interface Props {
  queuedQuestion?: { id: number; text: string } | null;
  onQuestionConsumed?: () => void;
}

export function Chat({ queuedQuestion, onQuestionConsumed }: Props): React.ReactElement {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousQueued = useRef<number | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!queuedQuestion || queuedQuestion.id === previousQueued.current) return;
    previousQueued.current = queuedQuestion.id;
    void sendMessage(queuedQuestion.text);
    onQuestionConsumed?.();
  }, [onQuestionConsumed, queuedQuestion]);

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

  const summaryCards = useMemo(() => [
    {
      label: 'Grounded answers',
      value: 'Accepted local data only',
      detail: 'Pocket answers from normalized transactions, not raw documents.',
    },
    {
      label: 'Sources',
      value: messages.filter((message) => message.answer?.sources.length).length > 0
        ? `${messages.reduce((sum, message) => sum + (message.answer?.sources.length ?? 0), 0)} cited`
        : 'Shown when helpful',
      detail: 'Evidence stays close to each answer instead of cluttering the main view.',
    },
  ], [messages]);

  return (
    <WorkspacePage width={1100}>
      <PageHeader
        eyebrow="Assistant"
        title="Ask Pocket"
        description="Use natural questions to inspect accepted activity, compare periods, and understand what changed."
      />

      <div style={{ display: 'grid', gridTemplateColumns: '320px minmax(0, 1fr)', gap: 18, alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 18, position: 'sticky', top: 28 }}>
          <QuietCard title="Start with a goal" subtitle="Prompt groups make the assistant feel like part of the product, not a blank screen.">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {SUGGESTED.map((q) => (
                <button
                  key={q}
                  onClick={() => void sendMessage(q)}
                  style={{
                    background: theme.colors.surfaceAlt,
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: theme.radius.md,
                    padding: '10px 12px',
                    fontSize: 13,
                    color: theme.colors.text,
                    cursor: 'pointer',
                    textAlign: 'left',
                    lineHeight: 1.45,
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </QuietCard>

          {summaryCards.map((card) => (
            <QuietCard key={card.label} padding={18}>
              <div style={{ ...theme.type.label, color: theme.colors.textSoft, marginBottom: 8 }}>{card.label}</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.text, lineHeight: 1.2 }}>{card.value}</div>
              <div style={{ fontSize: 12, color: theme.colors.textMuted, lineHeight: 1.5, marginTop: 6 }}>{card.detail}</div>
            </QuietCard>
          ))}
        </div>

        <QuietCard padding={0}>
          <div style={{ padding: '18px 20px', borderBottom: `1px solid ${theme.colors.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: theme.colors.text }}>Grounded conversation</div>
                <div style={{ fontSize: 12, color: theme.colors.textMuted, marginTop: 4 }}>
                  Answers are read-only and grounded in accepted, normalized data.
                </div>
              </div>
              <Chip tone="accent">Read-only</Chip>
            </div>
          </div>

          <div style={{ minHeight: 540, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
            {messages.length === 0 && (
              <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: theme.colors.text }}>Start with a financial question.</div>
                <div style={{ fontSize: 13, color: theme.colors.textMuted, marginTop: 8 }}>
                  Pocket will answer with local evidence when it has enough support.
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <ChatBubble key={msg.id} msg={msg} />
            ))}

            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 34, height: 34, borderRadius: 999, background: theme.colors.accentSoft, color: theme.colors.accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700 }}>
                  P
                </div>
                <div style={{ background: theme.colors.surfaceAlt, borderRadius: 16, padding: '12px 14px', color: theme.colors.textSoft, fontSize: 13 }}>
                  Reading your accepted activity...
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          <div style={{ borderTop: `1px solid ${theme.colors.border}`, padding: 20 }}>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about spending, recurring charges, changes, or suspicious activity..."
                aria-label="Chat input"
                disabled={loading}
                style={{
                  flex: 1,
                  border: `1px solid ${theme.colors.borderStrong}`,
                  borderRadius: theme.radius.md,
                  padding: '12px 14px',
                  fontSize: 14,
                  outline: 'none',
                  color: theme.colors.text,
                }}
              />
              <PrimaryButton onClick={() => void sendMessage(input)} disabled={loading || !input.trim()} aria-label="Send message">
                Ask
              </PrimaryButton>
              <SecondaryButton onClick={() => setMessages([])} disabled={messages.length === 0 || loading}>
                Clear
              </SecondaryButton>
            </div>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.colors.textSoft }}>
              Pocket never answers from raw import files by default. It works from accepted normalized data and shows evidence when available.
            </div>
          </div>
        </QuietCard>
      </div>
    </WorkspacePage>
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
          background: isUser ? theme.colors.accent : theme.colors.surfaceAlt,
          color: isUser ? '#fff' : theme.colors.text,
          borderRadius: isUser ? '16px 16px 6px 16px' : '16px 16px 16px 6px',
          padding: '12px 16px',
          border: isUser ? 'none' : `1px solid ${theme.colors.border}`,
          fontSize: 14,
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
        }}>
          {msg.text}
        </div>

        {/* Uncertainty */}
        {msg.answer?.uncertainty && (
          <div style={{ marginTop: 6, fontSize: 12, color: theme.colors.warning, background: theme.colors.warningSoft, borderRadius: 8, padding: '6px 10px' }}>
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
                  <div key={i} style={{ background: theme.colors.surface, borderRadius: 8, padding: '8px 12px', fontSize: 12, color: theme.colors.textMuted, border: `1px solid ${theme.colors.border}`, display: 'flex', gap: 10 }}>
                    <span style={{ color: theme.colors.textSoft, fontFamily: 'monospace' }}>{formatDate(s.date)}</span>
                    <span style={{ flex: 1 }}>{s.description}</span>
                    <span style={{ fontWeight: 700, color: s.amount < 0 ? theme.colors.danger : theme.colors.success }}>
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
          <div style={{ marginTop: 4, fontSize: 11, color: theme.colors.textSoft }}>
            {msg.answer.queryPlan.humanReadable}
          </div>
        )}
      </div>
    </div>
  );
}
