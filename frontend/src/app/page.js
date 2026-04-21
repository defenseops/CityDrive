'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const FEATURES = [
  { icon: '🔐', title: 'Безопасно', desc: 'Верификация документов перед первой поездкой. Все данные защищены.' },
  { icon: '⚡', title: 'Мгновенно', desc: 'Бронирование за несколько секунд. Авто ждёт на парковке.' },
  { icon: '💳', title: 'Прозрачно', desc: 'Только за минуты и километры. Никаких скрытых платежей.' },
  { icon: '🚗', title: 'Любой класс', desc: 'Эконом, Комфорт, Бизнес, Премиум — выберите под настроение.' },
  { icon: '🚚', title: 'Доставка', desc: 'Закажите авто прямо к вашему адресу без лишних поездок.' },
  { icon: '📊', title: 'Контроль', desc: 'История поездок, чеки и штрафы в одном удобном приложении.' },
];

const STEPS = [
  { step: '01', title: 'Регистрация', desc: 'Создайте аккаунт и загрузите фото ВУ. Верификация — до 24 часов.' },
  { step: '02', title: 'Выбор авто', desc: 'Просматривайте доступные машины, фильтруйте по классу и ценам.' },
  { step: '03', title: 'В путь!', desc: 'Забронируйте онлайн — авто ждёт на парковке или доставим к вам.' },
];

const STATS = [
  { value: '500+', label: 'Автомобилей' },
  { value: '12 000+', label: 'Клиентов' },
  { value: '99.8%', label: 'Надёжность' },
  { value: '24/7', label: 'Поддержка' },
];

export default function Home() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      try {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        router.replace(user.table === 'employees' ? '/admin/dashboard' : '/profile');
        return;
      } catch {}
    }
    setChecked(true);
  }, [router]);

  if (!checked) return (
    <div className="flex items-center justify-center min-h-screen" style={{ background: '#07070f' }}>
      <div className="w-8 h-8 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
    </div>
  );

  return (
    <div className="min-h-screen" style={{ background: '#07070f', color: '#fff' }}>

      {/* Header */}
      <header className="fixed top-0 inset-x-0 z-50 border-b"
        style={{ background: 'rgba(7,7,15,0.85)', backdropFilter: 'blur(16px)', borderColor: 'rgba(30,30,48,0.8)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>🚗</div>
            <span className="text-xl font-bold text-white">CityDrive</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link href="/login"
              className="px-3 sm:px-4 py-2 rounded-xl text-sm font-medium transition-colors"
              style={{ color: '#94a3b8' }}>
              Войти
            </Link>
            <Link href="/register"
              className="px-3 sm:px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg whitespace-nowrap"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
              Начать →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-28 sm:pt-36 pb-16 sm:pb-24 px-4 sm:px-6 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-96 opacity-25"
            style={{ background: 'radial-gradient(ellipse at center top, #4f46e5, transparent 70%)' }} />
          <div className="absolute top-32 left-1/3 w-72 h-72 opacity-10 blur-3xl rounded-full"
            style={{ background: '#7c3aed' }} />
          <div className="absolute top-16 right-1/4 w-96 h-96 opacity-8 blur-3xl rounded-full"
            style={{ background: '#4f46e5' }} />
        </div>

        <div className="relative max-w-6xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-8 border animate-fade-in"
            style={{ background: 'rgba(79,70,229,0.1)', borderColor: 'rgba(99,102,241,0.3)', color: '#818cf8' }}>
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#818cf8' }} />
            Каршеринг нового поколения
          </div>

          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white leading-tight mb-6 animate-slide-up">
            Твой автомобиль<br />
            <span style={{
              background: 'linear-gradient(135deg, #818cf8 0%, #c084fc 50%, #f472b6 100%)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              в один клик
            </span>
          </h1>

          <p className="text-base sm:text-xl max-w-xl mx-auto mb-10 leading-relaxed animate-slide-up-d"
            style={{ color: '#64748b' }}>
            Бронируй, езди, возвращай — без лишних формальностей.<br className="hidden sm:block" />
            Сотни автомобилей по всему городу, готовых прямо сейчас.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 animate-slide-up-d2">
            <Link href="/register"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-bold text-white transition-all duration-200 hover:-translate-y-1 text-center"
              style={{
                background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                boxShadow: '0 0 40px rgba(99,102,241,0.35)',
              }}>
              Зарегистрироваться бесплатно
            </Link>
            <Link href="/login"
              className="w-full sm:w-auto px-8 py-4 rounded-2xl text-base font-medium transition-all border text-center hover:-translate-y-0.5"
              style={{ background: '#13131f', borderColor: '#1e1e30', color: '#94a3b8' }}>
              Уже есть аккаунт
            </Link>
          </div>

          {/* Hero visual — mock car card */}
          <div className="mt-14 sm:mt-20 max-w-sm mx-auto animate-slide-up-d3">
            <div className="rounded-2xl border p-5 text-left relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #13131f, #0e0e1a)', borderColor: '#1e1e30' }}>
              <div className="absolute top-0 right-0 w-40 h-40 opacity-15"
                style={{ background: 'radial-gradient(circle at top right, #7c3aed, transparent)' }} />
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-bold text-white text-lg">Toyota Camry</p>
                  <p className="text-xs mt-0.5" style={{ color: '#64748b' }}>2023 · Серебристый</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>Бизнес</span>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-4">
                {[['⚙️', 'Автомат'], ['⛽', '85%'], ['📍', 'Центр'], ['🛡️', '15 000 ₽']].map(([icon, val]) => (
                  <div key={val} className="flex items-center gap-1.5 rounded-xl px-3 py-2"
                    style={{ background: '#0a0a14' }}>
                    <span className="text-xs">{icon}</span>
                    <span className="text-xs" style={{ color: '#94a3b8' }}>{val}</span>
                  </div>
                ))}
              </div>
              {/* Fuel bar */}
              <div className="mb-4">
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e30' }}>
                  <div className="h-full rounded-full" style={{ width: '85%', background: 'linear-gradient(90deg, #22c55e, #4ade80)' }} />
                </div>
              </div>
              <div className="flex items-center justify-between pt-3 border-t" style={{ borderColor: '#1e1e30' }}>
                <p className="font-bold text-indigo-400 text-xl">8 <span className="text-sm font-normal" style={{ color: '#64748b' }}>₽/мин</span></p>
                <div className="px-4 py-2 rounded-xl text-sm font-semibold text-white pointer-events-none"
                  style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                  Забронировать
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="py-12 border-y" style={{ borderColor: '#1e1e30', background: 'rgba(255,255,255,0.01)' }}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {STATS.map((s, i) => (
              <div key={i} className="text-center py-2">
                <p className="text-3xl sm:text-4xl font-black mb-1"
                  style={{
                    background: 'linear-gradient(135deg, #818cf8, #c084fc)',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
                  }}>
                  {s.value}
                </p>
                <p className="text-sm" style={{ color: '#64748b' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Всё что нужно для поездки</h2>
            <p className="max-w-xl mx-auto text-sm sm:text-base" style={{ color: '#64748b' }}>
              Простой интерфейс, мгновенное бронирование и прозрачный расчёт стоимости
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => (
              <div key={i}
                className="rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-1 group"
                style={{
                  background: '#13131f', borderColor: '#1e1e30',
                  animationDelay: `${i * 0.07}s`,
                }}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                  style={{ background: 'rgba(79,70,229,0.12)' }}>
                  {f.icon}
                </div>
                <h3 className="font-bold text-white text-lg mb-2 group-hover:text-indigo-300 transition-colors">{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 px-4 sm:px-6 border-t" style={{ borderColor: '#1e1e30' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">Как это работает</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 sm:gap-12">
            {STEPS.map((s, i) => (
              <div key={i} className="text-center">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-xl font-black mx-auto mb-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(79,70,229,0.2), rgba(124,58,237,0.2))',
                    border: '1px solid rgba(99,102,241,0.3)', color: '#818cf8',
                  }}>
                  {s.step}
                </div>
                <h3 className="font-bold text-white text-lg mb-2">{s.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#64748b' }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <div className="rounded-3xl p-10 sm:p-14 border relative overflow-hidden"
            style={{
              background: 'linear-gradient(135deg, rgba(79,70,229,0.12) 0%, rgba(124,58,237,0.06) 100%)',
              borderColor: 'rgba(99,102,241,0.25)',
            }}>
            <div className="absolute inset-0 pointer-events-none opacity-40"
              style={{ background: 'radial-gradient(ellipse at center, rgba(99,102,241,0.25), transparent 70%)' }} />
            <div className="relative">
              <p className="text-5xl mb-5">🚗</p>
              <h2 className="text-2xl sm:text-3xl font-black text-white mb-3">Готов к поездке?</h2>
              <p className="mb-8 text-sm sm:text-base" style={{ color: '#64748b' }}>
                Зарегистрируйся за минуту и начни пользоваться сервисом
              </p>
              <Link href="/register"
                className="inline-block px-10 py-4 rounded-2xl text-base font-bold text-white transition-all hover:-translate-y-1"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  boxShadow: '0 0 30px rgba(99,102,241,0.3)',
                }}>
                Начать бесплатно
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 px-4 sm:px-6" style={{ borderColor: '#1e1e30' }}>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center text-xs"
              style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>🚗</div>
            <span className="text-sm font-semibold" style={{ color: '#94a3b8' }}>CityDrive</span>
          </div>
          <p className="text-xs" style={{ color: '#334155' }}>© 2025 CityDrive — дипломный проект</p>
          <div className="flex gap-5">
            <Link href="/login" className="text-xs transition-colors hover:text-white" style={{ color: '#475569' }}>Вход</Link>
            <Link href="/register" className="text-xs transition-colors hover:text-white" style={{ color: '#475569' }}>Регистрация</Link>
            <Link href="/admin/login" className="text-xs transition-colors hover:text-white" style={{ color: '#475569' }}>Для сотрудников</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
