import React, { useState, useEffect } from 'react';
import { Group } from '../types';
import { 
  Tablet, 
  UserCheck, 
  LogOut, 
  AlertTriangle, 
  ShieldAlert, 
  CheckCircle2, 
  Activity, 
  Bed, 
  X, 
  Check,
  RefreshCw,
  Utensils
} from 'lucide-react';
import { format } from 'date-fns';

interface TabletKioskViewProps {
  groups: Group[];
  showToast: (msg: string) => void;
}

export const TabletKioskView: React.FC<TabletKioskViewProps> = ({ groups, showToast }) => {
  const [selectedGroupId, setSelectedGroupId] = useState<string>(groups[0]?.id || 'g_u3_maeuse');
  const [attendanceList, setAttendanceList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(format(new Date(), 'HH:mm:ss'));
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  // Modal: Check-Out with Pickup Authorization
  const [checkoutChild, setCheckoutChild] = useState<any | null>(null);
  const [pickupAuths, setPickupAuths] = useState<any[]>([]);
  const [customPickupPerson, setCustomPickupPerson] = useState('');

  // Modal: U3 Daily Log (Wickeln, Schlafen)
  const [logChild, setLogChild] = useState<any | null>(null);
  const [logType, setLogType] = useState<'DIAPER' | 'SLEEP' | 'MEAL'>('DIAPER');
  const [logDetails, setLogDetails] = useState('');

  // Digital Meal Summary
  const [mealSummary, setMealSummary] = useState<any | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(format(new Date(), 'HH:mm:ss'));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const [attRes, mealRes] = await Promise.all([
        fetch(`/api/attendance?group_id=${selectedGroupId}&date=${todayStr}`),
        fetch(`/api/meals/summary?date=${todayStr}`)
      ]);

      if (attRes.ok) {
        const data = await attRes.json();
        setAttendanceList(data.list || []);
      }
      if (mealRes.ok) {
        setMealSummary(await mealRes.json());
      }
    } catch (e) {
      console.error(e);
      showToast('Fehler beim Laden der Anwesenheitsliste');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, [selectedGroupId]);

  // Fast 1-Tap Check-In
  const handleCheckIn = async (childId: string, childName: string) => {
    try {
      const nowTime = format(new Date(), 'HH:mm');
      const res = await fetch('/api/attendance/check-in', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_id: childId, check_in_time: nowTime, date: todayStr })
      });

      if (res.ok) {
        showToast(`✓ ${childName} eingecheckt (${nowTime} Uhr)`);
        loadAttendance();
      }
    } catch (e) {
      console.error(e);
      showToast('Check-In fehlgeschlagen');
    }
  };

  // Open Check-Out Dialog (Fetches authorized pick-up persons)
  const openCheckoutDialog = async (child: any) => {
    setCheckoutChild(child);
    try {
      const res = await fetch(`/api/children/${child.child_id}`);
      if (res.ok) {
        const fullChild = await res.json();
        setPickupAuths(fullChild.pickup_authorizations || []);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmCheckout = async (pickedUpBy: string) => {
    if (!checkoutChild) return;

    try {
      const nowTime = format(new Date(), 'HH:mm');
      const res = await fetch('/api/attendance/check-out', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: checkoutChild.child_id,
          check_out_time: nowTime,
          picked_up_by: pickedUpBy,
          date: todayStr
        })
      });

      if (res.ok) {
        showToast(`✓ ${checkoutChild.first_name} abgeholt von ${pickedUpBy}`);
        setCheckoutChild(null);
        setCustomPickupPerson('');
        loadAttendance();
      }
    } catch (e) {
      console.error(e);
      showToast('Check-Out fehlgeschlagen');
    }
  };

  const handleMarkSick = async (childId: string, childName: string) => {
    try {
      const res = await fetch('/api/attendance/mark-absent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: childId,
          status: 'absent_sick',
          reason: 'Krank gemeldet',
          cancel_meal: true,
          date: todayStr
        })
      });

      if (res.ok) {
        showToast(`${childName} krankgemeldet (Essen storniert & Auto-Balancing aktiv)`);
        loadAttendance();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveDailyLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logChild || !logDetails) return;

    try {
      const res = await fetch('/api/daily-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: logChild.child_id,
          date: todayStr,
          log_type: logType,
          details: logDetails,
          staff_id: 's_sabine'
        })
      });

      if (res.ok) {
        showToast(`Tagebucheintrag für ${logChild.first_name} gespeichert`);
        setLogChild(null);
        setLogDetails('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  const presentCount = attendanceList.filter(a => a.status === 'present').length;
  const sickCount = attendanceList.filter(a => a.status === 'absent_sick').length;
  const otherCount = attendanceList.filter(a => a.status !== 'present' && a.status !== 'absent_sick').length;

  return (
    <div className="space-y-5 select-none">
      {/* Top Tablet Header Bar */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-lg border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
            <Tablet className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h2 className="text-lg font-semibold tracking-tight">Erzieher Gruppen-Tablet</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold">
                KIOSK AKTIV
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Ein- und Auschecken • Abholprüfung • U3-Tagebuch
            </p>
          </div>
        </div>

        {/* Live Clock & Refresh */}
        <div className="flex items-center space-x-4">
          <div className="text-right">
            <div className="font-mono text-xl font-semibold text-emerald-400 tracking-wider">
              {currentTime}
            </div>
            <div className="text-xs text-slate-400 font-medium">
              {format(new Date(), 'EEEE, dd. MMMM yyyy')}
            </div>
          </div>

          <button
            onClick={loadAttendance}
            className="p-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-2xl border border-slate-700 transition-colors"
            title="Aktualisieren"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Group Selector & Live Stats Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Big Group Tabs */}
        <div className="flex items-center space-x-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
          {groups.map(g => {
            const isSelected = selectedGroupId === g.id;
            return (
              <button
                key={g.id}
                onClick={() => setSelectedGroupId(g.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center space-x-2 ${
                  isSelected
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <span>{g.name}</span>
                <span className={`px-1.5 py-0.5 rounded-full text-xs font-mono ${isSelected ? 'bg-emerald-700 text-white' : 'bg-slate-200 text-slate-700'}`}>
                  {g.type}
                </span>
              </button>
            );
          })}
        </div>

        {/* Live Attendance Counter Pill */}
        <div className="flex items-center space-x-3 text-xs font-bold">
          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl">
            <UserCheck className="w-4 h-4 text-emerald-600" />
            <span>{presentCount} Anwesend</span>
          </div>

          <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl">
            <Activity className="w-4 h-4 text-rose-600" />
            <span>{sickCount} Krank / Abgemeldet</span>
          </div>

          {mealSummary && (
            <div className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-xl">
              <Utensils className="w-4 h-4 text-amber-600" />
              <span>{mealSummary.total_ordered} Essen bestellt</span>
            </div>
          )}
        </div>
      </div>

      {/* Children Kiosk Grid */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">Gruppe wird geladen...</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {attendanceList.map(c => {
            const isPresent = c.status === 'present';
            const isSick = c.status === 'absent_sick';
            const hasCheckedOut = isPresent && !!c.check_out_time;
            const hasAllergy = c.allergies && c.allergies.length > 0;
            const hasEpiPen = !!c.emergency_instructions;

            return (
              <div
                key={c.child_id}
                className={`rounded-2xl p-4 border transition-all flex flex-col justify-between ${
                  hasCheckedOut
                    ? 'bg-slate-100/80 border-slate-300 opacity-75'
                    : isPresent
                    ? 'bg-white border-emerald-300 ring-2 ring-emerald-500/20 shadow-md'
                    : isSick
                    ? 'bg-rose-50/50 border-rose-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Card Header: Avatar & Status Badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-semibold text-sm shrink-0 border ${
                        isPresent
                          ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                          : 'bg-slate-100 text-slate-700 border-slate-200'
                      }`}>
                        {c.first_name[0]}{c.last_name[0]}
                      </div>

                      <div className="min-w-0">
                        <h3 className="font-semibold text-slate-900 text-sm truncate">
                          {c.first_name} {c.last_name}
                        </h3>
                        <p className="text-xs text-slate-400">
                          {c.care_hours}h Vertrag
                        </p>
                      </div>
                    </div>

                    {/* Status Chip */}
                    <div>
                      {hasCheckedOut ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          Abgeholt ({c.check_out_time})
                        </span>
                      ) : isPresent ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Da ({c.check_in_time})</span>
                        </span>
                      ) : isSick ? (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-600 text-white">
                          Krank
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-500">
                          Noch offen
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Safety & Allergy Alert Pill */}
                  {hasAllergy && (
                    <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">Allergie: {c.allergies.join(', ')}</span>
                    </div>
                  )}

                  {hasEpiPen && (
                    <div className="mb-3 px-2.5 py-1.5 rounded-xl bg-rose-600 text-white text-xs font-semibold flex items-center space-x-1.5">
                      <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">NOTFALL-MEDIKAMENT!</span>
                    </div>
                  )}

                  {hasCheckedOut && c.picked_up_by && (
                    <div className="mb-2 text-xs text-slate-600 bg-slate-200/60 px-2.5 py-1 rounded-lg">
                      Abgeholt von: <span className="font-bold">{c.picked_up_by}</span>
                    </div>
                  )}
                </div>

                {/* Big Action Buttons (1-Tap Kiosk Touch) */}
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  {!isPresent || hasCheckedOut ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleCheckIn(c.child_id, `${c.first_name} ${c.last_name}`)}
                        className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center space-x-1"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Kommen</span>
                      </button>

                      <button
                        onClick={() => handleMarkSick(c.child_id, `${c.first_name} ${c.last_name}`)}
                        className="w-full py-2.5 bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 font-bold text-xs rounded-xl transition-all"
                      >
                        Krank
                      </button>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => openCheckoutDialog(c)}
                        className="w-full py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-semibold text-xs rounded-xl transition-all flex items-center justify-center space-x-1"
                      >
                        <LogOut className="w-4 h-4" />
                        <span>Abholen</span>
                      </button>

                      <button
                        onClick={() => {
                          setLogChild(c);
                          setLogType('DIAPER');
                          setLogDetails('');
                        }}
                        className="w-full py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl border border-indigo-200 transition-all flex items-center justify-center space-x-1"
                      >
                        <Bed className="w-3.5 h-3.5" />
                        <span>Tagebuch</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Check-Out with Pick-up Verification */}
      {checkoutChild && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  {checkoutChild.first_name} {checkoutChild.last_name} abholen
                </h3>
                <p className="text-xs text-slate-500">Wer holt das Kind heute ab?</p>
              </div>
              <button onClick={() => setCheckoutChild(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of Authorized Persons */}
            <div className="space-y-2 mb-4">
              <div className="text-xs uppercase font-bold text-slate-400">Hinterlegte Abholberechtigte:</div>

              {pickupAuths.map(pa => {
                if (pa.is_forbidden) {
                  return (
                    <div key={pa.id} className="p-3 rounded-2xl bg-rose-50 border border-rose-300 text-xs">
                      <div className="flex items-center space-x-2 text-rose-700 font-semibold">
                        <ShieldAlert className="w-4 h-4" />
                        <span>{pa.name} ({pa.relationship})</span>
                        <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-xs">VERBOT</span>
                      </div>
                      <p className="text-rose-600 font-semibold text-xs mt-1">{pa.notes}</p>
                    </div>
                  );
                }

                return (
                  <button
                    key={pa.id}
                    onClick={() => handleConfirmCheckout(`${pa.name} (${pa.relationship})`)}
                    className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 flex items-center justify-between transition-all text-left"
                  >
                    <div>
                      <span className="font-semibold text-slate-900 text-xs">{pa.name}</span>
                      <span className="text-slate-500 text-xs ml-1.5">({pa.relationship})</span>
                      {pa.notes && <p className="text-xs text-slate-400 mt-0.5">{pa.notes}</p>}
                    </div>
                    <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  </button>
                );
              })}

              {/* Standard Options */}
              <button
                onClick={() => handleConfirmCheckout('Mutter')}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-xs font-bold text-slate-800 text-left transition-all"
              >
                Mutter
              </button>
              <button
                onClick={() => handleConfirmCheckout('Vater')}
                className="w-full p-3 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 text-xs font-bold text-slate-800 text-left transition-all"
              >
                Vater
              </button>
            </div>

            {/* Custom person entry */}
            <div className="pt-3 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-600 mb-1">Andere Person (z. B. Nachbar):</label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  placeholder="Name der abholenden Person"
                  value={customPickupPerson}
                  onChange={e => setCustomPickupPerson(e.target.value)}
                  className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  disabled={!customPickupPerson}
                  onClick={() => handleConfirmCheckout(customPickupPerson)}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all"
                >
                  Bestätigen
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: U3 Krippen-Tagebuch (Wickeln & Schlafen) */}
      {logChild && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-semibold text-slate-900 flex items-center space-x-2">
                <Bed className="w-5 h-5 text-indigo-600" />
                <span>U3 Tagebuch: {logChild.first_name}</span>
              </h3>
              <button onClick={() => setLogChild(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDailyLog} className="space-y-4">
              {/* Category Picker */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setLogType('DIAPER');
                    setLogDetails('Windel gewechselt, normal');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    logType === 'DIAPER'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Wickeln
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogType('SLEEP');
                    setLogDetails('Mittagsschlaf: 12:15 bis 13:45 Uhr');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    logType === 'SLEEP'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Schlafen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setLogType('MEAL');
                    setLogDetails('Mittagessen: Gut gegessen');
                  }}
                  className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                    logType === 'MEAL'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
                >
                  Essen
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Details & Notiz für Eltern:</label>
                <textarea
                  rows={3}
                  required
                  value={logDetails}
                  onChange={e => setLogDetails(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500"
                  placeholder="z. B. Stuhlgang normal, gut geschlafen..."
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setLogChild(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold"
                >
                  Speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
