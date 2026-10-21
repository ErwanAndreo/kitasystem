import React, { useState, useEffect } from 'react';
import { Staff, Shift, Approval } from '../types';
import { 
  Clock, 
  ArrowRightLeft, 
  Palmtree, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Play, 
  Square, 
  User, 
  Sparkles,
  Send,
  Coffee,
  AlertTriangle,
  Megaphone,
  UserCheck,
  Shield,
  FileText,
  Bell,
  TrendingUp
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface MobileAppViewProps {
  staffList: Staff[];
  shifts: Shift[];
  approvals: Approval[];
  onStamp: (staff_id: string, action: 'CLOCK_IN' | 'BREAK' | 'CLOCK_OUT') => Promise<void>;
  onRequestSwap: (data: { requester_id: string; target_id: string; shift_id: string; note: string }) => Promise<void>;
  onRequestVacation: (data: { requester_id: string; start_date: string; end_date: string; reason: string }) => Promise<void>;
}

export const MobileAppView: React.FC<MobileAppViewProps> = ({
  staffList,
  shifts,
  approvals,
  onStamp,
  onRequestSwap,
  onRequestVacation
}) => {
  const [currentStaffId, setCurrentStaffId] = useState<string>(staffList[5]?.id || staffList[1]?.id || 's_lukas');
  const [activeTab, setActiveTab] = useState<'HOME' | 'ROSTER' | 'SWAP' | 'CHANGES' | 'BOARD'>('HOME');

  const [groupNotes, setGroupNotes] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [staffStats, setStaffStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Swap Form State
  const [swapShiftId, setSwapShiftId] = useState<string>('');
  const [swapTargetId, setSwapTargetId] = useState<string>('');
  const [swapNote, setSwapNote] = useState<string>('');
  const [swapSuccessMsg, setSwapSuccessMsg] = useState<string | null>(null);

  // Vacation Form State
  const [vacStart, setVacStart] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [vacEnd, setVacEnd] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [vacReason, setVacReason] = useState<string>('Erholungsurlaub');
  const [vacSuccessMsg, setVacSuccessMsg] = useState<string | null>(null);

  const currentUser = staffList.find(s => s.id === currentStaffId) || staffList[0];
  const todayStr = format(new Date(), 'yyyy-MM-dd');

  const userShifts = shifts.filter(s => s.staff_id === currentStaffId);
  const todayShift = userShifts.find(s => s.date === todayStr);

  const userApprovals = approvals.filter(
    a => a.requester_id === currentStaffId || a.target_id === currentStaffId
  );

  const coWorkersToday = todayShift
    ? shifts.filter(s => s.group_id === todayShift.group_id && s.date === todayStr && s.staff_id !== currentStaffId)
    : [];

  useEffect(() => {
    loadDetails();
  }, [currentStaffId, todayShift?.group_id]);

  const loadDetails = async () => {
    try {
      const [annRes, statsRes, auditRes] = await Promise.all([
        fetch('/api/announcements'),
        fetch(`/api/staff/${currentStaffId}/stats`),
        fetch(`/api/staff/${currentStaffId}/audit-log`)
      ]);
      setAnnouncements(await annRes.json());
      setStaffStats(await statsRes.json());
      setAuditLogs(await auditRes.json());

      const groupId = todayShift?.group_id || currentUser?.target_group_id || 'g_ue3_sonne';
      const notesRes = await fetch(`/api/groups/${groupId}/details`);
      const notesData = await notesRes.json();
      setGroupNotes(notesData.notes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendSwap = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!swapShiftId || !swapTargetId) return;

    await onRequestSwap({
      requester_id: currentStaffId,
      target_id: swapTargetId,
      shift_id: swapShiftId,
      note: swapNote
    });

    setSwapSuccessMsg('Schichttausch eingereicht! Wartet auf Freigabe der Leitung.');
    setSwapNote('');
    setTimeout(() => setSwapSuccessMsg(null), 4000);
  };

  const handleSendVacation = async (e: React.FormEvent) => {
    e.preventDefault();
    await onRequestVacation({
      requester_id: currentStaffId,
      start_date: vacStart,
      end_date: vacEnd,
      reason: vacReason
    });

    setVacSuccessMsg('Urlaubsantrag eingereicht! Wartet auf Freigabe der Leitung.');
    setTimeout(() => setVacSuccessMsg(null), 4000);
  };

  const unreadChangesCount = auditLogs.filter(l => l.is_read === 0).length;

  return (
    <div className="max-w-md mx-auto my-6">
      <div className="bg-slate-900 rounded-[44px] p-3 shadow-2xl border-4 border-slate-800">
        {/* Notch */}
        <div className="h-5 w-32 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
          <div className="w-10 h-1 bg-slate-700 rounded-full" />
        </div>

        {/* Screen */}
        <div className="bg-slate-50 rounded-[34px] overflow-hidden min-h-[720px] flex flex-col border border-slate-200">
          {/* Header */}
          <div className="bg-emerald-600 text-white p-4 pt-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-bold text-emerald-200 tracking-wider">
                MITARBEITER-APP
              </span>
              <div className="flex items-center space-x-1 text-[10px] bg-emerald-700/60 px-2 py-0.5 rounded-full">
                <span>SIMULATION:</span>
                <select
                  value={currentStaffId}
                  onChange={(e) => setCurrentStaffId(e.target.value)}
                  className="bg-transparent font-bold text-white focus:outline-none cursor-pointer"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id} className="text-slate-900">
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <div
                className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-md ring-2 ring-white/30"
                style={{ backgroundColor: currentUser?.color || '#16a34a' }}
              >
                {currentUser?.avatar}
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-base leading-tight truncate">{currentUser?.name}</h3>
                <p className="text-xs text-emerald-100">{currentUser?.qualification}</p>
                <p className="text-[10px] text-emerald-200 font-semibold mt-0.5">
                  Vertrag: {currentUser?.weekly_hours}h/Woche • {currentUser?.work_days || 5} Tage
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation (5 Tabs) */}
          <div className="grid grid-cols-5 border-b border-slate-200 bg-white text-center">
            <button
              onClick={() => setActiveTab('HOME')}
              className={`py-2 text-[10px] font-bold border-b-2 transition-all ${
                activeTab === 'HOME' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
              }`}
            >
              Heute
            </button>
            <button
              onClick={() => setActiveTab('ROSTER')}
              className={`py-2 text-[10px] font-bold border-b-2 transition-all ${
                activeTab === 'ROSTER' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
              }`}
            >
              Plan
            </button>
            <button
              onClick={() => setActiveTab('SWAP')}
              className={`py-2 text-[10px] font-bold border-b-2 transition-all ${
                activeTab === 'SWAP' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
              }`}
            >
              Anträge
            </button>
            <button
              onClick={() => setActiveTab('CHANGES')}
              className={`py-2 text-[10px] font-bold border-b-2 transition-all relative ${
                activeTab === 'CHANGES' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
              }`}
            >
              <span>Änderungen</span>
              {unreadChangesCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('BOARD')}
              className={`py-2 text-[10px] font-bold border-b-2 transition-all ${
                activeTab === 'BOARD' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
              }`}
            >
              Konto
            </button>
          </div>

          {/* Content Area */}
          <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
            {/* TAB 1: HEUTE */}
            {activeTab === 'HOME' && (
              <>
                {/* Shift Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Heutiger Dienst • {format(new Date(), 'EEEE', { locale: de })}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Schlüssel: 1:6.2 (Grün)
                    </span>
                  </div>

                  {todayShift ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-extrabold text-slate-900">
                          {todayShift.start_time} - {todayShift.end_time} Uhr
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-lg bg-amber-100 text-amber-900">
                          {todayShift.group_name.split(' ')[0]}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 mt-1">
                        Pause: {todayShift.break_minutes} Min. • Gruppe: {todayShift.group_name}
                      </div>

                      {/* Co-workers */}
                      <div className="mt-3 pt-3 border-t border-slate-100">
                        <div className="text-[11px] font-bold text-slate-500 mb-1.5">
                          Mit dir im Gruppendienst:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {coWorkersToday.map((cw) => (
                            <span
                              key={cw.id}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 rounded-md text-[10px] font-semibold text-slate-700"
                            >
                              <UserCheck className="w-2.5 h-2.5 text-emerald-600" />
                              <span>{cw.staff_name.split(' ')[0]}</span>
                              <span className="text-slate-400">({cw.start_time})</span>
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm font-semibold text-slate-600 py-2">
                      Heute keine Schicht eingeteilt.
                    </div>
                  )}
                </div>

                {/* 1-Tap Stempeluhr */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs text-center">
                  <div className="text-[10px] font-bold text-slate-400 tracking-wider mb-1">
                    DIGITALE ZEITERFASSUNG
                  </div>
                  <div className="text-3xl font-black text-slate-900 font-mono tracking-tight mb-2">
                    {format(new Date(), 'HH:mm:ss')} Uhr
                  </div>

                  <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold mb-4 bg-slate-100 text-slate-700">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        currentUser?.clock_status === 'CLOCKED_IN'
                          ? 'bg-emerald-500 animate-ping'
                          : currentUser?.clock_status === 'IN_BREAK'
                          ? 'bg-amber-500'
                          : 'bg-slate-400'
                      }`}
                    />
                    <span>
                      {currentUser?.clock_status === 'CLOCKED_IN'
                        ? 'Eingestempelt'
                        : currentUser?.clock_status === 'IN_BREAK'
                        ? 'In Pause'
                        : 'Nicht eingestempelt'}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => onStamp(currentUser.id, 'CLOCK_IN')}
                      className="p-3 bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex flex-col items-center"
                    >
                      <Play className="w-4 h-4 mb-1" />
                      <span>Kommen</span>
                    </button>
                    <button
                      onClick={() => onStamp(currentUser.id, 'BREAK')}
                      className="p-3 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex flex-col items-center"
                    >
                      <Coffee className="w-4 h-4 mb-1" />
                      <span>Pause</span>
                    </button>
                    <button
                      onClick={() => onStamp(currentUser.id, 'CLOCK_OUT')}
                      className="p-3 bg-slate-700 hover:bg-slate-800 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex flex-col items-center"
                    >
                      <Square className="w-4 h-4 mb-1" />
                      <span>Gehen</span>
                    </button>
                  </div>
                </div>

                {/* Group Notes & Allergies */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Kinder-Besonderheiten & Allergien</span>
                    </span>
                    <span className="text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
                      {groupNotes.length} Notizen
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    {groupNotes.map((note) => (
                      <div
                        key={note.id}
                        className={`p-2 rounded-xl text-xs flex items-start space-x-2 border ${
                          note.category === 'ALLERGY'
                            ? 'bg-rose-50/60 border-rose-200 text-rose-950'
                            : 'bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                      >
                        <span className="font-bold shrink-0">{note.child_name}:</span>
                        <span>{note.note}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* TAB 2: ROSTER */}
            {activeTab === 'ROSTER' && (
              <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                <div className="text-xs font-bold text-slate-900 mb-3">
                  Mein Dienstplan diese Woche
                </div>
                <div className="space-y-2">
                  {userShifts.map((sh) => (
                    <div
                      key={sh.id}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
                        sh.status === 'CANCELLED'
                          ? 'bg-rose-50 border-rose-200 line-through text-slate-400'
                          : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{sh.date}</div>
                        <div className="text-[11px] text-slate-500">{sh.group_name}</div>
                      </div>
                      <div className="font-bold text-emerald-700">
                        {sh.start_time} - {sh.end_time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: SWAP & VACATION */}
            {activeTab === 'SWAP' && (
              <div className="space-y-3.5">
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <h4 className="font-bold text-xs text-slate-900 mb-2 flex items-center space-x-1.5">
                    <ArrowRightLeft className="w-3.5 h-3.5 text-blue-600" />
                    <span>Schicht abgeben / Kollegen anfragen</span>
                  </h4>

                  {swapSuccessMsg && (
                    <div className="p-2 mb-2 bg-emerald-50 text-emerald-800 text-xs rounded-lg">
                      {swapSuccessMsg}
                    </div>
                  )}

                  <form onSubmit={handleSendSwap} className="space-y-2.5">
                    <select
                      value={swapShiftId}
                      onChange={(e) => setSwapShiftId(e.target.value)}
                      required
                      className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="">-- Meine Schicht wählen --</option>
                      {userShifts.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.date} ({s.start_time} - {s.end_time} Uhr)
                        </option>
                      ))}
                    </select>

                    <select
                      value={swapTargetId}
                      onChange={(e) => setSwapTargetId(e.target.value)}
                      required
                      className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white"
                    >
                      <option value="">-- Kolleg:in wählen --</option>
                      {staffList.filter(s => s.id !== currentStaffId).map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.qualification})
                        </option>
                      ))}
                    </select>

                    <button
                      type="submit"
                      className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl"
                    >
                      Tausch anfragen
                    </button>
                  </form>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <h4 className="font-bold text-xs text-slate-900 mb-2 flex items-center space-x-1.5">
                    <Palmtree className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Urlaub beantragen</span>
                  </h4>

                  <form onSubmit={handleSendVacation} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="date"
                        value={vacStart}
                        onChange={(e) => setVacStart(e.target.value)}
                        className="text-xs p-2 border border-slate-300 rounded-xl"
                      />
                      <input
                        type="date"
                        value={vacEnd}
                        onChange={(e) => setVacEnd(e.target.value)}
                        className="text-xs p-2 border border-slate-300 rounded-xl"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl"
                    >
                      Urlaub verbindlich einreichen
                    </button>
                  </form>
                </div>
              </div>
            )}

            {/* TAB 4: ÄNDERUNGEN DURCH DIE LEITUNG (TRANSPARENZ-LOG) */}
            {activeTab === 'CHANGES' && (
              <div className="space-y-3.5">
                <div className="bg-indigo-50/70 p-3.5 rounded-2xl border border-indigo-200">
                  <div className="flex items-center space-x-2 text-indigo-900 font-bold text-xs">
                    <Bell className="w-4 h-4 text-indigo-600" />
                    <span>Änderungen durch die Leitung</span>
                  </div>
                  <p className="text-[11px] text-indigo-700 mt-1">
                    Hier siehst du alle Schichtanpassungen, Überstundengutschriften und Vertragsänderungen von Sabine Weber.
                  </p>
                </div>

                <div className="space-y-2">
                  {auditLogs.length === 0 ? (
                    <div className="text-xs text-slate-400 py-6 text-center bg-white rounded-2xl border border-slate-200">
                      Keine Änderungen protokolliert.
                    </div>
                  ) : (
                    auditLogs.map((log) => (
                      <div
                        key={log.id}
                        className="p-3 bg-white rounded-2xl border border-slate-200 shadow-xs text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span className="text-indigo-950 font-bold">{log.title}</span>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {new Date(log.created_at).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                        <p className="text-slate-600 text-[11px]">{log.description}</p>
                        <div className="text-[10px] text-slate-400 font-medium pt-0.5">
                          Eingetragen von: {log.changed_by}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* TAB 5: KONTO & PINNWAND */}
            {activeTab === 'BOARD' && (
              <div className="space-y-3.5">
                {/* Stats Cards */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="text-[10px] font-bold text-slate-400">ÜBERSTUNDEN</div>
                    <div className="text-xl font-black text-emerald-600 mt-1">
                      {staffStats?.overtime_hours >= 0 ? `+${staffStats?.overtime_hours}h` : `${staffStats?.overtime_hours}h`}
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      inkl. {staffStats?.adjustments_hours || 0}h Sonderstunden
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
                    <div className="text-[10px] font-bold text-slate-400">RESTURLAUB</div>
                    <div className="text-xl font-black text-slate-900 mt-1">
                      {staffStats?.remaining_vacation_days || 24} Tage
                    </div>
                    <div className="text-[9px] text-slate-400 mt-0.5">
                      von {staffStats?.total_vacation_days || 30} Tagen gesamt
                    </div>
                  </div>
                </div>

                {/* Pinnwand */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs">
                  <div className="text-xs font-bold text-slate-900 mb-3 flex items-center space-x-1.5">
                    <Megaphone className="w-4 h-4 text-blue-600" />
                    <span>Kita-Pinnwand (Aushänge)</span>
                  </div>

                  <div className="space-y-2">
                    {announcements.map((ann) => (
                      <div
                        key={ann.id}
                        className={`p-3 rounded-xl border text-xs ${
                          ann.priority === 'HIGH' ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'
                        }`}
                      >
                        <div className="font-bold text-slate-900">{ann.title}</div>
                        <div className="text-slate-600 mt-1">{ann.content}</div>
                        <div className="text-[10px] text-slate-400 mt-1.5 flex justify-between">
                          <span>{ann.author}</span>
                          <span>{ann.date}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Bottom Device Bar */}
          <div className="bg-white p-3 border-t border-slate-200 flex justify-center">
            <div className="w-24 h-1 bg-slate-300 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
