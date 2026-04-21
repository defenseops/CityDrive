'use client';
import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { carsAPI, bookingsAPI } from '@/lib/api';

const CLASS_LABELS = { economy: 'Эконом', comfort: 'Комфорт', suv: 'SUV', minivan: 'Минивэн', business: 'Бизнес', premium: 'Премиум' };
const CLASS_COLORS = {
  economy:  { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8' },
  comfort:  { bg: 'rgba(14,165,233,0.12)',  text: '#38bdf8' },
  suv:      { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
  minivan:  { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  business: { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  premium:  { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
};
const TRANSMISSION_LABELS = { automatic: 'Автоматическая КП', manual: 'Механическая КП', robotic: 'Роботизированная КП' };
const ENGINE_LABELS = { petrol: 'Бензин', diesel: 'Дизель', electric: 'Электро', hybrid: 'Гибрид', gas: 'Газ' };
const STATUS_LABELS = { available: 'Доступен', reserved: 'Забронирован', in_use: 'В поездке', maintenance: 'На ТО', disabled: 'Отключён' };

function InfoRow({ label, value, accent }) {
  return (
    <div className="flex items-center justify-between py-2.5 border-b" style={{ borderColor: '#1e1e30' }}>
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium ${accent ? 'text-indigo-400' : 'text-white'}`}>{value}</span>
    </div>
  );
}

export default function CarDetailPage() {
  const router = useRouter();
  const params = useParams();
  const [car, setCar] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showBooking, setShowBooking] = useState(false);
  const [bookingForm, setBookingForm] = useState({ has_delivery: false, delivery_address: '' });
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!localStorage.getItem('token') || user.table === 'employees') { router.replace('/login'); return; }
    carsAPI.getCar(params.id)
      .then(setCar)
      .catch(() => router.replace('/cars'))
      .finally(() => setLoading(false));
  }, [params.id]);

  const handleBook = async () => {
    setBookingError('');
    setBookingLoading(true);
    try {
      const result = await bookingsAPI.createBooking({
        car_id: car.id,
        tariff_id: 1,
        has_delivery: bookingForm.has_delivery,
        delivery_address: bookingForm.has_delivery ? bookingForm.delivery_address : undefined,
      });
      router.push('/bookings');
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
    </div>
  );
  if (!car) return null;

  const clr = CLASS_COLORS[car.car_class] || { bg: 'rgba(99,102,241,0.12)', text: '#818cf8' };
  const fuelPct = car.fuel_level ?? 0;
  const fuelColor = fuelPct > 50 ? '#4ade80' : fuelPct > 20 ? '#fbbf24' : '#f87171';

  return (
    <div className="min-h-screen">
      <header className="border-b border-dark-border px-4 py-4 sticky top-0 z-10"
        style={{ background: 'rgba(7,7,15,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/cars">
              <button className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                style={{ background: '#13131f' }}>←</button>
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>🚗</div>
              <span className="font-bold text-white text-lg">CityDrive</span>
            </div>
          </div>
          <nav className="flex items-center gap-5">
            <Link href="/bookings" className="nav-link">Мои брони</Link>
            <Link href="/profile" className="nav-link">Профиль</Link>
          </nav>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-8">
        {/* Hero card */}
        <div className="rounded-2xl border overflow-hidden mb-5 animate-fade-in"
          style={{ background: '#13131f', borderColor: '#1e1e30' }}>
          {/* Car visual header */}
          <div className="relative px-6 pt-8 pb-6"
            style={{ background: `linear-gradient(135deg, ${clr.bg.replace('0.12', '0.25')}, transparent)` }}>
            <div className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ background: `radial-gradient(ellipse at top left, ${clr.text}, transparent 60%)` }} />
            <div className="relative flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: clr.bg, color: clr.text }}>
                    {CLASS_LABELS[car.car_class] || car.car_class}
                  </span>
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                    style={{ background: car.status === 'available' ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                             color: car.status === 'available' ? '#4ade80' : '#f87171' }}>
                    {STATUS_LABELS[car.status] || car.status}
                  </span>
                </div>
                <h1 className="text-3xl font-bold text-white">{car.brand} {car.model}</h1>
                <p className="text-slate-400 mt-1">{car.year} · {car.color} · {car.license_plate}</p>
              </div>
              <div className="text-5xl">🚗</div>
            </div>

            {/* Fuel bar */}
            <div className="mt-5">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-slate-500">Топливо</span>
                <span className="text-xs font-semibold" style={{ color: fuelColor }}>{fuelPct}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: '#0a0a14' }}>
                <div className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${fuelPct}%`, background: fuelColor }} />
              </div>
            </div>
          </div>

          {/* Price block */}
          <div className="flex items-center gap-4 px-6 py-4 border-t border-b" style={{ borderColor: '#1e1e30', background: '#0a0a14' }}>
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-indigo-400">{car.price_per_minute} ₽</p>
              <p className="text-xs text-slate-500 mt-0.5">за минуту</p>
            </div>
            <div className="w-px h-10" style={{ background: '#1e1e30' }} />
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-indigo-400">{car.price_per_km || '—'} ₽</p>
              <p className="text-xs text-slate-500 mt-0.5">за километр</p>
            </div>
            <div className="w-px h-10" style={{ background: '#1e1e30' }} />
            <div className="flex-1 text-center">
              <p className="text-2xl font-bold text-slate-300">{Number(car.insurance_deposit || 0).toLocaleString('ru-RU')} ₽</p>
              <p className="text-xs text-slate-500 mt-0.5">депозит</p>
            </div>
          </div>

          {/* Specs */}
          <div className="px-6 py-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Характеристики</p>
            <InfoRow label="Трансмиссия" value={TRANSMISSION_LABELS[car.transmission] || car.transmission || '—'} />
            <InfoRow label="Тип топлива" value={ENGINE_LABELS[car.engine_type] || car.engine_type || '—'} />
            <InfoRow label="Пробег" value={`${(car.odometer_km || 0).toLocaleString('ru-RU')} км`} />
            {car.parking_name && <InfoRow label="Расположение" value={car.parking_name} />}
            {car.parking_address && <InfoRow label="Адрес" value={car.parking_address} />}
            {car.address && !car.parking_address && <InfoRow label="Адрес" value={car.address} />}
            {car.child_seat && <InfoRow label="Детское кресло" value="Есть" accent />}
          </div>

          {/* Damages */}
          {car.damages?.length > 0 && (
            <div className="px-6 pb-4">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Известные повреждения</p>
              <div className="space-y-2">
                {car.damages.map((d) => (
                  <div key={d.id} className="rounded-xl px-4 py-2.5 text-sm text-amber-400 border border-amber-500/20"
                    style={{ background: 'rgba(251,191,36,0.05)' }}>
                    ⚠️ {d.description || d.damage_type}
                    {d.location && <span className="text-xs text-amber-400/60 ml-2">({d.location})</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* CTA */}
        {car.status === 'available' ? (
          <button onClick={() => setShowBooking(true)}
            className="w-full py-4 rounded-2xl text-base font-bold text-white transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xl animate-slide-up"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', boxShadow: '0 0 40px rgba(99,102,241,0.3)' }}>
            Забронировать автомобиль
          </button>
        ) : (
          <div className="w-full py-4 rounded-2xl text-base font-bold text-center animate-slide-up"
            style={{ background: '#13131f', color: '#475569', border: '1px solid #1e1e30' }}>
            Автомобиль недоступен
          </div>
        )}
      </main>

      {/* Booking modal */}
      {showBooking && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowBooking(false); }}>
          <div className="w-full max-w-md rounded-2xl border p-6 animate-slide-up"
            style={{ background: '#13131f', borderColor: '#1e1e30' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: clr.bg }}>🚗</div>
              <div>
                <h3 className="font-bold text-white">{car.brand} {car.model}</h3>
                <p className="text-xs text-slate-500">{car.license_plate} · {car.year}</p>
              </div>
              <button onClick={() => setShowBooking(false)}
                className="ml-auto text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            <div className="rounded-xl p-4 mb-4 grid grid-cols-2 gap-3" style={{ background: '#0a0a14' }}>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Тариф</p>
                <p className="text-base font-bold text-indigo-400">{car.price_per_minute} ₽/мин</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Депозит</p>
                <p className="text-base font-bold text-white">{Number(car.insurance_deposit || 0).toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>

            <label className="flex items-center gap-3 cursor-pointer rounded-xl p-3 border border-dark-border hover:border-indigo-500/40 transition-colors mb-4"
              style={{ background: bookingForm.has_delivery ? 'rgba(79,70,229,0.08)' : 'transparent' }}>
              <div onClick={() => setBookingForm({ ...bookingForm, has_delivery: !bookingForm.has_delivery })}
                className={`w-10 h-6 rounded-full transition-all duration-200 relative shrink-0 cursor-pointer ${bookingForm.has_delivery ? '' : 'bg-dark-border'}`}
                style={bookingForm.has_delivery ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow ${bookingForm.has_delivery ? 'left-5' : 'left-1'}`} />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-200">Доставить ко мне</p>
                <p className="text-xs text-slate-500">Привезём автомобиль по вашему адресу</p>
              </div>
            </label>

            {bookingForm.has_delivery && (
              <div className="mb-4 animate-fade-in">
                <input type="text" className="input-field" placeholder="Введите адрес доставки"
                  value={bookingForm.delivery_address}
                  onChange={(e) => setBookingForm({ ...bookingForm, delivery_address: e.target.value })} />
              </div>
            )}

            {bookingError && (
              <div className="rounded-xl px-4 py-3 mb-4 text-sm text-red-400 border border-red-500/20"
                style={{ background: 'rgba(239,68,68,0.08)' }}>{bookingError}</div>
            )}

            <div className="flex gap-3">
              <button onClick={() => setShowBooking(false)} className="btn-secondary">Отмена</button>
              <button onClick={handleBook} className="btn-primary" disabled={bookingLoading}>
                {bookingLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                    Бронируем...
                  </span>
                ) : 'Подтвердить бронь'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
