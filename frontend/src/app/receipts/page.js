'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { bookingsAPI } from '@/lib/api';
import { BookingReceiptModal } from '@/components/FiscalReceiptModal';
import UserHeader from '@/components/UserHeader';

function fmtShort(n) { return Number(n || 0).toLocaleString('ru-RU'); }

function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function ReceiptCard({ b, index, onPrint }) {
  const km = (b.start_odometer != null && b.end_odometer != null)
    ? b.end_odometer - b.start_odometer : null;
  const charge  = parseFloat(b.charge_amount  || 0);
  const refund  = parseFloat(b.refund_amount  || 0);
  const deposit = parseFloat(b.insurance_deposit || 0);

  return (
    <div
      className="rounded-2xl border p-5 transition-all duration-200 hover:border-indigo-500/20"
      style={{
        background: '#13131f', borderColor: '#1e1e30',
        animation: 'slideUp 0.4s ease forwards',
        animationDelay: `${index * 0.05}s`, opacity: 0,
      }}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
            style={{ background: '#0a0a14' }}>🧾</div>
          <div>
            <h3 className="font-bold text-white">{b.car_name}</h3>
            <p className="text-xs text-slate-500">{b.license_plate}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-lg font-bold text-indigo-400">{fmtShort(charge)} ₽</p>
          <p className="text-xs text-slate-500">{formatDate(b.ended_at)}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
          <p className="text-xs text-slate-600 mb-0.5">Начало</p>
          <p className="text-xs text-slate-300 font-medium">{formatDate(b.started_at)}</p>
        </div>
        <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
          <p className="text-xs text-slate-600 mb-0.5">Завершение</p>
          <p className="text-xs text-slate-300 font-medium">{formatDate(b.ended_at)}</p>
        </div>
        {km !== null && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
            <p className="text-xs text-slate-600 mb-0.5">Пробег</p>
            <p className="text-xs text-slate-300 font-medium">{km.toLocaleString('ru-RU')} км</p>
          </div>
        )}
        {b.tariff_name && (
          <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
            <p className="text-xs text-slate-600 mb-0.5">Тариф</p>
            <p className="text-xs text-slate-300 font-medium">{b.tariff_name}</p>
          </div>
        )}
      </div>

      <div className="rounded-xl border p-4 mb-3" style={{ background: 'rgba(99,102,241,0.04)', borderColor: 'rgba(99,102,241,0.12)' }}>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Расчёт</p>
        <div className="space-y-1.5">
          {deposit > 0 && (
            <div className="flex justify-between text-xs text-slate-400">
              <span>Залог (предоплата)</span>
              <span className="text-slate-300">{fmtShort(deposit)} ₽</span>
            </div>
          )}
          {km !== null && b.price_per_km > 0 ? (
            <div className="flex justify-between text-xs text-slate-400">
              <span>{km} км × {fmtShort(b.price_per_km)} ₽/км</span>
              <span className="text-red-400">−{fmtShort(charge)} ₽</span>
            </div>
          ) : charge > 0 && (
            <div className="flex justify-between text-xs text-slate-400">
              <span>Списано за аренду</span>
              <span className="text-red-400">−{fmtShort(charge)} ₽</span>
            </div>
          )}
          {refund > 0 && (
            <div className="flex justify-between text-xs text-slate-400">
              <span>Возврат остатка залога</span>
              <span className="text-green-400">+{fmtShort(refund)} ₽</span>
            </div>
          )}
        </div>
        <div className="flex justify-between font-bold border-t pt-2.5 mt-2.5"
          style={{ borderColor: 'rgba(99,102,241,0.12)' }}>
          <span className="text-sm text-slate-300">Итого оплачено</span>
          <span className="text-base text-indigo-400">{fmtShort(charge)} ₽</span>
        </div>
      </div>

      <button onClick={() => onPrint(b)}
        className="w-full py-2.5 rounded-xl text-sm font-semibold text-slate-300 border transition-all hover:border-indigo-500/40 hover:text-white"
        style={{ background: '#0a0a14', borderColor: '#1e1e30' }}>
        🧾 Фискальный чек
      </button>
    </div>
  );
}

export default function ReceiptsPage() {
  const router = useRouter();
  const [receipts, setReceipts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [printing, setPrinting] = useState(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.replace('/login'); return; }
    bookingsAPI.getMyReceipts()
      .then(setReceipts)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalSpent = receipts.reduce((s, r) => s + parseFloat(r.charge_amount || 0), 0);

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
            <h2 className="text-2xl font-bold text-white">Мои чеки</h2>
            <p className="text-slate-500 text-sm mt-1">{receipts.length} завершённых поездок</p>
          </div>
          {receipts.length > 0 && (
            <div className="text-right">
              <p className="text-xs text-slate-500 mb-0.5">Всего потрачено</p>
              <p className="text-xl font-bold text-indigo-400">{fmtShort(totalSpent)} ₽</p>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
            <p className="text-slate-500 text-sm">Загружаем чеки...</p>
          </div>
        ) : receipts.length === 0 ? (
          <div className="text-center py-20 animate-fade-in">
            <p className="text-6xl mb-4">🧾</p>
            <p className="text-slate-400 text-lg font-medium mb-2">Чеков пока нет</p>
            <p className="text-slate-600 text-sm">Чеки появятся после завершения поездок</p>
          </div>
        ) : (
          <div className="space-y-3">
            {receipts.map((r, i) => (
              <ReceiptCard key={r.id} b={r} index={i} onPrint={setPrinting} />
            ))}
          </div>
        )}
      </main>

      {printing && <BookingReceiptModal booking={printing} onClose={() => setPrinting(null)} />}
    </div>
  );
}
