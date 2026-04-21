'use client';
import { useState, useEffect } from 'react';
import { usersAPI } from '@/lib/api';

const STATUS_LABELS = {
  unverified:           'Не верифицирован',
  documents_uploaded:   'Документы загружены',
  pending_verification: 'На проверке',
  verified:             'Верифицирован',
  rejected:             'Отклонён',
};

const STATUS_BADGES = {
  verified:             'badge-verified',
  documents_uploaded:   'badge-reserved',
  pending_verification: 'badge-reserved',
  rejected:             'badge-rejected',
  unverified:           'badge-pending',
};

export default function UsersPage() {
  const [data, setData] = useState({ data: [], total: 0 });
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const params = { page, limit: 20 };
      if (search) params.search = search;
      if (status) params.status = status;
      setData(await usersAPI.getUsers(params));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [page, status]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load();
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-white">Клиенты</h1>
        <p className="text-slate-500 text-sm mt-1">Управление пользователями</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <form onSubmit={handleSearch} className="flex gap-2">
          <input type="text" className="input-field w-64" placeholder="Поиск по имени, телефону, email..."
            value={search} onChange={(e) => setSearch(e.target.value)} />
          <button type="submit"
            className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            Найти
          </button>
        </form>
        <select className="input-field w-auto" value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}>
          <option value="">Все статусы</option>
          {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
        </div>
      ) : (
        <>
          <div className="rounded-2xl border overflow-hidden" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
            <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr style={{ background: '#0a0a14', borderBottom: '1px solid #1e1e30' }}>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Клиент</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Телефон</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Брони</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Рейтинг</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Зарегистрирован</th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((u) => (
                  <tr key={u.id} className="border-b transition-colors hover:bg-dark-hover"
                    style={{ borderColor: '#1e1e30' }}>
                    <td className="px-4 py-3.5">
                      <p className="font-medium text-white">{u.last_name} {u.first_name}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{u.email}</p>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">{u.phone}</td>
                    <td className="px-4 py-3.5">
                      <span className={STATUS_BADGES[u.verification_status] || 'badge-pending'}>
                        {STATUS_LABELS[u.verification_status] || u.verification_status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-slate-300">{u.total_rides}</td>
                    <td className="px-4 py-3.5 text-slate-300">⭐ {u.rating}</td>
                    <td className="px-4 py-3.5 text-slate-500 text-xs">
                      {new Date(u.created_at).toLocaleDateString('ru-RU')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {data.data.length === 0 && (
              <div className="text-center py-12 text-slate-500">Клиентов не найдено</div>
            )}
          </div>

          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-slate-500">Всего: {data.total}</span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-dark-border hover:border-indigo-500/40 hover:text-white transition-colors disabled:opacity-30"
                style={{ background: '#13131f' }}>←</button>
              <span className="text-slate-500 px-1">Стр. {page}</span>
              <button onClick={() => setPage(p => p+1)} disabled={page * 20 >= data.total}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-dark-border hover:border-indigo-500/40 hover:text-white transition-colors disabled:opacity-30"
                style={{ background: '#13131f' }}>→</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
