import React, { useState, useEffect } from 'react';
import { SubstituteCycle, Staff } from '../types';
import { 
  Users, 
  ShieldAlert, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  ChevronRight, 
  RotateCw, 
  Sparkles,
  Gavel,
  Check,
  X,
  Send,
  UserCheck
} from 'lucide-react';

interface EinspringKaskadeWidgetProps {
  staffList: Staff[];
  onRefreshData?: () => void;
}

export const EinspringKaskadeWidget: React.FC<EinspringKaskadeWidgetProps> = ({
  staffList,
  onRefreshData
}) => {
  const [cycles, setCycles] = useState<SubstituteCycle[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [directorChosenStaffId, setDirectorChosenStaffId] = useState('');
  const [directorNote, setDirectorNote] = useState('Verbindliche Weisung der Leitung nach Ablehnung aller Verfügbaren zur Aufrechterhaltung des Mindestpersonalschlüssels.');
  const [showStartForm, setShowStartForm] = useState(false);

  // New Cycle Form state
  const [newGroupId, setNewGroupId] = useState('g_u3_maeuse');
  const [newDate, setNewDate] = useState(new Date().toISOString().substring(0, 10));
  const [newStartTime, setNewStartTime] = useState('08:00');
  const [newEndTime, setNewEndTime] = useState('16:30');
  const [newAbsentStaffId, setNewAbsentStaffId] = useState(staffList[2]?.id || staffList[1]?.id || '');
  const [newReason, setNewReason] = useState('Akute Krankmeldung / Kinderschutz-Schlüssel sichern');

  const loadCycles = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/emergency/cycles');
      if (res.ok) {
        const data = await res.json();
        setCycles(data);
      }
    } catch (err) {
      console.error('Error loading substitute cycles:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCycles();
    const interval = setInterval(loadCycles, 8000);
    return () => clearInterval(interval);
  }, []);

  const activeCycle = cycles[0];

  const handleStartCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch('/api/emergency/start-cycle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: newGroupId,
          date: newDate,
          start_time: newStartTime,
          end_time: newEndTime,
          absent_staff_id: newAbsentStaffId,
          reason: newReason
        })
      });
      if (res.ok) {
        setShowStartForm(false);
        await loadCycles();
        if (onRefreshData) onRefreshData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleRespond = async (cycleId: string, staffId: string, decision: 'ACCEPT' | 'DECLINE') => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/emergency/cycles/${cycleId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: staffId, decision })
      });
      if (res.ok) {
        await loadCycles();
        if (onRefreshData) onRefreshData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectorDecide = async (cycleId: string, overrideStaffId?: string, overrideNote?: string) => {
    const targetStaffId = overrideStaffId || directorChosenStaffId;
    if (!targetStaffId) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/emergency/cycles/${cycleId}/director-decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: targetStaffId,
          director_note: overrideNote || directorNote
        })
      });
      if (res.ok) {
        await loadCycles();
        if (onRefreshData) onRefreshData();
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleDirectAssign = async (cycleId: string, staffId: string, staffName: string) => {
    if (!window.confirm(`Soll ${staffName} sofort verbindlich durch die Leitung angewiesen werden ("Die Person macht das jetzt!")?`)) return;
    await handleDirectorDecide(
      cycleId, 
      staffId, 
      `Sofortige Weisung der Leitung während der laufenden Abfrage: ${staffName} macht das jetzt!`
    );
  };

  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
        <div className="flex items-center space-x-3">
          <div className="h-10 w-10 rounded-2xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-extrabold text-sm sm:text-base text-slate-900">
                Einspring-Kaskade (Automatisches Durchcyceln aller Verfügbaren)
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-800 border border-indigo-200">
                ArbZG & Rechtlicher Rahmen
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Fragt nacheinander alle im gesetzlichen Rahmen verfügbaren Fachkräfte an. Sagen alle ab, entscheidet die Leitung.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowStartForm(!showStartForm)}
            className="px-3.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
            <span>{showStartForm ? 'Schließen' : '+ Notfall-Kaskade starten'}</span>
          </button>
          <button
            onClick={loadCycles}
            disabled={loading}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
            title="Aktualisieren"
          >
            <RotateCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Start New Cascade Form Modal / Inset */}
      {showStartForm && (
        <form onSubmit={handleStartCycle} className="mt-4 p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
          <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Neue Einspring-Kaskade initiieren</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Gruppe</label>
              <select
                value={newGroupId}
                onChange={(e) => setNewGroupId(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
              >
                <option value="g_u3_maeuse">Mäusegruppe (U3 Krippe)</option>
                <option value="g_ue3_sonne">Sonnenschein (Ü3 Elementar)</option>
                <option value="g_ue3_wald">Waldgruppe (Ü3 Natur)</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Datum</label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Uhrzeit</label>
              <div className="flex items-center space-x-1">
                <input
                  type="text"
                  value={newStartTime}
                  onChange={(e) => setNewStartTime(e.target.value)}
                  className="w-1/2 text-xs p-2 rounded-xl border border-slate-300 bg-white text-center font-mono"
                  placeholder="08:00"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="text"
                  value={newEndTime}
                  onChange={(e) => setNewEndTime(e.target.value)}
                  className="w-1/2 text-xs p-2 rounded-xl border border-slate-300 bg-white text-center font-mono"
                  placeholder="16:30"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Ausgefallener Mitarbeiter</label>
              <select
                value={newAbsentStaffId}
                onChange={(e) => setNewAbsentStaffId(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
              >
                {staffList.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Grund / Anlass</label>
              <input
                type="text"
                value={newReason}
                onChange={(e) => setNewReason(e.target.value)}
                className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={() => setShowStartForm(false)}
              className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200 rounded-xl font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kaskade starten (Rechtsprüfung & Durchcyceln)</span>
            </button>
          </div>
        </form>
      )}

      {/* Active or Selected Cycle View */}
      {activeCycle ? (
        <div className="mt-4 space-y-4">
          {/* Cycle Status Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl border bg-slate-50 border-slate-200">
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xs text-slate-900">
                  Ausfall in {activeCycle.group_name || 'Gruppe'}:
                </span>
                <span className="font-mono text-xs font-semibold text-slate-600">
                  {activeCycle.date} ({activeCycle.start_time} - {activeCycle.end_time} Uhr)
                </span>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    activeCycle.status === 'IN_PROGRESS'
                      ? 'bg-amber-100 text-amber-800 animate-pulse'
                      : activeCycle.status === 'ACCEPTED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : activeCycle.status === 'ALL_DECLINED'
                      ? 'bg-rose-100 text-rose-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {activeCycle.status === 'IN_PROGRESS' && '⏳ Kaskade läuft (cycelt durch)'}
                  {activeCycle.status === 'ACCEPTED' && '✓ Einspringen bestätigt'}
                  {activeCycle.status === 'ALL_DECLINED' && '🚨 JEDER HAT NEIN GESAGT'}
                  {activeCycle.status === 'DIRECTOR_RESOLVED' && '⚖️ Durch Leitung entschieden'}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Grund: {activeCycle.reason || 'Krankheitsbedingter Ausfall'} • {activeCycle.candidates.length} Mitarbeiter im rechtlichen Rahmen (ArbZG § 3 & § 5) qualifiziert
              </p>
            </div>

            {/* Quick Status Info */}
            {activeCycle.status === 'ACCEPTED' && (
              <div className="px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Eingesprungen: {activeCycle.accepted_staff_name}</span>
              </div>
            )}
          </div>

          {/* Active Director Immediate Override ("Die Person macht das jetzt!") */}
          {activeCycle.status === 'IN_PROGRESS' && (
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-amber-50 via-orange-50 to-amber-100/60 border border-amber-300 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-2.5">
                <div className="p-2 rounded-xl bg-amber-500 text-white shrink-0 mt-0.5">
                  <Gavel className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-bold text-amber-950">
                      Direktionsrecht der Leitung (jederzeit während der Abfrage):
                    </span>
                    <span className="px-2 py-0.2 bg-amber-200/80 text-amber-900 rounded-full text-[10px] font-bold">
                      Sofort-Zuweisung
                    </span>
                  </div>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Die Leitung kann auch <strong>während der laufenden Abfrage</strong> jederzeit sofort bestimmen: <em>"Die Person macht das jetzt!"</em>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                <select
                  value={directorChosenStaffId}
                  onChange={(e) => setDirectorChosenStaffId(e.target.value)}
                  className="text-xs p-2 rounded-xl border border-amber-300 bg-white font-medium text-slate-800"
                >
                  <option value="">-- Person direkt bestimmen --</option>
                  <optgroup label="Rechtlich geprüfte Kandidaten:">
                    {activeCycle.candidates.map((c) => (
                      <option key={c.staff_id} value={c.staff_id}>
                        {c.name} ({c.role} • {c.qualification})
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="Weitere Kita-Mitarbeiter:">
                    {staffList
                      .filter((s) => !activeCycle.candidates.some((c) => c.staff_id === s.id))
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role})
                        </option>
                      ))}
                  </optgroup>
                </select>

                <button
                  onClick={() => handleDirectorDecide(activeCycle.id)}
                  disabled={actionLoading || !directorChosenStaffId}
                  className="px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all whitespace-nowrap disabled:opacity-50 flex items-center space-x-1.5"
                >
                  <Gavel className="w-3.5 h-3.5" />
                  <span>Die Person macht das jetzt!</span>
                </button>
              </div>
            </div>
          )}

          {/* Candidates Cascade Pipeline */}
          <div>
            <div className="text-xs font-bold text-slate-700 mb-2 flex items-center justify-between">
              <span>Reihenfolge der Einspring-Anfragen (nach Rechtsprüfung & Springer-Prio):</span>
              <span className="text-[10px] text-slate-400">
                ArbZG § 3 (max. 10h) • ArbZG § 5 (11h Ruhezeit)
              </span>
            </div>

            <div className="space-y-2">
              {activeCycle.candidates.map((c, idx) => {
                const isCurrent = activeCycle.status === 'IN_PROGRESS' && activeCycle.current_candidate_index === idx;
                const isAccepted = c.status === 'ACCEPTED';
                const isDeclined = c.status === 'DECLINED';
                const isWaiting = c.status === 'WAITING';

                return (
                  <div
                    key={c.staff_id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      isCurrent
                        ? 'bg-amber-50/70 border-amber-300 ring-2 ring-amber-400/20 shadow-xs'
                        : isAccepted
                        ? 'bg-emerald-50/80 border-emerald-300'
                        : isDeclined
                        ? 'bg-slate-50 border-slate-200 opacity-60'
                        : 'bg-white border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-700 shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="flex items-center space-x-2">
                            <span className={`text-xs font-bold ${isDeclined ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {c.name}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-slate-100 text-slate-700 rounded font-medium">
                              {c.role} • {c.qualification}
                            </span>
                            {c.is_fachkraft && (
                              <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-bold">
                                Fachkraft
                              </span>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[10px] text-slate-500">
                            <span className="text-emerald-700 font-semibold flex items-center space-x-0.5">
                              <span>✓ ArbZG § 3: {c.legal_check.total_daily_hours.toFixed(1)}h/10h</span>
                            </span>
                            <span>•</span>
                            <span className="text-emerald-700 font-semibold flex items-center space-x-0.5">
                              <span>✓ ArbZG § 5: {c.legal_check.rest_hours_before.toFixed(1)}h Ruhezeit</span>
                            </span>
                            <span>•</span>
                            <span className="text-slate-600">Keine Abwesenheit</span>
                          </div>
                        </div>
                      </div>

                      {/* Status / Action buttons */}
                      <div className="flex items-center space-x-2 self-end sm:self-center">
                        {isAccepted && (
                          <span className="px-2.5 py-1 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center space-x-1">
                            <Check className="w-3.5 h-3.5" />
                            <span>Hat zugesagt!</span>
                          </span>
                        )}

                        {isDeclined && (
                          <span className="px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 text-[11px] font-semibold flex items-center space-x-1">
                            <X className="w-3 h-3" />
                            <span>Hat abgelehnt</span>
                          </span>
                        )}

                        {isWaiting && (
                          <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[11px]">
                            In Warteschlange
                          </span>
                        )}

                        {isCurrent && (
                          <div className="flex items-center space-x-1.5">
                            <span className="text-[11px] text-amber-800 font-bold animate-pulse mr-1">
                              Wird gerade angefragt...
                            </span>
                            <button
                              onClick={() => handleRespond(activeCycle.id, c.staff_id, 'ACCEPT')}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center space-x-1"
                              title="Simulation: Mitarbeiter sagt zu"
                            >
                              <Check className="w-3 h-3" />
                              <span>Zusage simulieren</span>
                            </button>
                            <button
                              onClick={() => handleRespond(activeCycle.id, c.staff_id, 'DECLINE')}
                              disabled={actionLoading}
                              className="px-2.5 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 text-[11px] font-bold rounded-lg border border-rose-300 flex items-center space-x-1"
                              title="Simulation: Mitarbeiter sagt ab -> Weiter zum Nächsten"
                            >
                              <X className="w-3 h-3" />
                              <span>Absage (Weiter)</span>
                            </button>
                          </div>
                        )}

                        {/* Direct Director Override on this Candidate ("Die Person macht das jetzt!") */}
                        {activeCycle.status === 'IN_PROGRESS' && (
                          <button
                            onClick={() => handleDirectAssign(activeCycle.id, c.staff_id, c.name)}
                            disabled={actionLoading}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white text-[11px] font-bold rounded-lg shadow-xs flex items-center space-x-1 transition-all"
                            title={`Leitung weist ${c.name} sofort verbindlich an ("Die Person macht das jetzt!")`}
                          >
                            <Gavel className="w-3 h-3" />
                            <span>Die Person macht das jetzt!</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ALL DECLINED WARNING & DIRECTOR OVERRIDE DECISION */}
          {activeCycle.status === 'ALL_DECLINED' && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-50 via-rose-100 to-amber-50 border-2 border-rose-400 shadow-sm space-y-3">
              <div className="flex items-start space-x-3">
                <div className="p-2 rounded-xl bg-rose-600 text-white shrink-0 mt-0.5">
                  <ShieldAlert className="w-5 h-5 animate-bounce" />
                </div>
                <div>
                  <h4 className="text-sm font-extrabold text-rose-950">
                    Alle im rechtlichen Rahmen verfügbaren Mitarbeiter haben nein gesagt!
                  </h4>
                  <p className="text-xs text-rose-800 mt-0.5">
                    Das System hat alle {activeCycle.candidates.length} infrage kommenden Fachkräfte nacheinander durchgecycelt. 
                    Niemand hat zugesagt. <strong>Jetzt muss die Einrichtungsleitung entscheiden, wer einspringt!</strong>
                  </p>
                </div>
              </div>

              {/* Director Decision Form */}
              <div className="bg-white/80 backdrop-blur-xs p-3.5 rounded-xl border border-rose-200 space-y-3">
                <div className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Gavel className="w-4 h-4 text-rose-600" />
                  <span>Verbindliche Direktions-Entscheidung der Einrichtungsleitung:</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Mitarbeiter für das Einspringen anweisen:
                    </label>
                    <select
                      value={directorChosenStaffId}
                      onChange={(e) => setDirectorChosenStaffId(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white font-medium"
                    >
                      <option value="">-- Mitarbeiter auswählen --</option>
                      {staffList.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.role} • {s.qualification})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Begründung / Weisungsnotiz der Leitung:
                    </label>
                    <input
                      type="text"
                      value={directorNote}
                      onChange={(e) => setDirectorNote(e.target.value)}
                      className="w-full text-xs p-2 rounded-xl border border-slate-300 bg-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => handleDirectorDecide(activeCycle.id)}
                    disabled={actionLoading || !directorChosenStaffId}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 active:scale-95 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 disabled:opacity-50"
                  >
                    <Gavel className="w-3.5 h-3.5" />
                    <span>Verbindlich anweisen & Schicht zuteilen</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* DIRECTOR RESOLVED BANNER */}
          {activeCycle.status === 'DIRECTOR_RESOLVED' && (
            <div className="p-3.5 rounded-2xl bg-purple-50 border border-purple-200 text-xs text-purple-900 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Gavel className="w-4 h-4 text-purple-700 shrink-0" />
                <span>
                  <strong>Entscheidung der Leitung vollzogen:</strong> {activeCycle.director_decision_staff_name} wurde angewiesen einzuspringen.
                  {activeCycle.director_note && ` ("${activeCycle.director_note}")`}
                </span>
              </div>
              <span className="font-bold text-purple-800 text-[11px] shrink-0">
                Schicht eingebucht ✓
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="mt-4 p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
          Aktuell läuft keine aktive Einspring-Kaskade. Bei akutem Ausfall oben auf "+ Notfall-Kaskade starten" klicken.
        </div>
      )}
    </div>
  );
};
