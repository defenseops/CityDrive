'use client';
import { useState, useEffect } from 'react';
import { tariffsAPI } from '@/lib/api';

const EMPTY_FORM = {
  name: '', description: '', car_class: '',
  price_per_minute: '', price_per_km: '', insurance_deposit: '',
  default_delivery_fee: '500', default_pickup_fee: '500',
  dirty_car_fine: '500', smoking_fine: '2000', pet_hair_fine: '3000',
  is_active: true,
};

function fmt(n) { return Number(n || 0).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

function Field({ label, name, value, onChange, type = 'text', suffix }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">{label}</label>
      <div className="relative">
        <input type={type} className="input-field" value={value}
          onChange={(e) => onChange(name, e.target.value)}
          style={suffix ? { paddingRight: '2.5rem' } : {}} />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">{suffix}</span>
        )}
      </div>
    </div>
  );
}

export default function TariffsPage() {
  const [tariffs, setTariffs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setTariffs(await tariffsAPI.getTariffs()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing('new');
    setForm({ ...EMPTY_FORM });
    setError('');
  };

  const openEdit = (t) => {
    setEditing(t.id);
    setForm({
      name: t.name || '',
      description: t.description || '',
      car_class: t.car_class || '',
      price_per_minute: t.price_per_minute || '',
      price_per_km: t.price_per_km || '',
      insurance_deposit: t.insurance_deposit || '',
      default_delivery_fee: t.default_delivery_fee || '500',
      default_pickup_fee: t.default_pickup_fee || '500',
      dirty_car_fine: t.dirty_car_fine || '500',
      smoking_fine: t.smoking_fine || '2000',
      pet_hair_fine: t.pet_hair_fine || '3000',
      is_active: t.is_active !== false,
    });
    setError('');
  };

  const setField = (name, value) => setForm((f) => ({ ...f, [name]: value }));

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        price_per_minute: parseFloat(form.price_per_minute),
        price_per_km: parseFloat(form.price_per_km) || 0,
        insurance_deposit: parseFloat(form.insurance_deposit) || 0,
        default_delivery_fee: parseFloat(form.default_delivery_fee) || 500,
        default_pickup_fee: parseFloat(form.default_pickup_fee) || 500,
        dirty_car_fine: parseFloat(form.dirty_car_fine) || 500,
        smoking_fine: parseFloat(form.smoking_fine) || 2000,
        pet_hair_fine: parseFloat(form.pet_hair_fine) || 3000,
      };
      if (editing === 'new') {
        await tariffsAPI.createTariff(payload);
      } else {
        await tariffsAPI.updateTariff(editing, payload);
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Удалить тариф? Это нельзя отменить.')) return;
    setDeleting(id);
    try {
      await tariffsAPI.deleteTariff(id);
      await load();
    } catch (err) {
      alert(err.message);
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Тарифы</h1>
          <p className="text-slate-500 text-sm mt-1">{tariffs.length} тарифов в системе</p>
        </div>
        <button onClick={openNew}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          + Новый тариф
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {tariffs.map((t, i) => (
            <div key={t.id}
              className="rounded-2xl border overflow-hidden transition-all duration-200 hover:border-indigo-500/20"
              style={{ background: '#13131f', borderColor: '#1e1e30',
                       animation: 'slideUp 0.4s ease forwards', animationDelay: `${i * 0.04}s`, opacity: 0 }}>
              {/* Header */}
              <div className="px-5 py-4 flex items-center justify-between border-b" style={{ borderColor: '#1e1e30' }}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg"
                    style={{ background: 'rgba(79,70,229,0.12)' }}>💳</div>
                  <div>
                    <h3 className="font-bold text-white">{t.name}</h3>
                    <span className={`text-xs font-medium ${t.is_active ? 'text-green-400' : 'text-slate-500'}`}>
                      {t.is_active ? '● Активен' : '○ Неактивен'}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => openEdit(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-indigo-400 hover:text-white transition-colors"
                    style={{ background: 'rgba(79,70,229,0.1)' }}>Изменить</button>
                  <button onClick={() => handleDelete(t.id)} disabled={deleting === t.id}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium text-red-400 hover:text-white transition-colors disabled:opacity-40"
                    style={{ background: 'rgba(239,68,68,0.08)' }}>
                    {deleting === t.id ? '...' : 'Удалить'}
                  </button>
                </div>
              </div>

              {/* Prices */}
              <div className="grid grid-cols-3 divide-x px-0" style={{ borderColor: '#1e1e30' }}>
                {[
                  { label: '₽/мин', value: fmt(t.price_per_minute) },
                  { label: '₽/км', value: fmt(t.price_per_km) },
                  { label: 'Депозит', value: `${Number(t.insurance_deposit || 0).toLocaleString('ru-RU')} ₽` },
                ].map((item) => (
                  <div key={item.label} className="text-center py-4 px-3"
                    style={{ borderColor: '#1e1e30', borderRight: '1px solid #1e1e30' }}>
                    <p className="text-lg font-bold text-indigo-400">{item.value}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{item.label}</p>
                  </div>
                ))}
              </div>

              {/* Fines */}
              <div className="px-5 py-3 border-t" style={{ borderColor: '#1e1e30', background: '#0a0a14' }}>
                <p className="text-xs text-slate-600 mb-2">Штрафы</p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { l: 'Грязный', v: t.dirty_car_fine },
                    { l: 'Курение', v: t.smoking_fine },
                    { l: 'Шерсть', v: t.pet_hair_fine },
                  ].map((s) => (
                    <span key={s.l} className="text-xs px-2 py-1 rounded-lg text-amber-400"
                      style={{ background: 'rgba(251,191,36,0.08)' }}>
                      {s.l}: {Number(s.v || 0).toLocaleString('ru-RU')} ₽
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit modal */}
      {editing !== null && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}>
          <div className="w-full max-w-xl rounded-2xl border p-6 animate-slide-up my-4"
            style={{ background: '#13131f', borderColor: '#1e1e30' }}>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
                style={{ background: 'rgba(79,70,229,0.12)' }}>💳</div>
              <div>
                <h3 className="font-bold text-white">{editing === 'new' ? 'Новый тариф' : 'Редактировать тариф'}</h3>
                <p className="text-xs text-slate-500">Заполните параметры тарифа</p>
              </div>
              <button onClick={() => setEditing(null)}
                className="ml-auto text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              <Field label="Название" name="name" value={form.name} onChange={setField} />

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">Стоимость</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Цена за минуту" name="price_per_minute" value={form.price_per_minute} onChange={setField} type="number" suffix="₽" />
                <Field label="Цена за км" name="price_per_km" value={form.price_per_km} onChange={setField} type="number" suffix="₽" />
              </div>
              <Field label="Страховой депозит" name="insurance_deposit" value={form.insurance_deposit} onChange={setField} type="number" suffix="₽" />

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">Доставка и забор</p>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Стоимость доставки" name="default_delivery_fee" value={form.default_delivery_fee} onChange={setField} type="number" suffix="₽" />
                <Field label="Стоимость забора" name="default_pickup_fee" value={form.default_pickup_fee} onChange={setField} type="number" suffix="₽" />
              </div>

              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider pt-2">Штрафы</p>
              <div className="grid grid-cols-3 gap-3">
                <Field label="Грязный авто" name="dirty_car_fine" value={form.dirty_car_fine} onChange={setField} type="number" suffix="₽" />
                <Field label="Курение" name="smoking_fine" value={form.smoking_fine} onChange={setField} type="number" suffix="₽" />
                <Field label="Шерсть" name="pet_hair_fine" value={form.pet_hair_fine} onChange={setField} type="number" suffix="₽" />
              </div>

              <label className="flex items-center gap-3 cursor-pointer py-1">
                <div onClick={() => setField('is_active', !form.is_active)}
                  className="w-10 h-6 rounded-full relative transition-all duration-200 cursor-pointer shrink-0"
                  style={{ background: form.is_active ? 'linear-gradient(135deg, #4f46e5, #7c3aed)' : '#1e1e30' }}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow ${form.is_active ? 'left-5' : 'left-1'}`} />
                </div>
                <span className="text-sm text-slate-300">Тариф активен</span>
              </label>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-3 mt-4 text-sm text-red-400 border border-red-500/20"
                style={{ background: 'rgba(239,68,68,0.08)' }}>{error}</div>
            )}

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="btn-secondary">Отмена</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                    Сохраняем...
                  </span>
                ) : (editing === 'new' ? 'Создать тариф' : 'Сохранить изменения')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
