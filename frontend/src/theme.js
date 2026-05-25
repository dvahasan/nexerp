/**
 * theme.js — Single source of truth for DMMAS design tokens.
 */

export const T = {
  light: {
    canvas:    '#FAFAF7', elev:      '#FFFFFF', sunken:    '#F4F3EE',
    border:    '#E5E4DE', fg:        '#0A0A0A', fgMuted:   '#525252',
    fgSubtle:  '#9A9A9A', neg:       '#B91C1C', negTint:   '#FBEAEA',
  },
  dark: {
    canvas:    '#0E0F11', elev:      '#16181B', sunken:    '#1C1F23',
    border:    '#2A2D32', fg:        '#F1F0EB', fgMuted:   '#9CA0A6',
    fgSubtle:  '#5E626A', neg:       '#F26F6F', negTint:   '#2B1818',
  },
};

export const tok  = (theme) => T[theme] || T.light;

export const monoLabel = (t) => ({
  fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
});

export const panelStyle = (t) => ({
  backgroundColor: t.elev, border: `1px solid ${t.border}`, borderRadius: 4,
});

export const inputStyle = (t) => ({
  width: '100%', height: 34, padding: '0 10px', borderRadius: 4,
  border: `1px solid ${t.border}`, backgroundColor: t.canvas,
  color: t.fg, fontSize: 13, outline: 'none', fontFamily: 'inherit',
  boxSizing: 'border-box', transition: 'border-color 120ms, box-shadow 120ms',
});

export const textareaStyle = (t) => ({
  ...inputStyle(t), height: 'auto', padding: '8px 10px', resize: 'vertical',
});

export const inputFocus = (primary = '#3b82f6') => ({
  onFocus: e => { e.target.style.borderColor = primary; e.target.style.boxShadow = `0 0 0 1px ${primary}`; },
  onBlur:  e => { e.target.style.borderColor = ''; e.target.style.boxShadow = 'none'; },
});

export const labelStyle = (t) => ({
  display: 'block', fontFamily: 'ui-monospace, monospace', fontSize: 10,
  fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em',
  color: t.fgSubtle, marginBottom: 6,
});

export const btnPrimary = (primary = '#3b82f6') => ({
  height: 32, padding: '0 16px', borderRadius: 4,
  backgroundColor: primary, color: '#fff', border: 'none', cursor: 'pointer',
  fontSize: 13, fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 6,
  transition: 'opacity 120ms',
});

export const btnGhost = (t) => ({
  height: 32, padding: '0 14px', borderRadius: 4,
  backgroundColor: 'transparent', color: t.fgMuted,
  border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 500,
  display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 120ms',
});

export const btnDanger = (t) => ({
  height: 32, padding: '0 14px', borderRadius: 4,
  backgroundColor: 'transparent', color: t.neg,
  border: `1px solid ${t.border}`, cursor: 'pointer', fontSize: 13, fontWeight: 500,
  display: 'inline-flex', alignItems: 'center', gap: 6, transition: 'background 120ms',
});

export const iconBtn = (t) => ({
  background: 'transparent', border: 'none', borderRadius: 4, cursor: 'pointer',
  color: t.fgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 6, transition: 'background 120ms', width: 30, height: 30,
});
