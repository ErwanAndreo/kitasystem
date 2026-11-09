import { AvailabilityRules, describeRule } from './AvailabilityRules';
import { notifyError } from '../notify';
import React, { useState } from 'react';
import { Staff, Group, Role, } from '../types';
import { 
  Users, 
  UserPlus, 
  Award, 
  Clock, 
  Key, 
  Edit, 
  Trash2, 
  History, 
  X,
  Calendar,
  AlertTriangle,
  FileCheck,
  Plus,
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
  const [availabilityFor, setAvailabilityFor] = useState<Staff | null>(null);
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
    color: '#10b981',
    standard_work_hours: '08:00 - 16:30',
    availability_window: 'Mo-Fr 07:30 - 17:00',
    username: 'admin',
    password: 'admin'
  });

  const handleResetPassword = async (staffId: string, name: string) => {
    if (!confirm(`Passwort für ${name} wirklich auf den Standard "admin" zurücksetzen?`)) return;
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId })
      });
      if (res.ok) {
        notifyError(`✓ Login für ${name} lautet wieder standardmäßig: admin / admin`);
        onRefresh();
      }
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  // Audit history modal
  const [auditStaff, setAuditStaff] = useState<Staff | null>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Certification Modal State
  const [certModalOpen, setCertModalOpen] = useState(false);
  const [certTargetStaff, setCertTargetStaff] = useState<Staff | null>(null);
  const [certFormData, setCertFormData] = useState({
    type: 'ERSTE_HILFE_KIND',
    title: 'Erste-Hilfe am Kind (DGUV)',
    issue_date: new Date().toISOString().slice(0, 10),
    expires_at: new Date(Date.now() + 2 * 365 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10), // +2 years default
    institution: 'Deutsches Rotes Kreuz (DRK)',
    notes: 'Auffrischung alle 2 Jahre'
  });

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
      color: '#10b981',
      standard_work_hours: '08:00 - 16:30',
      availability_window: 'Mo-Fr 07:30 - 17:00',
      username: 'admin',
      password: 'admin'
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
      color: staff.color,
      standard_work_hours: staff.standard_work_hours || '08:00 - 16:30',
      availability_window: staff.availability_window || 'Mo-Fr 07:30 - 17:00',
      username: staff.username || 'admin',
      password: staff.password || 'admin'
    });
    setModalOpen(true);
  };

  const handleOpenAddCert = (staff: Staff) => {
    setCertTargetStaff(staff);
    const twoYearsLater = new Date();
    twoYearsLater.setFullYear(twoYearsLater.getFullYear() + 2);

    setCertFormData({
      type: 'ERSTE_HILFE_KIND',
      title: 'Erste-Hilfe am Kind (DGUV)',
      issue_date: new Date().toISOString().slice(0, 10),
      expires_at: twoYearsLater.toISOString().slice(0, 10),
      institution: 'Deutsches Rotes Kreuz (DRK)',
      notes: ''
    });
    setCertModalOpen(true);
  };

  const handleCertTypeChange = (type: string) => {
    const today = new Date();
    let yearsToAdd = 2;
    let defaultTitle = 'Erste-Hilfe am Kind (DGUV)';
    let defaultInst = 'Deutsches Rotes Kreuz (DRK)';

    if (type === 'FUEHRUNGSZEUGNIS_72A') {
      yearsToAdd = 5;
      defaultTitle = 'Erweitertes Führungszeugnis § 72a SGB VIII';
      defaultInst = 'Bundesamt für Justiz';
    } else if (type === 'INFEKTIONSSCHUTZ_43') {
      yearsToAdd = 2;
      defaultTitle = 'Belehrung § 43 Infektionsschutzgesetz (IfSG)';
      defaultInst = 'Gesundheitsamt';
    } else if (type === 'BRANDSCHUTZHELFER') {
      yearsToAdd = 3;
      defaultTitle = 'Brandschutzhelfer-Nachweis (DGUV)';
      defaultInst = 'TÜV / Feuerwehr';
    } else if (type === 'U3_ZERTIFIKAT') {
      yearsToAdd = 5;
      defaultTitle = 'U3-Fachkraft-Zertifikat';
      defaultInst = 'Landesjugendamt';
    }

    const expiry = new Date();
    expiry.setFullYear(expiry.getFullYear() + yearsToAdd);

    setCertFormData({
      ...certFormData,
      type,
      title: defaultTitle,
      institution: defaultInst,
      expires_at: expiry.toISOString().slice(0, 10)
    });
  };

  const handleSaveCert = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!certTargetStaff) return;
    try {
      await fetch('/api/certifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: certTargetStaff.id,
          ...certFormData
        })
      });
      setCertModalOpen(false);
      onRefresh();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCert = async (certId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Dieses Zertifikat wirklich entfernen?')) return;
    try {
      await fetch(`/api/certifications/${certId}`, { method: 'DELETE' });
      onRefresh();
    } catch (err) {
      console.error(err);
    }
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
      setAuditLogs(await res.json());
    } catch (err) {
      console.error(err);
    }
  };

  // Find all certificates that are expired or expiring soon across the facility
  const allStaffCerts = staffList.flatMap(s => (s.certifications || []).map(c => ({ ...c, staff_name: s.name })));
  const criticalCerts = allStaffCerts.filter(c => c.is_expired || c.expires_soon);

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      {availabilityFor && (
        <AvailabilityRules staff={availabilityFor} onClose={() => setAvailabilityFor(null)} onSaved={onRefresh} />
      )}
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Users className="w-5 h-5 text-emerald-600" />
              <span>Personal</span>
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">Verträge, Stammgruppen und ablaufende Zertifikate.</p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Neuen Account anlegen</span>
        </button>
      </div>

      {/* Critical Certifications Alert Banner */}
      {criticalCerts.length > 0 && (
        <div className="mt-4 p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-900">
          <div className="flex items-center space-x-2 font-bold mb-1.5">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Zertifikats-Ablauf-Monitor: {criticalCerts.length} Qualifikation(en) erfordern Aufmerksamkeit!</span>
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {criticalCerts.map((cert) => (
              <span
                key={cert.id}
                className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-xl text-xs font-bold border ${
                  cert.is_expired
                    ? 'bg-rose-100 text-rose-900 border-rose-300'
                    : 'bg-amber-100 text-amber-900 border-amber-300'
                }`}
              >
                <span>{cert.staff_name}:</span>
                <span className="font-normal">{cert.title}</span>
                <span>•</span>
                <span>
                  {cert.is_expired ? `Abgelaufen (${cert.expires_at})` : `Fällig in ${cert.days_until_expiry} Tagen`}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Staff List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
        {staffList.map((s) => {
          const groupName = groups.find(g => g.id === s.target_group_id)?.name || 'Springer / Einrichtungsübergreifend';
          const certs = s.certifications || [];

          return (
            <div
              key={s.id}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shrink-0"
                      style={{ backgroundColor: s.color }}
                    >
                      {s.avatar}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-slate-900 leading-tight">{s.name}</h4>
                      <span className="text-xs font-semibold text-slate-500">{s.role}</span>
                    </div>
                  </div>

                  <span
                    className={`text-xs font-bold px-2 py-0.5 rounded-full ${
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
                    <span>Urlaub: {s.annual_vacation_days || 30} Tage</span>
                    <span className="text-slate-300">•</span>
                    <span className="truncate">{groupName.split(' ')[0]}</span>
                  </div>

                  <button onClick={() => setAvailabilityFor(s)} className="block text-left text-xs font-medium text-emerald-700 hover:underline">
                    {s.availability_rules?.length ? s.availability_rules.map(describeRule).join(' · ') : 'Verfügbarkeit festlegen'}
                  </button>
                </div>

                {/* Qualifikationen & Ablaufdaten Section */}
                <div className="mt-3.5 pt-3 border-t border-slate-200">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center space-x-1">
                      <FileCheck className="w-3 h-3 text-emerald-600" />
                      <span>Qualifikationen & Ablaufdaten</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleOpenAddCert(s)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 font-bold flex items-center space-x-0.5"
                      title="Zertifikat / Nachweis erfassen"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Nachweis +</span>
                    </button>
                  </div>

                  {certs.length === 0 ? (
                    <div className="text-xs text-slate-400 italic">Keine Nachweise hinterlegt.</div>
                  ) : (
                    <div className="space-y-1">
                      {certs.map((c) => (
                        <div
                          key={c.id}
                          className={`flex items-center justify-between p-1.5 rounded-lg border text-xs ${
                            c.is_expired
                              ? 'bg-rose-50 border-rose-200 text-rose-900 font-bold'
                              : c.expires_soon
                              ? 'bg-amber-50 border-amber-200 text-amber-900 font-semibold'
                              : 'bg-white border-slate-200 text-slate-800'
                          }`}
                        >
                          <div className="truncate pr-1">
                            <span className="font-semibold">{c.title}</span>
                            <span className="block text-xs text-slate-500">
                              {c.is_expired 
                                ? `Abgelaufen am ${c.expires_at}` 
                                : c.expires_soon 
                                ? `Läuft in ${c.days_until_expiry} Tagen ab (${c.expires_at})`
                                : `Gültig bis ${c.expires_at}`}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={(e) => handleDeleteCert(c.id, e)}
                            className="text-slate-300 hover:text-rose-600 p-0.5"
                            title="Zertifikat löschen"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Login Credentials Status */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-1 text-slate-600">
                    <Key className="w-3 h-3 text-emerald-600 shrink-0" />
                    <span>Login: <strong className="font-mono text-slate-800">{s.username || 'admin'}</strong> / <strong className="font-mono text-slate-800">{s.password_changed ? '••••••' : (s.password || 'admin')}</strong></span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResetPassword(s.id, s.name)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold hover:underline"
                    title="Setzt das Passwort auf 'admin' zurück"
                  >
                    Reset auf 'admin'
                  </button>
                </div>
              </div>

              {/* Action Buttons & PIN */}
              <div className="border-t border-slate-200/80 mt-3.5 pt-2.5 flex items-center justify-between text-xs">
                <span className="text-xs font-mono text-slate-400">
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
                    className="flex items-center space-x-1 px-2.5 py-1 bg-white hover:bg-indigo-50 border border-slate-300 hover:border-indigo-300 text-indigo-700 font-semibold text-xs rounded-lg transition-colors"
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
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
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
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as Role })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="FACHKRAFT">Fachkraft (Erzieher:in)</option>
                    <option value="ERGAENZUNGSKRAFT">Ergänzungskraft (Kinderpfleger:in)</option>
                    <option value="SPRINGER">Springerkraft (Kita-übergreifend)</option>
                    <option value="LEITUNG">Einrichtungsleitung</option>
                    <option value="AZUBI">Auszubildende:r / FSJ</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">E-Mail</label>
                  <input
                    type="email"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telefon</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Qualifikationsabschluss</label>
                <input
                  type="text"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                  placeholder="z.B. Staatl. anerkannte/r Erzieher/in"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Wochenstunden</label>
                  <input
                    type="number"
                    step="0.5"
                    required
                    value={formData.weekly_hours}
                    onChange={(e) => setFormData({ ...formData, weekly_hours: parseFloat(e.target.value) || 0 })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Arbeitstage / Wo.</label>
                  <input
                    type="number"
                    min="1"
                    max="6"
                    value={formData.work_days}
                    onChange={(e) => setFormData({ ...formData, work_days: parseInt(e.target.value) || 5 })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Urlaubstage / Jahr</label>
                  <input
                    type="number"
                    value={formData.annual_vacation_days}
                    onChange={(e) => setFormData({ ...formData, annual_vacation_days: parseInt(e.target.value) || 30 })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Stammgruppe</label>
                  <select
                    value={formData.target_group_id}
                    onChange={(e) => setFormData({ ...formData, target_group_id: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
                  >
                    <option value="">-- Keine / Springer --</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Mitarbeiter-PIN</label>
                  <input
                    type="text"
                    maxLength={4}
                    value={formData.pin}
                    onChange={(e) => setFormData({ ...formData, pin: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono text-center tracking-widest"
                  />
                </div>
              </div>

                            {/* Standard-Login Info: admin / admin */}
              <div className="bg-emerald-50/80 border border-emerald-200 rounded-xl p-3.5 flex items-start space-x-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
                  <Key className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-emerald-950">Standard-Login für diesen Account:</span>
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-emerald-200 text-emerald-900 font-mono">
                      admin / admin
                    </span>
                  </div>
                  <p className="text-xs text-emerald-800 mt-0.5">
                    Accounts werden standardmäßig mit dem Login <strong>admin / admin</strong> eingerichtet. Mitarbeiter können ihr Passwort nach der ersten Anmeldung anpassen.
                  </p>

                  <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-emerald-200/60 text-xs">
                    <div>
                      <label className="text-xs font-bold text-emerald-900 block mb-0.5">Benutzername (Login):</label>
                      <input
                        type="text"
                        value={formData.username || 'admin'}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full text-xs p-1.5 bg-white border border-emerald-300 rounded-lg font-mono text-slate-800"
                        placeholder="admin"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-emerald-900 block mb-0.5">Initial-Passwort:</label>
                      <input
                        type="text"
                        value={formData.password || 'admin'}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full text-xs p-1.5 bg-white border border-emerald-300 rounded-lg font-mono text-slate-800"
                        placeholder="admin"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Certification with Expiration Date */}
      {certModalOpen && certTargetStaff && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <FileCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Qualifikation / Zertifikat hinterlegen
                </h3>
              </div>
              <button onClick={() => setCertModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2">
              Mitarbeiter:in: <strong>{certTargetStaff.name}</strong> ({certTargetStaff.role})
            </p>

            <form onSubmit={handleSaveCert} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Qualifikationsart</label>
                <select
                  value={certFormData.type}
                  onChange={(e) => handleCertTypeChange(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  <option value="ERSTE_HILFE_KIND">Erste-Hilfe am Kind (2 Jahre gültig)</option>
                  <option value="FUEHRUNGSZEUGNIS_72A">Erweitertes Führungszeugnis § 72a (5 Jahre gültig)</option>
                  <option value="INFEKTIONSSCHUTZ_43">Belehrung § 43 IfSG (Gesundheitszeugnis)</option>
                  <option value="BRANDSCHUTZHELFER">Brandschutzhelfer (3 Jahre gültig)</option>
                  <option value="U3_ZERTIFIKAT">U3-Zertifikatskurs (Krippenpädagogik)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Zertifikatstitel / Bezeichnung</label>
                <input
                  type="text"
                  required
                  value={certFormData.title}
                  onChange={(e) => setCertFormData({ ...certFormData, title: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ausstellungsdatum</label>
                  <input
                    type="date"
                    value={certFormData.issue_date}
                    onChange={(e) => setCertFormData({ ...certFormData, issue_date: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gültig bis (Ablaufdatum)
                  </label>
                  <input
                    type="date"
                    required
                    value={certFormData.expires_at}
                    onChange={(e) => setCertFormData({ ...certFormData, expires_at: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-bold text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Schulungsträger / Aussteller</label>
                <input
                  type="text"
                  value={certFormData.institution}
                  onChange={(e) => setCertFormData({ ...certFormData, institution: e.target.value })}
                  placeholder="z.B. DRK, Malteser, Landesjugendamt..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Bemerkung / Nachschulung</label>
                <input
                  type="text"
                  value={certFormData.notes}
                  onChange={(e) => setCertFormData({ ...certFormData, notes: e.target.value })}
                  placeholder="z.B. Auffrischungskurs fällig..."
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCertModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  Zertifikat speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Audit Log (Transparenz für Mitarbeiter) */}
      {auditStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  Änderungsprotokoll: {auditStaff.name}
                </h3>
              </div>
              <button onClick={() => setAuditStaff(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500 mt-2 mb-4">
              Alle durch die Einrichtungsleitung vorgenommenen Anpassungen (Stunden, Schichten, Korrekturen).
            </p>

            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {auditLogs.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  Keine protokollierten Änderungen für diesen Mitarbeiter vorhanden.
                </div>
              ) : (
                auditLogs.map((log) => (
                  <div key={log.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{log.title}</span>
                      <span className="text-xs text-slate-400 font-normal">
                        {new Date(log.created_at).toLocaleDateString('de-DE')} {new Date(log.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-slate-600 mt-1">{log.description}</p>
                    <div className="text-xs text-indigo-600 font-semibold mt-1">
                      Veranlasst durch: {log.changed_by}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setAuditStaff(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl"
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
