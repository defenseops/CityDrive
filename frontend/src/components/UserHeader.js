'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { balanceAPI } from '@/lib/api';

const NOTIF_ICONS = { bookings: '📋', fines: '⚠️', transactions: '💳' };
const NOTIF_TEXT = {
  bookings: (n) => {
    const s = n.new_data?.status;
    if (s === 'completed') return 'Поездка завершена';
    if (s === 'cancelled') return 'Бронь отменена';
    if (s === 'active')    return 'Поездка началась';
    return 'Изменение бронирования';
  },
  fines: (n) => `Штраф: ${Number(n.new_data?.amount || 0).toLocaleString('ru-RU')} ₽`,
  transactions: (n) => {
    const t = n.new_data?.type;
    if (t === 'refund') return `Баланс пополнен: +${Number(n.new_data?.amount || 0).toLocaleString('ru-RU')} ₽`;
    if (t === 'charge') return `Списание: −${Number(n.new_data?.amount || 0).toLocaleString('ru-RU')} ₽`;
    return 'Транзакция';
  },
};

function HamburgerIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <rect y="3" width="18" height="2" rx="1" fill="currentColor" />
      <rect y="8" width="18" height="2" rx="1" fill="currentColor" />
      <rect y="13" width="18" height="2" rx="1" fill="currentColor" />
    </svg>
  );
}

export default function UserHeader({ links = [] }) {
  const pathname = usePathname();
  const router   = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs,    setShowNotifs]    = useState(false);
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const notifRef  = useRef(null);
  const mobileRef = useRef(null);

  useEffect(() => {
    balanceAPI.getNotifications().then(setNotifications).catch(() => {});
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current  && !notifRef.current.contains(e.target))  setShowNotifs(false);
      if (mobileRef.current && !mobileRef.current.contains(e.target)) setMobileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Close mobile nav on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const unread = notifications.filter(
    (n) => Date.now() - new Date(n.created_at).getTime() < 86400000
  ).length;

  const logout = () => { localStorage.clear(); router.replace('/login'); };

  return (
    <header className="border-b sticky top-0 z-20"
      style={{
        background: 'rgba(7,7,15,0.97)',
        backdropFilter: 'blur(12px)',
        borderColor: '#1e1e30',
      }}>
      <div className="max-w-6xl mx-auto px-4 h-14 sm:h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/profile" className="flex items-center gap-2 shrink-0">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center text-sm"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>🚗</div>
          <span className="font-bold text-white text-lg">CityDrive</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {links.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link key={href} href={href}
                className="px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{ color: active ? '#fff' : '#64748b' }}>
                {label}
              </Link>
            );
          })}
          <Link href="/profile"
            className="px-3 py-2 rounded-lg text-sm font-medium transition-colors ml-1"
            style={{ color: pathname === '/profile' ? '#fff' : '#64748b' }}>
            Профиль
          </Link>
        </nav>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          {/* Notification bell */}
          <div className="relative" ref={notifRef}>
            <button
              onClick={() => setShowNotifs((v) => !v)}
              className="relative w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: '#13131f', color: '#64748b' }}
              aria-label="Уведомления">
              🔔
              {unread > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full flex items-center justify-center text-white font-bold"
                  style={{ background: '#ef4444', fontSize: '10px' }}>
                  {unread > 9 ? '9+' : unread}
                </span>
              )}
            </button>

            {showNotifs && (
              <div className="absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border shadow-2xl overflow-hidden animate-fade-in z-50"
                style={{ background: '#13131f', borderColor: '#1e1e30' }}>
                <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: '#1e1e30' }}>
                  <span className="text-sm font-semibold text-white">Уведомления</span>
                  <span className="text-xs" style={{ color: '#475569' }}>{notifications.length} событий</span>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-sm" style={{ color: '#475569' }}>Нет уведомлений</div>
                  ) : notifications.map((n) => {
                    const icon = NOTIF_ICONS[n.table_name] || '•';
                    const text = NOTIF_TEXT[n.table_name]?.(n) || n.operation;
                    return (
                      <div key={n.id} className="flex items-start gap-3 px-4 py-3 border-b transition-colors hover:bg-white/[0.02]"
                        style={{ borderColor: '#1e1e30' }}>
                        <span className="text-lg shrink-0 mt-0.5">{icon}</span>
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{text}</p>
                          <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
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

          {/* Mobile hamburger */}
          <div className="relative sm:hidden" ref={mobileRef}>
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
              style={{ background: '#13131f', color: '#94a3b8' }}
              aria-label="Меню">
              <HamburgerIcon />
            </button>

            {mobileOpen && (
              <div className="absolute right-0 top-12 w-48 rounded-2xl border shadow-2xl overflow-hidden animate-fade-in z-50"
                style={{ background: '#13131f', borderColor: '#1e1e30' }}>
                {links.map(({ href, label }) => {
                  const active = pathname === href || pathname.startsWith(href + '/');
                  return (
                    <Link key={href} href={href}
                      className="flex items-center px-4 py-3 text-sm font-medium border-b transition-colors hover:bg-white/[0.04]"
                      style={{ borderColor: '#1e1e30', color: active ? '#818cf8' : '#94a3b8' }}>
                      {label}
                    </Link>
                  );
                })}
                <Link href="/profile"
                  className="flex items-center px-4 py-3 text-sm font-medium border-b transition-colors hover:bg-white/[0.04]"
                  style={{ borderColor: '#1e1e30', color: pathname === '/profile' ? '#818cf8' : '#94a3b8' }}>
                  Профиль
                </Link>
                <button onClick={logout}
                  className="w-full flex items-center px-4 py-3 text-sm font-medium transition-colors hover:bg-red-500/[0.08]"
                  style={{ color: '#f87171' }}>
                  Выйти
                </button>
              </div>
            )}
          </div>

          {/* Desktop logout */}
          <button onClick={logout}
            className="hidden sm:block text-sm font-medium transition-colors hover:text-red-300 ml-1"
            style={{ color: '#475569' }}>
            Выйти
          </button>
        </div>
      </div>
    </header>
  );
}
