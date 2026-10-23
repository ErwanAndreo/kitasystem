import React, { useState, useEffect } from 'react';
import { Staff, Group, Shift, RatioStatusGroup, Approval, AutopilotProposal, NotificationQueueItem, SystemSettings } from './types';
import { Header } from './components/Header';
import { RatioRadar } from './components/RatioRadar';
import { ApprovalCenter } from './components/ApprovalCenter';
import { ShiftPlanner } from './components/ShiftPlanner';
import { GroupManagement } from './components/GroupManagement';
import { StaffManagement } from './components/StaffManagement';
import { DirectorNotebook } from './components/DirectorNotebook';
import { ChecklistManagement } from './components/ChecklistManagement';
import { ChildrenManagement } from './components/ChildrenManagement';
import { TabletKioskView } from './components/TabletKioskView';
import { RatioSettingsView } from './components/RatioSettingsView';
import { ParentInitiativeManagement } from './components/ParentInitiativeManagement';
import { ParentPortalView } from './components/ParentPortalView';
import { FinanceAndWaitlistView } from './components/FinanceAndWaitlistView';
import { AutopilotWidget } from './components/AutopilotWidget';
import { EinspringKaskadeWidget } from './components/EinspringKaskadeWidget';
import { MobileAppView } from './components/MobileAppView';
import { EmergencyModal } from './components/EmergencyModal';
import { useLanguage } from './i18n';
import { format, startOfWeek, addDays } from 'date-fns';
import { 
  Check, 
  BarChart3, 
  CalendarDays, 
  Layers, 
  Users, 
  ShieldCheck, 
  Sparkles, 
  BookOpen, 
  CheckSquare, 
  AlertTriangle, 
  X, 
  Info, 
  ShieldAlert, 
  Baby, 
  Sliders,
  Building2,
  Landmark
} from 'lucide-react';

export const App: React.FC = () => {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<'LEITUNG' | 'MOBILE' | 'TABLET' | 'ELTERN'>('LEITUNG');
  const [leitungTab, setLeitungTab] = useState<'DASHBOARD' | 'ROSTER' | 'CHILDREN' | 'GROUPS' | 'STAFF' | 'NOTEBOOK' | 'CHECKLISTS' | 'RATIO_SETTINGS' | 'INITIATIVE' | 'FINANCE_WAITLIST'>('DASHBOARD');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [ratioStatus, setRatioStatus] = useState<RatioStatusGroup[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [autopilotEnabled, setAutopilotEnabled] = useState(true);
  const [proposals, setProposals] = useState<AutopilotProposal[]>([]);
  const [queueItems, setQueueItems] = useState<NotificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals & Critical Alerts
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [directorCriticalAlerts, setDirectorCriticalAlerts] = useState<any[]>([]);
  const [directorAlertsMode, setDirectorAlertsMode] = useState<'CRITICAL' | 'SIMPLE'>('CRITICAL');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleDismissCriticalAlert = async (alertId: string) => {
    try {
      await fetch(`/api/staff/s_sabine/critical-alerts/${alertId}/dismiss`, { method: 'POST' });
      setDirectorCriticalAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (e) {
      console.error(e);
    }
  };

  const loadAllData = async () => {
    try {
      const todayStr = format(currentDate, 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');

      const [staffRes, groupsRes, ratioRes, shiftsRes, approvalsRes, settingsRes, proposalsRes, queueRes, alertsRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/groups'),
        fetch(`/api/ratio-status?date=${todayStr}`),
        fetch(`/api/shifts?start=${weekStart}&end=${weekEnd}`),
        fetch('/api/approvals'),
        fetch('/api/settings'),
        fetch('/api/autopilot/proposals'),
        fetch('/api/notifications/queue'),
        fetch('/api/staff/s_sabine/critical-alerts')
      ]);

      setStaffList(await staffRes.json());
      setGroups(await groupsRes.json());
      const ratioJson = await ratioRes.json();
      setRatioStatus(ratioJson.groups || []);
      setShifts(await shiftsRes.json());
      setApprovals(await approvalsRes.json());

      const settingsJson = await settingsRes.json();
      setAutopilotEnabled(settingsJson.autopilot_enabled !== false);
      setProposals(await proposalsRes.json());
      setQueueItems(await queueRes.json());

      if (alertsRes.ok) {
        const alertsData = await alertsRes.json();
        setDirectorCriticalAlerts(alertsData.alerts || []);
        if (alertsData.critical_alerts_mode) {
          setDirectorAlertsMode(alertsData.critical_alerts_mode);
        }
      }
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    // Poll every 10s for queue & auto-pilot updates
    const interval = setInterval(loadAllData, 10000);
    return () => clearInterval(interval);
  }, [currentDate]);

  // Auto-Pilot Toggle
  const handleToggleAutopilot = async () => {
    try {
      const nextState = !autopilotEnabled;
      setAutopilotEnabled(nextState);
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ autopilot_enabled: nextState })
      });
      if (res.ok) {
        showToast(nextState ? '🤖 Auto-Pilot aktiviert: Schichtpläne werden bei Bedarf automatisch vorbereitet!' : 'Auto-Pilot pausiert.');
        await loadAllData();
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Auto-Pilot Accept Proposal
  const handleAcceptProposal = async (id: string) => {
    try {
      const res = await fetch(`/api/autopilot/proposals/${id}/accept`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Fehler beim Akzeptieren');
      showToast(json.message);
      await loadAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Auto-Pilot Dismiss Proposal
  const handleDismissProposal = async (id: string) => {
    try {
      await fetch(`/api/autopilot/proposals/${id}/dismiss`, { method: 'POST' });
      showToast('Vorschlag verworfen.');
      await loadAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Immediate Flush of 30-min Notification Queue
  const handleFlushQueue = async () => {
    try {
      const res = await fetch('/api/notifications/queue/flush', { method: 'POST' });
      const json = await res.json();
      showToast(json.message);
      await loadAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Trigger Manual Auto-Pilot Analysis
  const handleTriggerAnalysis = async () => {
    try {
      const res = await fetch('/api/autopilot/analyze', { method: 'POST' });
      const json = await res.json();
      showToast(json.proposals_generated > 0 
        ? `🤖 ${json.proposals_generated} Auto-Pilot Vertretungsvorschläge generiert!` 
        : '✓ Dienstplan geprüft: Alle Gruppen sind optimal besetzt.');
      await loadAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Deciding an approval (Einrichtungsleitung freigeben)
  const handleDecideApproval = async (id: string, action: 'APPROVED' | 'REJECTED', note?: string) => {
    try {
      const res = await fetch(`/api/approvals/${id}/decide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          decision_note: note,
          decision_by: 'Sabine Weber (Einrichtungsleitung)'
        })
      });
      if (!res.ok) throw new Error('Entscheidung fehlgeschlagen');

      showToast(action === 'APPROVED' ? '✓ Antrag durch Leitung verbindlich freigegeben!' : '✗ Antrag abgelehnt.');
      await loadAllData();
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Mobile Shift Swap Request
  const handleRequestSwap = async (data: { requester_id: string; target_id: string; shift_id: string; note: string }) => {
    const res = await fetch('/api/approvals/request-swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Fehler beim Einreichen des Tauschs');
    showToast('Schichttausch eingereicht – wartet auf Freigabe der Leitung.');
    await loadAllData();
  };

  // Mobile Vacation Request
  const handleRequestVacation = async (data: { requester_id: string; start_date: string; end_date: string; reason: string }) => {
    const res = await fetch('/api/approvals/request-vacation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Fehler beim Urlaubsantrag');
    showToast('Urlaubsantrag übermittelt – wartet auf Freigabe der Leitung.');
    await loadAllData();
  };

  // Emergency Trigger
  const handleTriggerEmergency = async (staff_id: string, days: number, reason: string, substitute_id?: string) => {
    const res = await fetch('/api/emergency/trigger-sick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id, days, reason, substitute_id })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    showToast('🚨 Krankmeldung erfasst. Vertretungsvorschlag liegt im Freigabe-Center!');
    await loadAllData();
  };

  // Shift Management (Schichten vom Personal einstellen)
  const handleAddShift = async (data: any) => {
    const res = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    if (json.warning) {
      showToast(`⚠️ ArbZG-Hinweis erfasst: Schicht wurde autorisiert & eingetragen.`);
    } else {
      showToast('Schicht erfolgreich eingestellt & Mitarbeiterin benachrichtigt!');
    }
    await loadAllData();
    return json;
  };

  const handleUpdateShift = async (id: string, data: any) => {
    const res = await fetch(`/api/shifts/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    if (json.warning) {
      showToast(`⚠️ ArbZG-Hinweis erfasst: Schichtzeit wurde autorisiert & angepasst.`);
    } else {
      showToast('Schichtzeit erfolgreich angepasst!');
    }
    await loadAllData();
    return json;
  };

  const handleDeleteShift = async (id: string) => {
    await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
    showToast('Schicht gelöscht.');
    await loadAllData();
  };

  // Staff Account Management
  const handleAddStaff = async (newStaff: any) => {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStaff)
    });
    if (!res.ok) throw new Error('Fehler beim Anlegen');
    showToast('Mitarbeiter-Account erfolgreich erstellt!');
    await loadAllData();
  };

  const handleUpdateStaff = async (id: string, updated: any) => {
    const res = await fetch(`/api/staff/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated)
    });
    if (!res.ok) throw new Error('Fehler beim Aktualisieren');
    showToast('Vertrag & Wochenstunden angepasst!');
    await loadAllData();
  };

  const pendingApprovalsCount = approvals.filter(a => a.status === 'PENDING').length;
  const criticalRatioAlert = ratioStatus.some(g => g.status === 'CRITICAL');
  const criticalCertsCount = staffList.flatMap(s => s.certifications || []).filter(c => c.is_expired || c.expires_soon).length;

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-xl flex items-center space-x-2 text-xs font-semibold animate-slide-up border border-slate-700">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <Header
        currentView={currentView}
        setCurrentView={setCurrentView}
        pendingApprovalsCount={pendingApprovalsCount}
        onOpenEmergency={() => setEmergencyOpen(true)}
        criticalRatioAlert={criticalRatioAlert}
        autopilotEnabled={autopilotEnabled}
        onToggleAutopilot={handleToggleAutopilot}
        queuedNotificationsCount={queueItems.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
            <span>Daten werden geladen...</span>
          </div>
        ) : (
          <>
            {/* VIEW 1: PERSPEKTIVE DER EINRICHTUNGSLEITUNG (Windows / macOS / Web App) */}
            {currentView === 'LEITUNG' && (
              <div>
                {/* Kritische Warnungen & Krankmeldungen für die Leitung (je nach Einstellung kritisch oder einfach) */}
                {directorCriticalAlerts.length > 0 && (
                  <div className="mb-6 space-y-3">
                    {directorCriticalAlerts.map((alert) => {
                      const isCritical = directorAlertsMode === 'CRITICAL';
                      return isCritical ? (
                        <div
                          key={alert.id}
                          className="p-4 bg-rose-50 border-2 border-rose-500 rounded-2xl shadow-sm animate-pulse flex items-start justify-between"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="p-2 bg-rose-600 text-white rounded-xl shrink-0 mt-0.5">
                              <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <span className="text-xs font-black text-rose-950 uppercase tracking-wider">
                                  {alert.title}
                                </span>
                                <span className="text-[10px] bg-rose-200 text-rose-900 font-bold px-2 py-0.5 rounded-full">
                                  🚨 NOTFALL-ALARM
                                </span>
                              </div>
                              <p className="text-xs text-rose-900 font-medium mt-1 leading-relaxed">
                                {alert.description}
                              </p>
                              <div className="mt-2.5 flex items-center space-x-2">
                                <button
                                  onClick={() => {
                                    setLeitungTab('DASHBOARD');
                                    setEmergencyOpen(true);
                                  }}
                                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
                                >
                                  <ShieldAlert className="w-3.5 h-3.5" />
                                  <span>Notfall-Vertretung planen</span>
                                </button>
                                <button
                                  onClick={() => handleDismissCriticalAlert(alert.id)}
                                  className="px-3.5 py-1.5 bg-white border border-rose-300 text-rose-800 rounded-xl text-xs font-semibold hover:bg-rose-100 transition-colors"
                                >
                                  Als quittiert markieren
                                </button>
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDismissCriticalAlert(alert.id)}
                            className="text-rose-400 hover:text-rose-700 p-1"
                            title="Schließen"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div
                          key={alert.id}
                          className="p-3 bg-slate-50 border border-slate-300 rounded-2xl flex items-center justify-between text-xs text-slate-700 shadow-2xs"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <Info className="w-4 h-4 text-slate-500 shrink-0" />
                            <div className="truncate">
                              <span className="font-bold text-slate-900">{alert.title}</span>
                              <span className="text-slate-500 ml-1.5">— {alert.description}</span>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDismissCriticalAlert(alert.id)}
                            className="text-slate-500 hover:text-slate-800 text-xs font-semibold px-2.5 py-1 rounded-lg hover:bg-slate-200 transition-colors shrink-0"
                          >
                            Gelesen
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Leitung Navigation Tabs */}
                <div className="flex items-center space-x-2 mb-6 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs max-w-fit">
                  <button
                    onClick={() => setLeitungTab('DASHBOARD')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'DASHBOARD'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart3 className="w-4 h-4" />
                    <span>{t('tabs.dashboard')}</span>
                    {pendingApprovalsCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-amber-400 text-slate-900 font-black">
                        {pendingApprovalsCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setLeitungTab('ROSTER')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'ROSTER'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <CalendarDays className="w-4 h-4" />
                    <span>{t('tabs.roster')}</span>
                  </button>

                  <button
                    onClick={() => setLeitungTab('CHILDREN')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'CHILDREN'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Baby className="w-4 h-4" />
                    <span>Kinder & Familien</span>
                  </button>

                  <button
                    onClick={() => setLeitungTab('GROUPS')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'GROUPS'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    <span>{t('tabs.groups')}</span>
                  </button>

                  <button
                    onClick={() => setLeitungTab('STAFF')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'STAFF'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>{t('tabs.staff')}</span>
                    {criticalCertsCount > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-black" title={`${criticalCertsCount} Zertifikate fällig oder abgelaufen`}>
                        {criticalCertsCount}
                      </span>
                    )}
                  </button>

                  <button
                    onClick={() => setLeitungTab('NOTEBOOK')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'NOTEBOOK'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>{t('tabs.notebook')}</span>
                  </button>

                  <button
                    onClick={() => setLeitungTab('CHECKLISTS')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'CHECKLISTS'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <CheckSquare className="w-4 h-4" />
                    <span>{t('tabs.checklists')}</span>
                  </button>

                  <button
                    onClick={() => setLeitungTab('RATIO_SETTINGS')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'RATIO_SETTINGS'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    title="Ebene 3: Gesetzliche Betreuungsschlüssel & Jahres-Setup"
                  >
                    <Sliders className="w-4 h-4" />
                    <span>Schlüssel-Setup</span>
                  </button>

                  <button
                    onClick={() => setLeitungTab('INITIATIVE')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'INITIATIVE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    title="Trägerverein & Elterninitiative (LAGE.app Parität: Elterndienste, Vorstandswechsel, Umfragen, Verträge)"
                  >
                    <Building2 className="w-4 h-4" />
                    <span>Träger & Initiative</span>
                  </button>

                  <button
                    onClick={() => setLeitungTab('FINANCE_WAITLIST')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'FINANCE_WAITLIST'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    title="Modul E: Warteliste, SEPA-Abrechnung & Behördenstatistiken"
                  >
                    <Landmark className="w-4 h-4" />
                    <span>Finanzen & Warteliste</span>
                  </button>
                </div>

                {/* Sub-view 1: DASHBOARD & LIVE-RADAR */}
                {leitungTab === 'DASHBOARD' && (
                  <>
                    <AutopilotWidget
                      proposals={proposals}
                      queueItems={queueItems}
                      autopilotEnabled={autopilotEnabled}
                      onAcceptProposal={handleAcceptProposal}
                      onDismissProposal={handleDismissProposal}
                      onFlushQueue={handleFlushQueue}
                      onTriggerAnalysis={handleTriggerAnalysis}
                    />
                    <EinspringKaskadeWidget
                      staffList={staffList}
                      onRefreshData={loadAllData}
                    />
                    <RatioRadar
                      groupsStatus={ratioStatus}
                      date={format(currentDate, 'EEEE, dd.MM.yyyy')}
                    />
                    <ApprovalCenter
                      approvals={approvals}
                      onDecide={handleDecideApproval}
                      onRefresh={loadAllData}
                    />
                  </>
                )}

                {/* Sub-view 2: SCHICHTPLANUNG */}
                {leitungTab === 'ROSTER' && (
                  <ShiftPlanner
                    shifts={shifts}
                    staff={staffList}
                    groups={groups}
                    currentDate={currentDate}
                    setCurrentDate={setCurrentDate}
                    onAddShift={handleAddShift}
                    onUpdateShift={handleUpdateShift}
                    onDeleteShift={handleDeleteShift}
                  />
                )}

                {/* Sub-view 2b: KINDER- & STAMMDATENVERWALTUNG */}
                {leitungTab === 'CHILDREN' && (
                  <ChildrenManagement
                    groups={groups}
                    showToast={showToast}
                  />
                )}

                {/* Sub-view 3: GRUPPEN & SCHLÜSSEL-RICHTLINIEN */}
                {leitungTab === 'GROUPS' && (
                  <GroupManagement
                    groups={groups}
                    onRefresh={loadAllData}
                  />
                )}

                {/* Sub-view 4: PERSONAL & ACCOUNTS */}
                {leitungTab === 'STAFF' && (
                  <StaffManagement
                    staffList={staffList}
                    groups={groups}
                    onAddStaff={handleAddStaff}
                    onUpdateStaff={handleUpdateStaff}
                    onRefresh={loadAllData}
                  />
                )}

                {/* Sub-view 5: LEITUNGS-NOTIZBUCH (ONENOTE STYLE) */}
                {leitungTab === 'NOTEBOOK' && (
                  <DirectorNotebook />
                )}

                {/* Sub-view 6: CHECKLISTEN & STANDARDS */}
                {leitungTab === 'CHECKLISTS' && (
                  <ChecklistManagement staffList={staffList} />
                )}

                {/* Sub-view 7: BETREUUNGSSCHLÜSSEL-JAHRES-SETUP (EBENE 3) */}
                {leitungTab === 'RATIO_SETTINGS' && (
                  <RatioSettingsView showToast={showToast} />
                )}

                {/* Sub-view 8: TRÄGERVEREIN & ELTERNINITIATIVE (LAGE.app Parität) */}
                {leitungTab === 'INITIATIVE' && (
                  <ParentInitiativeManagement showToast={showToast} />
                )}

                {/* Sub-view 9: VERWALTUNG, FINANZEN & WARTELISTE (MODUL E) */}
                {leitungTab === 'FINANCE_WAITLIST' && (
                  <FinanceAndWaitlistView showToast={showToast} />
                )}
              </div>
            )}

            {/* VIEW 2: MITARBEITER-APP */}
            {currentView === 'MOBILE' && (
              <MobileAppView
                staffList={staffList}
                shifts={shifts}
                approvals={approvals}
                onRequestSwap={handleRequestSwap}
                onRequestVacation={handleRequestVacation}
              />
            )}

            {/* VIEW 3: GRUPPEN-TABLET KIOSK (iPad / Android Tablet) */}
            {currentView === 'TABLET' && (
              <TabletKioskView
                groups={groups}
                showToast={showToast}
              />
            )}

            {/* VIEW 4: ELTERN-PORTAL & ELTERN-APP (Web + Mobile) */}
            {currentView === 'ELTERN' && (
              <ParentPortalView showToast={showToast} />
            )}
          </>
        )}
      </main>

      {/* Emergency Crisis Modal */}
      <EmergencyModal
        isOpen={emergencyOpen}
        onClose={() => setEmergencyOpen(false)}
        staffList={staffList}
        onTriggerEmergency={handleTriggerEmergency}
      />
    </div>
  );
};
