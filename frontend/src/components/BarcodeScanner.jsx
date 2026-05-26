/**
 * BarcodeScanner.jsx
 * Full-screen camera overlay using @zxing/browser.
 * Props:
 *   open        – boolean
 *   onClose     – () => void
 *   onDetected  – (code: string) => void   called every new unique barcode
 *   isAR        – boolean (for RTL labels)
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { BrowserMultiFormatReader } from '@zxing/browser';
import { NotFoundException, ChecksumException, FormatException } from '@zxing/library';
import { useAppContext } from '../context/AppContext';
import { T } from '../theme';
import Icon from './Icon';

export default function BarcodeScanner({ open, onClose, onDetected }) {
  const { theme, company, isAR } = useAppContext();
  const tok     = T[theme] || T.light;
  const primary = company?.primaryColor || '#3b82f6';

  const videoRef    = useRef(null);
  const controlsRef = useRef(null);   // IScannerControls — has .stop()
  const lastCodeRef = useRef('');
  const lastTimeRef = useRef(0);

  const [status,   setStatus]   = useState('starting'); // starting | scanning | error | denied
  const [lastCode, setLastCode] = useState('');
  const [devices,  setDevices]  = useState([]);
  const [devIdx,   setDevIdx]   = useState(0);

  // ── Start / stop scanner ──────────────────────────────────────────────────
  const stopScanner = useCallback(() => {
    if (controlsRef.current) {
      try { controlsRef.current.stop(); } catch {}
      controlsRef.current = null;
    }
  }, []);

  const startScanner = useCallback(async (deviceId) => {
    stopScanner();
    setStatus('starting');
    try {
      const reader = new BrowserMultiFormatReader();

      const controls = await reader.decodeFromVideoDevice(
        deviceId || undefined,
        videoRef.current,
        (result, err) => {
          if (result) {
            const code = result.getText();
            const now  = Date.now();
            // Debounce: same code within 2 s is ignored
            if (code === lastCodeRef.current && now - lastTimeRef.current < 2000) return;
            lastCodeRef.current = code;
            lastTimeRef.current = now;
            setLastCode(code);
            onDetected(code);
          }
          if (err && !(err instanceof NotFoundException) &&
                     !(err instanceof ChecksumException) &&
                     !(err instanceof FormatException)) {
            console.warn('[BarcodeScanner]', err);
          }
        }
      );

      controlsRef.current = controls;
      setStatus('scanning');
    } catch (e) {
      const msg = e?.message || '';
      if (msg.includes('Permission') || msg.includes('NotAllowed') || msg.includes('denied')) {
        setStatus('denied');
      } else {
        setStatus('error');
      }
    }
  }, [onDetected, stopScanner]);

  // Enumerate cameras on open
  useEffect(() => {
    if (!open) { stopScanner(); return; }

    lastCodeRef.current = '';
    lastTimeRef.current = 0;
    setLastCode('');

    BrowserMultiFormatReader.listVideoInputDevices()
      .then(d => {
        setDevices(d);
        // Prefer back/environment camera
        const backIdx = d.findIndex(x => /back|rear|environment/i.test(x.label));
        const idx     = backIdx >= 0 ? backIdx : 0;
        setDevIdx(idx);
        startScanner(d[idx]?.deviceId);
      })
      .catch(() => startScanner(undefined));

    return () => stopScanner();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Switch camera device
  const switchDevice = () => {
    if (devices.length < 2) return;
    const next = (devIdx + 1) % devices.length;
    setDevIdx(next);
    startScanner(devices[next]?.deviceId);
  };

  if (!open) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      backgroundColor: 'rgba(0,0,0,0.94)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: 16,
    }}>
      {/* Header */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Icon name="scan" size={18} style={{ color: primary }} />
          <span style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>
            {isAR ? 'مسح الباركود' : 'Barcode Scanner'}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {devices.length > 1 && (
            <button
              onClick={switchDevice}
              title={isAR ? 'تبديل الكاميرا' : 'Switch camera'}
              style={{
                background: 'rgba(255,255,255,0.1)', border: 'none',
                borderRadius: 4, color: '#fff', width: 34, height: 34,
                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <Icon name="refresh" size={16} />
            </button>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.1)', border: 'none',
              borderRadius: 4, color: '#fff', width: 34, height: 34,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      </div>

      {/* Video + frame */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: 440,
        borderRadius: 8, overflow: 'hidden',
        backgroundColor: '#000',
        aspectRatio: '4/3',
      }}>
        <video
          ref={videoRef}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          playsInline muted autoPlay
        />

        {/* Scanning frame overlay */}
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <div style={{ position: 'relative', width: 220, height: 130 }}>
            {/* Animated scan line */}
            {status === 'scanning' && (
              <div style={{
                position: 'absolute', left: 0, right: 0, height: 2,
                background: `linear-gradient(90deg, transparent, ${primary}, transparent)`,
                animation: 'scanLine 2s ease-in-out infinite',
              }} />
            )}
            {/* Corner brackets */}
            {[
              { top: 0, left: 0,  borderTop: `3px solid ${primary}`, borderLeft: `3px solid ${primary}` },
              { top: 0, right: 0, borderTop: `3px solid ${primary}`, borderRight:`3px solid ${primary}` },
              { bottom:0,left: 0, borderBottom:`3px solid ${primary}`,borderLeft: `3px solid ${primary}` },
              { bottom:0,right:0, borderBottom:`3px solid ${primary}`,borderRight:`3px solid ${primary}` },
            ].map((s, i) => (
              <div key={i} style={{ position: 'absolute', width: 20, height: 20, ...s }} />
            ))}
          </div>
        </div>

        {/* Status overlays */}
        {status === 'starting' && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            backgroundColor: 'rgba(0,0,0,0.6)',
          }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              border: `2px solid rgba(255,255,255,0.2)`,
              borderTopColor: primary,
              animation: 'spin 600ms linear infinite',
            }} />
            <span style={{ color: '#fff', fontSize: 12 }}>
              {isAR ? 'جاري فتح الكاميرا...' : 'Starting camera…'}
            </span>
          </div>
        )}

        {(status === 'error' || status === 'denied') && (
          <div style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', gap: 10,
            backgroundColor: 'rgba(0,0,0,0.8)', padding: 20, textAlign: 'center',
          }}>
            <Icon name="error" size={32} style={{ color: '#f26f6f' }} />
            <span style={{ color: '#fff', fontSize: 13, lineHeight: 1.5 }}>
              {status === 'denied'
                ? (isAR ? 'تم رفض الوصول إلى الكاميرا. يرجى السماح بالوصول من إعدادات المتصفح.' : 'Camera access denied. Please allow camera access in your browser settings.')
                : (isAR ? 'تعذّر الوصول إلى الكاميرا.' : 'Could not access camera.')}
            </span>
          </div>
        )}
      </div>

      {/* Result display */}
      {lastCode ? (
        <div style={{
          marginTop: 16, padding: '12px 20px', borderRadius: 6,
          backgroundColor: `${primary}22`, border: `1px solid ${primary}55`,
          display: 'flex', alignItems: 'center', gap: 10,
          maxWidth: 440, width: '100%',
        }}>
          <Icon name="barcode" size={20} style={{ color: primary, flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10, fontFamily: 'ui-monospace,monospace', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {isAR ? 'تم الكشف' : 'Detected'}
            </div>
            <div style={{ color: '#fff', fontFamily: 'ui-monospace,monospace', fontSize: 15, fontWeight: 700, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lastCode}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: primary, border: 'none', borderRadius: 4,
              color: '#fff', padding: '6px 14px', cursor: 'pointer',
              fontSize: 12, fontWeight: 600, flexShrink: 0,
            }}
          >
            {isAR ? 'تطبيق' : 'Use'}
          </button>
        </div>
      ) : status === 'scanning' ? (
        <p style={{ marginTop: 16, color: 'rgba(255,255,255,0.45)', fontSize: 12, textAlign: 'center' }}>
          {isAR ? 'وجّه الكاميرا نحو الباركود' : 'Point camera at a barcode'}
        </p>
      ) : null}

      {/* Manual entry fallback */}
      <ManualEntry primary={primary} isAR={isAR} onDetected={code => { setLastCode(code); onDetected(code); }} />

      {/* Keyframe for scan line */}
      <style>{`
        @keyframes scanLine {
          0%   { top: 10%; }
          50%  { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  );
}

function ManualEntry({ primary, isAR, onDetected }) {
  const [val, setVal] = useState('');
  return (
    <form
      onSubmit={e => { e.preventDefault(); if (val.trim()) { onDetected(val.trim()); setVal(''); } }}
      style={{
        marginTop: 20, display: 'flex', gap: 8, maxWidth: 440, width: '100%',
      }}
    >
      <input
        value={val}
        onChange={e => setVal(e.target.value)}
        placeholder={isAR ? 'أدخل الباركود يدوياً...' : 'Enter barcode manually…'}
        style={{
          flex: 1, height: 34, padding: '0 10px', borderRadius: 4,
          border: '1px solid rgba(255,255,255,0.15)',
          backgroundColor: 'rgba(255,255,255,0.07)',
          color: '#fff', fontSize: 13, outline: 'none',
          fontFamily: 'ui-monospace, monospace',
        }}
      />
      <button
        type="submit"
        disabled={!val.trim()}
        style={{
          height: 34, padding: '0 14px', borderRadius: 4, border: 'none',
          backgroundColor: val.trim() ? primary : 'rgba(255,255,255,0.1)',
          color: '#fff', fontSize: 13, fontWeight: 600, cursor: val.trim() ? 'pointer' : 'not-allowed',
        }}
      >
        {isAR ? 'بحث' : 'Search'}
      </button>
    </form>
  );
}
