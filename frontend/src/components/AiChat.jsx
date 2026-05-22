import { useState, useRef, useEffect } from 'react';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import Icon from './Icon';

// Render basic markdown: **bold**, bullet lines starting with •
function MsgContent({ text }) {
  const lines = text.split('\n');
  return (
    <div className="space-y-0.5">
      {lines.map((line, i) => {
        // Bold: **text**
        const parts = line.split(/\*\*(.*?)\*\*/g);
        const rendered = parts.map((p, j) =>
          j % 2 === 1 ? <strong key={j} className="font-bold">{p}</strong> : p
        );
        if (!line.trim()) return <div key={i} className="h-1" />;
        return <p key={i} className="leading-relaxed">{rendered}</p>;
      })}
    </div>
  );
}

const SUGGESTIONS = [
  { en: "What's low on stock?",          ar: "ما الأصناف المنخفضة؟"    },
  { en: "What's my inventory value?",    ar: "ما قيمة المخزون؟"         },
  { en: "Any transactions today?",       ar: "هل توجد حركات اليوم؟"    },
  { en: "What's out of stock?",          ar: "ما الأصناف النافدة؟"      },
];

export default function AiChat({ open, onClose }) {
  const { isAR, company, theme } = useAppContext();
  const [messages, setMessages] = useState([]);   // { role: 'user'|'bot', text }
  const [input,    setInput]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // Focus input when opened
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
      {/* Backdrop — closes panel when clicking outside on any screen size */}
      <div className="fixed inset-0 z-40 bg-transparent" onClick={onClose} />

      {/* Panel — anchored to bottom-right, grows upward */}
      <div
        className={`fixed z-50 flex flex-col border shadow-2xl overflow-hidden
          ${theme === 'light' ? 'bg-slate-900 border-slate-700 shadow-black/40 text-slate-200' : 'bg-white border-slate-200 shadow-black/20 text-slate-700'}
        `}
        style={{
          bottom: '96px',       /* sit above the floating button (56px button + 16px gap + 24px margin) */
          ...(isAR ? { left: '24px' } : { right: '24px' }),
          width: 'min(400px, calc(100vw - 32px))',
          maxHeight: 'min(560px, calc(100dvh - 120px))',
          borderRadius: '20px',
        }}
      >
        {/* Header */}
        <div 
          className={`flex items-center gap-3 px-4 py-3.5 border-b flex-shrink-0 
            ${theme === 'light' ? 'bg-slate-950 border-slate-800 text-white' : 'bg-slate-50 border-slate-200 text-slate-900'}
          `}
        >
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0
            ${theme === 'light' ? 'bg-slate-800 text-slate-300' : 'bg-white shadow-sm border border-slate-200 text-slate-700'}`}>
            <Icon name="ai" size={16} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold leading-tight">
              {isAR ? 'مساعد الذكاء الاصطناعي' : 'AI Assistant'}
            </div>
            <div className={`text-[10px] truncate ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
              {company?.name || 'NexINV'} · {isAR ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}
            </div>
          </div>
          {messages.length > 0 && (
            <button
              onClick={() => setMessages([])}
              title={isAR ? 'مسح المحادثة' : 'Clear chat'}
              className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-white/70 hover:text-white flex-shrink-0">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
          {messages.length === 0 && (
            <div className="space-y-4">
              {/* Welcome */}
              <div className="text-center py-4">
                <div 
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg 
                    ${theme === 'light' ? 'bg-slate-800 shadow-black/40 text-slate-300' : 'bg-slate-100 shadow-black/5 border border-slate-200 text-slate-700'}`}
                >
                  <Icon name="ai" size={26} />
                </div>
                <p className={`text-sm font-semibold ${theme === 'light' ? 'text-white' : 'text-slate-900'}`}>
                  {isAR ? 'مرحباً! كيف يمكنني مساعدتك؟' : "Hi! How can I help?"}
                </p>
                <p className={`text-xs mt-1 ${theme === 'light' ? 'text-slate-400' : 'text-slate-500'}`}>
                  {isAR ? 'اسأل عن مخزونك أو حركاتك' : 'Ask about your inventory or transactions'}
                </p>
              </div>
              {/* Suggestion chips */}
              <div className="grid grid-cols-2 gap-2">
                {SUGGESTIONS.map((s, i) => (
                  <button
                    key={i}
                    onClick={() => send(isAR ? s.ar : s.en)}
                    className={`text-left px-3 py-2.5 rounded-xl text-xs font-medium border transition-all leading-snug
                      ${theme === 'light' 
                        ? 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white hover:border-slate-600' 
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 hover:text-slate-900 hover:border-slate-300'}`}
                  >
                    {isAR ? s.ar : s.en}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i} className={`flex gap-2.5 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
              {/* Avatar */}
              <div 
                className={`w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                  msg.role === 'user' 
                    ? (theme === 'light' ? 'bg-slate-800 text-slate-300 text-[11px] font-black' : 'bg-slate-200 text-slate-700 text-[11px] font-black border border-slate-300') 
                    : (theme === 'light' ? 'bg-slate-950 text-slate-300' : 'bg-slate-100 text-slate-700 border border-slate-200')
                }`}
              >
                {msg.role === 'user' ? '😊' : <Icon name="ai" size={13} />}
              </div>
              {/* Bubble */}
              <div 
                className={`p-3 text-sm leading-relaxed shadow-sm ${
                  msg.role === 'user'
                    ? (theme === 'light' ? 'bg-slate-800 text-slate-200 rounded-2xl rounded-tr-sm' : 'bg-slate-100 text-slate-800 border border-slate-200 rounded-2xl rounded-tr-sm')
                    : (theme === 'light' ? 'bg-slate-950/50 text-slate-300 rounded-2xl rounded-tl-sm border border-slate-800' : 'bg-white text-slate-600 border border-slate-100 shadow-sm rounded-2xl rounded-tl-sm')
                }`}
              >
                {msg.role === 'bot' ? <MsgContent text={msg.text} /> : msg.text}
              </div>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-2.5">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center flex-shrink-0 bg-gradient-to-br from-blue-500 to-indigo-600">
                <Icon name="ai" size={13} className="text-white" />
              </div>
              <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div 
          className={`p-3 border-t flex-shrink-0
            ${theme === 'light' ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-200'}`}
        >
          <div 
            className={`relative flex items-center rounded-xl px-2 shadow-sm border focus-within:ring-2 transition-all
              ${theme === 'light' 
                ? 'bg-slate-900 border-slate-700 focus-within:ring-slate-600 focus-within:border-slate-500' 
                : 'bg-white border-slate-300 focus-within:ring-slate-200 focus-within:border-slate-400'}`}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKey}
              placeholder={isAR ? 'اسأل مساعد الذكاء الاصطناعي...' : 'Ask AI Assistant...'}
              className={`flex-1 bg-transparent py-3 px-2 outline-none text-sm
                ${theme === 'light' ? 'text-white placeholder-slate-500' : 'text-slate-900 placeholder-slate-400'}`}
              disabled={loading}
            />
            <button
              onClick={() => send()}
              disabled={loading || !input.trim()}
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors
                ${input.trim() && !loading
                  ? (theme === 'light' ? 'bg-white text-slate-900 hover:bg-slate-200' : 'bg-slate-900 text-white hover:bg-slate-800')
                  : (theme === 'light' ? 'text-slate-600' : 'text-slate-300')
                }`}
            >
              <svg className="w-4 h-4 text-current" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-600 text-center mt-1.5">
            {isAR ? 'اضغط Enter للإرسال' : 'Press Enter to send'}
          </p>
        </div>
      </div>
    </>
  );
}
