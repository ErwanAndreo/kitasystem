import React, { useState } from 'react';
import { Staff, Group, Role } from '../types';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Award, 
  Clock, 
  Key, 
  Check, 
  Edit, 
  Trash2, 
  History, 
  X,
  Calendar
} from 'lucide-react';

interface StaffManagementProps {
  staffList: Staff[];
  groups: Group[];
  onAddStaff: (newStaff: any) => Promise<void>;
  onUpdateStaff: (id: string, updated: any) => Promise<void>;
  onRefresh: () => void;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  staffList,
  groups,
  onAddStaff,
  onUpdateStaff,
  onRefresh
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'FACHKRAFT' as Role,
    qualification: 'Staatl. anerkannte/r Erzieher/in',
    is_fachkraft: true,
    weekly_hours: 39.0,
    work_days: 5,
    annual_vacation_days: 30,
    target_group_id: groups[0]?.id || '',
    pin: '1234',
    color: '#10b981'
  });

  // Audit history modal
  const [auditStaff, setAuditStaff] = useState<Staff | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const handleOpenCreate = () => {
    setEditingStaffId(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'FACHKRAFT',
      qualification: 'Staatl. anerkannte/r Erzieher/in',
      is_fachkraft: true,
      weekly_hours: 39.0,
      work_days: 5,
      annual_vacation_days: 30,
      target_group_id: groups[0]?.id || '',
      pin: '1234',
      color: '#10b981'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (staff: Staff) => {
    setEditingStaffId(staff.id);
    setFormData({
      name: staff.name,
      email: staff.email,
      phone: staff.phone || '',
      role: staff.role,
      qualification: staff.qualification,
      is_fachkraft: staff.is_fachkraft === 1,
      weekly_hours: staff.weekly_hours,
      work_days: staff.work_days || 5,
      annual_vacation_days: staff.annual_vacation_days || 30,
      target_group_id: staff.target_group_id || '',
      pin: staff.pin,
      color: staff.color
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingStaffId) {
      await onUpdateStaff(editingStaffId, formData);
    } else {
      await onAddStaff(formData);
    }
    setModalOpen(false);
  };

  const handleOpenAuditLog = async (staff: Staff) => {
    setAuditStaff(staff);
    try {
      const res = await fetch(`/api/staff/${staff.id}/audit-log`);
      const data = await res.json();
      setAuditLogs(data);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-6">
      {/* Title & Add Account Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Personal- & Accountverwaltung</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              Leitungs-Perspektive
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Accounts anlegen, vertragliche Wochenstunden einstellen, Stammgruppen & Kiosk-PINs
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Neuen Account anlegen</span>
        </button>
      </div>

      {/* Staff List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {staffList.map((s) => {
          const groupName = groups.find(g => g.id === s.target_group_id)?.name || 'Springer / Einrichtungsübergreifend';

          return (
            <div
              key={s.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs shrink-0"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">{s.name}</h4>
                      <span className="text-[10px] font-semibold text-slate-500">{s.role}</span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      s.is_fachkraft === 1
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {s.is_fachkraft === 1 ? 'Fachkraft' : 'Ergänzung'}
                  </span>
                </div>

                <div className="space-y-1 mt-3 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.qualification}</span>
                  </div>

                  {/* Weekly Hours and Work Days */}
                  <div className="flex items-center space-x-1.5 font-bold text-slate-800">
                    <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                    <span>{s.weekly_hours} Std./Woche</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 font-normal">{s.work_days || 5} Arbeitstage</span>
                  </div>

                  <div className="flex items-center space-x-1.5 text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Urlaubsanspruch: {s.annual_vacation_days || 30} Tage</span>
                    <span className="text-slate-300">•</span>
                    <span className="truncate">{groupName.split(' ')[0]}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons & PIN */}
              <div className="border-t border-slate-200/80 mt-3.5 pt-2.5 flex items-center justify-between text-xs">
                <span className="text-[11px] font-mono text-slate-400">
                  PIN: {s.pin}
                </span>

                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={() => handleOpenAuditLog(s)}
                    className="p-1.5 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                    title="Änderungsprotokoll / Historie ansehen"
                  >
                    <History className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleOpenEdit(s)}
                    className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 text-indigo-700 font-semibold text-[11px] rounded-lg transition-colors"
                    title="Vertrag & Wochenstunden anpassen"
                  >
                    <Edit className="w-3 h-3" />
                    <span>Bearbeiten</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create or Edit Account */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">
                {editingStaffId ? 'Mitarbeiter-Vertrag anpassen' : 'Neuen Mitarbeiter-Account erstellen'}
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-4 space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Vollständiger Name</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="z.B. Jessica Müller"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Rolle</label>
                  <select
                    value={formData.role}
                    onChange={(e) => {
                      const role = e.target.value as Role;
                      setFormData({ 
                        ...formData, 
                        role,
                        is_fachkraft: role === 'FACHKRAFT' || role === 'LEITUNG' || role === 'SPRINGER'
                      });
                    }}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="FACHKRAFT">Fachkraft (Erzieher:in)</option>
                    <option value="ERGAENZUNGSKRAFT">Ergänzungskraft (Kinderpfleger:in)</option>
                    <option value="SPRINGER">Springer / Flexibel</option>
                    <option value="LEITUNG">Einrichtungsleitung</option>
                    <option value="AZUBI">Auszubildende:r / FSJ</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pädagogische Qualifikation</label>
                <input
                  type="text"
                  required
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  placeholder="z.B. Staatl. anerkannte Erzieherin / Kindheitspädagogin B.A."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              {/* CORE CONTRACT HOURS SETTING */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-2.5">
                <div className="text-xs font-bold text-indigo-900 flex items-center space-x-1">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Vertragliche Arbeitszeit & Urlaub (Leitungs-Vorgabe):</span>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Erwartete Wochenstunden
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      required
                      value={formData.weekly_hours}
                      onChange={(e) => setFormData({ ...formData, weekly_hours: Number(e.target.value) })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Arbeitstage/Woche
                    </label>
                    <select
                      value={formData.work_days}
                      onChange={(e) => setFormData({ ...formData, work_days: Number(e.target.value) })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-bold"
                    >
                      <option value={5}>5 Tage (Mo-Fr)</option>
                      <option value={4}>4 Tage</option>
                      <option value={3}>3 Tage</option>
                      <option value={2}>2 Tage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">
                      Urlaubstage/Jahr
                    </label>
                    <input
                      type="number"
                      required
                      value={formData.annual_vacation_days}
                      onChange={(e) => setFormData({ ...formData, annual_vacation_days: Number(e.target.value) })}
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg bg-white font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-Mail (Login)</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kiosk-PIN (4-stellig)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Stammgruppe</label>
                <select
                  value={formData.target_group_id}
                  onChange={(e) => setFormData({ ...formData, target_group_id: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                >
                  <option value="">Keine (Springer / Flexibel)</option>
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  {editingStaffId ? 'Änderungen speichern & Mitarbeiter informieren' : 'Account anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Staff Audit Log */}
      {auditStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Änderungsprotokoll: {auditStaff.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Alle durch die Leitung vorgenommenen Änderungen & Anpassungen
                </p>
              </div>
              <button onClick={() => setAuditStaff(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[340px] overflow-y-auto space-y-2.5">
              {auditLogs.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">
                  Bisher keine protokollierten Änderungen.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{log.title}</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        {new Date(log.created_at).toLocaleString('de-DE')}
                      </span>
                    </div>
                    <div className="text-slate-600 mt-1">{log.description}</div>
                    <div className="text-[10px] text-indigo-600 mt-1 font-semibold">
                      Durch: {log.changed_by}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setAuditStaff(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
