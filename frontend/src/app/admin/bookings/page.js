'use client';
import { useState, useEffect } from 'react';
import { bookingsAPI } from '@/lib/api';

const STATUS_OPTIONS = ['reserved', 'active', 'completed', 'cancelled', 'expired'];
const STATUS_LABELS  = { reserved: 'Зарезервировано', active: 'Активна', completed: 'Завершена', cancelled: 'Отменена', expired: 'Просрочена' };
const STATUS_BADGES  = { reserved: 'badge-reserved', active: 'badge-active', completed: 'badge-completed', cancelled: 'badge-cancelled', expired: 'badge-expired' };

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

export default function AdminBookingsPage() {
  const [data, setData] = useState({ data: [], total: 0 });
  const [filters, setFilters] = useState({ status: '', date_from: '', date_to: '' });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(null);
  const [endOdometer, setEndOdometer] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filters.status) params.status = filters.status;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      setData(await bookingsAPI.getBookings(params));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters, page]);

  const handleComplete = async () => {
    try {
      await bookingsAPI.completeBooking(completing.id, endOdometer ? parseInt(endOdometer) : undefined);
      setCompleting(null);
      setEndOdometer('');
      await load();
    } catch (err) { alert(err.message); }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-white">Бронирования</h1>
        <p className="text-slate-500 text-sm mt-1">Всего: {data.total}</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select className="input-field w-auto" value={filters.status}
          onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
          <option value="">Все статусы</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <input type="date" className="input-field w-auto" value={filters.date_from}
          onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} />
        <input type="date" className="input-field w-auto" value={filters.date_to}
          onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} />
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr style={{ background: '#0a0a14', borderBottom: '1px solid #1e1e30' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Автомобиль</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Начало</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Конец</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Сумма</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((b) => (
                  <tr key={b.id} className="border-b transition-colors hover:bg-dark-hover"
                    style={{ borderColor: '#1e1e30' }}>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">#{b.id}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-white">{b.client_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{b.client_phone}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-white">{b.car_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{b.license_plate}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={STATUS_BADGES[b.status] || 'badge-pending'}>
                        {STATUS_LABELS[b.status] || b.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{fmtDate(b.started_at || b.reserved_at)}</td>
                    <td className="px-4 py-3.5 text-xs text-slate-400">{fmtDate(b.ended_at)}</td>
                    <td className="px-4 py-3.5 font-semibold text-indigo-400">
                      {b.total_cost > 0 ? `${Number(b.total_cost).toLocaleString('ru-RU')} ₽` : '—'}
                    </td>
                    <td className="px-4 py-3.5">
                      {b.status === 'active' && (
                        <button onClick={() => { setCompleting(b); setEndOdometer(''); }}
                          className="text-xs font-medium text-green-400 hover:text-green-300 transition-colors">
                          Завершить
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {data.data.length === 0 && <div className="text-center py-12 text-slate-500">Бронирований не найдено</div>}
          </div>

          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-slate-500">Всего: {data.total}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1,p-1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-dark-border hover:border-indigo-500/40 hover:text-white transition-colors disabled:opacity-30"
                style={{ background: '#13131f' }}>←</button>
              <span className="text-slate-500 px-1">Стр. {page}</span>
              <button onClick={() => setPage(p => p+1)} disabled={page * 20 >= data.total}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-dark-border hover:border-indigo-500/40 hover:text-white transition-colors disabled:opacity-30"
                style={{ background: '#13131f' }}>→</button>
            </div>
          </div>
        </>
      )}

      {/* Complete modal */}
      {completing && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 animate-slide-up"
            style={{ background: '#13131f', borderColor: '#1e1e30' }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(34,197,94,0.1)' }}>✅</div>
              <div>
                <h3 className="font-bold text-white">Завершить аренду</h3>
                <p className="text-xs text-slate-500">Бронь #{completing.id} · {completing.client_name}</p>
              </div>
              <button onClick={() => setCompleting(null)}
                className="ml-auto text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            <div className="mb-5">
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Конечный пробег (км)</label>
              <input type="number" className="input-field" placeholder="Введите пробег"
                value={endOdometer} onChange={(e) => setEndOdometer(e.target.value)} />
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCompleting(null)} className="btn-secondary">Отмена</button>
              <button onClick={handleComplete} className="btn-primary"
                style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                Завершить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
