'use client';
import { useState, useEffect } from 'react';
import { usersAPI } from '@/lib/api';

const API_BASE = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api').replace('/api', '');

const DOC_TYPE_LABELS = {
  driver_license_front: 'ВУ (лицевая)',
  driver_license_back:  'ВУ (обратная)',
  passport_main:        'Паспорт',
};

export default function VerificationAdminPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [processing, setProcessing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setUsers(await usersAPI.getPendingVerification());
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handle = async (id, action) => {
    setProcessing(true);
    try {
      await usersAPI.verifyUser(id, action, action === 'reject' ? rejectReason : undefined);
      setSelected(null);
      setRejectReason('');
      await load();
    } catch (err) { alert(err.message); }
    finally { setProcessing(false); }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-white">Верификация документов</h1>
        <p className="text-slate-500 text-sm mt-1">{users.length} заявок на проверку</p>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
        </div>
      ) : users.length === 0 ? (
        <div className="rounded-2xl border p-12 text-center animate-fade-in"
          style={{ background: '#13131f', borderColor: '#1e1e30' }}>
          <p className="text-4xl mb-3">✅</p>
          <p className="text-slate-400 font-medium">Нет заявок на верификацию</p>
          <p className="text-slate-600 text-sm mt-1">Все документы проверены</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => (
            <div key={user.id} className="rounded-2xl border overflow-hidden transition-all duration-200"
              style={{ background: '#13131f', borderColor: selected?.id === user.id ? 'rgba(79,70,229,0.4)' : '#1e1e30' }}>

              {/* User header */}
              <div className="flex items-center justify-between p-5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold text-white shrink-0"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    {user.first_name?.[0]}{user.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{user.last_name} {user.first_name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{user.phone} · {user.email}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Зарегистрирован: {new Date(user.created_at).toLocaleDateString('ru-RU')}
                    </p>
                  </div>
                </div>
                <button onClick={() => setSelected(selected?.id === user.id ? null : user)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold transition-all"
                  style={selected?.id === user.id
                    ? { background: 'rgba(79,70,229,0.15)', color: '#a5b4fc' }
                    : { background: '#0a0a14', color: '#64748b' }}>
                  {selected?.id === user.id ? 'Скрыть ▲' : 'Документы ▼'}
                </button>
              </div>

              {/* Documents panel */}
              {selected?.id === user.id && (
                <div className="px-5 pb-5 border-t animate-fade-in" style={{ borderColor: '#1e1e30' }}>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4 pt-4">
                    {(user.documents || []).filter(Boolean).map((doc) => (
                      <div key={doc.id} className="rounded-xl overflow-hidden border"
                        style={{ background: '#0a0a14', borderColor: '#1e1e30' }}>
                        <p className="text-xs text-slate-500 px-3 py-2 border-b" style={{ borderColor: '#1e1e30' }}>
                          {DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}
                        </p>
                        <a href={`${API_BASE}${doc.file_url}`} target="_blank" rel="noreferrer"
                          className="block h-32 relative overflow-hidden">
                          <img src={`${API_BASE}${doc.file_url}`} alt=""
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.style.display='none'; e.target.nextSibling.style.display='flex'; }}
                          />
                          <span className="hidden absolute inset-0 items-center justify-center text-xs text-indigo-400 hover:underline"
                            style={{ background: '#0a0a14' }}>Открыть файл</span>
                        </a>
                      </div>
                    ))}
                  </div>

                  <div className="mb-4">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                      Причина отклонения (если отклоняете)
                    </label>
                    <input type="text" className="input-field" placeholder="Нечёткое фото, истёкший срок..."
                      value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} />
                  </div>

                  <div className="flex gap-3">
                    <button onClick={() => handle(user.id, 'approve')} disabled={processing}
                      className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                      {processing ? '...' : '✓ Одобрить'}
                    </button>
                    <button onClick={() => handle(user.id, 'reject')} disabled={processing}
                      className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                      style={{ background: 'linear-gradient(135deg, #dc2626, #b91c1c)' }}>
                      {processing ? '...' : '✕ Отклонить'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
