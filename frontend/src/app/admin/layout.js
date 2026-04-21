'use client';
import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const NAV_ITEMS = [
  { href: '/admin/dashboard',          label: 'Дашборд',       icon: '📊', roles: ['admin','manager','moderator','driver','parking_manager'] },
  { href: '/admin/employees',          label: 'Сотрудники',    icon: '👤', roles: ['admin'] },
  { href: '/admin/verification',       label: 'Верификация',   icon: '🪪', roles: ['admin','moderator'] },
  { href: '/admin/users',              label: 'Клиенты',       icon: '👥', roles: ['admin','manager','moderator'] },
  { href: '/admin/cars',               label: 'Автопарк',      icon: '🚗', roles: ['admin','manager','parking_manager'] },
  { href: '/admin/bookings',           label: 'Бронирования',  icon: '📋', roles: ['admin','manager','parking_manager'] },
  { href: '/admin/fines',              label: 'Штрафы',        icon: '⚠️', roles: ['admin','manager','moderator'] },
  { href: '/admin/driver/deliveries',  label: 'Доставки',      icon: '🚚', roles: ['driver','admin','manager'] },
  { href: '/admin/tariffs',            label: 'Тарифы',        icon: '💳', roles: ['admin','manager'] },
  { href: '/admin/receipts',           label: 'Чеки',          icon: '🧾', roles: ['admin','manager'] },
  { href: '/admin/audit',              label: 'Аудит',         icon: '🔍', roles: ['admin'] },
];

const ROLE_LABELS = {
  admin: 'Администратор', manager: 'Менеджер автопарка', moderator: 'Модератор',
  driver: 'Водитель', parking_manager: 'Менеджер паркинга',
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

export default function AdminLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [user, setUser]               = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (pathname === '/admin/login') return;
    const token   = localStorage.getItem('token');
    const userStr = localStorage.getItem('user');
    if (!token || !userStr) { router.replace('/admin/login'); return; }
    try {
      const u = JSON.parse(userStr);
      if (u.table !== 'employees') { router.replace('/admin/login'); return; }
      setUser(u);
    } catch {
      router.replace('/admin/login');
    }
  }, [pathname]);

  // Close sidebar on navigation
  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  if (pathname === '/admin/login') return <>{children}</>;

  const logout      = () => { localStorage.clear(); router.replace('/admin/login'); };
  const visibleNav  = user ? NAV_ITEMS.filter((item) => item.roles.includes(user.role)) : [];

  const SidebarContent = () => (
    <>
      {/* Logo + user info */}
      <div className="px-4 py-5 border-b flex items-start justify-between" style={{ borderColor: '#1e1e30' }}>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>🚗</div>
            <span className="font-bold text-white text-base">CityDrive</span>
            <span className="text-xs px-1.5 py-0.5 rounded-md font-semibold shrink-0"
              style={{ background: 'rgba(79,70,229,0.15)', color: '#818cf8' }}>Admin</span>
          </div>
          {user && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.first_name} {user.last_name}</p>
                <p className="text-xs truncate" style={{ color: '#6366f1' }}>{ROLE_LABELS[user.role] || user.role}</p>
              </div>
            </div>
          )}
        </div>
        {/* Close button — mobile only */}
        <button onClick={() => setSidebarOpen(false)}
          className="lg:hidden ml-2 mt-0.5 w-7 h-7 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/[0.06] transition-colors shrink-0">
          ✕
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {visibleNav.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link key={item.href} href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                active
                  ? 'text-indigo-300'
                  : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
              }`}
              style={active ? { background: 'rgba(79,70,229,0.12)', borderLeft: '2px solid #6366f1' } : {}}>
              <span className="text-base shrink-0">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="px-3 py-4 border-t" style={{ borderColor: '#1e1e30' }}>
        <button onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm text-slate-500 hover:text-red-400 hover:bg-red-400/[0.06] transition-all">
          <span>🚪</span> Выйти
        </button>
      </div>
    </>
  );

  return (
    <div className="flex min-h-screen" style={{ background: '#07070f' }}>

      {/* Mobile backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
          onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar — fixed on mobile, static on desktop */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 flex flex-col shrink-0 border-r transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: '#0a0a14', borderColor: '#1e1e30' }}>
        <SidebarContent />
      </aside>

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile top bar */}
        <div className="lg:hidden flex items-center gap-3 px-4 h-14 border-b sticky top-0 z-30 shrink-0"
          style={{
            background: 'rgba(7,7,15,0.97)',
            borderColor: '#1e1e30',
            backdropFilter: 'blur(12px)',
          }}>
          <button
            onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            style={{ background: '#13131f' }}
            aria-label="Открыть меню">
            <HamburgerIcon />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>🚗</div>
            <span className="font-bold text-white">CityDrive</span>
            <span className="text-xs px-1.5 py-0.5 rounded font-semibold"
              style={{ background: 'rgba(79,70,229,0.15)', color: '#818cf8' }}>Admin</span>
          </div>
          {user && (
            <div className="ml-auto flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white"
                style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
            </div>
          )}
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-auto" style={{ background: '#07070f' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
