import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// ── Approximate exchange rates → USD (updated periodically, good enough for ERP display) ──
const RATES_TO_USD = {
  USD: 1,      EUR: 1.08,   GBP: 1.27,   CHF: 1.13,   JPY: 0.0067,
  CAD: 0.74,   AUD: 0.65,   CNY: 0.14,   INR: 0.012,  SAR: 0.267,
  AED: 0.272,  KWD: 3.26,   QAR: 0.274,  BHD: 2.65,   OMR: 2.60,
  JOD: 1.41,   EGP: 0.021,  MAD: 0.099,  TND: 0.322,  DZD: 0.0074,
  LYD: 0.207,  TRY: 0.031,  PKR: 0.0036, BDT: 0.0091, NGN: 0.00065,
};

/** Convert an amount in `currency` to USD */
function toUSD(amount, currency) {
  const rate = RATES_TO_USD[currency?.toUpperCase()] ?? 1;
  return amount * rate;
}

/** Format a USD total — e.g. 1 234 567 → "$1.23M" */
function fmtUSD(value) {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000)     return `$${(value / 1_000).toFixed(1)}K`;
  return `$${Math.round(value).toLocaleString()}`;
}

export default function GlobalAnalytics({ companies, isAR, tok, theme }) {
  const t = tok || {
    canvas: '#FAFAF7', elev: '#FFFFFF', sunken: '#F4F3EE',
    border: '#E5E4DE', fg: '#0A0A0A', fgMuted: '#525252', fgSubtle: '#9A9A9A',
  };

  // Detect whether currencies are mixed across companies
  const currencies   = [...new Set(companies.map(c => c.baseCurrency || 'USD'))];
  const mixedCurrency = currencies.length > 1;

  // Build chart data — stockValueUSD used for fair cross-company comparison
  const chartData = companies.map(c => {
    const currency     = c.baseCurrency || 'USD';
    const rawValue     = c.stats?.stockValue || 0;
    const stockValueUSD = toUSD(rawValue, currency);
    return {
      name:         c.name.length > 14 ? c.name.slice(0, 13) + '…' : c.name,
      fullName:     c.name,
      currency,
      stockValue:   rawValue,
      stockValueUSD,
      txIn:         c.stats?.txIn      || 0,
      txOut:        c.stats?.txOut     || 0,
      employees:    c.stats?.employees || 0,
    };
  });

  // Totals — always in USD
  const totalValueUSD  = chartData.reduce((a, c) => a + c.stockValueUSD, 0);
  const totalTxIn      = chartData.reduce((a, c) => a + c.txIn,          0);
  const totalTxOut     = chartData.reduce((a, c) => a + c.txOut,         0);
  const totalEmployees = chartData.reduce((a, c) => a + c.employees,     0);

  const tooltipStyle = {
    backgroundColor: t.elev,
    border: `1px solid ${t.border}`,
    borderRadius: 4,
    color: t.fg,
    fontSize: 12,
    fontFamily: 'ui-monospace, monospace',
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
  };
  const axisStyle = { fontSize: 11, fill: t.fgSubtle, fontFamily: 'ui-monospace, monospace' };
  const cursor    = { fill: theme === 'dark' ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)' };

  // ── Stat card ────────────────────────────────────────────────────────────────
  const StatCard = ({ label, value, sub, accent }) => (
    <div
      className="p-3 sm:py-5 sm:px-6"
      style={{
        backgroundColor: t.elev, border: `1px solid ${t.border}`,
        borderRadius: 4,
        display: 'flex', flexDirection: 'column', gap: 4,
        minWidth: 0, // allows text truncation/wrapping in flex
      }}
    >
      <span style={{
        fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
        wordBreak: 'break-word'
      }}>
        {label}
      </span>
      <span
        className="text-xl sm:text-3xl"
        style={{
          fontWeight: 800, lineHeight: 1.1,
          color: accent || t.fg, fontFamily: 'ui-monospace, monospace',
          wordBreak: 'break-all'
        }}
      >
        {value}
      </span>
      {sub && (
        <span style={{
          fontSize: 10, color: t.fgSubtle,
          fontFamily: 'ui-monospace, monospace', letterSpacing: '0.04em',
        }}>
          {sub}
        </span>
      )}
    </div>
  );

  // ── Chart card ───────────────────────────────────────────────────────────────
  const ChartCard = ({ title, sub, children }) => (
    <div style={{
      backgroundColor: t.elev, border: `1px solid ${t.border}`,
      borderRadius: 4, padding: '20px 24px', height: 360,
      display: 'flex', flexDirection: 'column', gap: 4,
    }}>
      <span style={{
        fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600,
        textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
      }}>
        {title}
      </span>
      {sub && (
        <span style={{ fontSize: 10, color: t.fgSubtle, fontFamily: 'ui-monospace, monospace', marginBottom: 4 }}>
          {sub}
        </span>
      )}
      <div style={{ flex: 1, minHeight: 0 }}>
        {children}
      </div>
    </div>
  );

  return (
    <div className="space-y-4 w-full max-w-6xl mx-auto animate-in fade-in duration-300">

      {/* ── Mixed-currency notice ── */}
      {mixedCurrency && (
        <div style={{
          padding: '10px 14px', borderRadius: 4,
          border: `1px solid ${t.border}`,
          backgroundColor: t.sunken,
          display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: 'ui-monospace, monospace', fontSize: 11, color: t.fgMuted,
        }}>
          <span style={{ fontSize: 14 }}>⚠</span>
          <span>
            {isAR
              ? `شركاتك تستخدم عملات مختلفة (${currencies.join(', ')}). تم تحويل جميع القيم إلى USD للمقارنة.`
              : `Your companies use different currencies (${currencies.join(', ')}). All values converted to USD for comparison.`}
          </span>
        </div>
      )}

      {/* ── Stat strip ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label={isAR ? 'إجمالي قيمة المخزون' : 'Total Stock Value'}
          value={fmtUSD(totalValueUSD)}
          sub={mixedCurrency ? (isAR ? 'محوّل إلى USD' : 'Converted to USD') : `USD`}
        />
        <StatCard
          label={isAR ? 'إجمالي القوى العاملة' : 'Total Workforce'}
          value={totalEmployees.toLocaleString()}
        />
        <StatCard
          label={isAR ? 'إجمالي الوارد' : 'Total TX In'}
          value={totalTxIn.toLocaleString()}
          accent="#16774A"
        />
        <StatCard
          label={isAR ? 'إجمالي الصادر' : 'Total TX Out'}
          value={totalTxOut.toLocaleString()}
          accent="#B91C1C"
        />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">

        {/* Stock value — always shown in USD for fair comparison */}
        <ChartCard
          title={isAR ? 'قيمة المخزون حسب الشركة' : 'Stock Value by Company'}
          sub={mixedCurrency
            ? (isAR ? '(القيم محوّلة إلى USD)' : '(values converted to USD)')
            : undefined}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.border} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false}
                tickFormatter={v => fmtUSD(v)} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={cursor}
                formatter={(v, _name, props) => {
                  const row = props.payload;
                  if (mixedCurrency && row?.currency !== 'USD') {
                    // Show native value + USD equivalent
                    return [
                      `${fmtUSD(v)} USD\n(${row.currency} ${row.stockValue.toLocaleString()})`,
                      isAR ? 'قيمة المخزون' : 'Stock Value',
                    ];
                  }
                  return [`${fmtUSD(v)}`, isAR ? 'قيمة المخزون' : 'Stock Value'];
                }}
                labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullName || _l}
              />
              <Bar dataKey="stockValueUSD" fill="#3b82f6" radius={[2, 2, 0, 0]}
                name={isAR ? 'قيمة المخزون (USD)' : 'Stock Value (USD)'} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Transaction volume */}
        <ChartCard title={isAR ? 'حجم الحركات' : 'Transaction Volume'}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.border} />
              <XAxis dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} />
              <YAxis tick={axisStyle} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={tooltipStyle}
                cursor={cursor}
                labelFormatter={(_l, payload) => payload?.[0]?.payload?.fullName || _l}
              />
              <Legend wrapperStyle={{
                paddingTop: 8, fontSize: 11,
                fontFamily: 'ui-monospace, monospace', color: t.fgMuted,
              }} />
              <Bar dataKey="txIn"  fill="#16774A" radius={[2, 2, 0, 0]} name={isAR ? 'وارد'  : 'IN'}  />
              <Bar dataKey="txOut" fill="#B91C1C" radius={[2, 2, 0, 0]} name={isAR ? 'صادر' : 'OUT'} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

      </div>

      {/* ── Per-company currency breakdown (shown when mixed) ── */}
      {mixedCurrency && (
        <div style={{
          backgroundColor: t.elev, border: `1px solid ${t.border}`,
          borderRadius: 4, padding: '16px 20px',
        }}>
          <span style={{
            display: 'block', marginBottom: 12,
            fontFamily: 'ui-monospace, monospace', fontSize: 10, fontWeight: 600,
            textTransform: 'uppercase', letterSpacing: '0.08em', color: t.fgSubtle,
          }}>
            {isAR ? 'تفصيل القيم بالعملة الأصلية' : 'Native Currency Breakdown'}
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {chartData.map((c, i) => (
              <div key={i} style={{
                padding: '10px 14px', borderRadius: 4,
                border: `1px solid ${t.border}`, backgroundColor: t.canvas,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, color: t.fgMuted }}>{c.fullName}</span>
                <span style={{
                  fontFamily: 'ui-monospace, monospace', fontSize: 12,
                  fontWeight: 700, color: t.fg,
                }}>
                  {c.currency} {c.stockValue.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}
