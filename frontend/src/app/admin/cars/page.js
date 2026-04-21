'use client';
import { useState, useEffect } from 'react';
import { carsAPI } from '@/lib/api';

const STATUS_OPTIONS = ['available', 'reserved', 'in_use', 'maintenance', 'disabled'];
const STATUS_LABELS  = { available: 'Свободен', reserved: 'Зарезервирован', in_use: 'В аренде', maintenance: 'Обслуживание', disabled: 'Отключён' };
const STATUS_BADGES  = { available: 'badge-available', reserved: 'badge-reserved', in_use: 'badge-active', maintenance: 'badge-maintenance', disabled: 'badge-cancelled' };
const CLASS_LABELS   = { economy: 'Эконом', comfort: 'Комфорт', suv: 'SUV', minivan: 'Минивэн', business: 'Бизнес', premium: 'Премиум' };

export default function AdminCarsPage() {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', car_class: '' });
  const [editing, setEditing] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.status) params.status = filters.status;
      if (filters.car_class) params.car_class = filters.car_class;
      setCars(await carsAPI.getCars(params));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [filters]);

  const openEdit = (car) => {
    setEditing(car);
    setEditForm({ status: car.status, fuel_level: car.fuel_level || 0 });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await carsAPI.updateCar(editing.id, editForm);
      setEditing(null);
      await load();
    } catch (err) { alert(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl font-bold text-white">Автопарк</h1>
        <p className="text-slate-500 text-sm mt-1">{cars.length} автомобилей</p>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <select className="input-field w-auto" value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
          <option value="">Все статусы</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
        </select>
        <select className="input-field w-auto" value={filters.car_class}
          onChange={(e) => setFilters({ ...filters, car_class: e.target.value })}>
          <option value="">Все классы</option>
          {Object.entries(CLASS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead>
              <tr style={{ background: '#0a0a14', borderBottom: '1px solid #1e1e30' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Автомобиль</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Класс</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Пробег</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Топливо</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Паркинг</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {cars.map((car) => (
                <tr key={car.id} className="border-b transition-colors hover:bg-dark-hover"
                  style={{ borderColor: '#1e1e30' }}>
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-white">{car.brand} {car.model}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{car.license_plate} · {car.year}</p>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">{CLASS_LABELS[car.car_class] || car.car_class}</td>
                  <td className="px-4 py-3.5">
                    <span className={STATUS_BADGES[car.status] || 'badge-pending'}>
                      {STATUS_LABELS[car.status] || car.status}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-slate-300">{(car.odometer_km || 0).toLocaleString()} км</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full overflow-hidden" style={{ background: '#1e1e30' }}>
                        <div className="h-full rounded-full transition-all"
                          style={{ width: `${car.fuel_level ?? 0}%`, background: (car.fuel_level ?? 0) > 30 ? '#22c55e' : '#ef4444' }} />
                      </div>
                      <span className="text-xs text-slate-400">{car.fuel_level ?? '—'}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-slate-400 text-xs">{car.parking_name || '—'}</td>
                  <td className="px-4 py-3.5">
                    <button onClick={() => openEdit(car)}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300 transition-colors">
                      Изменить
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
          {cars.length === 0 && <div className="text-center py-12 text-slate-500">Нет автомобилей</div>}
        </div>
      )}

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-sm rounded-2xl border p-6 animate-slide-up"
            style={{ background: '#13131f', borderColor: '#1e1e30' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(99,102,241,0.12)' }}>🚗</div>
              <div>
                <h3 className="font-bold text-white">{editing.brand} {editing.model}</h3>
                <p className="text-xs text-slate-500">{editing.license_plate}</p>
              </div>
              <button onClick={() => setEditing(null)}
                className="ml-auto text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Статус</label>
                <select className="input-field" value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Уровень топлива: {editForm.fuel_level}%
                </label>
                <input type="range" min="0" max="100" className="w-full accent-indigo-500" value={editForm.fuel_level}
                  onChange={(e) => setEditForm({ ...editForm, fuel_level: parseInt(e.target.value) })} />
                <div className="flex justify-between text-xs text-slate-600 mt-1">
                  <span>0%</span><span>50%</span><span>100%</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setEditing(null)} className="btn-secondary">Отмена</button>
              <button onClick={handleSave} className="btn-primary" disabled={saving}>
                {saving ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                    Сохраняем...
                  </span>
                ) : 'Сохранить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
