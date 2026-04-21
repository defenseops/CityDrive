'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/lib/api';

const TABS = [
  { key: 'cars',  label: 'Автомобили', icon: '🚗' },
  { key: 'users', label: 'Пользователи', icon: '👥' },
];

const OP_LABELS = {
  INSERT: { label: 'Создан',  bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
  UPDATE: { label: 'Изменён', bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  DELETE: { label: 'Удалён',  bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
  COMPLETED: { label: 'Завершён', bg: 'rgba(99,102,241,0.12)', text: '#818cf8' },
};

const TABLE_LABELS = {
  cars: 'Авто',
  bookings: 'Бронь',
  users: 'Пользователь',
  fines: 'Штраф',
};

function DataDiff({ old_data, new_data, operation }) {
  if (operation === 'INSERT' || operation === 'COMPLETED') {
    const data = new_data || {};
    const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined);
    if (!entries.length) return null;
    return (
      <div className="mt-1.5 space-y-0.5">
        {entries.map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">{k}:</span>
            <span style={{ color: '#4ade80' }}>{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  if (operation === 'DELETE') {
    const data = old_data || {};
    return (
      <div className="mt-1.5 space-y-0.5">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex items-center gap-1.5 text-xs">
            <span className="text-slate-500">{k}:</span>
            <span style={{ color: '#f87171' }}>{String(v)}</span>
          </div>
        ))}
      </div>
    );
  }

  // UPDATE — show changed fields
  const oldD = old_data || {};
  const newD = new_data || {};
  const keys = [...new Set([...Object.keys(oldD), ...Object.keys(newD)])];
  const changed = keys.filter((k) => String(oldD[k]) !== String(newD[k]));
  if (!changed.length) return null;
  return (
    <div className="mt-1.5 space-y-0.5">
      {changed.map((k) => (
        <div key={k} className="flex items-center gap-1.5 text-xs flex-wrap">
          <span className="text-slate-500">{k}:</span>
          {oldD[k] !== undefined && (
            <span style={{ color: '#f87171' }} className="line-through">{String(oldD[k])}</span>
          )}
          <span className="text-slate-500">→</span>
          {newD[k] !== undefined && (
            <span style={{ color: '#4ade80' }}>{String(newD[k])}</span>
          )}
        </div>
      ))}
    </div>
  );
}

const LIMIT = 30;

export default function AuditPage() {
  const [tab, setTab] = useState('cars');
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (t, p) => {
    setLoading(true);
    try {
      const res = await adminAPI.getAudit({ type: t, page: p, limit: LIMIT });
      setRows(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(tab, page); }, [tab, page, load]);

  const switchTab = (key) => { setTab(key); setPage(1); };

  const pages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Журнал аудита</h1>
          <p className="text-slate-500 text-sm mt-1">{total} записей</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 rounded-xl p-1 w-fit" style={{ background: '#0a0a14', border: '1px solid #1e1e30' }}>
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => switchTab(t.key)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key
              ? { background: 'rgba(79,70,229,0.18)', color: '#818cf8' }
              : { color: '#64748b' }}>
            <span>{t.icon}</span>{t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr style={{ background: '#0a0a14', borderBottom: '1px solid #1e1e30' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Время</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Таблица</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Событие</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  {tab === 'cars' ? 'Автомобиль' : 'Пользователь'}
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Изменения</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Кем</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const op = OP_LABELS[row.operation] || OP_LABELS.UPDATE;
                const dt = new Date(row.changed_at);
                return (
                  <tr key={row.id} className="border-b hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: '#1e1e30' }}>
                    <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      <div>{dt.toLocaleDateString('ru-RU')}</div>
                      <div className="text-slate-600">{dt.toLocaleTimeString('ru-RU')}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                        style={{ background: 'rgba(100,116,139,0.12)', color: '#94a3b8' }}>
                        {TABLE_LABELS[row.table_name] || row.table_name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className="text-xs px-2.5 py-0.5 rounded-full font-semibold"
                        style={{ background: op.bg, color: op.text }}>
                        {op.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-white">
                      {tab === 'cars' ? (
                        <span>{row.car_info || `#${row.record_id}`}</span>
                      ) : (
                        <div>
                          <div>{row.client_name || `#${row.record_id}`}</div>
                          {row.client_phone && <div className="text-xs text-slate-500">{row.client_phone}</div>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 max-w-xs">
                      <DataDiff old_data={row.old_data} new_data={row.new_data} operation={row.operation} />
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{row.changed_by}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {rows.length === 0 && (
            <div className="text-center py-12 text-slate-500">Записей нет</div>
          )}
        </div>
      )}

      {/* Pagination */}
      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">
            Страница {page} из {pages} · {total} записей
          </p>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
              style={{ background: '#0a0a14', border: '1px solid #1e1e30' }}>
              ← Назад
            </button>
            <button disabled={page === pages} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
              style={{ background: '#0a0a14', border: '1px solid #1e1e30' }}>
              Вперёд →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
