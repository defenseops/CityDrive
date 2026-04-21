'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { finesAPI } from '@/lib/api';
import { FineReceiptModal } from '@/components/FiscalReceiptModal';
import UserHeader from '@/components/UserHeader';

const FINE_TYPES = {
  traffic_gibdd: 'Штраф ГИБДД',
  dirty_car:     'Грязный автомобиль',
  smoking:       'Курение в салоне',
  pet_hair:      'Шерсть животных',
  damage:        'Повреждение',
  late_return:   'Опоздание',
  other:         'Другое',
};

const STATUS_INFO = {
  pending:   { label: 'Не оплачен', badge: 'badge-pending',   icon: '⏳' },
  paid:      { label: 'Оплачен',    badge: 'badge-completed', icon: '✅' },
  cancelled: { label: 'Отменён',    badge: 'badge-cancelled', icon: '✕' },
};

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('ru-RU');
}

export default function FinesPage() {
  const router = useRouter();
  const [fines, setFines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying]     = useState(null);
  const [printing, setPrinting] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!token || user.table === 'employees') { router.replace('/login'); return; }
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    try { setFines(await finesAPI.getMyFines()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handlePay = async (fine) => {
    if (!confirm(`Оплатить штраф на сумму ${Number(fine.amount).toLocaleString('ru-RU')} ₽?`)) return;
    setPaying(fine.id);
    try { await finesAPI.payFine(fine.id); await load(); }
    catch (err) { alert(err.message); }
    finally { setPaying(null); }
  };

  const pendingFines = fines.filter((f) => f.payment_status === 'pending');
  const pendingTotal = pendingFines.reduce((sum, f) => sum + Number(f.amount), 0);

  return (
    <div className="min-h-screen">
      <UserHeader links={[
        { href: '/cars',     label: 'Авто' },
        { href: '/bookings', label: 'Мои брони' },
        { href: '/fines',    label: 'Штрафы' },
      ]} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-6 animate-fade-in">
          <h2 className="text-2xl font-bold text-white">Мои штрафы</h2>
          <p className="text-slate-500 text-sm mt-1">{fines.length} штрафов всего</p>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
            <p className="text-slate-500 text-sm">Загружаем штрафы...</p>
          </div>
        ) : (
          <>
            {/* Pending total banner */}
            {pendingTotal > 0 && (
              <div className="rounded-2xl p-5 mb-5 border border-red-500/20 animate-slide-up"
                style={{ background: 'rgba(239,68,68,0.06)' }}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-red-400 text-lg mb-0.5">
                      {pendingTotal.toLocaleString('ru-RU')} ₽
                    </p>
                    <p className="text-sm text-red-400/60">
                      {pendingFines.length} неоплаченных штрафа
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-red-400/50 max-w-40 text-right">
                      Бронирование авто заблокировано до оплаты
                    </p>
                  </div>
                </div>
              </div>
            )}

            {fines.length === 0 ? (
              <div className="text-center py-20 animate-fade-in">
                <p className="text-6xl mb-4">✅</p>
                <p className="text-slate-400 text-lg font-medium mb-1">Штрафов нет</p>
                <p className="text-slate-600 text-sm">Отличный водитель!</p>
              </div>
            ) : (
              <div className="space-y-3">
                {fines.map((f, i) => {
                  const si = STATUS_INFO[f.payment_status] || STATUS_INFO.pending;
                  const isPending = f.payment_status === 'pending';
                  return (
                    <div key={f.id}
                      className="rounded-2xl border p-5 transition-all duration-200"
                      style={{
                        background: '#13131f',
                        borderColor: isPending ? 'rgba(251,146,60,0.2)' : '#1e1e30',
                        animation: 'slideUp 0.4s ease forwards',
                        animationDelay: `${i * 0.05}s`,
                        opacity: 0,
                      }}>
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                            style={{ background: isPending ? 'rgba(251,146,60,0.1)' : '#0a0a14' }}>
                            {si.icon}
                          </div>
                          <div>
                            <p className="font-bold text-white">{FINE_TYPES[f.fine_type] || f.fine_type}</p>
                            {f.car_name && <p className="text-xs text-slate-500">{f.car_name} {f.license_plate && `· ${f.license_plate}`}</p>}
                          </div>
                        </div>
                        <span className={si.badge}>{si.label}</span>
                      </div>

                      <div className="flex items-end justify-between">
                        <div>
                          <p className={`text-2xl font-bold ${isPending ? 'text-amber-400' : 'text-slate-400'}`}>
                            {Number(f.amount).toLocaleString('ru-RU')} ₽
                          </p>
                          <div className="flex gap-3 mt-1">
                            <p className="text-xs text-slate-600">Выписан: {fmtDate(f.created_at)}</p>
                            {f.paid_at && <p className="text-xs text-green-500/60">Оплачен: {fmtDate(f.paid_at)}</p>}
                          </div>
                          {f.admin_comment && (
                            <p className="text-xs text-slate-500 mt-1.5 max-w-xs">💬 {f.admin_comment}</p>
                          )}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {isPending && (
                            <button onClick={() => handlePay(f)} disabled={paying === f.id}
                              className="px-5 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40"
                              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                              {paying === f.id ? (
                                <span className="flex items-center gap-2">
                                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                                  Оплата...
                                </span>
                              ) : 'Оплатить'}
                            </button>
                          )}
                          {f.payment_status === 'paid' && (
                            <button onClick={() => setPrinting(f)}
                              className="px-3 py-2.5 rounded-xl text-sm font-semibold text-slate-400 border transition-all hover:border-indigo-500/40 hover:text-white"
                              style={{ background: '#0a0a14', borderColor: '#1e1e30' }}>
                              🧾 Чек
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {printing && <FineReceiptModal fine={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
}
