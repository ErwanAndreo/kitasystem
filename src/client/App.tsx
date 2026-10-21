import React, { useState, useEffect } from 'react';
import { Staff, Group, Shift, RatioStatusGroup, Approval } from './types';
import { Header } from './components/Header';
import { RatioRadar } from './components/RatioRadar';
import { ApprovalCenter } from './components/ApprovalCenter';
import { ShiftPlanner } from './components/ShiftPlanner';
import { MobileAppView } from './components/MobileAppView';
import { KioskView } from './components/KioskView';
import { StaffManagement } from './components/StaffManagement';
import { EmergencyModal } from './components/EmergencyModal';
import { DatevExportModal } from './components/DatevExportModal';
import { format, startOfWeek, addDays } from 'date-fns';
import { Sparkles, Check, AlertTriangle } from 'lucide-react';

export const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<'LEITUNG' | 'MOBILE' | 'KIOSK'>('LEITUNG');
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

  // Deciding an approval (The core requirement: Einrichtungsleitung freigeben)
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

  // Shift Management
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
    showToast('Schicht erfolgreich geplant!');
    await loadAllData();
  };

  const handleDeleteShift = async (id: string) => {
    await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
    showToast('Schicht entfernt.');
    await loadAllData();
  };

  // Add staff
  const handleAddStaff = async (newStaff: any) => {
    const res = await fetch('/api/staff', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newStaff)
    });
    if (!res.ok) throw new Error('Fehler beim Anlegen');
    showToast('Mitarbeiter:in erfolgreich angelegt!');
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
            {/* VIEW 1: LEITUNG (Windows & Web Cockpit) */}
            {currentView === 'LEITUNG' && (
              <div>
                {/* 1. Live Betreuungsschlüssel Radar */}
                <RatioRadar
                  groupsStatus={ratioStatus}
                  date={format(currentDate, 'EEEE, dd.MM.yyyy')}
                />

                {/* 2. Freigabe-Center der Einrichtungsleitung */}
                <ApprovalCenter
                  approvals={approvals}
                  onDecide={handleDecideApproval}
                  onRefresh={loadAllData}
                />

                {/* 3. Wochendienstplaner */}
                <ShiftPlanner
                  shifts={shifts}
                  staff={staffList}
                  groups={groups}
                  currentDate={currentDate}
                  setCurrentDate={setCurrentDate}
                  onAddShift={handleAddShift}
                  onDeleteShift={handleDeleteShift}
                />

                {/* 4. Mitarbeiter- & Qualifikationsverwaltung */}
                <StaffManagement
                  staffList={staffList}
                  groups={groups}
                  onAddStaff={handleAddStaff}
                />
              </div>
            )}

            {/* VIEW 2: MITARBEITER APP (Mobile Smartphone View) */}
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
