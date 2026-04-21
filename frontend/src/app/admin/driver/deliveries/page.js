'use client';
import { useState, useEffect } from 'react';
import { driverAPI } from '@/lib/api';

const CLASS_LABELS = { economy: 'Эконом', comfort: 'Комфорт', suv: 'SUV', minivan: 'Минивэн', business: 'Бизнес', premium: 'Премиум' };

const INSPECTION_ITEMS = [
  { key: 'body_ok',     label: 'Кузов',  icon: '🚗' },
  { key: 'glass_ok',   label: 'Стекла', icon: '🪟' },
  { key: 'interior_ok',label: 'Салон',  icon: '💺' },
  { key: 'tires_ok',   label: 'Шины',   icon: '⚙️' },
  { key: 'lights_ok',  label: 'Фары',   icon: '💡' },
];

const DEFAULT_INSPECTION = {
  body_ok: true, glass_ok: true, interior_ok: true, tires_ok: true, lights_ok: true,
  has_new_damage: false, defect_notes: '',
};

function InspectionModal({ title, subtitle, onSubmit, onClose, submitting, showOdometer, initialOdometer }) {
  const [form, setForm] = useState({ ...DEFAULT_INSPECTION, end_odometer: initialOdometer || '' });
  const toggle = (key) => setForm((f) => ({ ...f, [key]: !f[key] }));

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in"
      style={{ background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)' }}>
      <div className="w-full max-w-md rounded-2xl border p-6 animate-slide-up"
        style={{ background: '#13131f', borderColor: '#1e1e30' }}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
            style={{ background: 'rgba(79,70,229,0.12)' }}>🔍</div>
          <div>
            <h3 className="font-bold text-white">{title}</h3>
            <p className="text-xs text-slate-500">{subtitle}</p>
          </div>
          <button onClick={onClose} className="ml-auto text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
        </div>

        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Проверка состояния</p>
        <div className="space-y-2 mb-4">
          {INSPECTION_ITEMS.map((item) => (
            <label key={item.key}
              className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer transition-colors"
              style={{ background: form[item.key] ? 'rgba(34,197,94,0.06)' : 'rgba(239,68,68,0.06)',
                       border: `1px solid ${form[item.key] ? 'rgba(34,197,94,0.15)' : 'rgba(239,68,68,0.15)'}` }}>
              <div className="flex items-center gap-2.5">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-medium text-white">{item.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-semibold ${form[item.key] ? 'text-green-400' : 'text-red-400'}`}>
                  {form[item.key] ? 'OK' : 'Дефект'}
                </span>
                <div onClick={() => toggle(item.key)}
                  className="w-10 h-6 rounded-full relative transition-all duration-200 cursor-pointer"
                  style={{ background: form[item.key] ? 'linear-gradient(135deg,#16a34a,#15803d)' : '#1e1e30' }}>
                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow ${form[item.key] ? 'left-5' : 'left-1'}`} />
                </div>
              </div>
            </label>
          ))}
        </div>

        <label className="flex items-center justify-between rounded-xl px-4 py-3 mb-3 cursor-pointer border"
          style={{ background: form.has_new_damage ? 'rgba(239,68,68,0.06)' : 'rgba(255,255,255,0.02)',
                   borderColor: form.has_new_damage ? 'rgba(239,68,68,0.2)' : '#1e1e30' }}>
          <span className="text-sm font-medium text-white">Обнаружены новые повреждения</span>
          <div onClick={() => setForm((f) => ({ ...f, has_new_damage: !f.has_new_damage }))}
            className="w-10 h-6 rounded-full relative transition-all duration-200 cursor-pointer"
            style={{ background: form.has_new_damage ? 'linear-gradient(135deg,#dc2626,#b91c1c)' : '#1e1e30' }}>
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 shadow ${form.has_new_damage ? 'left-5' : 'left-1'}`} />
          </div>
        </label>

        {form.has_new_damage && (
          <div className="mb-4 animate-fade-in">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Описание повреждений</label>
            <textarea className="input-field" rows={3} placeholder="Опишите найденные повреждения..."
              value={form.defect_notes} onChange={(e) => setForm({ ...form, defect_notes: e.target.value })} />
          </div>
        )}

        {showOdometer && (
          <div className="mb-4 animate-fade-in rounded-xl p-3 border" style={{ borderColor: '#1e1e30', background: '#0a0a14' }}>
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
              Показание одометра (км) *
            </label>
            <input
              type="number"
              className="input-field"
              placeholder="Введите пробег..."
              min={initialOdometer || 0}
              value={form.end_odometer}
              onChange={(e) => setForm({ ...form, end_odometer: e.target.value })}
            />
            {initialOdometer > 0 && form.end_odometer && (
              <p className="text-xs text-slate-500 mt-1">
                Пробег за поездку: {Math.max(0, parseInt(form.end_odometer || 0) - initialOdometer).toLocaleString()} км
              </p>
            )}
          </div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="btn-secondary">Отмена</button>
          <button onClick={() => onSubmit(form)} className="btn-primary" disabled={submitting}>
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                Сохраняем...
              </span>
            ) : 'Подтвердить'}
          </button>
        </div>
      </div>
    </div>
  );
}

function fmtTime(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function DriverDeliveriesPage() {
  const [deliveries, setDeliveries] = useState([]);
  const [myTasks, setMyTasks] = useState([]);
  const [pickups, setPickups] = useState([]);
  const [parkingQueue, setParkingQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [tab, setTab] = useState('pending');
  const [actioning, setActioning] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [d, t, p, q] = await Promise.all([
        driverAPI.getDeliveries(),
        driverAPI.getMyTasks(),
        driverAPI.getPickups(),
        driverAPI.getParkingQueue(),
      ]);
      setDeliveries(d);
      setMyTasks(t);
      setPickups(p);
      setParkingQueue(q);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const submitInspection = async (form) => {
    setSubmitting(true);
    try {
      if (inspecting.type === 'accept') {
        await driverAPI.acceptDelivery(inspecting.id, form);
      } else if (inspecting.type === 'complete') {
        await driverAPI.completeTask(inspecting.id, form);
      } else if (inspecting.type === 'parking') {
        await driverAPI.completeParkingInspection(inspecting.id, form);
      }
      setInspecting(null);
      await load();
    } catch (err) { alert(err.message); }
    finally { setSubmitting(false); }
  };

  const handleAction = async (action, id) => {
    setActioning(id);
    try {
      if (action === 'accept-pickup') await driverAPI.acceptPickup(id);
      if (action === 'arrived') await driverAPI.arrivedAtParking(id);
      await load();
    } catch (err) { alert(err.message); }
    finally { setActioning(null); }
  };

  const pendingDeliveries = deliveries.filter((d) => !d.assignment_id);
  const takenDeliveries   = deliveries.filter((d) => d.assignment_id);
  const myDeliveryTasks   = myTasks.filter((t) => t.task_type === 'delivery');
  const pendingPickups    = pickups.filter((p) => p.pickup_status === 'pending');
  const myPickups         = pickups.filter((p) => p.assigned_driver_id && p.pickup_status === 'accepted');

  const TABS = [
    { key: 'pending',  label: `Доставки (${pendingDeliveries.length})` },
    { key: 'my',       label: `Мои задачи (${myDeliveryTasks.filter(t=>t.task_status==='accepted').length})` },
    { key: 'pickups',  label: `Заборы (${pendingPickups.length})` },
    { key: 'parking',  label: `Парковщик (${parkingQueue.length})` },
  ];

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6 animate-fade-in">
        <h1 className="text-xl sm:text-2xl font-bold text-white">Доставки и заборы</h1>
        <p className="text-slate-500 text-sm mt-1">
          {pendingDeliveries.length} доставок · {pendingPickups.length} заборов · {parkingQueue.length} на осмотре
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 p-1 rounded-xl mb-6 w-fit" style={{ background: '#0a0a14' }}>
        {TABS.map((t) => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className="px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t.key
              ? { background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff' }
              : { color: '#64748b' }}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
        </div>
      ) : (
        <>
          {/* ─── PENDING DELIVERIES ─── */}
          {tab === 'pending' && (
            <div className="space-y-3">
              {pendingDeliveries.length === 0 && (
                <EmptyState icon="🚚" title="Нет новых запросов на доставку" />
              )}
              {pendingDeliveries.map((d, i) => (
                <DeliveryCard key={d.id} d={d} i={i}
                  action={<button onClick={() => setInspecting({ type: 'accept', id: d.id, car_name: d.car_name, client_name: d.client_name })}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                    Принять заказ
                  </button>}
                />
              ))}
              {takenDeliveries.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">Приняты другими водителями</p>
                  {takenDeliveries.map((d) => (
                    <div key={d.id} className="rounded-2xl border p-4 opacity-50" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium text-white text-sm">{d.car_name} · {d.license_plate}</p>
                          <p className="text-xs text-slate-500">{d.client_name} → {d.delivery_address}</p>
                        </div>
                        <span className="text-xs text-slate-500">👤 {d.assigned_driver_name}</span>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ─── MY DELIVERY TASKS ─── */}
          {tab === 'my' && (
            <div className="space-y-3">
              {myDeliveryTasks.filter(t => t.task_status === 'accepted').length === 0 && (
                <EmptyState icon="📋" title="Нет активных задач" sub="Примите заказ во вкладке «Доставки»" />
              )}
              {myDeliveryTasks.filter(t => t.task_status === 'accepted').map((t, i) => (
                <TaskCard key={t.id} t={t} i={i}
                  action={<button onClick={() => setInspecting({ type: 'complete', id: t.id, car_name: t.car_name, client_name: t.client_name })}
                    className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                    style={{ background: 'linear-gradient(135deg, #16a34a, #15803d)' }}>
                    Доставил ✓
                  </button>}
                />
              ))}
              {myDeliveryTasks.filter(t => t.task_status === 'completed').length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-6 mb-2">Завершённые доставки</p>
                  {myDeliveryTasks.filter(t => t.task_status === 'completed').map((t) => (
                    <CompactTask key={t.id} t={t} badge="badge-completed" label="Доставлено" />
                  ))}
                </>
              )}
            </div>
          )}

          {/* ─── PICKUPS (RETURN REQUESTS) ─── */}
          {tab === 'pickups' && (
            <div className="space-y-3">
              {pendingPickups.length === 0 && myPickups.length === 0 && (
                <EmptyState icon="🏁" title="Нет запросов на забор авто" />
              )}
              {pendingPickups.map((p, i) => (
                <div key={p.assignment_id} className="rounded-2xl border p-5 transition-all duration-200"
                  style={{ background: '#13131f', borderColor: 'rgba(251,146,60,0.2)',
                           animation: 'slideUp 0.4s ease forwards', animationDelay: `${i*0.05}s`, opacity: 0 }}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ background: 'rgba(251,146,60,0.1)' }}>🏁</div>
                      <div>
                        <p className="font-bold text-white">{p.car_name}</p>
                        <p className="text-xs text-slate-500">{p.license_plate} · {CLASS_LABELS[p.car_class] || p.car_class}</p>
                      </div>
                    </div>
                    <span className="badge-pending">Ждёт водителя</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
                      <p className="text-xs text-slate-600 mb-0.5">Клиент</p>
                      <p className="text-xs font-medium text-white">{p.client_name}</p>
                      <p className="text-xs text-slate-500">{p.client_phone}</p>
                    </div>
                    <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
                      <p className="text-xs text-slate-600 mb-0.5">Паркинг назначения</p>
                      <p className="text-xs font-medium text-white">{p.parking_name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => handleAction('accept-pickup', p.assignment_id)} disabled={actioning === p.assignment_id}
                      className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40"
                      style={{ background: 'linear-gradient(135deg, #d97706, #b45309)' }}>
                      {actioning === p.assignment_id ? '...' : 'Принять забор'}
                    </button>
                  </div>
                </div>
              ))}

              {myPickups.length > 0 && (
                <>
                  <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mt-4 mb-2">Мои заборы</p>
                  {myPickups.map((p) => (
                    <div key={p.assignment_id} className="rounded-2xl border p-5" style={{ background: '#13131f', borderColor: 'rgba(99,102,241,0.3)' }}>
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <p className="font-bold text-white">{p.car_name} · {p.license_plate}</p>
                          <p className="text-xs text-slate-500">{p.client_name} · {p.client_phone}</p>
                        </div>
                        <span className="badge-active">В пути</span>
                      </div>
                      <div className="flex justify-end">
                        <button onClick={() => handleAction('arrived', p.assignment_id)} disabled={actioning === p.assignment_id}
                          className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-40"
                          style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                          {actioning === p.assignment_id ? '...' : 'Привёз в паркинг'}
                        </button>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
          )}

          {/* ─── PARKING MANAGER QUEUE ─── */}
          {tab === 'parking' && (
            <div className="space-y-3">
              {parkingQueue.length === 0 && (
                <EmptyState icon="🅿️" title="Нет авто на осмотре" sub="Авто появятся здесь когда водитель привезёт их в паркинг" />
              )}
              {parkingQueue.map((q, i) => (
                <div key={q.assignment_id} className="rounded-2xl border p-5 transition-all duration-200"
                  style={{ background: '#13131f', borderColor: 'rgba(56,189,248,0.2)',
                           animation: 'slideUp 0.4s ease forwards', animationDelay: `${i*0.05}s`, opacity: 0 }}>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                        style={{ background: 'rgba(56,189,248,0.1)' }}>🅿️</div>
                      <div>
                        <p className="font-bold text-white">{q.car_name}</p>
                        <p className="text-xs text-slate-500">{q.license_plate}</p>
                      </div>
                    </div>
                    <span className="badge-reserved">На осмотре</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
                      <p className="text-xs text-slate-600 mb-0.5">Клиент</p>
                      <p className="text-xs font-medium text-white">{q.client_name}</p>
                      <p className="text-xs text-slate-500">{q.client_phone}</p>
                    </div>
                    <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
                      <p className="text-xs text-slate-600 mb-0.5">Привёз водитель</p>
                      <p className="text-xs font-medium text-white">{q.driver_name || '—'}</p>
                      <p className="text-xs text-slate-500">{fmtTime(q.arrived_at)}</p>
                    </div>
                    <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
                      <p className="text-xs text-slate-600 mb-0.5">Паркинг</p>
                      <p className="text-xs font-medium text-white">{q.parking_name || '—'}</p>
                    </div>
                    <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
                      <p className="text-xs text-slate-600 mb-0.5">Пробег</p>
                      <p className="text-xs font-medium text-white">{(q.odometer_km || 0).toLocaleString()} км</p>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => setInspecting({ type: 'parking', id: q.assignment_id, car_name: q.car_name, client_name: q.client_name, odometer: q.odometer_km })}
                      className="px-5 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
                      style={{ background: 'linear-gradient(135deg, #0ea5e9, #0284c7)' }}>
                      Провести осмотр
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {inspecting && (
        <InspectionModal
          title={
            inspecting.type === 'accept'  ? 'Осмотр перед доставкой' :
            inspecting.type === 'complete'? 'Осмотр после доставки' :
                                            'Приёмка авто в паркинг'
          }
          subtitle={`${inspecting.car_name} · ${inspecting.client_name}`}
          onSubmit={submitInspection}
          onClose={() => setInspecting(null)}
          submitting={submitting}
          showOdometer={inspecting.type === 'parking'}
          initialOdometer={inspecting.odometer || 0}
        />
      )}
    </div>
  );
}

// ── Small reusable pieces ────────────────────────────────────────────────────

function EmptyState({ icon, title, sub }) {
  return (
    <div className="rounded-2xl border p-12 text-center" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
      <p className="text-4xl mb-3">{icon}</p>
      <p className="text-slate-400 font-medium">{title}</p>
      {sub && <p className="text-slate-600 text-sm mt-1">{sub}</p>}
    </div>
  );
}

function DeliveryCard({ d, i, action }) {
  return (
    <div className="rounded-2xl border p-5 transition-all duration-200 hover:border-indigo-500/20"
      style={{ background: '#13131f', borderColor: '#1e1e30',
               animation: 'slideUp 0.4s ease forwards', animationDelay: `${i*0.05}s`, opacity: 0 }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(79,70,229,0.12)' }}>🚚</div>
          <div>
            <p className="font-bold text-white">{d.car_name}</p>
            <p className="text-xs text-slate-500">{d.license_plate} · {CLASS_LABELS[d.car_class] || d.car_class}</p>
          </div>
        </div>
        <span className="badge-reserved">Ожидает</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
          <p className="text-xs text-slate-600 mb-0.5">Клиент</p>
          <p className="text-xs font-medium text-white">{d.client_name}</p>
          <p className="text-xs text-slate-500">{d.client_phone}</p>
        </div>
        <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
          <p className="text-xs text-slate-600 mb-0.5">Откуда</p>
          <p className="text-xs font-medium text-white">{d.parking_name || '—'}</p>
        </div>
        <div className="rounded-xl px-3 py-2.5 col-span-2" style={{ background: '#0a0a14' }}>
          <p className="text-xs text-slate-600 mb-0.5">Адрес доставки</p>
          <p className="text-xs font-medium text-white">{d.delivery_address || '—'}</p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-600">{new Date(d.reserved_at).toLocaleString('ru-RU', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</p>
        {action}
      </div>
    </div>
  );
}

function TaskCard({ t, i, action }) {
  return (
    <div className="rounded-2xl border p-5" style={{ background: '#13131f', borderColor: 'rgba(79,70,229,0.3)',
               animation: 'slideUp 0.4s ease forwards', animationDelay: `${i*0.05}s`, opacity: 0 }}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg" style={{ background: 'rgba(99,102,241,0.15)' }}>🚗</div>
          <div>
            <p className="font-bold text-white">{t.car_name}</p>
            <p className="text-xs text-slate-500">{t.license_plate}</p>
          </div>
        </div>
        <span className="badge-active">В работе</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
          <p className="text-xs text-slate-600 mb-0.5">Клиент</p>
          <p className="text-xs font-medium text-white">{t.client_name}</p>
          <p className="text-xs text-slate-500">{t.client_phone}</p>
        </div>
        <div className="rounded-xl px-3 py-2.5" style={{ background: '#0a0a14' }}>
          <p className="text-xs text-slate-600 mb-0.5">Откуда</p>
          <p className="text-xs font-medium text-white">{t.parking_name || '—'}</p>
        </div>
        {t.delivery_address && (
          <div className="rounded-xl px-3 py-2.5 col-span-2" style={{ background: '#0a0a14' }}>
            <p className="text-xs text-slate-600 mb-0.5">Адрес доставки</p>
            <p className="text-xs font-medium text-white">{t.delivery_address}</p>
          </div>
        )}
      </div>
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

function CompactTask({ t, badge, label }) {
  return (
    <div className="rounded-2xl border p-4 opacity-60" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium text-white text-sm">{t.car_name} · {t.license_plate}</p>
          <p className="text-xs text-slate-500">{t.client_name}</p>
        </div>
        <div className="text-right">
          <span className={badge}>{label}</span>
          <p className="text-xs text-slate-600 mt-1">{new Date(t.completed_at).toLocaleDateString('ru-RU')}</p>
        </div>
      </div>
    </div>
  );
}
