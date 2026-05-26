import { useState } from 'react';
import { api } from '../api';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import { useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';

export default function Register() {
  const { loginWithToken, theme, company } = useAppContext();
  const t = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';
  const navigate = useNavigate();

  const [form, setForm] = useState({
    companyName: '', adminUsername: '', adminEmail: '', password: '', isEnterprise: false,
  });
  const [loading,     setLoading]     = useState(false);
  const [entering,    setEntering]    = useState(false);
  const [error,       setError]       = useState('');
  const [successData, setSuccessData] = useState(null);
  const [focused,     setFocused]     = useState('');
  const [showPass,    setShowPass]    = useState(false);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.register(form);
      setSuccessData({ token: res.token, code: res.companyCode, isEnterprise: res.isEnterprise });
    } catch (err) {
      setError(err.message || 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  const handleEnterWorkspace = async () => {
    if (!successData?.token) return;
    setEntering(true);
    try {
      await loginWithToken(successData.token);
      navigate('/dashboard', { replace: true });
    } catch {
      setError('Failed to enter workspace. Please log in manually.');
    } finally {
      setEntering(false);
    }
  };

  // ── style helpers ─────────────────────────────────────────────────────────
  const lbl = (text) => (
    <label style={{
      display: 'block',
      fontFamily: 'ui-monospace, monospace',
      fontSize: 10, fontWeight: 600,
      textTransform: 'uppercase', letterSpacing: '0.08em',
      color: t.fgSubtle, marginBottom: 5,
    }}>
      {text}
    </label>
  );

  const inp = (name, extra = {}) => ({
    width: '100%', height: 38, padding: '0 12px',
    borderRadius: 4, fontSize: 13, outline: 'none',
    border: `1px solid ${focused === name ? primary : t.border}`,
    boxShadow: focused === name ? `0 0 0 1px ${primary}` : 'none',
    backgroundColor: t.canvas, color: t.fg,
    fontFamily: 'inherit', boxSizing: 'border-box',
    transition: 'border-color 120ms, box-shadow 120ms',
    ...extra,
  });

  // ── Success screen ─────────────────────────────────────────────────────────
  if (successData) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: t.canvas,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, fontFamily: 'inherit',
      }}>
        <div style={{
          width: '100%', maxWidth: 420,
          backgroundColor: t.elev,
          border: `1px solid ${t.border}`,
          borderRadius: 4, padding: 40,
          textAlign: 'center',
        }}>
          {/* Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 4,
            backgroundColor: '#10b98118',
            border: '1px solid #10b98144',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 32, margin: '0 auto 24px',
          }}>
            🎉
          </div>

          <div style={{ fontSize: 22, fontWeight: 900, color: t.fg, marginBottom: 8, letterSpacing: '-0.02em' }}>
            Welcome to NexINV!
          </div>

          {successData.isEnterprise ? (
            <p style={{ fontSize: 13, color: t.fgMuted, marginBottom: 28, lineHeight: 1.6 }}>
              Your Enterprise account is ready. You can now manage multiple companies.
            </p>
          ) : (
            <div style={{ marginBottom: 28 }}>
              <p style={{ fontSize: 13, color: t.fgMuted, marginBottom: 12 }}>
                Your company has been created. Here's your company code:
              </p>
              <div style={{
                display: 'inline-block',
                fontFamily: 'ui-monospace, monospace',
                fontSize: 24, fontWeight: 900,
                letterSpacing: '0.2em', color: t.fg,
                backgroundColor: t.sunken,
                border: `1px solid ${t.border}`,
                borderRadius: 4, padding: '10px 24px',
              }}>
                {successData.code}
              </div>
              <p style={{ fontSize: 11, color: t.fgSubtle, marginTop: 8, fontFamily: 'ui-monospace, monospace' }}>
                Share this code with your team members to join
              </p>
            </div>
          )}

          <button
            onClick={handleEnterWorkspace}
            disabled={entering}
            style={{
              width: '100%', height: 42, borderRadius: 4,
              backgroundColor: primary, color: '#fff',
              border: 'none', cursor: entering ? 'not-allowed' : 'pointer',
              fontSize: 14, fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              opacity: entering ? 0.7 : 1,
              transition: 'opacity 120ms',
            }}
          >
            {entering ? (
              <>
                <div style={{
                  width: 14, height: 14,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 600ms linear infinite',
                }} />
                Entering...
              </>
            ) : (
              <>Enter Workspace →</>
            )}
          </button>
        </div>
      </div>
    );
  }

  // ── Registration form ──────────────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex', fontFamily: 'inherit',
    }}>
      {/* ── Left banner ── */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #4c1d95 100%)',
        padding: '48px 56px',
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
        position: 'relative', overflow: 'hidden',
        minWidth: 0,
      }}
        className="hidden-mobile"
      >
        {/* Dot grid overlay */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.12,
          backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)',
          backgroundSize: '24px 24px',
          pointerEvents: 'none',
        }} />

        {/* Logo */}
        <a href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 12, width: 'fit-content', position: 'relative', zIndex: 1 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 4,
            backgroundColor: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 20, fontWeight: 900, color: '#fff',
          }}>
            N
          </div>
          <span style={{ fontSize: 22, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>NexINV</span>
        </a>

        {/* Hero text */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
          <h1 style={{
            fontSize: 40, fontWeight: 900, color: '#fff',
            lineHeight: 1.15, letterSpacing: '-0.03em', margin: '0 0 16px',
          }}>
            Scale your operations instantly.
          </h1>
          <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.65, margin: 0 }}>
            Join NexINV's multi-tenant platform to organize your inventory and boost your team's productivity.
          </p>
        </div>

        {/* Social proof */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1 }}>
          <div style={{ display: 'flex' }}>
            {['#60a5fa', '#a78bfa', '#34d399'].map((c, i) => (
              <div key={i} style={{
                width: 30, height: 30, borderRadius: '50%',
                backgroundColor: c + '44',
                border: '2px solid rgba(255,255,255,0.3)',
                marginLeft: i === 0 ? 0 : -8,
              }} />
            ))}
          </div>
          <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', fontWeight: 600 }}>
            Join hundreds of companies worldwide
          </span>
        </div>
      </div>

      {/* ── Right form ── */}
      <div style={{
        flex: 1,
        backgroundColor: t.canvas,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '48px 40px',
        minWidth: 360,
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Mobile logo */}
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: t.fg, marginBottom: 6, letterSpacing: '-0.02em' }}>
              Create Company
            </div>
            <p style={{ fontSize: 13, color: t.fgMuted, margin: 0 }}>
              Set up your workspace and admin account.
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              backgroundColor: t.negTint,
              border: `1px solid ${t.neg}44`,
              borderRadius: 4, padding: '10px 14px',
              marginBottom: 18,
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 13, fontWeight: 600, color: t.neg,
            }}>
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Enterprise toggle */}
            <div style={{
              backgroundColor: t.sunken,
              border: `1px solid ${t.border}`,
              borderRadius: 4, padding: '12px 14px',
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              {/* DMMAS switch */}
              <div
                onClick={() => set('isEnterprise', !form.isEnterprise)}
                style={{
                  position: 'relative', width: 36, height: 20, borderRadius: 10, flexShrink: 0,
                  backgroundColor: form.isEnterprise ? primary : t.border,
                  transition: 'background 120ms', cursor: 'pointer',
                }}
              >
                <div style={{
                  position: 'absolute', top: 3,
                  left: form.isEnterprise ? 19 : 3,
                  width: 14, height: 14, borderRadius: '50%',
                  backgroundColor: '#fff', transition: 'left 120ms',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: t.fg, lineHeight: 1.2 }}>
                  Enterprise Account
                </div>
                <div style={{ fontSize: 11, color: t.fgMuted, marginTop: 2 }}>
                  Manage multiple companies under one account
                </div>
              </div>
            </div>

            {/* Company Name (non-enterprise only) */}
            {!form.isEnterprise && (
              <div>
                {lbl('Company Name *')}
                <input
                  type="text" required
                  value={form.companyName}
                  onChange={e => set('companyName', e.target.value)}
                  placeholder="Acme Corp"
                  style={inp('company')}
                  onFocus={() => setFocused('company')}
                  onBlur={() => setFocused('')}
                />
              </div>
            )}

            {/* Admin Username */}
            <div>
              {lbl('Admin Username *')}
              <input
                type="text" required
                value={form.adminUsername}
                onChange={e => set('adminUsername', e.target.value.toLowerCase().replace(/\s/g, ''))}
                placeholder="admin"
                style={inp('username', { fontFamily: 'ui-monospace, monospace' })}
                onFocus={() => setFocused('username')}
                onBlur={() => setFocused('')}
              />
            </div>

            {/* Admin Email */}
            <div>
              {lbl('Admin Email (optional)')}
              <input
                type="email"
                value={form.adminEmail}
                onChange={e => set('adminEmail', e.target.value)}
                placeholder="admin@acme.com"
                style={inp('email')}
                onFocus={() => setFocused('email')}
                onBlur={() => setFocused('')}
              />
            </div>

            {/* Password */}
            <div>
              {lbl('Password *')}
              <div style={{ position: 'relative' }}>
                <input
                  type={showPass ? 'text' : 'password'} required
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                  style={inp('pass', { paddingRight: 40 })}
                  onFocus={() => setFocused('pass')}
                  onBlur={() => setFocused('')}
                />
                <button
                  type="button"
                  onClick={() => setShowPass(v => !v)}
                  style={{
                    position: 'absolute', top: '50%', right: 10,
                    transform: 'translateY(-50%)',
                    background: 'none', border: 'none',
                    cursor: 'pointer', color: t.fgSubtle, padding: 0,
                    display: 'flex', alignItems: 'center',
                  }}
                >
                  <Icon name={showPass ? 'visibility_off' : 'visibility'} size={16} />
                </button>
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: t.border, margin: '4px 0' }} />

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', height: 42, borderRadius: 4,
                backgroundColor: primary, color: '#fff',
                border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                fontSize: 14, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                opacity: loading ? 0.7 : 1, transition: 'opacity 120ms',
              }}
            >
              {loading ? (
                <div style={{
                  width: 16, height: 16,
                  border: '2px solid rgba(255,255,255,0.3)',
                  borderTopColor: '#fff', borderRadius: '50%',
                  animation: 'spin 600ms linear infinite',
                }} />
              ) : (
                <>Sign Up →</>
              )}
            </button>

            {/* Login link */}
            <div style={{ textAlign: 'center', paddingTop: 4 }}>
              <span style={{ fontSize: 13, color: t.fgMuted }}>
                Already have a workspace?{' '}
                <a href="/login" style={{
                  color: primary, fontWeight: 700,
                  textDecoration: 'none',
                }}
                  onMouseEnter={e => e.currentTarget.style.textDecoration = 'underline'}
                  onMouseLeave={e => e.currentTarget.style.textDecoration = 'none'}
                >
                  Log in here
                </a>
              </span>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
