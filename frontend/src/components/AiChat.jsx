import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import Icon from './Icon';

// ── Markdown renderer: **bold**, newlines ─────────────────────────────────
function MsgContent({ text, color }) {
  const lines = text.split('\n');
  return (
    <div>
      {lines.map((line, i) => {
        const parts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = parts.map((p, j) =>
          j % 2 === 1
            ? <strong key={j} style={{ fontWeight: 700, color }}>{p}</strong>
            : p
        );
        if (!line.trim()) return <div key={i} style={{ height: 4 }} />;
        return <p key={i} style={{ margin: '2px 0', lineHeight: 1.6 }}>{rendered}</p>;
      })}
    </div>
  );
}

const SUGGESTIONS = [
  { en: "What's low on stock?",       ar: 'ما الأصناف المنخفضة؟'   },
  { en: "What's my inventory value?", ar: 'ما قيمة المخزون؟'        },
  { en: "Any transactions today?",    ar: 'هل توجد حركات اليوم؟'   },
  { en: "What's out of stock?",       ar: 'ما الأصناف النافدة؟'     },
];

export default function AiChat({ open, onClose }) {
  const { isAR, company, theme, company: comp } = useAppContext();
  const primary = comp?.primaryColor || '#3b82f6';

  // AI panel is always dark (inverted from app theme) for contrast
  const p = T.dark;

  const [messages, setMessages] = useState([]);
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [focused,  setFocused]  = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 150);
  }, [open]);

  const historyForApi = () =>
    messages.reduce((acc, msg, i, arr) => {
      if (msg.role === 'user' && arr[i + 1]?.role === 'bot') {
        acc.push({ user: msg.text, bot: arr[i + 1].text });
      }
      return acc;
    }, []);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: q }]);
    setLoading(true);
    try {
      const { response } = await api.aiChat(q, historyForApi());
      setMessages(prev => [...prev, { role: 'bot', text: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'bot', text: `⚠️ Error: ${e.message}` }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  };

  if (!open) return null;

  return (
    <>
      {/* Transparent backdrop */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        position: 'fixed', zIndex: 50,
        bottom: 32,
        ...(isAR ? { left: 24 } : { right: 24 }),
        width: 'min(400px, calc(100vw - 32px))',
        maxHeight: 'min(560px, calc(100dvh - 80px))',
        backgroundColor: p.canvas,
        border: `1px solid ${p.border}`,
        borderRadius: 8,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
      }}>

        {/* ── Header ── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '10px 14px', flexShrink: 0,
          backgroundColor: p.elev,
          borderBottom: `1px solid ${p.border}`,
        }}>
          {/* AI icon */}
          <div style={{
            width: 32, height: 32, borderRadius: 4, flexShrink: 0,
            backgroundColor: primary + '22',
            border: `1px solid ${primary}44`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: primary,
          }}>
            <Icon name="ai" size={16} />
          </div>

          {/* Title */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: p.fg, lineHeight: 1.2 }}>
              {isAR ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
            </div>
            <div style={{
              fontSize: 10, color: p.fgSubtle,
              fontFamily: 'ui-monospace, monospace',
              letterSpacing: '0.04em', marginTop: 1,
            }}>
              {company?.name || 'NexINV'} · {isAR ? 'مدعوم بالذكاء الاصطناعي' : 'POWERED BY AI'}
            </div>
          </div>

          {/* Clear */}
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              title={isAR ? 'مسح المحادثة' : 'Clear chat'}
              style={{
                width: 28, height: 28, borderRadius: 4,
                backgroundColor: 'transparent',
                border: `1px solid ${p.border}`,
                color: p.fgMuted, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 120ms',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = p.sunken; e.currentTarget.style.color = p.fg; }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = p.fgMuted; }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              width: 28, height: 28, borderRadius: 4,
              backgroundColor: 'transparent',
              border: `1px solid ${p.border}`,
              color: p.fgMuted, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 120ms',
            }}
            onMouseEnter={e => { e.currentTarget.style.backgroundColor = p.sunken; e.currentTarget.style.color = p.fg; }}
            onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = p.fgMuted; }}
          >
            <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* ── Messages ── */}
        <div style={{
          flex: 1, overflowY: 'auto', minHeight: 0,
          padding: '16px 14px',
          display: 'flex', flexDirection: 'column', gap: 14,
        }}>
          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Welcome */}
              <div style={{ textAlign: 'center', padding: '16px 0 8px' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 4,
                  backgroundColor: primary + '18',
                  border: `1px solid ${primary}33`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: primary, margin: '0 auto 12px',
                  fontSize: 22,
                }}>
                  <Icon name="ai" size={24} />
                </div>
                <p style={{ fontSize: 14, fontWeight: 700, color: p.fg, margin: '0 0 4px' }}>
                  {isAR ? 'مرحباً! كيف يمكنني مساعدتك؟' : 'Hi! How can I help?'}
                </p>
                <p style={{ fontSize: 12, color: p.fgMuted, margin: 0 }}>
                  {isAR ? 'اسأل عن مخزونك أو حركاتك' : 'Ask about your inventory or transactions'}
                </p>
              </div>

              {/* Suggestion chips */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(isAR ? s.ar : s.en)}
                    style={{
                      padding: '8px 10px', borderRadius: 4,
                      backgroundColor: p.elev,
                      border: `1px solid ${p.border}`,
                      color: p.fgMuted, fontSize: 11, fontWeight: 500,
                      cursor: 'pointer', textAlign: 'start',
                      lineHeight: 1.4, transition: 'all 120ms',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.backgroundColor = p.sunken;
                      e.currentTarget.style.color = p.fg;
                      e.currentTarget.style.borderColor = primary;
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.backgroundColor = p.elev;
                      e.currentTarget.style.color = p.fgMuted;
                      e.currentTarget.style.borderColor = p.border;
                    }}
                  >
                    {isAR ? s.ar : s.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={i}
              style={{
                display: 'flex', gap: 8, alignItems: 'flex-start',
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 28, height: 28, borderRadius: 4, flexShrink: 0, marginTop: 2,
                backgroundColor: msg.role === 'user' ? primary + '22' : p.elev,
                border: `1px solid ${msg.role === 'user' ? primary + '44' : p.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: msg.role === 'user' ? 14 : 0,
                color: msg.role === 'user' ? primary : p.fgMuted,
              }}>
                {msg.role === 'user'
                  ? '😊'
                  : <Icon name="ai" size={13} style={{ color: p.fgMuted }} />
                }
              </div>

              {/* Bubble */}
              <div style={{
                padding: '8px 12px',
                borderRadius: 4,
                backgroundColor: msg.role === 'user' ? primary + '18' : p.elev,
                border: `1px solid ${msg.role === 'user' ? primary + '33' : p.border}`,
                fontSize: 13, lineHeight: 1.6,
                color: msg.role === 'user' ? p.fg : p.fgMuted,
                maxWidth: '82%',
              }}>
                {msg.role === 'bot'
                  ? <MsgContent text={msg.text} color={p.fg} />
                  : msg.text
                }
              </div>
            </div>
          ))}

          {/* Loading dots */}
          {loading && (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <div style={{
                width: 28, height: 28, borderRadius: 4, flexShrink: 0,
                backgroundColor: p.elev, border: `1px solid ${p.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Icon name="ai" size={13} style={{ color: p.fgMuted }} />
              </div>
              <div style={{
                padding: '10px 14px',
                borderRadius: 4,
                backgroundColor: p.elev,
                border: `1px solid ${p.border}`,
                display: 'flex', alignItems: 'center', gap: 5,
              }}>
                {[0, 150, 300].map(delay => (
                  <span key={delay} style={{
                    width: 6, height: 6, borderRadius: '50%',
                    backgroundColor: p.fgSubtle,
                    display: 'inline-block',
                    animation: 'bounce 1.2s ease-in-out infinite',
                    animationDelay: `${delay}ms`,
                  }} />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div style={{
          padding: '10px 12px', flexShrink: 0,
          backgroundColor: p.elev,
          borderTop: `1px solid ${p.border}`,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            backgroundColor: p.canvas,
            border: `1px solid ${focused ? primary : p.border}`,
            boxShadow: focused ? `0 0 0 1px ${primary}` : 'none',
            borderRadius: 4, padding: '0 8px',
            transition: 'border-color 120ms, box-shadow 120ms',
          }}>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              placeholder={isAR ? 'اسأل مساعد الذكاء الاصطناعي...' : 'Ask AI Assistant...'}
              disabled={loading}
              style={{
                flex: 1, height: 38, background: 'transparent',
                border: 'none', outline: 'none',
                fontSize: 13, color: p.fg, fontFamily: 'inherit',
              }}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              style={{
                width: 30, height: 30, borderRadius: 4, flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                backgroundColor: input.trim() && !loading ? primary : 'transparent',
                border: `1px solid ${input.trim() && !loading ? primary : p.border}`,
                color: input.trim() && !loading ? '#fff' : p.fgSubtle,
                cursor: input.trim() && !loading ? 'pointer' : 'not-allowed',
                transition: 'all 120ms',
              }}
            >
              <svg width="14" height="14" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p style={{
            textAlign: 'center', marginTop: 6,
            fontSize: 10, color: p.fgSubtle,
            fontFamily: 'ui-monospace, monospace',
            letterSpacing: '0.04em',
          }}>
            {isAR ? 'اضغط Enter للإرسال' : 'ENTER TO SEND · SHIFT+ENTER FOR NEWLINE'}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>
    </>
  );
}
