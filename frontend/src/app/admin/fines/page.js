'use client';
import { useState, useEffect } from 'react';
import { finesAPI, bookingsAPI } from '@/lib/api';
import { FineReceiptModal } from '@/components/FiscalReceiptModal';

const FINE_TYPES = [
  { value: 'traffic_gibdd', label: 'Штраф ГИБДД' },
  { value: 'dirty_car',     label: 'Грязный автомобиль' },
  { value: 'smoking',       label: 'Курение в салоне' },
  { value: 'pet_hair',      label: 'Шерсть животных' },
  { value: 'damage',        label: 'Повреждение' },
  { value: 'late_return',   label: 'Опоздание' },
  { value: 'other',         label: 'Другое' },
];

const PAYMENT_LABELS = { pending: 'Не оплачен', paid: 'Оплачен', cancelled: 'Отменён' };
const PAYMENT_BADGES = { pending: 'badge-pending', paid: 'badge-verified', cancelled: 'badge-cancelled' };

const STATUS_LABELS = {
  reserved: 'Забронировано', active: 'Активна', completed: 'Завершена',
  cancelled: 'Отменена', expired: 'Просрочена',
};
const STATUS_COLORS = {
  reserved: '#a78bfa', active: '#34d399', completed: '#60a5fa',
  cancelled: '#f87171', expired: '#fb923c',
};

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('ru-RU');
}
function fmtDateTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function AdminFinesPage() {
  const [data, setData] = useState({ data: [], total: 0 });
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [bookings, setBookings] = useState([]);
  const [bookingsLoading, setBookingsLoading] = useState(false);
  const [bookingSearch, setBookingSearch] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [form, setForm] = useState({ fine_type: 'dirty_car', amount: '', admin_comment: '' });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [paying, setPaying]     = useState(null);
  const [printing, setPrinting] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (filterStatus) params.payment_status = filterStatus;
      setData(await finesAPI.getFines(params));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filterStatus, page]);

  const openForm = async () => {
    setShowForm(true);
    setSelectedBooking(null);
    setBookingSearch('');
    setForm({ fine_type: 'dirty_car', amount: '', admin_comment: '' });
    setFormError('');
    setBookingsLoading(true);
    try {
      const res = await bookingsAPI.getBookings({ limit: 100, status: 'active' });
      const active = res.data || [];
      const res2 = await bookingsAPI.getBookings({ limit: 100, status: 'completed' });
      const completed = res2.data || [];
      setBookings([...active, ...completed]);
    } catch (err) { console.error(err); }
    finally { setBookingsLoading(false); }
  };

  const closeForm = () => {
    setShowForm(false);
    setSelectedBooking(null);
    setBookingSearch('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedBooking) { setFormError('Выберите поездку'); return; }
    setFormError('');
    setSubmitting(true);
    try {
      await finesAPI.assignFine({
        user_id: selectedBooking.user_id,
        booking_id: selectedBooking.id,
        car_id: selectedBooking.car_id,
        fine_type: form.fine_type,
        amount: parseFloat(form.amount),
        admin_comment: form.admin_comment || undefined,
      });
      closeForm();
      await load();
    } catch (err) { setFormError(err.message); }
    finally { setSubmitting(false); }
  };

  const handlePay = async (id) => {
    if (!confirm('Отметить штраф оплаченным?')) return;
    setPaying(id);
    try {
      await finesAPI.payFine(id);
      await load();
    } catch (err) { alert(err.message); }
    finally { setPaying(null); }
  };

  const q = bookingSearch.toLowerCase();
  const filteredBookings = bookings.filter((b) =>
    !q ||
    b.client_name?.toLowerCase().includes(q) ||
    b.client_phone?.includes(q) ||
    b.car_name?.toLowerCase().includes(q) ||
    b.license_plate?.toLowerCase().includes(q) ||
    String(b.id).includes(q)
  );

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Штрафы</h1>
          <p className="text-slate-500 text-sm mt-1">Всего: {data.total}</p>
        </div>
        <button onClick={openForm}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          + Назначить штраф
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 mb-5">
        <select className="input-field w-auto" value={filterStatus}
          onChange={(e) => { setFilterStatus(e.target.value); setPage(1); }}>
          <option value="">Все статусы</option>
          <option value="pending">Не оплачен</option>
          <option value="paid">Оплачен</option>
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead>
                <tr style={{ background: '#0a0a14', borderBottom: '1px solid #1e1e30' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Тип</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Сумма</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Дата</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((f) => (
                  <tr key={f.id} className="border-b transition-colors hover:bg-dark-hover"
                    style={{ borderColor: '#1e1e30' }}>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">#{f.id}</td>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-white">{f.client_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{f.client_phone}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">
                      {FINE_TYPES.find((t) => t.value === f.fine_type)?.label || f.fine_type}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-amber-400">
                      {Number(f.amount).toLocaleString('ru-RU')} ₽
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={PAYMENT_BADGES[f.payment_status] || 'badge-pending'}>
                        {PAYMENT_LABELS[f.payment_status] || f.payment_status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">{fmtDate(f.created_at)}</td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2">
                        {f.payment_status === 'pending' && (
                          <button onClick={() => handlePay(f.id)} disabled={paying === f.id}
                            className="text-xs font-medium text-green-400 hover:text-green-300 transition-colors disabled:opacity-40">
                            {paying === f.id ? '...' : 'Оплачен'}
                          </button>
                        )}
                        {f.payment_status === 'paid' && (
                          <button onClick={() => setPrinting(f)}
                            className="px-2 py-1 rounded-lg text-xs font-medium text-slate-400 hover:text-white transition-colors"
                            style={{ background: '#0a0a14', border: '1px solid #1e1e30' }}
                            title="Фискальный чек">
                            🧾
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {data.data.length === 0 && <div className="text-center py-12 text-slate-500">Штрафов не найдено</div>}
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

      {printing && <FineReceiptModal fine={printing} onClose={() => setPrinting(null)} />}

      {/* Assign fine modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-lg rounded-2xl border flex flex-col animate-slide-up"
            style={{ background: '#13131f', borderColor: '#1e1e30', maxHeight: '90vh' }}>

            {/* Header */}
            <div className="flex items-center gap-3 px-6 pt-6 pb-4 border-b shrink-0" style={{ borderColor: '#1e1e30' }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: 'rgba(251,146,60,0.1)' }}>⚠️</div>
              <h3 className="font-bold text-white">Назначить штраф</h3>
              <button onClick={closeForm}
                className="ml-auto text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col overflow-hidden">
              {/* Step 1: pick booking */}
              <div className="px-6 pt-4 pb-3 border-b shrink-0" style={{ borderColor: '#1e1e30' }}>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">1. Выберите поездку</p>

                {selectedBooking ? (
                  <div className="rounded-xl p-3 border flex items-center justify-between"
                    style={{ background: 'rgba(79,70,229,0.08)', borderColor: 'rgba(79,70,229,0.3)' }}>
                    <div>
                      <p className="font-semibold text-white text-sm">{selectedBooking.client_name}</p>
                      <p className="text-xs text-slate-400">{selectedBooking.car_name} · {selectedBooking.license_plate}</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        #{selectedBooking.id} · {fmtDateTime(selectedBooking.started_at || selectedBooking.reserved_at)}
                      </p>
                    </div>
                    <button type="button" onClick={() => setSelectedBooking(null)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors font-medium ml-3 shrink-0">
                      Изменить
                    </button>
                  </div>
                ) : (
                  <>
                    <input
                      className="input-field mb-2"
                      placeholder="Поиск по клиенту, авто, номеру..."
                      value={bookingSearch}
                      onChange={(e) => setBookingSearch(e.target.value)}
                    />
                    <div className="overflow-y-auto space-y-1.5" style={{ maxHeight: '220px' }}>
                      {bookingsLoading ? (
                        <div className="flex justify-center py-6">
                          <div className="w-6 h-6 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
                        </div>
                      ) : filteredBookings.length === 0 ? (
                        <p className="text-center text-slate-500 text-sm py-4">Поездок не найдено</p>
                      ) : (
                        filteredBookings.slice(0, 30).map((b) => (
                          <button type="button" key={b.id}
                            onClick={() => setSelectedBooking(b)}
                            className="w-full text-left rounded-xl px-3 py-2.5 border transition-all hover:border-indigo-500/30"
                            style={{ background: '#0a0a14', borderColor: '#1e1e30' }}>
                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <p className="font-medium text-white text-sm truncate">{b.client_name}</p>
                                <p className="text-xs text-slate-400 truncate">{b.car_name} · {b.license_plate}</p>
                              </div>
                              <div className="text-right shrink-0">
                                <p className="text-xs font-medium" style={{ color: STATUS_COLORS[b.status] || '#94a3b8' }}>
                                  {STATUS_LABELS[b.status] || b.status}
                                </p>
                                <p className="text-xs text-slate-600 mt-0.5">#{b.id}</p>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Step 2: fine details */}
              <div className="px-6 pt-4 pb-5 overflow-y-auto space-y-4">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">2. Детали штрафа</p>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Тип штрафа *</label>
                  <select className="input-field" value={form.fine_type}
                    onChange={(e) => setForm({ ...form, fine_type: e.target.value })}>
                    {FINE_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Сумма (₽) *</label>
                  <input type="number" step="0.01" min="0" className="input-field" required value={form.amount}
                    onChange={(e) => setForm({ ...form, amount: e.target.value })} />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Комментарий</label>
                  <textarea className="input-field" rows={2} value={form.admin_comment}
                    onChange={(e) => setForm({ ...form, admin_comment: e.target.value })} />
                </div>

                {formError && (
                  <div className="rounded-xl px-4 py-3 text-sm text-red-400 border border-red-500/20"
                    style={{ background: 'rgba(239,68,68,0.08)' }}>{formError}</div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={closeForm} className="btn-secondary">Отмена</button>
                  <button type="submit" className="btn-primary" disabled={submitting || !selectedBooking}>
                    {submitting ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                        Сохраняем...
                      </span>
                    ) : 'Назначить'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
