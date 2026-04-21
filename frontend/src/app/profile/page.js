'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI, bookingsAPI, balanceAPI } from '@/lib/api';

const VERIFICATION_LABELS = {
  unverified:           { label: 'Не верифицирован', cls: 'badge-pending' },
  documents_uploaded:   { label: 'Документы загружены', cls: 'badge-reserved' },
  pending_verification: { label: 'На проверке', cls: 'badge-reserved' },
  verified:             { label: 'Верифицирован', cls: 'badge-verified' },
  rejected:             { label: 'Отклонён', cls: 'badge-rejected' },
};

const STATUS_LABELS = {
  reserved:  { label: 'Забронирован', color: '#818cf8' },
  active:    { label: 'Активна',      color: '#4ade80' },
  completed: { label: 'Завершена',    color: '#64748b' },
  cancelled: { label: 'Отменена',     color: '#f87171' },
  expired:   { label: 'Просрочена',   color: '#fbbf24' },
};

function fmt(n) { return Number(n || 0).toLocaleString('ru-RU'); }

function fmtDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function NotificationBell({ count, onClick }) {
  return (
    <button onClick={onClick} className="relative w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
      style={{ background: '#13131f' }}>
      🔔
      {count > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white text-xs font-bold"
          style={{ background: '#ef4444', fontSize: '10px' }}>{count > 9 ? '9+' : count}</span>
      )}
    </button>
  );
}

const NOTIF_ICONS = { bookings: '📋', fines: '⚠️', transactions: '💳' };
const NOTIF_TEXT = {
  bookings: (n) => {
    const s = n.new_data?.status;
    if (s === 'completed') return 'Поездка завершена';
    if (s === 'cancelled') return 'Бронь отменена';
    if (s === 'active')    return 'Поездка началась';
    return 'Изменение бронирования';
  },
  fines: (n) => `Новый штраф: ${fmt(n.new_data?.amount)} ₽`,
  transactions: (n) => {
    const t = n.new_data?.type;
    if (t === 'deposit') return `Баланс пополнен: +${fmt(n.new_data?.amount)} ₽`;
    if (t === 'charge')  return `Списание: −${fmt(n.new_data?.amount)} ₽`;
    return 'Транзакция';
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [balance, setBalance] = useState(null);
  const [recentBookings, setRecentBookings] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showTopup, setShowTopup] = useState(false);
  const [topupAmount, setTopupAmount] = useState('');
  const [topupLoading, setTopupLoading] = useState(false);
  const [topupSuccess, setTopupSuccess] = useState(false);
  const [topupError, setTopupError] = useState('');
  const [loading, setLoading] = useState(true);
  const notifRef = useRef(null);

  useEffect(() => {
    if (!localStorage.getItem('token')) { router.replace('/login'); return; }
    Promise.all([
      authAPI.me(),
      balanceAPI.getBalance().catch(() => ({ balance: 0 })),
      bookingsAPI.getMyBookings().catch(() => []),
      balanceAPI.getNotifications().catch(() => []),
    ]).then(([u, bal, bookings, notifs]) => {
      if (u.table === 'employees') { router.replace('/admin/dashboard'); return; }
      setUser(u);
      localStorage.setItem('user', JSON.stringify(u));
      setBalance(bal.balance);
      setRecentBookings(bookings.slice(0, 5));
      setNotifications(notifs);
    }).catch(() => { localStorage.clear(); router.replace('/login'); })
      .finally(() => setLoading(false));
  }, [router]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleTopup = async () => {
    const amt = parseFloat(topupAmount);
    if (!amt || amt <= 0) { setTopupError('Введите сумму'); return; }
    setTopupLoading(true);
    setTopupError('');
    try {
      await balanceAPI.topup(amt);
      const newBal = await balanceAPI.getBalance();
      setBalance(newBal.balance);
      setTopupSuccess(true);
      setTopupAmount('');
      setTimeout(() => { setTopupSuccess(false); setShowTopup(false); }, 2000);
    } catch (err) {
      setTopupError(err.message);
    } finally {
      setTopupLoading(false);
    }
  };

  const logout = () => { localStorage.clear(); router.replace('/login'); };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
    </div>
  );
  if (!user) return null;

  const vs = VERIFICATION_LABELS[user.verification_status] || VERIFICATION_LABELS.unverified;
  const unreadNotifs = notifications.filter((n) => {
    const age = Date.now() - new Date(n.created_at).getTime();
    return age < 86400000;
  }).length;

  const PRESETS = [500, 1000, 2000, 5000];

  return (
    <div className="min-h-screen">
      <header className="border-b border-dark-border px-4 py-4 sticky top-0 z-20"
        style={{ background: 'rgba(7,7,15,0.95)', backdropFilter: 'blur(12px)' }}>
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>🚗</div>
            <span className="font-bold text-white text-lg">CityDrive</span>
          </div>
          <nav className="flex items-center gap-3">
            {user.can_book && <Link href="/cars" className="nav-link">Авто</Link>}
            {user.can_book && <Link href="/bookings" className="nav-link">Брони</Link>}
            <Link href="/fines" className="nav-link">Штрафы</Link>

            {/* Notification bell */}
            <div className="relative" ref={notifRef}>
              <NotificationBell count={unreadNotifs} onClick={() => setShowNotifs((v) => !v)} />
              {showNotifs && (
                <div className="absolute right-0 top-12 w-80 rounded-2xl border shadow-xl z-50 overflow-hidden animate-fade-in"
                  style={{ background: '#13131f', borderColor: '#1e1e30' }}>
                  <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#1e1e30' }}>
                    <span className="text-sm font-semibold text-white">Уведомления</span>
                    <span className="text-xs text-slate-500">{notifications.length} событий</span>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-sm">Нет уведомлений</div>
                    ) : notifications.map((n) => {
                      const icon = NOTIF_ICONS[n.table_name] || '•';
                      const text = NOTIF_TEXT[n.table_name]?.(n) || n.operation;
                      return (
                        <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b hover:bg-white/[0.02] transition-colors"
                          style={{ borderColor: '#1e1e30' }}>
                          <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                          <div className="min-w-0">
                            <p className="text-sm text-slate-200 truncate">{text}</p>
                            <p className="text-xs text-slate-600 mt-0.5">
                              {new Date(n.created_at).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <button onClick={logout} className="text-sm text-red-400 hover:text-red-300 transition-colors font-medium">Выйти</button>
          </nav>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 space-y-5">
        {/* User card */}
        <div className="card animate-slide-up relative overflow-hidden">
          <div className="absolute inset-0 opacity-30 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse at top right, rgba(79,70,229,0.2) 0%, transparent 60%)' }} />
          <div className="relative flex items-start justify-between mb-5">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{user.last_name} {user.first_name}</h2>
                <p className="text-slate-400 text-sm">{user.phone}</p>
                {user.email && <p className="text-slate-500 text-xs">{user.email}</p>}
              </div>
            </div>
            <span className={vs.cls}>{vs.label}</span>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-4">
            {[
              { label: 'Поездок', value: user.total_rides || 0 },
              { label: 'Рейтинг', value: `⭐ ${user.rating || '—'}` },
              { label: 'Потрачено', value: `${fmt(user.total_spent)} ₽` },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-4 text-center" style={{ background: '#0a0a14' }}>
                <p className="text-xl font-bold text-white">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>

          {!user.can_book && (
            <div className="rounded-xl px-3 py-2 text-xs text-amber-400 border border-amber-500/20 text-center"
              style={{ background: 'rgba(251,191,36,0.06)' }}>
              Бронирование недоступно
            </div>
          )}
        </div>

        {/* Balance card */}
        <div className="rounded-2xl border overflow-hidden animate-slide-up"
          style={{ background: '#13131f', borderColor: '#1e1e30' }}>
          <div className="px-5 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: 'rgba(34,197,94,0.12)' }}>💰</div>
              <div>
                <p className="text-xs text-slate-500 mb-0.5">Баланс счёта</p>
                <p className="text-2xl font-bold text-white">
                  {balance !== null ? `${fmt(balance)} ₽` : '—'}
                </p>
              </div>
            </div>
            <button onClick={() => { setShowTopup(true); setTopupError(''); setTopupSuccess(false); }}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
              style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
              + Пополнить
            </button>
          </div>
        </div>

        {/* Not verified warning */}
        {!user.can_book && (
          <div className="rounded-2xl p-5 border border-amber-500/20 animate-slide-up"
            style={{ background: 'rgba(251,191,36,0.05)' }}>
            <h3 className="font-semibold text-amber-400 mb-2">Активируйте аккаунт</h3>
            {user.verification_status === 'unverified' && (
              <p className="text-sm text-amber-400/70 mb-3">Загрузите фото водительского удостоверения для прохождения верификации.</p>
            )}
            {user.verification_status === 'documents_uploaded' && (
              <p className="text-sm text-amber-400/70 mb-3">Ваши документы на проверке. Обычно занимает до 24 часов.</p>
            )}
            {user.verification_status === 'rejected' && (
              <p className="text-sm text-amber-400/70 mb-3">Документы отклонены. Загрузите актуальные фото.</p>
            )}
            {['unverified', 'rejected'].includes(user.verification_status) && (
              <Link href="/verification">
                <button className="btn-primary max-w-xs">Загрузить документы</button>
              </Link>
            )}
          </div>
        )}

        {/* Quick nav */}
        <div className={`grid gap-3 sm:gap-4 animate-slide-up ${user.can_book ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-1'}`}>
          {user.can_book && (
            <Link href="/cars" className="flex flex-col items-center gap-2 rounded-2xl p-5 border border-dark-border hover:border-indigo-500/40 transition-all duration-200 group"
              style={{ background: '#13131f' }}>
              <span className="text-3xl group-hover:scale-110 transition-transform duration-200">🚗</span>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Забронировать</span>
            </Link>
          )}
          {user.can_book && (
            <Link href="/bookings" className="flex flex-col items-center gap-2 rounded-2xl p-5 border border-dark-border hover:border-indigo-500/40 transition-all duration-200 group"
              style={{ background: '#13131f' }}>
              <span className="text-3xl group-hover:scale-110 transition-transform duration-200">📋</span>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Мои брони</span>
            </Link>
          )}
          {user.can_book && (
            <Link href="/receipts" className="flex flex-col items-center gap-2 rounded-2xl p-5 border border-dark-border hover:border-indigo-500/40 transition-all duration-200 group"
              style={{ background: '#13131f' }}>
              <span className="text-3xl group-hover:scale-110 transition-transform duration-200">🧾</span>
              <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Чеки</span>
            </Link>
          )}
          <Link href="/fines" className="flex flex-col items-center gap-2 rounded-2xl p-5 border border-dark-border hover:border-indigo-500/40 transition-all duration-200 group"
            style={{ background: '#13131f' }}>
            <span className="text-3xl group-hover:scale-110 transition-transform duration-200">⚠️</span>
            <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">Штрафы</span>
          </Link>
        </div>

        {/* Recent bookings */}
        {recentBookings.length > 0 && (
          <div className="animate-slide-up">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Последние поездки</h3>
              <Link href="/bookings" className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors">Все →</Link>
            </div>
            <div className="space-y-2">
              {recentBookings.map((b) => {
                const sm = STATUS_LABELS[b.status] || { label: b.status, color: '#64748b' };
                return (
                  <div key={b.id} className="rounded-xl border px-4 py-3 flex items-center gap-3 transition-all hover:border-indigo-500/20"
                    style={{ background: '#13131f', borderColor: '#1e1e30' }}>
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                      style={{ background: '#0a0a14' }}>🚗</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{b.car_name}</p>
                      <p className="text-xs text-slate-500">{fmtDate(b.reserved_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs font-semibold" style={{ color: sm.color }}>{sm.label}</p>
                      {b.total_cost > 0 && (
                        <p className="text-xs text-slate-500">{fmt(b.total_cost)} ₽</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Info */}
        {user.last_ride_at && (
          <div className="rounded-2xl border px-5 py-4 animate-slide-up" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Информация</p>
            <div className="space-y-2">
              {[
                { label: 'Стаж вождения', value: `${user.driving_experience_years || 0} лет` },
                { label: 'Последняя поездка', value: fmtDate(user.last_ride_at) },
                { label: 'Дата рождения', value: fmtDate(user.birth_date) },
              ].filter((i) => i.value && i.value !== '—').map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-slate-500">{item.label}</span>
                  <span className="text-white font-medium">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Top-up modal */}
      {showTopup && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowTopup(false); }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 animate-slide-up"
            style={{ background: '#13131f', borderColor: '#1e1e30' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: 'rgba(34,197,94,0.12)' }}>💰</div>
              <div>
                <h3 className="font-bold text-white">Пополнение баланса</h3>
                <p className="text-xs text-slate-500">Текущий баланс: {fmt(balance)} ₽</p>
              </div>
              <button onClick={() => setShowTopup(false)}
                className="ml-auto text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            {topupSuccess ? (
              <div className="text-center py-6 animate-fade-in">
                <p className="text-4xl mb-3">✅</p>
                <p className="text-green-400 font-semibold">Баланс пополнен!</p>
              </div>
            ) : (
              <>
                {/* Presets */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                  {PRESETS.map((p) => (
                    <button key={p} onClick={() => setTopupAmount(String(p))}
                      className={`py-2 rounded-xl text-sm font-semibold transition-all ${topupAmount === String(p) ? 'text-white' : 'text-slate-400 hover:text-white'}`}
                      style={{
                        background: topupAmount === String(p) ? 'rgba(79,70,229,0.2)' : '#0a0a14',
                        border: `1px solid ${topupAmount === String(p) ? 'rgba(99,102,241,0.4)' : '#1e1e30'}`,
                      }}>
                      {p.toLocaleString('ru-RU')}
                    </button>
                  ))}
                </div>

                <div className="relative mb-4">
                  <input type="number" className="input-field text-lg font-bold pr-8"
                    placeholder="Сумма" value={topupAmount}
                    onChange={(e) => setTopupAmount(e.target.value)}
                    style={{ textAlign: 'center' }} />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 font-bold">₽</span>
                </div>

                {topupError && (
                  <div className="rounded-xl px-4 py-3 mb-4 text-sm text-red-400 border border-red-500/20"
                    style={{ background: 'rgba(239,68,68,0.08)' }}>{topupError}</div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setShowTopup(false)} className="btn-secondary">Отмена</button>
                  <button onClick={handleTopup} className="btn-primary" disabled={topupLoading}>
                    {topupLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                        Обрабатываем...
                      </span>
                    ) : `Пополнить ${topupAmount ? fmt(topupAmount) + ' ₽' : ''}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
