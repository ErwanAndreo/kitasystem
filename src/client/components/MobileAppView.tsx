import { notifyError } from '../notify';
import React, { useState, useEffect } from 'react';
import { Staff, Shift, Approval, Checklist, ShareFavorite, ChecklistShareScope } from '../types';
import { 
  Clock, 
  ArrowRightLeft, 
  Palmtree, 
  User, 
  AlertTriangle,
  Megaphone,
  UserCheck,
  Bell,
  Lightbulb,
  Check,
  Lock,
  Key,
  Plus,
  Users,
  Star,
  ShieldCheck,
  X
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface MobileAppViewProps {
  staffList: Staff[];
  shifts: Shift[];
  approvals: Approval[];
  onRequestSwap: (data: { requester_id: string; target_id: string; shift_id: string; note: string }) => Promise<void>;
  onRequestVacation: (data: { requester_id: string; start_date: string; end_date: string; reason: string }) => Promise<void>;
}

export const MobileAppView: React.FC<MobileAppViewProps> = ({
  staffList,
  shifts,
  approvals,
  onRequestSwap,
  onRequestVacation
}) => {
  const [currentStaffId, setCurrentStaffId] = useState<string>(staffList[5]?.id || staffList[1]?.id || staffList[0]?.id || '');
  const [activeTab, setActiveTab] = useState<'HOME' | 'ROSTER' | 'CHECKLISTS' | 'SWAP' | 'CHANGES' | 'BOARD'>('HOME');

  const [groupNotes, setGroupNotes] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [staffStats, setStaffStats] = useState<any>(null);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Checklist State for Staff
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [checklistFilter, setChecklistFilter] = useState<'ALL' | 'SHARED' | 'PRIVATE'>('ALL');
  const [newChecklistOpen, setNewChecklistOpen] = useState(false);
  const [newChecklistTitle, setNewChecklistTitle] = useState('');
  const [newChecklistIsShared, setNewChecklistIsShared] = useState(true);
  const [newChecklistScope, setNewChecklistScope] = useState<ChecklistShareScope>('ALL');
  const [groups, setGroups] = useState<{ id: string; name: string }[]>([]);
  const [newChecklistGroup, setNewChecklistGroup] = useState('');

  useEffect(() => {
    fetch('/api/groups').then(res => res.json()).then((data) => {
      setGroups(data);
      setNewChecklistGroup(data[0]?.id ?? '');
    }).catch(console.error);
  }, []);
  const [newChecklistStaffId, setNewChecklistStaffId] = useState('');
  const [mobileFavorites, setMobileFavorites] = useState<ShareFavorite[]>([
    { id: 'fav_gesamt', type: 'GESAMT', label: 'Gesamt (Alle)', icon: 'users', targetId: null },
    { id: 'fav_today_group', type: 'TODAY_GROUP', label: 'Heutige Gruppe', icon: 'clock-group', targetId: null },
    { id: 'fav_leitung', type: 'LEITUNG', label: 'Leitung', icon: 'shield-check', targetId: null }
  ]);
  const [newChecklistItems, setNewChecklistItems] = useState<string[]>(['']);
  const [newInlineItem, setNewInlineItem] = useState<{ [id: string]: string }>({});

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

  // Staff Wish Form State (Competitor Best Practice)
  const [wishDate, setWishDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [wishType, setWishType] = useState<'WUNSCH_FRUEH' | 'WUNSCH_SPAET' | 'WUNSCH_FREI'>('WUNSCH_FRUEH');
  const [wishNote, setWishNote] = useState<string>('');
  const [wishSuccessMsg, setWishSuccessMsg] = useState<string | null>(null);
  const [pendingEmergencyReq, setPendingEmergencyReq] = useState<any>(null);

  // Critical Notification Mode (Kritisch vs. Einfach) & Sick Notice
  const [userAlertsMode, setUserAlertsMode] = useState<'CRITICAL' | 'SIMPLE'>('CRITICAL');
  const [sickSubmitting, setSickSubmitting] = useState<boolean>(false);
  const [sickSuccessMsg, setSickSuccessMsg] = useState<string | null>(null);

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
      const [annRes, statsRes, auditRes, chkRes, emergRes, favRes, alertModeRes] = await Promise.all([
        fetch('/api/announcements'),
        fetch(`/api/staff/${currentStaffId}/stats`),
        fetch(`/api/staff/${currentStaffId}/audit-log`),
        fetch(`/api/checklists?staff_id=${currentStaffId}`),
        fetch(`/api/emergency/pending-request/${currentStaffId}`),
        fetch(`/api/staff/${currentStaffId}/share-favorites`),
        fetch(`/api/staff/${currentStaffId}/notification-settings`)
      ]);
      setAnnouncements(await annRes.json());
      setStaffStats(await statsRes.json());
      setAuditLogs(await auditRes.json());
      if (chkRes.ok) {
        setChecklists(await chkRes.json());
      }
      if (favRes.ok) {
        setMobileFavorites(await favRes.json());
      }
      if (emergRes.ok) {
        const emergData = await emergRes.json();
        setPendingEmergencyReq(emergData.has_pending_request ? emergData : null);
      } else {
        setPendingEmergencyReq(null);
      }
      if (alertModeRes.ok) {
        const alertData = await alertModeRes.json();
        if (alertData.critical_alerts_mode) {
          setUserAlertsMode(alertData.critical_alerts_mode);
        }
      }

      const groupId = todayShift?.group_id || currentUser?.target_group_id || 'g_ue3_sonne';
      const notesRes = await fetch(`/api/groups/${groupId}/details`);
      const notesData = await notesRes.json();
      setGroupNotes(notesData.notes || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleUserAlertsMode = async (mode: 'CRITICAL' | 'SIMPLE') => {
    setUserAlertsMode(mode);
    try {
      await fetch(`/api/staff/${currentStaffId}/notification-settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ critical_alerts_mode: mode })
      });
      await loadDetails();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSendSickNotice = async () => {
    if (!window.confirm('Möchtest du dich für heute krankmelden? Die Leitung wird sofort benachrichtigt (je nach Einstellung kritisch oder einfach).')) {
      return;
    }
    setSickSubmitting(true);
    setSickSuccessMsg(null);
    try {
      const res = await fetch('/api/requests/sick', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staff_id: currentStaffId,
          reason: 'Akute Krankmeldung morgens'
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSickSuccessMsg('Krankmeldung übermittelt & Leitung benachrichtigt! Gute Besserung.');
        await loadDetails();
      } else {
        notifyError(data.error || 'Fehler beim Übermitteln');
      }
    } catch (e: any) {
      notifyError('Netzwerkfehler: ' + e.message);
    } finally {
      setSickSubmitting(false);
    }
  };

  const handleRespondToEmergency = async (cycleId: string, decision: 'ACCEPT' | 'DECLINE') => {
    try {
      await fetch(`/api/emergency/cycles/${cycleId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staff_id: currentStaffId, decision })
      });
      await loadDetails();
    } catch (e) {
      console.error(e);
    }
  };

  const handleMobileToggleItem = async (checklistId: string, itemId: string) => {
    try {
      setChecklists(prev => prev.map(c => {
        if (c.id !== checklistId) return c;
        const updated = c.items.map(it => {
          if (it.id !== itemId) return it;
          const nextDone = !it.done;
          return {
            ...it,
            done: nextDone,
            completed_by: nextDone ? currentUser?.name : undefined,
            completed_at: nextDone ? new Date().toISOString() : undefined
          };
        });
        const completed = updated.filter(i => i.done).length;
        return {
          ...c,
          items: updated,
          completed_items: completed,
          progress_percent: updated.length > 0 ? Math.round((completed / updated.length) * 100) : 0
        };
      }));

      await fetch(`/api/checklists/${checklistId}/toggle-item`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          completed_by: currentUser?.name
        })
      });
    } catch (e) {
      console.error(e);
      loadDetails();
    }
  };

  const handleMobileToggleSharing = async (checklist: Checklist) => {
    try {
      const nextShared = !checklist.is_shared;
      setChecklists(prev => prev.map(c => c.id === checklist.id ? { ...c, is_shared: nextShared } : c));
      await fetch(`/api/checklists/${checklist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_shared: nextShared })
      });
    } catch (e) {
      console.error(e);
      loadDetails();
    }
  };

  const handleMobileAddInlineItem = async (checklistId: string) => {
    const text = newInlineItem[checklistId]?.trim();
    if (!text) return;
    try {
      const res = await fetch(`/api/checklists/${checklistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        setNewInlineItem(prev => ({ ...prev, [checklistId]: '' }));
        const chkRes = await fetch(`/api/checklists?staff_id=${currentStaffId}`);
        if (chkRes.ok) setChecklists(await chkRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMobileCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistTitle.trim()) return;

    const items = newChecklistItems
      .filter(i => i.trim().length > 0)
      .map(i => ({
        id: 'i_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        text: i.trim(),
        done: false
      }));

    try {
      const isShared = newChecklistScope !== 'PRIVATE';
      const staffTarget = staffList.find(s => s.id === newChecklistStaffId);
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newChecklistTitle.trim(),
          category: 'ROUTINE',
          created_by_id: currentStaffId,
          created_by_name: currentUser?.name,
          is_shared: isShared,
          share_scope: newChecklistScope,
          shared_group_id: newChecklistScope === 'GROUP' ? newChecklistGroup : null,
          shared_staff_ids: newChecklistScope === 'PERSONS' && newChecklistStaffId ? [newChecklistStaffId] : [],
          shared_staff_names: newChecklistScope === 'PERSONS' && staffTarget ? [staffTarget.name] : [],
          color: currentUser?.color || '#3b82f6',
          items
        })
      });

      if (res.ok) {
        setNewChecklistOpen(false);
        setNewChecklistTitle('');
        setNewChecklistItems(['']);
        setNewChecklistScope('ALL');
        const chkRes = await fetch(`/api/checklists?staff_id=${currentStaffId}`);
        if (chkRes.ok) setChecklists(await chkRes.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMobilePinFavorite = async (fav: { type: string; label: string; targetId?: string | null; targetName?: string | null }) => {
    try {
      const res = await fetch(`/api/staff/${currentStaffId}/share-favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: fav })
      });
      if (res.ok) {
        const data = await res.json();
        setMobileFavorites(data.favorites);
      }
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

  const handleSendWish = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/staff-wishes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: currentStaffId,
        date: wishDate,
        type: wishType,
        note: wishNote
      })
    });
    if (res.ok) {
      setWishSuccessMsg('Wunschdienst eingereicht! Die Leitung sieht ihn bei der Schichtplanung.');
      setWishNote('');
      setTimeout(() => setWishSuccessMsg(null), 4000);
    }
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
              <span className="text-xs font-bold text-emerald-200 tracking-wider">
                MITARBEITER-APP
              </span>
              <div className="flex items-center space-x-1 text-xs bg-emerald-700/60 px-2 py-0.5 rounded-full">
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
                <p className="text-xs text-emerald-200 font-semibold mt-0.5">
                  Vertrag: {currentUser?.weekly_hours}h/Woche • {currentUser?.work_days || 5} Tage
                </p>
              </div>
            </div>
          </div>

          {/* Tab Navigation (6 Tabs) */}
          <div className="grid grid-cols-6 border-b border-slate-200 bg-white text-center">
            <button
              onClick={() => setActiveTab('HOME')}
              className={`py-2 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'HOME' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
              }`}
            >
              Heute
            </button>
            <button
              onClick={() => setActiveTab('ROSTER')}
              className={`py-2 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'ROSTER' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
              }`}
            >
              Plan
            </button>
            {/* <button
              onClick={() => setActiveTab('CHECKLISTS')}
              className={`py-2 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'CHECKLISTS' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
              }`}
            >
              Listen
            </button> */}
            <button
              onClick={() => setActiveTab('SWAP')}
              className={`py-2 text-xs font-bold border-b-2 transition-all ${
                activeTab === 'SWAP' ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-slate-500'
              }`}
            >
              Anträge
            </button>
            <button
              onClick={() => setActiveTab('CHANGES')}
              className={`py-2 text-xs font-bold border-b-2 transition-all relative ${
                activeTab === 'CHANGES' ? 'border-indigo-600 text-indigo-700' : 'border-transparent text-slate-500'
              }`}
            >
              <span>Änderung</span>
              {unreadChangesCount > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('BOARD')}
              className={`py-2 text-xs font-bold border-b-2 transition-all ${
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
                {/* Einspring-Anfrage (falls Kaskade mich gerade anfragt - je nach persönlicher Einstellung kritisch oder einfach) */}
                {pendingEmergencyReq && (
                  (() => {
                    const isCritical = pendingEmergencyReq.is_critical !== false && userAlertsMode === 'CRITICAL';
                    return isCritical ? (
                      <div className="bg-rose-50 border-2 border-rose-500 rounded-2xl p-4 shadow-sm space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-rose-600 text-white rounded-lg">
                              <AlertTriangle className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-semibold text-rose-950 uppercase tracking-wider">
                                Notfall-Alarm: Spontan aushelfen
                              </div>
                              <div className="text-xs text-rose-700 font-semibold">
                                Rechtlicher Rahmen (ArbZG § 3 & § 5) geprüft ✓
                              </div>
                            </div>
                          </div>
                          <span className="text-xs bg-rose-200 text-rose-900 font-semibold px-2 py-0.5 rounded-full">
                            PRIORITÄT
                          </span>
                        </div>

                        <p className="text-xs text-rose-900 font-medium leading-relaxed">
                          Kannst du am <strong>{pendingEmergencyReq.date}</strong> von <strong>{pendingEmergencyReq.start_time} - {pendingEmergencyReq.end_time} Uhr</strong> in der <strong>{pendingEmergencyReq.group_name}</strong> spontan einspringen?
                        </p>

                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={() => handleRespondToEmergency(pendingEmergencyReq.cycle_id, 'ACCEPT')}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Ja, ich springe ein</span>
                          </button>
                          <button
                            onClick={() => handleRespondToEmergency(pendingEmergencyReq.cycle_id, 'DECLINE')}
                            className="flex-1 py-2 bg-white hover:bg-rose-100 text-rose-800 border border-rose-300 text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Nein, kann nicht</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-slate-50 border border-slate-300 rounded-2xl p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-2">
                            <div className="p-1.5 bg-slate-600 text-white rounded-lg">
                              <Clock className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-slate-800">
                                Vertretungsanfrage (Standard)
                              </div>
                              <div className="text-xs text-slate-500 font-semibold">
                                ArbZG § 3 & § 5 geprüft ✓
                              </div>
                            </div>
                          </div>
                          <span className="text-xs bg-slate-200 text-slate-700 font-semibold px-2 py-0.5 rounded-full">
                            Regulär
                          </span>
                        </div>

                        <p className="text-xs text-slate-700 font-medium leading-relaxed">
                          Kannst du am <strong>{pendingEmergencyReq.date}</strong> von <strong>{pendingEmergencyReq.start_time} - {pendingEmergencyReq.end_time} Uhr</strong> in der <strong>{pendingEmergencyReq.group_name}</strong> einspringen?
                        </p>

                        <div className="flex items-center space-x-2 pt-1">
                          <button
                            onClick={() => handleRespondToEmergency(pendingEmergencyReq.cycle_id, 'ACCEPT')}
                            className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center space-x-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Ja, ich übernehme</span>
                          </button>
                          <button
                            onClick={() => handleRespondToEmergency(pendingEmergencyReq.cycle_id, 'DECLINE')}
                            className="flex-1 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 text-xs font-semibold rounded-xl transition-colors flex items-center justify-center space-x-1"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Nein, passt nicht</span>
                          </button>
                        </div>
                      </div>
                    );
                  })()
                )}

                {/* Shift Card */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                      Heutiger Dienst • {format(new Date(), 'EEEE', { locale: de })}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      Schlüssel: 1:6.2 (Grün)
                    </span>
                  </div>

                  {todayShift ? (
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xl font-semibold text-slate-900">
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
                        <div className="text-xs font-bold text-slate-500 mb-1.5">
                          Mit dir im Gruppendienst:
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {coWorkersToday.map((cw) => (
                            <span
                              key={cw.id}
                              className="inline-flex items-center space-x-1 px-2 py-0.5 bg-slate-100 rounded-md text-xs font-semibold text-slate-700"
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

                {/* Standard-Arbeitszeiten & Verfügbarkeits-Info */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Mein Arbeitszeitprofil
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-400 font-bold">REGULÄRE ZEITEN</div>
                      <div className="font-bold text-slate-800 mt-0.5">
                        {currentUser?.standard_work_hours || 'Flexibel nach Dienstplan'}
                      </div>
                    </div>
                    <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                      <div className="text-xs text-slate-400 font-bold">WOCHENSTUNDEN</div>
                      <div className="font-bold text-emerald-700 mt-0.5">
                        {currentUser?.weekly_hours}h / Woche
                      </div>
                    </div>
                  </div>
                  {currentUser?.availability_window && (
                    <div className="mt-2 text-xs text-slate-600 bg-amber-50/60 border border-amber-100 p-2 rounded-xl">
                      <span className="font-bold text-amber-900">Verfügbarkeitsrahmen: </span>
                      {currentUser?.availability_window}
                    </div>
                  )}
                </div>

                {/* Group Notes & Allergies */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Kinder-Besonderheiten & Allergien</span>
                    </span>
                    <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full">
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
              <div className="bg-white rounded-2xl p-4 border border-slate-200">
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
                        <div className="text-xs text-slate-500">{sh.group_name}</div>
                      </div>
                      <div className="font-bold text-emerald-700">
                        {sh.start_time} - {sh.end_time}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TAB: CHECKLISTEN */}
            {activeTab === 'CHECKLISTS' && (
              <div className="space-y-3">
                {/* Filter and Create Header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-1 bg-white p-1 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setChecklistFilter('ALL')}
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        checklistFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600'
                      }`}
                    >
                      Alle
                    </button>
                    <button
                      onClick={() => setChecklistFilter('SHARED')}
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        checklistFilter === 'SHARED' ? 'bg-emerald-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Team
                    </button>
                    <button
                      onClick={() => setChecklistFilter('PRIVATE')}
                      className={`px-2 py-1 rounded-lg text-xs font-bold ${
                        checklistFilter === 'PRIVATE' ? 'bg-indigo-600 text-white' : 'text-slate-600'
                      }`}
                    >
                      Meine
                    </button>
                  </div>

                  <button
                    onClick={() => setNewChecklistOpen(true)}
                    className="flex items-center space-x-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-xl text-xs font-bold"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Neue Liste</span>
                  </button>
                </div>

                {/* Create Modal for Mobile */}
                {newChecklistOpen && (
                  <div className="bg-white rounded-2xl p-3.5 border border-emerald-200 shadow-md space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Neue Checkliste anlegen</span>
                      <button 
                        onClick={() => setNewChecklistOpen(false)}
                        className="text-slate-400 text-xs font-bold"
                      >
                        ✕
                      </button>
                    </div>

                    <form onSubmit={handleMobileCreateChecklist} className="space-y-2">
                      <input
                        type="text"
                        placeholder="Titel der Liste (z.B. Portfolioarbeit)..."
                        value={newChecklistTitle}
                        onChange={(e) => setNewChecklistTitle(e.target.value)}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                      />

                      {/* Top 3 Favorites Quick Select */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-bold text-slate-600">
                          <span className="flex items-center space-x-1">
                            <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                            <span>Favoriten (Ersetzt von unten nach oben):</span>
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-1">
                          {mobileFavorites.map((fav, idx) => {
                            const isSelected = 
                              (fav.type === 'GESAMT' && newChecklistScope === 'ALL') ||
                              (fav.type === 'TODAY_GROUP' && newChecklistScope === 'TODAY_GROUP') ||
                              (fav.type === 'LEITUNG' && newChecklistScope === 'LEITUNG') ||
                              (fav.type === 'GROUP' && newChecklistScope === 'GROUP') ||
                              (fav.type === 'PERSON' && newChecklistScope === 'PERSONS');

                            return (
                              <button
                                key={fav.id || idx}
                                type="button"
                                onClick={() => {
                                  if (fav.type === 'GESAMT') setNewChecklistScope('ALL');
                                  else if (fav.type === 'TODAY_GROUP') setNewChecklistScope('TODAY_GROUP');
                                  else if (fav.type === 'LEITUNG') setNewChecklistScope('LEITUNG');
                                  else if (fav.type === 'GROUP') {
                                    setNewChecklistScope('GROUP');
                                    if (fav.targetId) setNewChecklistGroup(fav.targetId);
                                  } else if (fav.type === 'PERSON') {
                                    setNewChecklistScope('PERSONS');
                                    if (fav.targetId) setNewChecklistStaffId(fav.targetId);
                                  }
                                }}
                                className={`p-1.5 rounded-lg text-left text-xs border transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                                    : 'bg-slate-50 text-slate-700 border-slate-200'
                                }`}
                              >
                                <div className="text-xs opacity-75">{idx === 2 ? '3 (unten)' : idx === 1 ? '2 (Mitte)' : '1 (oben)'}</div>
                                <div className="truncate font-semibold">{fav.label}</div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Granular Scope Selector */}
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-slate-500 block">Freigeben für:</span>
                        <div className="flex flex-wrap gap-1">
                          <button
                            type="button"
                            onClick={() => setNewChecklistScope('ALL')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              newChecklistScope === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Gesamt
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewChecklistScope('TODAY_GROUP')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              newChecklistScope === 'TODAY_GROUP' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Heutige Gruppe
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewChecklistScope('GROUP')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              newChecklistScope === 'GROUP' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Kindergruppe
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewChecklistScope('PERSONS')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              newChecklistScope === 'PERSONS' ? 'bg-purple-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Person
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewChecklistScope('LEITUNG')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              newChecklistScope === 'LEITUNG' ? 'bg-amber-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Leitung
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewChecklistScope('PRIVATE')}
                            className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                              newChecklistScope === 'PRIVATE' ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            Privat
                          </button>
                        </div>

                        {newChecklistScope === 'TODAY_GROUP' && (
                          <p className="text-xs text-blue-600 bg-blue-50 p-1.5 rounded-md">
                            Bleibt bei der Gruppe immer – wird allen angezeigt, die heute in dieser Gruppe arbeiten. Dem Ersteller aber immer!
                          </p>
                        )}

                        {newChecklistScope === 'GROUP' && (
                          <div className="flex items-center space-x-1">
                            <select
                              value={newChecklistGroup}
                              onChange={(e) => setNewChecklistGroup(e.target.value)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1 flex-1 text-slate-800"
                            >
                              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                            </select>
                            <button
                              type="button"
                              onClick={() => handleMobilePinFavorite({
                                type: 'GROUP',
                                label: groups.find(g => g.id === newChecklistGroup)?.name ?? '',
                                targetId: newChecklistGroup
                              })}
                              className="text-xs bg-amber-50 text-amber-700 px-1.5 py-1 rounded border border-amber-200"
                              title="Zu Favoriten hinzufügen"
                            >
                              ⭐ Pin
                            </button>
                          </div>
                        )}

                        {newChecklistScope === 'PERSONS' && (
                          <div className="flex items-center space-x-1">
                            <select
                              value={newChecklistStaffId}
                              onChange={(e) => setNewChecklistStaffId(e.target.value)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded-lg p-1 flex-1 text-slate-800"
                            >
                              <option value="">Kollegen wählen...</option>
                              {staffList.filter(s => s.id !== currentStaffId).map(s => (
                                <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                              ))}
                            </select>
                            {newChecklistStaffId && (
                              <button
                                type="button"
                                onClick={() => {
                                  const s = staffList.find(st => st.id === newChecklistStaffId);
                                  if (s) handleMobilePinFavorite({ type: 'PERSON', label: s.name, targetId: s.id });
                                }}
                                className="text-xs bg-amber-50 text-amber-700 px-1.5 py-1 rounded border border-amber-200"
                                title="Zu Favoriten hinzufügen"
                              >
                                ⭐ Pin
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Item inputs */}
                      <div className="space-y-1.5">
                        <span className="text-xs font-bold text-slate-500 block">Aufgaben:</span>
                        {newChecklistItems.map((it, idx) => (
                          <div key={idx} className="flex items-center space-x-1">
                            <input
                              type="text"
                              placeholder={`Punkt ${idx + 1}...`}
                              value={it}
                              onChange={(e) => {
                                const upd = [...newChecklistItems];
                                upd[idx] = e.target.value;
                                setNewChecklistItems(upd);
                              }}
                              className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-800 outline-none"
                            />
                            {newChecklistItems.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setNewChecklistItems(newChecklistItems.filter((_, i) => i !== idx))}
                                className="text-slate-400 text-xs px-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => setNewChecklistItems([...newChecklistItems, ''])}
                          className="text-xs text-emerald-600 font-bold hover:underline"
                        >
                          + Punkt hinzufügen
                        </button>
                      </div>

                      <div className="flex justify-end space-x-1.5 pt-1">
                        <button
                          type="button"
                          onClick={() => setNewChecklistOpen(false)}
                          className="px-2.5 py-1 text-xs text-slate-500 font-semibold"
                        >
                          Abbrechen
                        </button>
                        <button
                          type="submit"
                          className="px-3 py-1 bg-emerald-600 text-white text-xs font-bold rounded-lg"
                        >
                          Erstellen
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Checklist Cards */}
                {checklists
                  .filter(c => {
                    if (checklistFilter === 'SHARED' && !c.is_shared) return false;
                    if (checklistFilter === 'PRIVATE' && c.is_shared) return false;
                    return true;
                  })
                  .map(c => {
                    const completed = c.items.filter(i => i.done).length;
                    const total = c.items.length;
                    const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

                    return (
                      <div 
                        key={c.id}
                        className="bg-white rounded-2xl border border-slate-200 overflow-hidden"
                      >
                        {/* Header */}
                        <div 
                          className="p-3 border-b border-slate-100 flex items-start justify-between"
                          style={{ borderTop: `3px solid ${c.color || '#3b82f6'}` }}
                        >
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center space-x-1.5 mb-1">
                              <span className="text-xs font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-700">
                                {c.category}
                              </span>
                              <button
                                onClick={() => handleMobileToggleSharing(c)}
                                className={`text-xs font-bold px-1.5 py-0.5 rounded flex items-center space-x-0.5 ${
                                  !c.is_shared || c.share_scope === 'PRIVATE'
                                    ? 'bg-slate-100 text-slate-600'
                                    : c.share_scope === 'TODAY_GROUP'
                                    ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                    : c.share_scope === 'GROUP'
                                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                    : c.share_scope === 'PERSONS'
                                    ? 'bg-purple-50 text-purple-700 border border-purple-200'
                                    : c.share_scope === 'LEITUNG'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                }`}
                              >
                                {!c.is_shared || c.share_scope === 'PRIVATE' ? (
                                  <>
                                    <Lock className="w-2.5 h-2.5" />
                                    <span>Privat</span>
                                  </>
                                ) : c.share_scope === 'TODAY_GROUP' ? (
                                  <>
                                    <Clock className="w-2.5 h-2.5 text-blue-600" />
                                    <span>Heutige Gruppe</span>
                                  </>
                                ) : c.share_scope === 'GROUP' ? (
                                  <>
                                    <Users className="w-2.5 h-2.5 text-indigo-600" />
                                    <span>{c.shared_group_name || 'Gruppe'}</span>
                                  </>
                                ) : c.share_scope === 'PERSONS' ? (
                                  <>
                                    <User className="w-2.5 h-2.5 text-purple-600" />
                                    <span>Personen</span>
                                  </>
                                ) : c.share_scope === 'LEITUNG' ? (
                                  <>
                                    <ShieldCheck className="w-2.5 h-2.5 text-amber-600" />
                                    <span>Leitung</span>
                                  </>
                                ) : (
                                  <>
                                    <Users className="w-2.5 h-2.5" />
                                    <span>Team (Alle)</span>
                                  </>
                                )}
                              </button>
                            </div>
                            <h4 className="font-bold text-xs text-slate-900 leading-tight">{c.title}</h4>
                            <p className="text-xs text-slate-400 mt-0.5">von {c.created_by_name.split(' ')[0]}</p>
                          </div>
                          <span className="text-xs font-bold text-slate-600 font-mono">
                            {completed}/{total}
                          </span>
                        </div>

                        {/* Progress */}
                        <div className="w-full bg-slate-100 h-1">
                          <div className="bg-emerald-500 h-1 transition-all" style={{ width: `${pct}%` }} />
                        </div>

                        {/* Items */}
                        <div className="p-3 space-y-1.5 max-h-48 overflow-y-auto">
                          {c.items.map(it => (
                            <div
                              key={it.id}
                              onClick={() => handleMobileToggleItem(c.id, it.id)}
                              className={`p-2 rounded-xl text-xs flex items-start space-x-2 cursor-pointer transition-all ${
                                it.done ? 'bg-emerald-50/50 text-slate-400 line-through' : 'bg-slate-50 text-slate-800'
                              }`}
                            >
                              <div className="pt-0.5 shrink-0">
                                {it.done ? (
                                  <div className="w-3.5 h-3.5 rounded bg-emerald-600 text-white flex items-center justify-center">
                                    <Check className="w-2.5 h-2.5 stroke-[3]" />
                                  </div>
                                ) : (
                                  <div className="w-3.5 h-3.5 rounded border border-slate-400" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="leading-snug">{it.text}</p>
                                {it.done && it.completed_by && (
                                  <span className="text-xs text-emerald-700 block mt-0.5 no-underline">
                                    ✓ {it.completed_by.split(' ')[0]}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Inline add item */}
                        <div className="p-2 bg-slate-50/80 border-t border-slate-100 flex items-center space-x-1.5">
                          <input
                            type="text"
                            placeholder="+ Punkt ergänzen..."
                            value={newInlineItem[c.id] || ''}
                            onChange={(e) => setNewInlineItem({ ...newInlineItem, [c.id]: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                handleMobileAddInlineItem(c.id);
                              }
                            }}
                            className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-800 outline-none"
                          />
                          <button
                            onClick={() => handleMobileAddInlineItem(c.id)}
                            disabled={!newInlineItem[c.id]?.trim()}
                            className="px-2 py-1 bg-slate-800 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}

            {/* TAB 3: SWAP & VACATION */}
            {activeTab === 'SWAP' && (
              <div className="space-y-3.5">
                {/* 1. Krankmeldung einreichen (Akut) */}
                <div className="bg-rose-50/70 rounded-2xl p-4 border border-rose-200">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-bold text-xs text-rose-950 flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      <span>Krankmeldung einreichen (Akut)</span>
                    </h4>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-rose-200 text-rose-900">
                      Sofort-Meldung
                    </span>
                  </div>
                  <p className="text-xs text-rose-800 mb-3 leading-relaxed">
                    Meldet dich unverzüglich bei der Leitung ab. Löst bei der Einrichtungsleitung sofort eine Benachrichtigung aus (gemäß der Leitungs-Einstellung: Notfall-Alarm oder Standard-Info).
                  </p>

                  {sickSuccessMsg && (
                    <div className="p-2 mb-3 bg-white border border-rose-300 text-rose-900 text-xs rounded-xl font-medium">
                      ✓ {sickSuccessMsg}
                    </div>
                  )}

                  <button
                    onClick={handleSendSickNotice}
                    disabled={sickSubmitting}
                    className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold text-xs rounded-xl transition-all active:scale-95 flex items-center justify-center space-x-1.5 cursor-pointer"
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>{sickSubmitting ? 'Wird übertragen...' : 'Krankmeldung für heute abschicken'}</span>
                  </button>
                </div>

                <div className="bg-white rounded-2xl p-4 border border-slate-200">
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

                <div className="bg-white rounded-2xl p-4 border border-slate-200">
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

                {/* 3. Wunschdienst einreichen (Competitor Best Practice) */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
                  <h4 className="font-bold text-xs text-slate-900 mb-2 flex items-center space-x-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                    <span>Wunschdienst / Verfügbarkeit hinterlegen</span>
                  </h4>

                  {wishSuccessMsg && (
                    <div className="p-2 mb-2 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-lg font-medium">
                      ✓ {wishSuccessMsg}
                    </div>
                  )}

                  <form onSubmit={handleSendWish} className="space-y-2.5">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-xs text-slate-500 mb-0.5">Datum</label>
                        <input
                          type="date"
                          value={wishDate}
                          onChange={(e) => setWishDate(e.target.value)}
                          className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-500 mb-0.5">Schichtwunsch</label>
                        <select
                          value={wishType}
                          onChange={(e) => setWishType(e.target.value as any)}
                          className="w-full text-xs p-2 border border-slate-300 rounded-xl bg-white"
                        >
                          <option value="WUNSCH_FRUEH">Frühdienst (ab 07:00)</option>
                          <option value="WUNSCH_SPAET">Spätdienst (bis 17:00)</option>
                          <option value="WUNSCH_FREI">Wunschfrei / Zeitausgleich</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <input
                        type="text"
                        placeholder="Begründung (z.B. Arzttermin, Fortbildung...)"
                        value={wishNote}
                        onChange={(e) => setWishNote(e.target.value)}
                        className="w-full text-xs p-2 border border-slate-300 rounded-xl"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs rounded-xl transition-all active:scale-95"
                    >
                      Schichtwunsch für Leitung hinterlegen
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
                  <p className="text-xs text-indigo-700 mt-1">
                    Hier siehst du alle Schichtanpassungen, Überstundengutschriften und Vertragsänderungen der Leitung.
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
                        className="p-3 bg-white rounded-2xl border border-slate-200 text-xs space-y-1"
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span className="text-indigo-950 font-bold">{log.title}</span>
                          <span className="text-xs text-slate-400 font-normal">
                            {new Date(log.created_at).toLocaleDateString('de-DE')}
                          </span>
                        </div>
                        <p className="text-slate-600 text-xs">{log.description}</p>
                        <div className="text-xs text-slate-400 font-medium pt-0.5">
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
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-400">WOCHENSTUNDEN</div>
                    <div className="text-xl font-semibold text-emerald-600 mt-1">
                      {currentUser?.weekly_hours}h
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      {currentUser?.standard_work_hours ? `Regulär: ${currentUser.standard_work_hours}` : 'Flexibel nach Dienstplan'}
                    </div>
                  </div>
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-400">RESTURLAUB 2026</div>
                    <div className="text-xl font-semibold text-slate-900 mt-1">
                      {staffStats?.remaining_vacation_days ?? '–'} Tage
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      von {staffStats?.total_vacation_days ?? '–'} Tagen gesamt
                    </div>
                  </div>
                </div>

                {/* Verfügbarkeitsrahmen */}
                {currentUser?.availability_window && (
                  <div className="bg-white p-3.5 rounded-2xl border border-slate-200">
                    <div className="text-xs font-bold text-slate-400">MEIN VERFÜGBARKEITSRAHMEN</div>
                    <div className="text-xs font-semibold text-slate-800 mt-1">
                      {currentUser.availability_window}
                    </div>
                    <div className="text-xs text-slate-400 mt-0.5">
                      Wird von der Leitung bei der Schichteinteilung berücksichtigt
                    </div>
                  </div>
                )}

                {/* Account & Login (admin / admin) */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                      <Key className="w-4 h-4 text-emerald-600" />
                      <span>Login & Zugangsdaten</span>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800">
                      admin / admin
                    </span>
                  </div>
                  <div className="text-xs text-slate-600 mb-2">
                    Benutzer: <strong className="font-mono text-slate-800">{currentUser?.username || 'admin'}</strong> • Status: <span className="text-emerald-700 font-semibold">{currentUser?.password_changed ? 'Individuelles Passwort' : 'Standard (admin / admin)'}</span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 text-xs text-slate-500">
                    Accounts werden über die Leitungs-Seite eingerichtet und starten standardmäßig mit <strong className="font-mono text-slate-700">admin / admin</strong>.
                  </div>
                </div>

                {/* Kritische Benachrichtigungen (Alarm-Modus) */}
                <div className="bg-white rounded-2xl p-3.5 border border-slate-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-slate-900">
                      <Bell className="w-4 h-4 text-emerald-600" />
                      <span>Kritische Benachrichtigungen</span>
                    </div>
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      userAlertsMode === 'CRITICAL' ? 'bg-rose-100 text-rose-800 border border-rose-300' : 'bg-slate-100 text-slate-700'
                    }`}>
                      {userAlertsMode === 'CRITICAL' ? 'Kritisch (Alarm)' : 'Einfach (Info)'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 mb-2.5 leading-relaxed">
                    Entscheide selbst, wie spontane Einspring-Anfragen bei Personalausfall bei dir signalisiert werden:
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => handleToggleUserAlertsMode('CRITICAL')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        userAlertsMode === 'CRITICAL'
                          ? 'bg-rose-50 border-rose-400 text-rose-950 ring-1 ring-rose-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center space-x-1">
                        <span>Kritisch</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                        Notfall-Alarm & rotes Banner
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleToggleUserAlertsMode('SIMPLE')}
                      className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                        userAlertsMode === 'SIMPLE'
                          ? 'bg-emerald-50 border-emerald-400 text-emerald-950 ring-1 ring-emerald-400'
                          : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <div className="font-bold text-xs flex items-center space-x-1">
                        <span>Einfach</span>
                      </div>
                      <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                        Standard-Nachricht ohne Alarm
                      </div>
                    </button>
                  </div>
                </div>

                {/* Pinnwand */}
                <div className="bg-white rounded-2xl p-4 border border-slate-200">
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
                        <div className="text-xs text-slate-400 mt-1.5 flex justify-between">
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
