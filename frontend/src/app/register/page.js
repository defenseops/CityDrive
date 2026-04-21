'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

const STEPS = ['Аккаунт', 'Личные данные', 'Права'];

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    phone: '', email: '', password: '', confirm_password: '',
    first_name: '', last_name: '', middle_name: '', birth_date: '',
    driver_license_number: '', driver_license_issue_date: '',
    driver_license_expiry_date: '', first_license_issue_date: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const nextStep = (e) => {
    e.preventDefault();
    setError('');
    if (step === 0 && form.password !== form.confirm_password) {
      setError('Пароли не совпадают');
      return;
    }
    setStep(step + 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.register({
        phone: form.phone, email: form.email || undefined, password: form.password,
        first_name: form.first_name, last_name: form.last_name,
        middle_name: form.middle_name || undefined, birth_date: form.birth_date,
        driver_license_number: form.driver_license_number,
        driver_license_issue_date: form.driver_license_issue_date,
        driver_license_expiry_date: form.driver_license_expiry_date,
        first_license_issue_date: form.first_license_issue_date || undefined,
      });
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify({ ...data.user, table: 'users' }));
      router.push('/verification');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const labelCls = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5';

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-15"
          style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-md relative animate-slide-up">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <span className="text-xl">🚗</span>
          </div>
          <h1 className="text-2xl font-bold text-white">CityDrive</h1>
          <p className="text-slate-400 text-sm mt-1">Создайте аккаунт</p>
        </div>

        {/* Steps */}
        <div className="flex items-center mb-6 px-2">
          {STEPS.map((s, i) => (
            <div key={i} className="flex items-center flex-1">
              <div className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300
                  ${i < step ? 'text-white' : i === step ? 'text-white' : 'text-slate-600 border border-dark-border'}`}
                  style={i <= step ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' } : { background: '#13131f' }}>
                  {i < step ? '✓' : i + 1}
                </div>
                <span className={`text-xs mt-1 font-medium transition-colors ${i <= step ? 'text-indigo-400' : 'text-slate-600'}`}>{s}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mb-4 mx-2 transition-all duration-300 ${i < step ? 'bg-indigo-500' : 'bg-dark-border'}`} />
              )}
            </div>
          ))}
        </div>

        <div className="card">
          {step === 0 && (
            <form onSubmit={nextStep} className="space-y-4 animate-fade-in">
              <div>
                <label className={labelCls}>Телефон *</label>
                <input type="tel" className="input-field" placeholder="+79001234567"
                  value={form.phone} onChange={set('phone')} required />
              </div>
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" className="input-field" placeholder="example@mail.ru"
                  value={form.email} onChange={set('email')} />
              </div>
              <div>
                <label className={labelCls}>Пароль *</label>
                <input type="password" className="input-field"
                  value={form.password} onChange={set('password')} required minLength={6} />
              </div>
              <div>
                <label className={labelCls}>Повторите пароль *</label>
                <input type="password" className="input-field"
                  value={form.confirm_password} onChange={set('confirm_password')} required />
              </div>
              {error && <div className="rounded-xl px-4 py-3 text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</div>}
              <button type="submit" className="btn-primary">Далее →</button>
            </form>
          )}

          {step === 1 && (
            <form onSubmit={nextStep} className="space-y-4 animate-fade-in">
              <div>
                <label className={labelCls}>Фамилия *</label>
                <input type="text" className="input-field" value={form.last_name} onChange={set('last_name')} required />
              </div>
              <div>
                <label className={labelCls}>Имя *</label>
                <input type="text" className="input-field" value={form.first_name} onChange={set('first_name')} required />
              </div>
              <div>
                <label className={labelCls}>Отчество</label>
                <input type="text" className="input-field" value={form.middle_name} onChange={set('middle_name')} />
              </div>
              <div>
                <label className={labelCls}>Дата рождения *</label>
                <input type="date" className="input-field" value={form.birth_date} onChange={set('birth_date')} required />
              </div>
              {error && <div className="rounded-xl px-4 py-3 text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</div>}
              <div className="flex gap-3">
                <button type="button" className="btn-secondary" onClick={() => setStep(0)}>← Назад</button>
                <button type="submit" className="btn-primary">Далее →</button>
              </div>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in">
              <div>
                <label className={labelCls}>Номер ВУ *</label>
                <input type="text" className="input-field" placeholder="9900 123456"
                  value={form.driver_license_number} onChange={set('driver_license_number')} required />
              </div>
              <div>
                <label className={labelCls}>Дата выдачи *</label>
                <input type="date" className="input-field"
                  value={form.driver_license_issue_date} onChange={set('driver_license_issue_date')} required />
              </div>
              <div>
                <label className={labelCls}>Срок действия *</label>
                <input type="date" className="input-field"
                  value={form.driver_license_expiry_date} onChange={set('driver_license_expiry_date')} required />
              </div>
              <div>
                <label className={labelCls}>Дата первого ВУ</label>
                <input type="date" className="input-field"
                  value={form.first_license_issue_date} onChange={set('first_license_issue_date')} />
              </div>
              {error && <div className="rounded-xl px-4 py-3 text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</div>}
              <div className="flex gap-3">
                <button type="button" className="btn-secondary" onClick={() => setStep(1)}>← Назад</button>
                <button type="submit" className="btn-primary" disabled={loading}>
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                      Регистрация...
                    </span>
                  ) : 'Зарегистрироваться'}
                </button>
              </div>
            </form>
          )}

          <div className="mt-5 pt-5 border-t border-dark-border text-center">
            <p className="text-sm text-slate-500">
              Уже есть аккаунт?{' '}
              <Link href="/login" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">Войти</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
