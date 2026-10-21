import React, { useState, useEffect } from 'react';
import { Staff, Group, Shift, RatioStatusGroup, Approval } from './types';
import { Header } from './components/Header';
import { RatioRadar } from './components/RatioRadar';
import { ApprovalCenter } from './components/ApprovalCenter';
import { ShiftPlanner } from './components/ShiftPlanner';
import { OvertimeTracker } from './components/OvertimeTracker';
import { StaffManagement } from './components/StaffManagement';
import { MobileAppView } from './components/MobileAppView';
import { KioskView } from './components/KioskView';
import { EmergencyModal } from './components/EmergencyModal';
import { DatevExportModal } from './components/DatevExportModal';
import { format, startOfWeek, addDays } from 'date-fns';
import { 
  Check, 
  BarChart3, 
  CalendarDays, 
  Clock, 
  Users, 
  ShieldCheck, 
  Sparkles 
} from 'lucide-react';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'LEITUNG' | 'MOBILE' | 'KIOSK'>('LEITUNG');
  const [leitungTab, setLeitungTab] = useState<'DASHBOARD' | 'ROSTER' | 'OVERTIME' | 'STAFF'>('DASHBOARD');
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [ratioStatus, setRatioStatus] = useState<RatioStatusGroup[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [approvals, setApprovals] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [emergencyOpen, setEmergencyOpen] = useState(false);
  const [datevOpen, setDatevOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const loadAllData = async () => {
    try {
      const todayStr = format(currentDate, 'yyyy-MM-dd');
      const weekStart = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const weekEnd = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');

      const [staffRes, groupsRes, ratioRes, shiftsRes, approvalsRes] = await Promise.all([
        fetch('/api/staff'),
        fetch('/api/groups'),
        fetch(`/api/ratio-status?date=${todayStr}`),
        fetch(`/api/shifts?start=${weekStart}&end=${weekEnd}`),
        fetch('/api/approvals')
      ]);

      setStaffList(await staffRes.json());
      setGroups(await groupsRes.json());
      const ratioJson = await ratioRes.json();
      setRatioStatus(ratioJson.groups || []);
      setShifts(await shiftsRes.json());
      setApprovals(await approvalsRes.json());
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, [currentDate]);

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

  // Stamp time
  const handleStamp = async (staff_id: string, action: 'CLOCK_IN' | 'BREAK' | 'CLOCK_OUT', pin?: string) => {
    const res = await fetch('/api/timelogs/stamp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id, action, pin })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error || 'Fehler beim Stempeln');
    showToast(json.message);
    await loadAllData();
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
  const handleTriggerEmergency = async (staff_id: string, days: number, reason: string) => {
    const res = await fetch('/api/emergency/trigger-sick', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ staff_id, days, reason })
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.error);
    showToast('🚨 Krankmeldung erfasst. Notfall-Vorschlag liegt im Freigabe-Center!');
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
      alert(json.warning);
    }
    showToast('Schicht erfolgreich eingestellt & Mitarbeiterin benachrichtigt!');
    await loadAllData();
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
        onOpenDatev={() => setDatevOpen(true)}
        criticalRatioAlert={criticalRatioAlert}
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
                    <span>Übersicht & Live-Radar</span>
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
                    <span>Schichtplanung</span>
                  </button>

                  <button
                    onClick={() => setLeitungTab('OVERTIME')}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                      leitungTab === 'OVERTIME'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Clock className="w-4 h-4" />
                    <span>Überstunden-Tracking</span>
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
                    <span>Personal- & Accounts</span>
                  </button>
                </div>

                {/* Sub-view 1: DASHBOARD & LIVE-RADAR */}
                {leitungTab === 'DASHBOARD' && (
                  <>
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
                    onDeleteShift={handleDeleteShift}
                  />
                )}

                {/* Sub-view 3: ÜBERSTUNDEN-TRACKING */}
                {leitungTab === 'OVERTIME' && (
                  <OvertimeTracker
                    staffList={staffList}
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
              </div>
            )}

            {/* VIEW 2: MITARBEITER-APP */}
            {currentView === 'MOBILE' && (
              <MobileAppView
                staffList={staffList}
                shifts={shifts}
                approvals={approvals}
                onStamp={handleStamp}
                onRequestSwap={handleRequestSwap}
                onRequestVacation={handleRequestVacation}
              />
            )}

            {/* VIEW 3: KIOSK (Eingangs-Terminal Tablet) */}
            {currentView === 'KIOSK' && (
              <KioskView
                staffList={staffList}
                onStamp={handleStamp}
              />
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

      {/* DATEV Export Modal */}
      <DatevExportModal
        isOpen={datevOpen}
        onClose={() => setDatevOpen(false)}
      />
    </div>
  );
};
