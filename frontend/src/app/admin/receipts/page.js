'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '@/lib/api';
import { BookingReceiptModal } from '@/components/FiscalReceiptModal';

function fmtShort(n) { return Number(n || 0).toLocaleString('ru-RU'); }

const SORT_OPTIONS = [
  { key: 'date_desc',   label: 'Сначала новые' },
  { key: 'date_asc',    label: 'Сначала старые' },
  { key: 'amount_desc', label: 'Сумма ↓' },
  { key: 'amount_asc',  label: 'Сумма ↑' },
];

const LIMIT = 20;

export default function AdminReceiptsPage() {
  const [rows, setRows]       = useState([]);
  const [total, setTotal]     = useState(0);
  const [page, setPage]       = useState(1);
  const [loading, setLoading] = useState(true);
  const [sort, setSort]       = useState('date_desc');
  const [search, setSearch]   = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [printing, setPrinting] = useState(null);

  const load = useCallback(async (p, s, q) => {
    setLoading(true);
    try {
      const res = await adminAPI.getReceipts({ page: p, limit: LIMIT, sort: s, search: q });
      setRows(res.data);
      setTotal(res.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page, sort, search); }, [page, sort, search, load]);

  const handleSearch = (e) => { e.preventDefault(); setPage(1); setSearch(searchInput); };
  const handleSort   = (key) => { setSort(key); setPage(1); };
  const pages = Math.max(1, Math.ceil(total / LIMIT));
  const totalRevenue = rows.reduce((s, r) => s + parseFloat(r.charge_amount || 0), 0);

  return (
    <div className="p-4 sm:p-6 max-w-6xl">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-white">Чеки клиентов</h1>
        <p className="text-slate-500 text-sm mt-1">{total} завершённых поездок</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex items-center gap-2">
          <input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Клиент, телефон, гос. номер..."
            className="input-field text-sm py-2"
            style={{ width: '260px' }}
          />
          <button type="submit"
            className="px-4 py-2 rounded-lg text-xs font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)' }}>
            Найти
          </button>
          {search && (
            <button type="button" onClick={() => { setSearchInput(''); setSearch(''); setPage(1); }}
              className="px-3 py-2 rounded-lg text-xs text-slate-400 hover:text-white transition-colors"
              style={{ background: '#0a0a14', border: '1px solid #1e1e30' }}>
              ✕
            </button>
          )}
        </form>

        <div className="flex gap-1 rounded-xl p-1" style={{ background: '#0a0a14', border: '1px solid #1e1e30' }}>
          {SORT_OPTIONS.map((o) => (
            <button key={o.key} onClick={() => handleSort(o.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={sort === o.key
                ? { background: 'rgba(79,70,229,0.18)', color: '#818cf8' }
                : { color: '#64748b' }}>
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {rows.length > 0 && (
        <div className="mb-4 px-4 py-3 rounded-xl border inline-flex items-center gap-2"
          style={{ background: 'rgba(79,70,229,0.06)', borderColor: 'rgba(99,102,241,0.15)' }}>
          <span className="text-xs text-slate-500">Выручка по выборке:</span>
          <span className="text-sm font-bold text-indigo-400">{fmtShort(totalRevenue)} ₽</span>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden animate-slide-up"
          style={{ background: '#13131f', borderColor: '#1e1e30' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr style={{ background: '#0a0a14', borderBottom: '1px solid #1e1e30' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Дата</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Клиент</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Автомобиль</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Пробег</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Залог</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Возврат</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Списано</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const km = (r.start_odometer != null && r.end_odometer != null)
                  ? r.end_odometer - r.start_odometer : null;
                return (
                  <tr key={r.id} className="border-b hover:bg-white/[0.02] transition-colors"
                    style={{ borderColor: '#1e1e30' }}>
                    <td className="px-4 py-3.5 text-xs text-slate-400 whitespace-nowrap">
                      <div>{new Date(r.ended_at).toLocaleDateString('ru-RU')}</div>
                      <div className="text-slate-600">{new Date(r.ended_at).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-white font-medium">{r.client_name}</div>
                      <div className="text-xs text-slate-500">{r.client_phone}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="text-sm text-white">{r.car_name}</div>
                      <div className="text-xs text-slate-500">{r.license_plate}</div>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-300">
                      {km !== null ? `${km.toLocaleString('ru-RU')} км` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-300">
                      {r.insurance_deposit > 0 ? `${fmtShort(r.insurance_deposit)} ₽` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-green-400">
                      {r.refund_amount > 0 ? `+${fmtShort(r.refund_amount)} ₽` : '—'}
                    </td>
                    <td className="px-4 py-3.5 text-right">
                      <span className="text-sm font-bold text-indigo-400">{fmtShort(r.charge_amount)} ₽</span>
                    </td>
                    <td className="px-4 py-3.5">
                      <button onClick={() => setPrinting(r)}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                        style={{ background: '#0a0a14', border: '1px solid #1e1e30' }}
                        title="Фискальный чек">
                        🧾
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {rows.length === 0 && (
            <div className="text-center py-12 text-slate-500">
              {search ? 'Ничего не найдено' : 'Завершённых поездок нет'}
            </div>
          )}
        </div>
      )}

      {pages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-slate-500">Страница {page} из {pages} · {total} записей</p>
          <div className="flex gap-1">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
              style={{ background: '#0a0a14', border: '1px solid #1e1e30' }}>← Назад</button>
            <button disabled={page === pages} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 disabled:opacity-30 hover:text-white transition-colors"
              style={{ background: '#0a0a14', border: '1px solid #1e1e30' }}>Вперёд →</button>
          </div>
        </div>
      )}

      {printing && <BookingReceiptModal booking={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
}
