'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { authAPI } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ phone: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authAPI.login(form.phone, form.password);
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      router.push('/profile');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-sm relative animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <span className="text-2xl">🚗</span>
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">CityDrive</h1>
          <p className="text-slate-400 mt-2 text-sm">Войдите в свой аккаунт</p>
        </div>

        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Телефон</label>
              <input type="tel" className="input-field" placeholder="+79001234567"
                value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Пароль</label>
              <input type="password" className="input-field"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 text-sm text-red-400 border border-red-500/20"
                style={{ background: 'rgba(239,68,68,0.08)' }}>
                {error}
              </div>
            )}

            <button type="submit" className="btn-primary mt-2" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                  Входим...
                </span>
              ) : 'Войти'}
            </button>
          </form>

          <div className="mt-5 pt-5 border-t border-dark-border text-center space-y-2">
            <p className="text-sm text-slate-500">
              Нет аккаунта?{' '}
              <Link href="/register" className="text-indigo-400 hover:text-indigo-300 font-semibold transition-colors">
                Зарегистрироваться
              </Link>
            </p>
            <p>
              <Link href="/admin/login" className="text-xs text-slate-600 hover:text-slate-400 transition-colors">
                Вход для сотрудников →
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
