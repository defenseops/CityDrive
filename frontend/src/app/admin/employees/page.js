'use client';
import { useState, useEffect } from 'react';
import { employeesAPI } from '@/lib/api';

const ROLES = [
  { value: 'admin',           label: 'Администратор' },
  { value: 'manager',         label: 'Менеджер автопарка' },
  { value: 'moderator',       label: 'Модератор' },
  { value: 'driver',          label: 'Водитель' },
  { value: 'parking_manager', label: 'Менеджер паркинга' },
];

const ROLE_COLORS = {
  admin:           { bg: 'rgba(99,102,241,0.12)',  text: '#818cf8' },
  manager:         { bg: 'rgba(56,189,248,0.12)',  text: '#38bdf8' },
  moderator:       { bg: 'rgba(168,85,247,0.12)',  text: '#c084fc' },
  driver:          { bg: 'rgba(34,197,94,0.12)',   text: '#4ade80' },
  parking_manager: { bg: 'rgba(251,146,60,0.12)',  text: '#fb923c' },
};

const EMPTY_FORM = {
  first_name: '', last_name: '', middle_name: '',
  email: '', phone: '', password: '',
  role: 'driver',
  driver_license_number: '', driver_license_expiry_date: '',
};

export default function EmployeesPage() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toggling, setToggling] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = async () => {
    setLoading(true);
    try { setEmployees(await employeesAPI.getEmployees()); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    setSubmitting(true);
    try {
      await employeesAPI.createEmployee({
        ...form,
        driver_license_number: form.driver_license_number || undefined,
        driver_license_expiry_date: form.driver_license_expiry_date || undefined,
        middle_name: form.middle_name || undefined,
      });
      setShowForm(false);
      setForm(EMPTY_FORM);
      await load();
    } catch (err) { setFormError(err.message); }
    finally { setSubmitting(false); }
  };

  const toggleActive = async (emp) => {
    setToggling(emp.id);
    try {
      await employeesAPI.updateEmployee(emp.id, { is_active: !emp.is_active });
      await load();
    } catch (err) { alert(err.message); }
    finally { setToggling(null); }
  };

  const handleRoleChange = async (emp, newRole) => {
    try {
      await employeesAPI.updateEmployee(emp.id, { role: newRole });
      await load();
    } catch (err) { alert(err.message); }
  };

  const clr = (role) => ROLE_COLORS[role] || ROLE_COLORS.driver;

  return (
    <div className="p-4 sm:p-6">
      <div className="flex items-center justify-between mb-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-white">Сотрудники</h1>
          <p className="text-slate-500 text-sm mt-1">{employees.length} сотрудников</p>
        </div>
        <button onClick={() => { setShowForm(true); setForm(EMPTY_FORM); setFormError(''); }}
          className="px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:shadow-lg"
          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
          + Добавить сотрудника
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 rounded-full border-2 border-indigo-500/20 border-t-indigo-500 animate-spin-slow" />
        </div>
      ) : (
        <div className="rounded-2xl border overflow-hidden" style={{ background: '#13131f', borderColor: '#1e1e30' }}>
          <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr style={{ background: '#0a0a14', borderBottom: '1px solid #1e1e30' }}>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Сотрудник</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Контакты</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Роль</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Статус</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Добавлен</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {employees.map((emp) => {
                const c = clr(emp.role);
                return (
                  <tr key={emp.id} className="border-b transition-colors hover:bg-dark-hover"
                    style={{ borderColor: '#1e1e30' }}>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold text-white shrink-0"
                          style={{ background: 'linear-gradient(135deg, #4f46e5, #7c3aed)' }}>
                          {emp.first_name?.[0]}{emp.last_name?.[0]}
                        </div>
                        <div>
                          <p className="font-medium text-white">{emp.last_name} {emp.first_name}</p>
                          {emp.middle_name && <p className="text-xs text-slate-500">{emp.middle_name}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <p className="text-slate-300 text-xs">{emp.email}</p>
                      <p className="text-slate-500 text-xs mt-0.5">{emp.phone}</p>
                    </td>
                    <td className="px-4 py-3.5">
                      <select
                        value={emp.role}
                        onChange={(e) => handleRoleChange(emp, e.target.value)}
                        className="text-xs font-semibold px-2.5 py-1 rounded-full border-0 cursor-pointer focus:outline-none"
                        style={{ background: c.bg, color: c.text }}>
                        {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                      </select>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={emp.is_active ? 'badge-completed' : 'badge-cancelled'}>
                        {emp.is_active ? 'Активен' : 'Отключён'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-slate-500">
                      {new Date(emp.created_at).toLocaleDateString('ru-RU')}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleActive(emp)}
                        disabled={toggling === emp.id}
                        className={`text-xs font-medium transition-colors disabled:opacity-40 ${
                          emp.is_active ? 'text-red-400 hover:text-red-300' : 'text-green-400 hover:text-green-300'
                        }`}>
                        {toggling === emp.id ? '...' : emp.is_active ? 'Отключить' : 'Активировать'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
          {employees.length === 0 && <div className="text-center py-12 text-slate-500">Сотрудников нет</div>}
        </div>
      )}

      {/* Create employee modal */}
      {showForm && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-50 animate-fade-in overflow-y-auto"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)' }}>
          <div className="w-full max-w-md rounded-2xl border p-6 my-8 animate-slide-up"
            style={{ background: '#13131f', borderColor: '#1e1e30' }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                style={{ background: 'rgba(79,70,229,0.12)' }}>👤</div>
              <h3 className="font-bold text-white">Добавить сотрудника</h3>
              <button onClick={() => setShowForm(false)}
                className="ml-auto text-slate-500 hover:text-white transition-colors text-xl leading-none">×</button>
            </div>

            <form onSubmit={handleCreate} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Фамилия *</label>
                  <input className="input-field" required value={form.last_name}
                    onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Имя *</label>
                  <input className="input-field" required value={form.first_name}
                    onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Отчество</label>
                <input className="input-field" value={form.middle_name}
                  onChange={(e) => setForm({ ...form, middle_name: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Email *</label>
                <input type="email" className="input-field" required value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Телефон *</label>
                <input className="input-field" required value={form.phone} placeholder="+7..."
                  onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Пароль *</label>
                <input type="password" className="input-field" required value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Роль *</label>
                <select className="input-field" value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                </select>
              </div>

              {(form.role === 'driver') && (
                <div className="rounded-xl p-3 border space-y-3 animate-fade-in" style={{ borderColor: '#1e1e30', background: '#0a0a14' }}>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Водительское удостоверение</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Номер ВУ</label>
                      <input className="input-field" placeholder="1234 567890" value={form.driver_license_number}
                        onChange={(e) => setForm({ ...form, driver_license_number: e.target.value })} />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">Срок действия</label>
                      <input type="date" className="input-field" value={form.driver_license_expiry_date}
                        onChange={(e) => setForm({ ...form, driver_license_expiry_date: e.target.value })} />
                    </div>
                  </div>
                </div>
              )}

              {formError && (
                <div className="rounded-xl px-4 py-3 text-sm text-red-400 border border-red-500/20"
                  style={{ background: 'rgba(239,68,68,0.08)' }}>{formError}</div>
              )}

              <div className="flex gap-3 pt-1">
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary">Отмена</button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin-slow" />
                      Создаём...
                    </span>
                  ) : 'Создать'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
