import React, { useState, useEffect } from 'react';
import { Child, Group } from '../types';
import { 
  Users, 
  Search, 
  Plus, 
  AlertTriangle, 
  ShieldAlert, 
  Phone, 
  Calendar, 
  Clock, 
  HeartPulse, 
  UserCheck, 
  X, 
  Check, 
  Eye, 
  FileText,
  Shield,
  Activity
} from 'lucide-react';
import { format } from 'date-fns';

interface ChildrenManagementProps {
  groups: Group[];
  showToast: (msg: string) => void;
}

export const ChildrenManagement: React.FC<ChildrenManagementProps> = ({ groups, showToast }) => {
  const [children, setChildren] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [selectedChild, setSelectedChild] = useState<any | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // New child form
  const [newFirst, setNewFirst] = useState('');
  const [newLast, setNewLast] = useState('');
  const [newDob, setNewDob] = useState('2023-01-15');
  const [newGroup, setNewGroup] = useState(groups[0]?.id || 'g_u3_maeuse');
  const [newHours, setNewHours] = useState(35);
  const [newAllergies, setNewAllergies] = useState('');
  const [newDiet, setNewDiet] = useState('');
  const [newEmergencyNote, setNewEmergencyNote] = useState('');

  const loadChildren = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/children');
      const data = await res.json();
      setChildren(data);
    } catch (e) {
      console.error(e);
      showToast('Fehler beim Laden der Kinderakten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadChildren();
  }, []);

  const openChildDetail = async (childId: string) => {
    try {
      const res = await fetch(`/api/children/${childId}`);
      if (res.ok) {
        const fullChild = await res.json();
        setSelectedChild(fullChild);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateChild = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFirst || !newLast || !newDob) return;

    try {
      const allergiesList = newAllergies ? newAllergies.split(',').map(s => s.trim()).filter(Boolean) : [];
      const res = await fetch('/api/children', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: newGroup,
          first_name: newFirst,
          last_name: newLast,
          birth_date: newDob,
          care_hours: newHours,
          allergies: allergiesList,
          dietary_needs: newDiet || null,
          emergency_instructions: newEmergencyNote || null
        })
      });

      if (res.ok) {
        showToast(`Kind ${newFirst} ${newLast} erfolgreich aufgenommen`);
        setShowAddModal(false);
        setNewFirst('');
        setNewLast('');
        setNewAllergies('');
        setNewDiet('');
        setNewEmergencyNote('');
        loadChildren();
      }
    } catch (e) {
      console.error(e);
      showToast('Fehler beim Speichern des Kindes');
    }
  };

  const filteredChildren = children.filter(c => {
    const matchesGroup = selectedGroup === 'ALL' || c.group_id === selectedGroup;
    const matchesSearch = search === '' || 
      `${c.first_name} ${c.last_name}`.toLowerCase().includes(search.toLowerCase()) ||
      (c.allergies && c.allergies.some(a => a.toLowerCase().includes(search.toLowerCase())));
    return matchesGroup && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Filter Controls */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Users className="w-5 h-5 text-emerald-600" />
            <span>Digitale Kinder- & Stammdatenverwaltung</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gesetzliche Kinderakten, Notfallkontakte, Allergie-Wächter & Abholberechtigungen ({children.length} Kinder aufgenommen)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Group Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setSelectedGroup('ALL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedGroup === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Alle ({children.length})
            </button>
            {groups.map(g => (
              <button
                key={g.id}
                onClick={() => setSelectedGroup(g.id)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  selectedGroup === g.id ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {g.name.split(' ')[0]}
              </button>
            ))}
          </div>

          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Kind oder Allergie suchen..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white w-52"
            />
          </div>

          {/* Add Child Button */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Neues Kind aufnehmen</span>
          </button>
        </div>
      </div>

      {/* Children Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Kinderakten werden geladen...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredChildren.map(c => {
            const hasAllergy = c.has_allergy;
            const hasEmergencyNote = c.has_emergency_note;
            const isSick = c.today_status === 'absent_sick';
            const isPresent = c.today_status === 'present';

            return (
              <div
                key={c.id}
                onClick={() => openChildDetail(c.id)}
                className="bg-white rounded-2xl p-4 border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
              >
                {/* Status bar top */}
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {c.group_name || 'Gruppe'}
                  </span>

                  <div className="flex items-center space-x-1">
                    {isPresent && (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <UserCheck className="w-3 h-3" />
                        <span>Anwesend ({c.check_in_time || '08:00'})</span>
                      </span>
                    )}
                    {isSick && (
                      <span className="inline-flex items-center space-x-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                        <Activity className="w-3 h-3" />
                        <span>Krank</span>
                      </span>
                    )}
                    {!isPresent && !isSick && (
                      <span className="text-[11px] font-semibold text-slate-400">
                        Nicht erfasst
                      </span>
                    )}
                  </div>
                </div>

                {/* Child Name & Details */}
                <div className="flex items-start space-x-3 mb-3">
                  <div className="w-11 h-11 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center font-bold text-emerald-800 text-sm shrink-0">
                    {c.first_name[0]}{c.last_name[0]}
                  </div>

                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 text-sm truncate">
                      {c.first_name} {c.last_name}
                    </h3>
                    <p className="text-xs text-slate-500 flex items-center space-x-1.5 mt-0.5">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>Geb: {c.birth_date} ({c.care_hours}h Betreuung)</span>
                    </p>
                  </div>
                </div>

                {/* Health & Safety Indicators */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  {hasAllergy ? (
                    <div className="flex items-center space-x-1.5 text-xs text-amber-800 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 font-medium">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">Allergie: {c.allergies?.join(', ')}</span>
                    </div>
                  ) : (
                    <div className="text-[11px] text-slate-400 flex items-center space-x-1">
                      <Check className="w-3 h-3 text-emerald-500" />
                      <span>Keine bekannten Allergien</span>
                    </div>
                  )}

                  {hasEmergencyNote && (
                    <div className="flex items-center space-x-1.5 text-xs text-rose-800 bg-rose-50 px-2.5 py-1 rounded-lg border border-rose-200 font-bold animate-pulse">
                      <ShieldAlert className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                      <span className="truncate">Notfall-Medikament hinterlegt</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Full Child Details / Akte */}
      {selectedChild && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 rounded-full bg-emerald-100 border border-emerald-300 flex items-center justify-center font-extrabold text-emerald-800 text-base">
                  {selectedChild.child.first_name[0]}{selectedChild.child.last_name[0]}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-slate-900">
                    {selectedChild.child.first_name} {selectedChild.child.last_name}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {selectedChild.child.group_name} • Geboren am {selectedChild.child.birth_date} • {selectedChild.child.care_hours} Std. Vertrag
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedChild(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-full hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* 1. Health & Safety Card */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5 mb-3">
                  <HeartPulse className="w-4 h-4 text-rose-500" />
                  <span>Gesundheit, Allergien & Masernschutz</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block mb-0.5">Allergien & Unverträglichkeiten:</span>
                    <span className="font-bold text-slate-800">
                      {selectedChild.health?.allergies?.length > 0 ? selectedChild.health.allergies.join(', ') : 'Keine Allergien bekannt'}
                    </span>
                    {selectedChild.health?.dietary_needs && (
                      <span className="block text-slate-600 mt-1 italic">
                        Kostform: {selectedChild.health.dietary_needs}
                      </span>
                    )}
                  </div>

                  <div className="bg-white p-3 rounded-xl border border-slate-200">
                    <span className="text-slate-400 block mb-0.5">Masernschutz nach IfSG:</span>
                    <span className="font-bold text-emerald-700 flex items-center space-x-1">
                      <Check className="w-4 h-4 text-emerald-600" />
                      <span>{selectedChild.health?.measles_vaccinated ? 'Vollständig nachgewiesen' : 'Ausstehend'}</span>
                    </span>
                    {selectedChild.health?.doctor_name && (
                      <span className="block text-slate-500 mt-1">
                        Kinderarzt: {selectedChild.health.doctor_name} ({selectedChild.health.doctor_phone})
                      </span>
                    )}
                  </div>
                </div>

                {selectedChild.health?.emergency_instructions && (
                  <div className="mt-3 bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-800 font-semibold flex items-start space-x-2">
                    <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="block font-bold">Ärztliche Notfall-Anweisung:</span>
                      {selectedChild.health.emergency_instructions}
                    </div>
                  </div>
                )}
              </div>

              {/* 2. Emergency Contacts */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5 mb-3">
                  <Phone className="w-4 h-4 text-emerald-600" />
                  <span>Notfallkontakte (nach Anrufpriorität)</span>
                </h3>

                <div className="space-y-2">
                  {selectedChild.emergency_contacts?.map((ec: any) => (
                    <div key={ec.id} className="bg-white p-3 rounded-xl border border-slate-200 flex items-center justify-between text-xs">
                      <div>
                        <span className="font-bold text-slate-900">{ec.name}</span>
                        <span className="text-slate-500 ml-1.5">({ec.relationship})</span>
                        <span className="ml-2 px-1.5 py-0.2 bg-emerald-50 text-emerald-700 font-bold rounded">
                          Priorität {ec.priority}
                        </span>
                      </div>
                      <a
                        href={`tel:${ec.phone_primary}`}
                        className="flex items-center space-x-1 px-3 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg font-bold transition-colors"
                      >
                        <Phone className="w-3 h-3" />
                        <span>{ec.phone_primary}</span>
                      </a>
                    </div>
                  ))}
                </div>
              </div>

              {/* 3. Pickup Authorizations with Forbidden Check */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5 mb-3">
                  <Shield className="w-4 h-4 text-indigo-600" />
                  <span>Abholberechtigungen & Sicherheitsausschluss</span>
                </h3>

                <div className="space-y-2">
                  {selectedChild.pickup_authorizations?.map((pa: any) => (
                    <div
                      key={pa.id}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        pa.is_forbidden
                          ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-200'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className={`font-bold ${pa.is_forbidden ? 'text-rose-700' : 'text-slate-900'}`}>
                            {pa.name}
                          </span>
                          <span className="text-slate-500">({pa.relationship})</span>
                          {pa.is_forbidden ? (
                            <span className="px-2 py-0.5 bg-rose-600 text-white font-bold rounded-full text-[10px]">
                              ⚠️ ABHOLVERBOT
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                              Berechtigt
                            </span>
                          )}
                        </div>
                        {pa.notes && (
                          <p className={`text-[11px] mt-1 ${pa.is_forbidden ? 'text-rose-600 font-semibold' : 'text-slate-500'}`}>
                            {pa.notes}
                          </p>
                        )}
                      </div>

                      {pa.phone && (
                        <span className="text-slate-600 font-mono text-[11px]">{pa.phone}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Child */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <span>Neues Kind aufnehmen</span>
              </h2>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateChild} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vorname *</label>
                  <input
                    type="text"
                    required
                    value={newFirst}
                    onChange={e => setNewFirst(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="z. B. Liam"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nachname *</label>
                  <input
                    type="text"
                    required
                    value={newLast}
                    onChange={e => setNewLast(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                    placeholder="z. B. Müller"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Geburtsdatum *</label>
                  <input
                    type="date"
                    required
                    value={newDob}
                    onChange={e => setNewDob(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Gruppe *</label>
                  <select
                    value={newGroup}
                    onChange={e => setNewGroup(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  >
                    {groups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Betreuungszeit (Std./Woche)</label>
                <div className="flex space-x-3">
                  {[25, 35, 45].map(hrs => (
                    <button
                      key={hrs}
                      type="button"
                      onClick={() => setNewHours(hrs)}
                      className={`flex-1 py-1.5 rounded-xl font-bold border transition-all ${
                        newHours === hrs
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {hrs} Std.
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Allergien (kommagetrennt)</label>
                <input
                  type="text"
                  value={newAllergies}
                  onChange={e => setNewAllergies(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="z. B. Erdnuss, Laktose"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ärztliche Notfallanweisung / EpiPen</label>
                <textarea
                  rows={2}
                  value={newEmergencyNote}
                  onChange={e => setNewEmergencyNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  placeholder="z. B. Notfallset im Fach 1 deponiert, sofort 112..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-semibold transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-semibold shadow-xs transition-colors"
                >
                  Kind anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
