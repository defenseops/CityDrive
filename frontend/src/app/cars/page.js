'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { carsAPI, bookingsAPI } from '@/lib/api';
import UserHeader from '@/components/UserHeader';

const CLASS_LABELS = { economy: 'Эконом', comfort: 'Комфорт', suv: 'SUV', minivan: 'Минивэн', business: 'Бизнес', premium: 'Премиум' };
const CLASS_COLORS = {
  economy:  { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8' },
  comfort:  { bg: 'rgba(14,165,233,0.12)',  text: '#38bdf8' },
  suv:      { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
  minivan:  { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  business: { bg: 'rgba(251,191,36,0.12)',  text: '#fbbf24' },
  premium:  { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
};
const TRANSMISSION_LABELS = { automatic: 'Автомат', manual: 'Механика', robotic: 'Робот' };

export default function CarsPage() {
  const router = useRouter();
  const [cars, setCars] = useState([]);
  const [filters, setFilters] = useState({ status: 'available', car_class: '' });
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(null);
  const [bookingForm, setBookingForm] = useState({ tariff_id: '1', has_delivery: false, delivery_address: '' });
  const [bookingError, setBookingError] = useState('');
  const [bookingLoading, setBookingLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!localStorage.getItem('token') || user.table === 'employees') { router.replace('/login'); return; }
    loadCars();
  }, [filters]);

  const loadCars = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.car_class) params.car_class = filters.car_class;
      setCars(await carsAPI.getCars(params));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const openBooking = (car) => {
    setBooking(car);
    setBookingError('');
    setBookingForm({ tariff_id: '1', has_delivery: false, delivery_address: '' });
  };

  const handleBook = async () => {
    setBookingError('');
    setBookingLoading(true);
    try {
      await bookingsAPI.createBooking({
        car_id: booking.id,
        tariff_id: parseInt(bookingForm.tariff_id),
        has_delivery: bookingForm.has_delivery,
        delivery_address: bookingForm.has_delivery ? bookingForm.delivery_address : undefined,
      });
      setBooking(null);
      router.push('/bookings');
    } catch (err) {
      setBookingError(err.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const clr = (cls) => CLASS_COLORS[cls] || { bg: 'rgba(99,102,241,0.12)', text: '#818cf8' };

  return (
    <div className="min-h-screen">
      <UserHeader links={[
        { href: '/cars',     label: 'Авто' },
        { href: '/bookings', label: 'Мои брони' },
        { href: '/receipts', label: 'Чеки' },
        { href: '/fines',    label: 'Штрафы' },
      ]} />

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between mb-6 animate-fade-in">
          <div>
            <h2 className="text-2xl font-bold text-white">Доступные автомобили</h2>
            <p className="text-slate-500 text-sm mt-1">{cars.length} авто доступно</p>
          </div>
          <select
            className="rounded-xl px-3 py-2 text-sm text-slate-300 border border-dark-border focus:outline-none focus:border-indigo-500 transition-colors"
            style={{ background: '#13131f' }}
            value={filters.car_class}
            onChange={(e) => setFilters({ ...filters, car_class: e.target.value })}>
            <option value="">Все классы</option>
            {Object.entries(CLASS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
            <p className="text-slate-500 text-sm">Загружаем автомобили...</p>
          </div>
        ) : cars.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-5xl mb-4">🚫</p>
            <p className="text-slate-400">Нет доступных автомобилей</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cars.map((car, i) => {
              const c = clr(car.car_class);
              return (
                <div key={car.id}
                  onClick={() => router.push(`/cars/${car.id}`)}
                  className="rounded-2xl border border-dark-border transition-all duration-300 hover:border-indigo-500/40 hover:-translate-y-1 hover:shadow-xl group cursor-pointer overflow-hidden"
                  style={{
                    background: '#13131f',
                    animationDelay: `${i * 0.05}s`,
                    animation: 'slideUp 0.4s ease forwards',
                    opacity: 0,
                  }}>
                  {/* Class color accent strip */}
                  <div className="h-1 w-full" style={{ background: c.text }} />

                  <div className="p-5">
                    {/* Car header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-bold text-white text-base group-hover:text-indigo-200 transition-colors">
                          {car.brand} {car.model}
                        </h3>
                        <p className="text-xs text-slate-500 mt-0.5">{car.year} · {car.color}</p>
                      </div>
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full shrink-0 ml-2"
                        style={{ background: c.bg, color: c.text }}>
                        {CLASS_LABELS[car.car_class] || car.car_class}
                      </span>
                    </div>

                    {/* Info grid */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      {[
                        { icon: '⚙️', val: TRANSMISSION_LABELS[car.transmission] || car.transmission },
                        { icon: '📍', val: car.parking_name || 'Нет паркинга' },
                        { icon: '🛡️', val: `${Number(car.insurance_deposit || 0).toLocaleString('ru-RU')} ₽` },
                        { icon: '🪑', val: car.child_seat ? 'Детское кресло' : 'Без кресла' },
                      ].map((item, j) => (
                        <div key={j} className="flex items-center gap-1.5 rounded-xl px-3 py-2"
                          style={{ background: '#0a0a14' }}>
                          <span className="text-xs">{item.icon}</span>
                          <span className="text-xs text-slate-400 truncate">{item.val}</span>
                        </div>
                      ))}
                    </div>

                    {/* Fuel bar */}
                    <div className="mb-4">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs" style={{ color: '#475569' }}>⛽ Топливо</span>
                        <span className="text-xs font-medium" style={{
                          color: (car.fuel_level ?? 0) > 30 ? '#4ade80' : '#f87171',
                        }}>{car.fuel_level ?? '—'}%</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e30' }}>
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${car.fuel_level ?? 0}%`,
                            background: (car.fuel_level ?? 0) > 30
                              ? 'linear-gradient(90deg, #16a34a, #4ade80)'
                              : 'linear-gradient(90deg, #dc2626, #f87171)',
                          }} />
                      </div>
                    </div>

                    {/* Price + CTA */}
                    <div className="flex items-center justify-between pt-3 border-t border-dark-border">
                      <div>
                        <p className="font-bold text-indigo-400 text-xl">{car.price_per_minute} <span className="text-sm font-normal text-slate-500">₽/мин</span></p>
                        {car.price_per_km && <p className="text-xs text-slate-600">{car.price_per_km} ₽/км</p>}
                      </div>
                      <button onClick={(e) => { e.stopPropagation(); openBooking(car); }}
                        className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5 shrink-0"
                        style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                        Забронировать
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Booking modal */}
      {booking && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md rounded-2xl border border-dark-border p-6 animate-slide-up"
            style={{ background: '#13131f' }}>
            {/* Modal header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: clr(booking.car_class).bg }}>🚗</div>
              <div>
                <h3 className="font-bold text-white">{booking.brand} {booking.model}</h3>
                <p className="text-xs text-slate-500">{booking.license_plate}</p>
              </div>
              <button onClick={() => setBooking(null)}
                className="ml-auto text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            {/* Info */}
            <div className="rounded-xl p-4 mb-4 grid grid-cols-2 gap-3" style={{ background: '#0a0a14' }}>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Тариф</p>
                <p className="text-sm font-semibold text-white">{booking.price_per_minute} ₽/мин</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Депозит</p>
                <p className="text-sm font-semibold text-white">{Number(booking.insurance_deposit || 0).toLocaleString('ru-RU')} ₽</p>
              </div>
            </div>

            {/* Delivery toggle */}
            <label className="flex items-center gap-3 cursor-pointer rounded-xl p-3 border border-dark-border hover:border-indigo-500/40 transition-colors mb-4"
              style={{ background: bookingForm.has_delivery ? 'rgba(79,70,229,0.08)' : 'transparent' }}>
              <div className={`w-10 h-6 rounded-full transition-all duration-200 relative shrink-0 ${bookingForm.has_delivery ? '' : 'bg-dark-border'}`}
                style={bookingForm.has_delivery ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : {}}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow ${bookingForm.has_delivery ? 'left-5' : 'left-1'}`} />
              </div>
              <input type="checkbox" className="hidden" checked={bookingForm.has_delivery}
                onChange={(e) => setBookingForm({ ...bookingForm, has_delivery: e.target.checked })} />
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
              <button onClick={() => setBooking(null)} className="btn-secondary">Отмена</button>
              <button onClick={handleBook} className="btn-primary" disabled={bookingLoading}>
                {bookingLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                    Бронируем...
                  </span>
                ) : 'Подтвердить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
