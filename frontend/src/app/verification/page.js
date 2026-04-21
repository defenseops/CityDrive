'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { usersAPI } from '@/lib/api';

const DOC_TYPES = [
  { value: 'driver_license_front', label: 'Водительское удостоверение (лицевая)' },
  { value: 'driver_license_back',  label: 'Водительское удостоверение (обратная)' },
  { value: 'passport_main',        label: 'Паспорт (главная страница)' },
];

const DOC_STATUS = {
  pending:  { label: 'На проверке', color: 'text-amber-400', bg: 'bg-amber-400/10' },
  verified: { label: 'Подтверждён', color: 'text-green-400', bg: 'bg-green-400/10' },
  rejected: { label: 'Отклонён',    color: 'text-red-400',   bg: 'bg-red-400/10' },
};

export default function VerificationPage() {
  const router = useRouter();
  const [uploaded, setUploaded] = useState([]);
  const [selectedType, setSelectedType] = useState('driver_license_front');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!localStorage.getItem('token')) router.replace('/login');
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const docs = await usersAPI.getMyDocuments();
      setUploaded(docs);
    } catch {}
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) { setError('Выберите файл'); return; }
    setError(''); setSuccess('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('doc_type', selectedType);
      await usersAPI.uploadDocument(formData);
      setSuccess('Документ успешно загружен!');
      setFile(null);
      await loadDocuments();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const uploadedTypes = uploaded.map((d) => d.doc_type);
  const allDone = DOC_TYPES.slice(0, 2).every((d) => uploadedTypes.includes(d.value));

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/3 right-1/4 w-80 h-80 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #4f46e5 0%, transparent 70%)' }} />
      </div>

      <div className="w-full max-w-lg relative animate-slide-up">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-4"
            style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
            <span className="text-2xl">🪪</span>
          </div>
          <h1 className="text-2xl font-bold text-white">Верификация</h1>
          <p className="text-slate-400 text-sm mt-2">Загрузите документы для активации аккаунта</p>
        </div>

        {/* Uploaded docs */}
        <div className="card mb-4 animate-slide-up">
          <h3 className="font-semibold text-white mb-4">Загруженные документы</h3>
          {uploaded.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">Документов ещё нет</p>
          ) : (
            <ul className="space-y-2">
              {uploaded.map((doc) => {
                const st = DOC_STATUS[doc.verification_status] || DOC_STATUS.pending;
                return (
                  <li key={doc.id} className="flex items-center justify-between rounded-xl px-4 py-3"
                    style={{ background: '#0a0a14' }}>
                    <span className="text-sm text-slate-300">
                      {DOC_TYPES.find((t) => t.value === doc.doc_type)?.label || doc.doc_type}
                    </span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${st.color} ${st.bg}`}>
                      {st.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Upload form */}
        <div className="card animate-slide-up-d">
          <h3 className="font-semibold text-white mb-5">Загрузить документ</h3>
          <form onSubmit={handleUpload} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Тип документа</label>
              <select className="input-field" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
                {DOC_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Файл (jpg, png, pdf, до 10 МБ)</label>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf"
                className="input-field py-2 text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-500/20 file:text-indigo-400 hover:file:bg-indigo-500/30 file:cursor-pointer"
                onChange={(e) => setFile(e.target.files[0])} />
            </div>
            {error && <div className="rounded-xl px-4 py-3 text-sm text-red-400 border border-red-500/20" style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</div>}
            {success && <div className="rounded-xl px-4 py-3 text-sm text-green-400 border border-green-500/20" style={{ background: 'rgba(34,197,94,0.08)' }}>{success}</div>}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                  Загружаем...
                </span>
              ) : 'Загрузить'}
            </button>
          </form>
        </div>

        {allDone && (
          <div className="mt-4 rounded-2xl p-5 border border-green-500/20 text-center animate-fade-in"
            style={{ background: 'rgba(34,197,94,0.06)' }}>
            <p className="text-green-400 font-semibold">✅ Документы переданы на проверку!</p>
            <p className="text-green-500/70 text-sm mt-1">Обычно проверка занимает до 24 часов.</p>
            <button onClick={() => router.push('/profile')} className="btn-primary mt-4 max-w-xs mx-auto">
              В личный кабинет
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
