import React, { useState } from 'react';
import { Staff, Group, Role } from '../types';
import { Users, UserPlus, Shield, Award, Clock, Key, Check } from 'lucide-react';

interface StaffManagementProps {
  staffList: Staff[];
  groups: Group[];
  onAddStaff: (newStaff: any) => Promise<void>;
}

export const StaffManagement: React.FC<StaffManagementProps> = ({
  staffList,
  groups,
  onAddStaff
}) => {
  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'FACHKRAFT' as Role,
    qualification: 'Staatl. anerkannte/r Erzieher/in',
    is_fachkraft: true,
    weekly_hours: 39.0,
    target_group_id: groups[0]?.id || '',
    pin: '1234',
    color: '#10b981'
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddStaff(formData);
    setModalOpen(false);
    setFormData({
      name: '',
      email: '',
      phone: '',
      role: 'FACHKRAFT',
      qualification: 'Staatl. anerkannte/r Erzieher/in',
      is_fachkraft: true,
      weekly_hours: 39.0,
      target_group_id: groups[0]?.id || '',
      pin: '1234',
      color: '#10b981'
    });
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-4 h-4 text-emerald-600" />
            <span>Mitarbeiter- & Qualifikationsverwaltung</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Personalstamm, Rollen, Fachkraftquoten & Kiosk-PINs
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Mitarbeiter:in anlegen</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
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
                    {s.is_fachkraft === 1 ? 'Fachkraft' : 'Ergänzungskraft'}
                  </span>
                </div>

                <div className="space-y-1 mt-3 text-xs text-slate-600">
                  <div className="flex items-center space-x-1.5">
                    <Award className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{s.qualification}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{s.weekly_hours} Std./Woche</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-slate-500 truncate">{groupName}</span>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200/80 mt-3 pt-2 flex items-center justify-between text-[11px] text-slate-400">
                <span className="flex items-center space-x-1">
                  <Key className="w-3 h-3 text-slate-400" />
                  <span>Kiosk-PIN: ••••</span>
                </span>
                <span className="text-emerald-700 font-semibold">{s.email}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Staff Modal */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h3 className="text-base font-bold text-slate-900 mb-4">
              Neues Teammitglied erfassen (Onboarding Wizard)
            </h3>

            <form onSubmit={handleSubmit} className="space-y-3.5">
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-Mail</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="j.mueller@kita.de"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
                  <input
                    type="text"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="0170-123456"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Wochenstunden</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.weekly_hours}
                    onChange={(e) => setFormData({ ...formData, weekly_hours: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stammgruppe</label>
                  <select
                    value={formData.target_group_id}
                    onChange={(e) => setFormData({ ...formData, target_group_id: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">Keine (Springer)</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Kiosk PIN (4-stellig)</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono text-center font-bold"
                  />
                </div>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-[11px] text-blue-900 flex items-center space-x-2">
                <Shield className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Fachkraft-Status für Betreuungsschlüssel: <strong>{formData.is_fachkraft ? 'Ja (100% Wert)' : 'Nein (Ergänzungskraft)'}</strong>
                </span>
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
                  Mitarbeiter:in speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
