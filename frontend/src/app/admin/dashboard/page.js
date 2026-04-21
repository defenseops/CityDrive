'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/lib/api';

const STAT_CONFIG = [
  {
    key: 'cars', title: 'Автомобили', icon: '🚗',
    color: '#6366f1', bg: 'rgba(99,102,241,0.12)',
    getVal: (s) => s?.cars?.total,
    getSub: (s) => `${s?.cars?.available || 0} свободно · ${s?.cars?.in_use || 0} в аренде`,
    getTrend: (s) => s?.cars?.in_use ? Math.round((s.cars.in_use / (s.cars.total || 1)) * 100) : 0,
  },
  {
    key: 'users', title: 'Клиенты', icon: '👥',
    color: '#22c55e', bg: 'rgba(34,197,94,0.12)',
    getVal: (s) => s?.users?.total,
    getSub: (s) => `${s?.users?.verified || 0} верифицировано · ${s?.users?.pending || 0} на проверке`,
    getTrend: (s) => s?.users?.total ? Math.round((s.users.verified / s.users.total) * 100) : 0,
  },
  {
    key: 'bookings', title: 'Бронирования', icon: '📋',
    color: '#38bdf8', bg: 'rgba(56,189,248,0.12)',
    getVal: (s) => s?.bookings?.total,
    getSub: (s) => `${s?.bookings?.active || 0} активных · ${s?.bookings?.reserved || 0} зарезервировано`,
    getTrend: (s) => s?.bookings?.active || 0,
  },
  {
    key: 'fines', title: 'Штрафы (неопл.)', icon: '⚠️',
    color: '#f87171', bg: 'rgba(248,113,113,0.12)',
    getVal: (s) => s?.fines?.pending,
    getSub: (s) => s?.fines?.pending_amount ? `${Number(s.fines.pending_amount).toLocaleString('ru-RU')} ₽` : '—',
    getTrend: () => null,
  },
];

const PERIODS = [
  { key: 'today', label: 'Сегодня' },
  { key: 'week',  label: '7 дней' },
  { key: 'month', label: 'Месяц' },
  { key: 'custom',label: 'Период' },
];

function fmt(n) { return Number(n || 0).toLocaleString('ru-RU'); }

// SVG Area Chart
function AreaChart({ data }) {
  if (!data || data.length === 0) return (
    <div className="flex items-center justify-center py-10 text-sm" style={{ color: '#334155' }}>
      Нет данных за период
    </div>
  );

  const W = 600, H = 140, padL = 0, padR = 0, padT = 12, padB = 8;
  const cW = W - padL - padR;
  const cH = H - padT - padB;

  const values = data.map((d) => parseFloat(d.revenue) || 0);
  const maxV   = Math.max(...values, 1);

  const pts = data.map((d, i) => ({
    x: padL + (i / Math.max(data.length - 1, 1)) * cW,
    y: padT + cH - (((parseFloat(d.revenue) || 0) / maxV) * cH),
    val: d.revenue,
    day: d.day,
  }));

  const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const areaPath = pts.length > 1
    ? `${linePath} L ${pts[pts.length - 1].x.toFixed(1)} ${H} L ${pts[0].x.toFixed(1)} ${H} Z`
    : '';

  return (
    <div className="w-full overflow-hidden">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} preserveAspectRatio="none">
        <defs>
          <linearGradient id="areaGrad" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#4f46e5" stopOpacity="0" />
          </linearGradient>
        </defs>
        {areaPath && <path d={areaPath} fill="url(#areaGrad)" />}
        <path d={linePath} fill="none" stroke="#6366f1" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="3.5" fill="#818cf8" stroke="#0a0a14" strokeWidth="2" />
        ))}
      </svg>
      {/* X-axis labels */}
      <div className="flex justify-between mt-2 px-0">
        {data.length <= 10
          ? data.map((d) => (
            <span key={d.day} className="text-xs shrink-0" style={{ color: '#334155' }}>
              {new Date(d.day).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
            </span>
          ))
          : (
            <>
              <span className="text-xs" style={{ color: '#334155' }}>
                {new Date(data[0].day).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
              </span>
              <span className="text-xs" style={{ color: '#334155' }}>
                {new Date(data[Math.floor(data.length / 2)].day).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
              </span>
              <span className="text-xs" style={{ color: '#334155' }}>
                {new Date(data[data.length - 1].day).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}
              </span>
            </>
          )
        }
      </div>
    </div>
  );
}

// SVG Donut Chart
function DonutChart({ available = 0, in_use = 0, maintenance = 0 }) {
  const total = available + in_use + maintenance;
  if (total === 0) return null;

  const r   = 38;
  const cx  = 55, cy = 55;
  const circ = 2 * Math.PI * r;

  const segs = [
    { value: available,   color: '#22c55e', label: 'Свободно' },
    { value: in_use,      color: '#6366f1', label: 'В аренде' },
    { value: maintenance, color: '#f59e0b', label: 'Обслуживание' },
  ];

  let cum = 0;
  const rendered = segs.map((seg) => {
    const len = (seg.value / total) * circ;
    const offset = -cum;
    cum += len;
    return { ...seg, len, offset };
  });

  return (
    <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap">
      <div className="shrink-0">
        <svg width="110" height="110" viewBox="0 0 110 110">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#1e1e30" strokeWidth="13" />
          {rendered.map((seg, i) => (
            <circle key={i} cx={cx} cy={cy} r={r} fill="none"
              stroke={seg.color} strokeWidth="13"
              strokeDasharray={`${seg.len.toFixed(1)} ${circ.toFixed(1)}`}
              strokeDashoffset={seg.offset.toFixed(1)}
              strokeLinecap="butt"
              style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} />
          ))}
          <text x={cx} y={cy - 6} textAnchor="middle" fill="#fff" fontSize="16" fontWeight="700">{total}</text>
          <text x={cx} y={cy + 10} textAnchor="middle" fill="#475569" fontSize="9">авто</text>
        </svg>
      </div>
      <div className="space-y-2 flex-1 min-w-0">
        {rendered.map((seg) => (
          <div key={seg.label} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: seg.color }} />
              <span className="text-xs text-slate-400 truncate">{seg.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-white">{seg.value}</span>
              <span className="text-xs w-8 text-right" style={{ color: '#334155' }}>
                {total > 0 ? Math.round((seg.value / total) * 100) : 0}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ cfg, stats }) {
  const val   = cfg.getVal(stats);
  const sub   = cfg.getSub(stats);
  const trend = cfg.getTrend(stats);

  return (
    <div className="rounded-2xl border p-5 transition-all duration-200 hover:border-indigo-500/20 relative overflow-hidden"
      style={{ background: '#13131f', borderColor: '#1e1e30' }}>
      <div className="absolute top-0 right-0 w-28 h-28 opacity-5 pointer-events-none"
        style={{ background: `radial-gradient(circle at top right, ${cfg.color}, transparent)` }} />
      <div className="relative flex items-start justify-between mb-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl" style={{ background: cfg.bg }}>
          {cfg.icon}
        </div>
        {trend !== null && (
          <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: cfg.bg, color: cfg.color }}>
            {trend}%
          </span>
        )}
      </div>
      <p className="text-3xl font-bold mb-1" style={{ color: val !== undefined ? cfg.color : '#475569' }}>
        {val ?? '—'}
      </p>
      <p className="text-xs font-semibold text-slate-400 mb-0.5">{cfg.title}</p>
      {sub && <p className="text-xs" style={{ color: '#334155' }}>{sub}</p>}
    </div>
  );
}

export default function DashboardPage() {
  const [stats,     setStats]     = useState(null);
  const [revenue,   setRevenue]   = useState(null);
  const [loadingS,  setLS]        = useState(true);
  const [loadingR,  setLR]        = useState(true);
  const [period,    setPeriod]    = useState('week');
  const [dateFrom,  setDateFrom]  = useState('');
  const [dateTo,    setDateTo]    = useState('');
  const [user,      setUser]      = useState(null);

  useEffect(() => {
    try { setUser(JSON.parse(localStorage.getItem('user') || '{}')); } catch {}
    adminAPI.getStats().then(setStats).catch(console.error).finally(() => setLS(false));
  }, []);

  const loadRevenue = useCallback((p, from, to) => {
    setLR(true);
    const params = { period: p };
    if (p === 'custom') { if (from) params.date_from = from; if (to) params.date_to = to; }
    adminAPI.getRevenue(params).then(setRevenue).catch(console.error).finally(() => setLR(false));
  }, []);

  useEffect(() => { loadRevenue(period, dateFrom, dateTo); }, [period]);

  const isAdmin = user?.role === 'admin';

  if (loadingS) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
    </div>
  );

  return (
    <div className="p-4 sm:p-6 max-w-6xl">

      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Дашборд</h1>
        <p className="text-sm mt-1" style={{ color: '#475569' }}>Обзор состояния системы</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-5 animate-slide-up">
        {STAT_CONFIG.map((cfg) => <StatCard key={cfg.key} cfg={cfg} stats={stats} />)}
      </div>

      {/* Revenue — admin only */}
      {isAdmin && (
        <div className="rounded-2xl border p-4 sm:p-6 mb-5 animate-slide-up" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <h2 className="font-semibold text-white flex items-center gap-2 text-base">
              <span>💰</span> Выручка
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              {PERIODS.map((p) => (
                <button key={p.key} onClick={() => setPeriod(p.key)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={period === p.key
                    ? { background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: '#fff' }
                    : { background: '#0a0a14', color: '#64748b', border: '1px solid #1e1e30' }}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {period === 'custom' && (
            <div className="flex flex-wrap items-center gap-2 mb-5 p-3 rounded-xl" style={{ background: '#0a0a14', border: '1px solid #1e1e30' }}>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#475569' }}>С</span>
                <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
                  className="input-field text-xs py-1.5" style={{ width: '140px' }} />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: '#475569' }}>По</span>
                <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
                  className="input-field text-xs py-1.5" style={{ width: '140px' }} />
              </div>
              <button onClick={() => loadRevenue('custom', dateFrom, dateTo)}
                className="px-4 py-1.5 rounded-lg text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
                style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
                Применить
              </button>
            </div>
          )}

          {loadingR ? (
            <div className="flex justify-center py-10">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
            </div>
          ) : (
            <>
              {/* Summary KPI row */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Чистая выручка',    val: `${fmt(revenue?.net_revenue)} ₽`,     color: '#4ade80', bg: 'rgba(34,197,94,0.08)',   border: 'rgba(34,197,94,0.15)' },
                  { label: 'Начислено',          val: `${fmt(revenue?.total_charges)} ₽`,   color: '#38bdf8', bg: 'rgba(56,189,248,0.08)',  border: 'rgba(56,189,248,0.15)' },
                  { label: 'Возвращено залогов', val: `${fmt(revenue?.total_refunds)} ₽`,   color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.15)' },
                  { label: 'Штрафы (оплачено)', val: `${fmt(revenue?.fines_collected)} ₽`, color: '#c084fc', bg: 'rgba(168,85,247,0.08)',  border: 'rgba(168,85,247,0.15)' },
                ].map((c) => (
                  <div key={c.label} className="rounded-xl p-3.5 border" style={{ background: c.bg, borderColor: c.border }}>
                    <p className="text-xs mb-1" style={{ color: '#64748b' }}>{c.label}</p>
                    <p className="text-lg font-bold" style={{ color: c.color }}>{c.val}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="rounded-xl p-3.5 border" style={{ background: '#0a0a14', borderColor: '#1e1e30' }}>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>Завершено поездок</p>
                  <p className="text-2xl font-bold text-white">{revenue?.bookings_count || 0}</p>
                </div>
                <div className="rounded-xl p-3.5 border" style={{ background: '#0a0a14', borderColor: '#1e1e30' }}>
                  <p className="text-xs mb-1" style={{ color: '#64748b' }}>Средний чек</p>
                  <p className="text-2xl font-bold text-indigo-400">{fmt(revenue?.avg_per_booking)} ₽</p>
                </div>
              </div>

              {/* Area chart */}
              {revenue?.by_day?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#334155' }}>
                      Динамика выручки
                    </p>
                    <p className="text-xs" style={{ color: '#334155' }}>
                      Макс: {fmt(Math.max(...revenue.by_day.map((d) => parseFloat(d.revenue))))} ₽
                    </p>
                  </div>
                  <div className="rounded-xl p-4" style={{ background: '#0a0a14' }}>
                    <AreaChart data={revenue.by_day} />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Detail cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 animate-slide-up">
        {/* Fleet with donut */}
        <div className="rounded-2xl border p-5 sm:p-6" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2"><span>🚗</span> Автопарк</h2>
          <DonutChart
            available={stats?.cars?.available || 0}
            in_use={stats?.cars?.in_use || 0}
            maintenance={stats?.cars?.maintenance || 0}
          />
        </div>

        {/* Bookings breakdown */}
        <div className="rounded-2xl border p-5 sm:p-6" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
          <h2 className="font-semibold text-white mb-5 flex items-center gap-2"><span>📋</span> Бронирования</h2>
          <div className="space-y-3">
            {[
              { label: 'Активных поездок', val: stats?.bookings?.active    || 0, color: '#4ade80', pct: stats?.bookings?.total ? Math.round((stats.bookings.active / stats.bookings.total) * 100) : 0 },
              { label: 'Зарезервировано',  val: stats?.bookings?.reserved  || 0, color: '#818cf8', pct: stats?.bookings?.total ? Math.round((stats.bookings.reserved / stats.bookings.total) * 100) : 0 },
              { label: 'Завершено',        val: stats?.bookings?.completed || 0, color: '#475569', pct: stats?.bookings?.total ? Math.round((stats.bookings.completed / stats.bookings.total) * 100) : 0 },
            ].map((row) => (
              <div key={row.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm text-slate-400">{row.label}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">{row.val}</span>
                    <span className="text-xs w-8 text-right" style={{ color: '#334155' }}>{row.pct}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e30' }}>
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${row.pct}%`, background: row.color }} />
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t flex items-center justify-between" style={{ borderColor: '#1e1e30' }}>
            <span className="text-sm text-slate-500">Всего бронирований</span>
            <span className="text-xl font-bold text-white">{stats?.bookings?.total || 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
