import { useState } from 'react';
import { useAppContext } from '../context/AppContext';
import { MdInventory } from 'react-icons/md';
import { useNavigate, Link } from 'react-router-dom';
import { T } from '../theme';

export default function Login() {
  const { login, t: tr, isAR, theme } = useAppContext();
  const tok = T[theme] || T.light;
  const navigate = useNavigate();

  const [code,      setCode]      = useState('');
  const [username,  setUsername]  = useState('');
  const [password,  setPassword]  = useState('');
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(false);
  const [loginType, setLoginType] = useState('standard');

  // Focus styles
  const [focused, setFocused] = useState('');
  const primary = '#3b82f6';

  const inputStyle = (name) => ({
    width: '100%', height: 38, padding: '0 12px', borderRadius: 4,
    border: `1px solid ${focused === name ? primary : tok.border}`,
    backgroundColor: tok.canvas, color: tok.fg,
    fontSize: 13, outline: 'none', fontFamily: 'inherit',
    boxSizing: 'border-box',
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    transition: 'border-color 120ms, box-shadow 120ms',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await login(loginType === 'enterprise' ? '' : code, username, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', backgroundColor: tok.canvas,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      padding: 16, position: 'relative',
    }}>
      {/* Top accent line */}
      <div style={{
        position: 'fixed', top: 0, left: 0, right: 0, height: 2,
        background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
        pointerEvents: 'none',
      }} />

      {/* Back to Home */}
      <div style={{ width: '100%', maxWidth: 420, marginBottom: 16, display: 'flex', justifyContent: 'flex-start', zIndex: 10 }}>
        <Link
          to="/"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            fontSize: 12, fontWeight: 600, color: tok.fgMuted,
            textDecoration: 'none',
            padding: '6px 12px', borderRadius: 4,
            border: `1px solid ${tok.border}`,
            backgroundColor: tok.elev,
            transition: 'border-color 120ms',
            fontFamily: 'ui-monospace, monospace',
            textTransform: 'uppercase', letterSpacing: '0.06em',
          }}
        >
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {isAR ? 'الرئيسية' : 'Home'}
        </Link>
      </div>

      <div style={{ width: '100%', maxWidth: 420, zIndex: 10 }}>
        {/* Card */}
        <div style={{
          backgroundColor: tok.elev, border: `1px solid ${tok.border}`,
          borderRadius: 4, padding: 32,
        }}>
          {/* Logo + heading */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <div style={{
              backgroundColor: primary, width: 48, height: 48, borderRadius: 4,
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginBottom: 14,
            }}>
              <MdInventory style={{ color: '#fff', fontSize: 26 }} />
            </div>
            <div style={{
              fontFamily: 'ui-monospace, monospace', fontSize: 16, fontWeight: 800,
              letterSpacing: '0.06em', color: tok.fg, textTransform: 'uppercase',
            }}>
              NexINV
            </div>
            <div style={{ fontSize: 11, color: tok.fgSubtle, marginTop: 4, fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {isAR ? 'تسجيل الدخول' : 'Workspace Login'}
            </div>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding: '10px 12px', borderRadius: 4, marginBottom: 16,
              border: `1px solid ${tok.neg}`, backgroundColor: tok.negTint,
              color: tok.neg, fontSize: 12, textAlign: 'center',
              fontFamily: 'ui-monospace, monospace',
            }}>
              {error}
            </div>
          )}

          {/* Tab switcher */}
          <div style={{
            display: 'flex', gap: 0, marginBottom: 20,
            border: `1px solid ${tok.border}`, borderRadius: 4, overflow: 'hidden',
          }}>
            {['standard', 'enterprise'].map(type => (
              <button
                key={type}
                onClick={() => setLoginType(type)}
                style={{
                  flex: 1, height: 34, fontSize: 11, fontWeight: 700,
                  textTransform: 'uppercase', letterSpacing: '0.06em',
                  fontFamily: 'ui-monospace, monospace',
                  cursor: 'pointer', border: 'none',
                  backgroundColor: loginType === type ? primary : 'transparent',
                  color: loginType === type ? '#fff' : tok.fgSubtle,
                  transition: 'background 120ms, color 120ms',
                }}
              >
                {type === 'standard'
                  ? (isAR ? 'مساحة العمل' : 'Workspace')
                  : (isAR ? 'المؤسسة' : 'Enterprise')}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loginType === 'standard' && (
              <div>
                <label style={{
                  display: 'block', fontFamily: 'ui-monospace, monospace',
                  fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                  letterSpacing: '0.08em', color: tok.fgSubtle, marginBottom: 6,
                }}>
                  {tr.companyCode}
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  required
                  placeholder="e.g. NEX-01"
                  style={inputStyle('code')}
                  onFocus={() => setFocused('code')}
                  onBlur={() => setFocused('')}
                />
              </div>
            )}

            <div>
              <label style={{
                display: 'block', fontFamily: 'ui-monospace, monospace',
                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: tok.fgSubtle, marginBottom: 6,
              }}>
                {tr.username}
              </label>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                style={inputStyle('username')}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused('')}
              />
            </div>

            <div>
              <label style={{
                display: 'block', fontFamily: 'ui-monospace, monospace',
                fontSize: 10, fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.08em', color: tok.fgSubtle, marginBottom: 6,
              }}>
                {tr.password}
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                style={inputStyle('password')}
                onFocus={() => setFocused('password')}
                onBlur={() => setFocused('')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: 38, borderRadius: 4, marginTop: 4,
                backgroundColor: primary, color: '#fff', border: 'none',
                cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700,
                fontFamily: 'ui-monospace, monospace', textTransform: 'uppercase',
                letterSpacing: '0.08em',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.65 : 1, transition: 'opacity 120ms',
              }}
            >
              {loading
                ? <div style={{ width: 16, height: 16, border: '2px solid rgba(255,255,255,0.3)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 600ms linear infinite' }} />
                : tr.login}
            </button>
          </form>

          <div style={{ marginTop: 20, textAlign: 'center' }}>
            <span style={{ fontSize: 12, color: tok.fgSubtle }}>
              {isAR ? 'ليس لديك مساحة عمل؟' : "Don't have a workspace?"}{' '}
            </span>
            <Link
              to="/register"
              style={{ fontSize: 12, color: primary, fontWeight: 600, textDecoration: 'none' }}
            >
              {isAR ? 'إنشاء حساب' : 'Create one'}
            </Link>
          </div>
        </div>

        <p style={{ textAlign: 'center', color: tok.fgSubtle, fontSize: 10, marginTop: 16, fontFamily: 'ui-monospace, monospace', letterSpacing: '0.06em' }}>
          © 2025 NEXINV SAAS. ALL RIGHTS RESERVED.
        </p>
      </div>
    </div>
  );
}
