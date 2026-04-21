'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { bookingsAPI } from '@/lib/api';
import UserHeader from '@/components/UserHeader';

function fmt(n) { return Number(n || 0).toLocaleString('ru-RU'); }

const STATUS_MAP = {
  reserved:  { label: 'Забронирован', badge: 'badge-reserved',  icon: '🕐' },
  active:    { label: 'Активна',      badge: 'badge-active',    icon: '🚗' },
  completed: { label: 'Завершена',    badge: 'badge-completed', icon: '✅' },
  cancelled: { label: 'Отменена',     badge: 'badge-cancelled', icon: '✕' },
  expired:   { label: 'Просрочена',   badge: 'badge-expired',   icon: '⏰' },
};

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function BookingsPage() {
  const router = useRouter();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(null);
  const [returning, setReturning] = useState(null);
  const [returnRequested, setReturnRequested] = useState(new Set());
  const [payingDeposit, setPayingDeposit] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.replace('/login'); return; }
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setLoading(true);
    try {
      setBookings(await bookingsAPI.getMyBookings());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Отменить бронирование?')) return;
    setCancelling(id);
    try {
      await bookingsAPI.cancelBooking(id);
      await loadBookings();
    } catch (err) { alert(err.message); }
    finally { setCancelling(null); }
  };

  const handlePayDeposit = async (id) => {
    setPayingDeposit(id);
    try {
      await bookingsAPI.payDeposit(id);
      await loadBookings();
    } catch (err) { alert(err.message); }
    finally { setPayingDeposit(null); }
  };

  const handleRequestReturn = async (id) => {
    if (!confirm('Завершить поездку и вызвать водителя для возврата авто?')) return;
    setReturning(id);
    try {
      await bookingsAPI.requestReturn(id);
      setReturnRequested((s) => new Set([...s, id]));
    } catch (err) { alert(err.message); }
    finally { setReturning(null); }
  };

  return (
    <div className="min-h-screen">
      <UserHeader links={[
        { href: '/cars',     label: 'Авто' },
        { href: '/bookings', label: 'Мои брони' },
        { href: '/receipts', label: 'Чеки' },
        { href: '/fines',    label: 'Штрафы' },
      ]} />

      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-white">Мои бронирования</h2>
            <p className="text-slate-500 text-sm mt-1">{bookings.length} поездок</p>
          </div>
          <Link href="/cars">
            <button className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              + Забронировать
            </button>
          </Link>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
            <p className="text-slate-500 text-sm">Загружаем брони...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-6xl mb-4">📋</p>
            <p className="text-slate-400 text-lg font-medium mb-2">Бронирований ещё нет</p>
            <p className="text-slate-600 text-sm mb-6">Выберите автомобиль и начните поездку</p>
            <Link href="/cars">
              <button className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                Выбрать автомобиль
              </button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.map((b, i) => {
              const sm = STATUS_MAP[b.status] || { label: b.status, badge: 'badge-pending', icon: '•' };
              const returnSent = returnRequested.has(b.id);
              return (
                <div key={b.id}
                  className="rounded-2xl border border-dark-border p-5 transition-all duration-200 hover:border-indigo-500/20"
                  style={{
                    background: '#13131f',
                    animation: 'slideUp 0.4s ease forwards',
                    animationDelay: `${i * 0.05}s`,
                    opacity: 0,
                  }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: '#0a0a14' }}>
                        {sm.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-white">{b.car_name}</h3>
                        <p className="text-xs text-slate-500">{b.license_plate}</p>
                      </div>
                    </div>
                    <span className={sm.badge}>{sm.label}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
                      <p className="text-xs text-slate-600 mb-0.5">Забронировано</p>
                      <p className="text-xs text-slate-300 font-medium">{formatDate(b.reserved_at)}</p>
                    </div>
                    {b.started_at && (
                      <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
                        <p className="text-xs text-slate-600 mb-0.5">Начало</p>
                        <p className="text-xs text-slate-300 font-medium">{formatDate(b.started_at)}</p>
                      </div>
                    )}
                    {b.ended_at && (
                      <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
                        <p className="text-xs text-slate-600 mb-0.5">Завершение</p>
                        <p className="text-xs text-slate-300 font-medium">{formatDate(b.ended_at)}</p>
                      </div>
                    )}
                    {b.total_cost > 0 && (
                      <div className="rounded-xl px-3 py-2.5" style={{ background: 'rgba(79,70,229,0.1)' }}>
                        <p className="text-xs text-slate-600 mb-0.5">Стоимость</p>
                        <p className="text-sm font-bold text-indigo-400">{Number(b.total_cost).toLocaleString('ru-RU')} ₽</p>
                      </div>
                    )}
                  </div>

                  {/* Pending deposit payment */}
                  {b.status === 'active' && b.pending_hold_amount > 0 && (
                    <div className="mt-3 rounded-xl border p-4 animate-fade-in"
                      style={{ background: 'rgba(251,191,36,0.05)', borderColor: 'rgba(251,191,36,0.2)' }}>
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-yellow-400">💳</span>
                        <p className="text-sm font-semibold text-yellow-300">Требуется оплата залога</p>
                      </div>
                      <p className="text-xs text-slate-400 mb-3">
                        Залог будет возвращён после сдачи авто. Вы заплатите только за пройденные километры.
                      </p>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs text-slate-500">Сумма залога</span>
                        <span className="text-lg font-bold text-yellow-400">{fmt(b.pending_hold_amount)} ₽</span>
                      </div>
                      <button onClick={() => handlePayDeposit(b.id)} disabled={payingDeposit === b.id}
                        className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40"
                        style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                        {payingDeposit === b.id ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                            Обрабатываем...
                          </span>
                        ) : `Оплатить залог ${fmt(b.pending_hold_amount)} ₽`}
                      </button>
                    </div>
                  )}

                  {/* Deposit paid confirmation */}
                  {b.status === 'active' && !b.pending_hold_amount && b.insurance_deposit > 0 && (
                    <div className="mt-3 flex items-center gap-2 rounded-xl px-4 py-2.5 border border-green-500/15"
                      style={{ background: 'rgba(34,197,94,0.04)' }}>
                      <span className="text-green-400 text-sm">✓</span>
                      <p className="text-xs text-green-400">Залог {fmt(b.insurance_deposit)} ₽ оплачен</p>
                    </div>
                  )}

                  {/* Active booking: request return */}
                  {b.status === 'active' && (
                    <div className="mt-2">
                      {returnSent ? (
                        <div className="flex items-center gap-2 rounded-xl px-4 py-2.5 border border-green-500/20"
                          style={{ background: 'rgba(34,197,94,0.06)' }}>
                          <span className="text-green-400 text-sm">🚗</span>
                          <p className="text-sm text-green-400">Водитель уже едет забрать авто</p>
                        </div>
                      ) : (
                        <button onClick={() => handleRequestReturn(b.id)} disabled={returning === b.id}
                          className="w-full py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                          {returning === b.id ? (
                            <span className="flex items-center justify-center gap-2">
                              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                              Отправляем запрос...
                            </span>
                          ) : '🏁 Завершить поездку'}
                        </button>
                      )}
                    </div>
                  )}

                  {/* Completed: final bill */}
                  {b.status === 'completed' && (b.charge_amount > 0 || b.refund_amount > 0) && (
                    <div className="mt-3 rounded-xl border p-4" style={{ background: 'rgba(99,102,241,0.05)', borderColor: 'rgba(99,102,241,0.15)' }}>
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Итоговый расчёт</p>
                      {b.end_odometer && b.start_odometer && (
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                          <span>Пробег</span>
                          <span className="text-white">{(b.end_odometer - b.start_odometer).toLocaleString()} км</span>
                        </div>
                      )}
                      {b.charge_amount > 0 && (
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                          <span>Списано за аренду</span>
                          <span className="text-red-400">−{fmt(b.charge_amount)} ₽</span>
                        </div>
                      )}
                      {b.refund_amount > 0 && (
                        <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                          <span>Возврат залога</span>
                          <span className="text-green-400">+{fmt(b.refund_amount)} ₽</span>
                        </div>
                      )}
                      <div className="flex justify-between text-sm font-bold border-t pt-2 mt-2"
                        style={{ borderColor: 'rgba(99,102,241,0.15)' }}>
                        <span className="text-slate-300">Итого</span>
                        <span className="text-indigo-400">{fmt(b.charge_amount || b.total_cost)} ₽</span>
                      </div>
                    </div>
                  )}

                  {b.status === 'reserved' && (
                    <button onClick={() => handleCancel(b.id)} disabled={cancelling === b.id}
                      className="flex items-center gap-1.5 text-sm text-red-400 hover:text-red-300 transition-colors font-medium disabled:opacity-40 mt-1">
                      <span>✕</span>
                      {cancelling === b.id ? 'Отменяем...' : 'Отменить бронь'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
