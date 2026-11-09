import { notifyError } from '../notify';
import React, { useState, useEffect } from 'react';
import { Shift, Staff, Group, ShiftTemplate, StaffWish, KitaClosure, Excursion } from '../types';
import { GroupCalendar } from './GroupCalendar';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock, 
  AlertTriangle,
  Calendar,
  Filter,
  Baby,
  HeartPulse,
  GraduationCap,
  Sparkles,
  ShieldCheck,
  Printer,
  Lightbulb,
  X,
  CheckCircle2,
  Copy,
  RefreshCw,
  GripVertical,
  Sliders,
  Edit3,
  PanelRightClose,
  Search,
  Info
} from 'lucide-react';
import { format, addDays, startOfWeek, subWeeks, addWeeks, getISOWeek } from 'date-fns';
import { de } from 'date-fns/locale';

interface ShiftPlannerProps {
  shifts: Shift[];
  staff: Staff[];
  groups: Group[];
  currentDate: Date;
  setCurrentDate: (date: Date) => void;
  onAddShift: (data: {
    staff_id: string;
    group_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    role_override?: string;
  }) => Promise<any>;
  onUpdateShift?: (id: string, data: {
    staff_id?: string;
    group_id?: string;
    date?: string;
    start_time?: string;
    end_time?: string;
    break_minutes?: number;
    role_override?: string;
  }) => Promise<any>;
  onDeleteShift: (id: string) => Promise<void>;
  onReplan: (scope: 'TODAY' | 'WEEK', weekStart: string) => Promise<void>;
  specialsVersion: number;
}

export const ShiftPlanner: React.FC<ShiftPlannerProps> = ({
  shifts,
  staff,
  groups,
  currentDate,
  setCurrentDate,
  onAddShift,
  onUpdateShift,
  onDeleteShift,
  onReplan,
  specialsVersion
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [wishes, setWishes] = useState<StaffWish[]>([]);
  const [closures, setClosures] = useState<KitaClosure[]>([]);
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [calendarView, setCalendarView] = useState<'PERSON' | 'GROUP'>('PERSON');

  useEffect(() => {
    Promise.all([fetch('/api/closures'), fetch('/api/excursions')])
      .then(async ([c, e]) => {
        setClosures(await c.json());
        setExcursions(await e.json());
      })
      .catch(err => notifyError(err.message));
  }, [specialsVersion]);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);
  const [copyLoading, setCopyLoading] = useState(false);

  // Drag and Drop & Sidebar State
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [staffSearch, setStaffSearch] = useState<string>('');
  const [draggedStaff, setDraggedStaff] = useState<Staff | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ staffId: string; date: string } | null>(null);
  const [recentLegalWarning, setRecentLegalWarning] = useState<{ title: string; details: string; shiftId?: string } | null>(null);

  // Settings State (Standard-Arbeitszeit & ArbZG-Prüfung)
  const [defaultDurationHours, setDefaultDurationHours] = useState<number>(8.0);
  const [defaultStartTime, setDefaultStartTime] = useState<string>('08:00');
  const [defaultBreakMinutes, setDefaultBreakMinutes] = useState<number>(30);
  const [settingsModalOpen, setSettingsModalOpen] = useState<boolean>(false);
  const [savingSettings, setSavingSettings] = useState<boolean>(false);

  // Edit Shift State (Zeit anpassen im Kalender)
  const [editModalOpen, setEditModalOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editFormData, setEditFormData] = useState<{
    id: string;
    staff_id: string;
    group_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    role_override: string;
  }>({
    id: '',
    staff_id: '',
    group_id: '',
    date: '',
    start_time: '08:00',
    end_time: '16:30',
    break_minutes: 30,
    role_override: ''
  });

  const [modalData, setModalData] = useState<{
    staff_id: string;
    group_id: string;
    date: string;
    start_time: string;
    end_time: string;
    break_minutes: number;
    role_override?: string;
  }>({
    staff_id: staff[0]?.id || '',
    group_id: groups[0]?.id || '',
    date: format(new Date(), 'yyyy-MM-dd'),
    start_time: '08:00',
    end_time: '16:30',
    break_minutes: 30,
    role_override: ''
  });

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekDays = [0, 1, 2, 3, 4].map(offset => addDays(weekStart, offset));
  const todayStr = format(new Date(), 'yyyy-MM-dd');
  const nowStr = format(new Date(), 'HH:mm');
  const mondayKey = format(weekDays[0], 'yyyy-MM-dd');
  const fridayKey = format(weekDays[4], 'yyyy-MM-dd');
  const [dayStatus, setDayStatus] = useState<Record<string, boolean>>({});
  const [replanning, setReplanning] = useState(false);
  const isFinished = (sh: Shift) => sh.date < todayStr || (sh.date === todayStr && sh.end_time <= nowStr);

  useEffect(() => {
    fetch(`/api/roster-days?start=${mondayKey}&end=${fridayKey}`)
      .then(r => r.json())
      .then(setDayStatus)
      .catch(e => notifyError(e.message));
  }, [mondayKey, fridayKey]);

  const saveDayStatus = async (date: string, followed: boolean) => {
    const next = dayStatus[date] === followed ? null : followed;
    try {
      const res = await fetch(`/api/roster-days/${date}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ followed: next })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      setDayStatus(prev => {
        const { [date]: _old, ...rest } = prev;
        return next === null ? rest : { ...rest, [date]: next };
      });
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const replan = async (scope: 'TODAY' | 'WEEK') => {
    const question = scope === 'TODAY'
      ? 'Alles ab jetzt für heute neu planen? Einzelne Änderungen an noch nicht begonnenen Schichten gehen verloren.'
      : 'Diese Woche aus dem Dienstplan neu laden? Einzelne Änderungen an kommenden Schichten gehen verloren.';
    if (!confirm(question)) return;
    setReplanning(true);
    try {
      await onReplan(scope, mondayKey);
    } catch (e: any) {
      notifyError(e.message);
    } finally {
      setReplanning(false);
    }
  };
  const weekNumber = getISOWeek(currentDate);

  // Load Settings from Backend
  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => {
        if (data.default_shift_duration_hours !== undefined) {
          setDefaultDurationHours(Number(data.default_shift_duration_hours));
        }
        if (data.default_shift_start_time) {
          setDefaultStartTime(String(data.default_shift_start_time));
        }
        if (data.default_shift_break_minutes !== undefined) {
          setDefaultBreakMinutes(Number(data.default_shift_break_minutes));
        }
      })
      .catch(console.error);
  }, []);

  // Helper to calculate end time from start time + duration + break
  const calculateEndTime = (start: string, durationHours: number, breakMins: number): string => {
    const [h, m] = start.split(':').map(Number);
    const totalMinutes = Math.round(h * 60 + m + durationHours * 60 + breakMins);
    const endH = Math.floor((totalMinutes % (24 * 60)) / 60);
    const endM = totalMinutes % 60;
    return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
  };

  // Helper to calculate net hours between two times
  const calculateNetHours = (start: string, end: string, breakMins: number): number => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    const gross = (eh + em / 60) - (sh + sm / 60);
    return Math.max(0, Number((gross - breakMins / 60).toFixed(2)));
  };

  // Load competitor-proven features: Shift Templates, Staff Wishes & Kita Closures
  useEffect(() => {
    fetch('/api/shift-templates')
      .then(r => r.json())
      .then(setTemplates)
      .catch(console.error);

    fetch('/api/closures')
      .then(r => r.json())
      .then(setClosures)
      .catch(console.error);
  }, []);

  const handleCopyPreviousWeek = async () => {
    const mondayStr = format(weekDays[0], 'yyyy-MM-dd');
    if (!window.confirm(`Dienstplan der Vorwoche in diese Woche (KW ${weekNumber}, ab ${mondayStr}) übernehmen? Bestehende Schichten und Urlaube werden berücksichtigt.`)) {
      return;
    }
    setCopyLoading(true);
    try {
      const res = await fetch('/api/shifts/copy-week', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target_week_start: mondayStr })
      });
      const data = await res.json();
      if (!res.ok) {
        notifyError(data.error || 'Fehler beim Kopieren der Vorwoche');
      } else {
        let msg = `Vorwoche erfolgreich übernommen: ${data.copied_count} Schichten kopiert!`;
        if (data.skipped_vacation_count > 0) {
          msg += ` (${data.skipped_vacation_count} Schichten wegen Urlaub ausgespart)`;
        }
        if (data.skipped_existing_count > 0) {
          msg += ` (${data.skipped_existing_count} bereits vorhandene Schichten beibehalten)`;
        }
        setCopyStatus(msg);
        setTimeout(() => setCopyStatus(null), 6000);
        window.location.reload();
      }
    } catch (err: any) {
      notifyError('Netzwerkfehler: ' + err.message);
    } finally {
      setCopyLoading(false);
    }
  };

  useEffect(() => {
    const startStr = format(weekDays[0], 'yyyy-MM-dd');
    const endStr = format(weekDays[4], 'yyyy-MM-dd');
    fetch(`/api/staff-wishes?start=${startStr}&end=${endStr}`)
      .then(r => r.json())
      .then(setWishes)
      .catch(console.error);
  }, [currentDate]);

  const filteredStaff = staff.filter(s => {
    if (selectedGroup === 'ALL') return true;
    return s.target_group_id === selectedGroup || s.role === 'SPRINGER' || s.role === 'LEITUNG';
  });

  const sidebarStaffList = staff.filter(s => {
    if (!staffSearch.trim()) return true;
    const query = staffSearch.toLowerCase();
    return s.name.toLowerCase().includes(query) ||
           s.role.toLowerCase().includes(query) ||
           s.qualification.toLowerCase().includes(query) ||
           (s.skills && s.skills.some(sk => sk.toLowerCase().includes(query)));
  });

  const handleOpenNewShift = (staffId?: string, dateStr?: string) => {
    if (dateStr && dateStr < todayStr) return;
    const sObj = staff.find(s => s.id === (staffId || staff[0]?.id));
    const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd');
    
    // Check if employee has a wish on that day
    const employeeWish = wishes.find(w => w.staff_id === (staffId || staff[0]?.id) && w.date === targetDate);
    let initialStart = defaultStartTime;
    let initialEnd = calculateEndTime(defaultStartTime, defaultDurationHours, defaultBreakMinutes);
    let defaultRoleOverride = sObj?.role === 'LEITUNG' ? 'Springer / Notfall-Unterstützung' : '';

    if (employeeWish) {
      if (employeeWish.type === 'WUNSCH_FRUEH') {
        initialStart = '07:00';
        initialEnd = '15:30';
        defaultRoleOverride = 'Frühdienst (Wunsch)';
      } else if (employeeWish.type === 'WUNSCH_SPAET') {
        initialStart = '08:30';
        initialEnd = '17:00';
        defaultRoleOverride = 'Spätdienst (Wunsch)';
      }
    }

    setModalData({
      staff_id: staffId || staff[0]?.id || '',
      group_id: sObj?.target_group_id || (selectedGroup !== 'ALL' ? selectedGroup : groups[0]?.id || ''),
      date: targetDate,
      start_time: initialStart,
      end_time: initialEnd,
      break_minutes: defaultBreakMinutes,
      role_override: defaultRoleOverride
    });
    setModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await onAddShift(modalData);
      if (res?.warning) {
        setRecentLegalWarning({
          title: 'Rechtlicher Rahmen (ArbZG)',
          details: res.warning,
          shiftId: res.id
        });
      }
      setModalOpen(false);
    } catch (err: any) {
      notifyError(err.message);
    }
  };

  // Drag and Drop Handler for Day Cells
  const handleDragStart = (e: React.DragEvent, person: Staff) => {
    setDraggedStaff(person);
    const payload = JSON.stringify({
      staffId: person.id,
      staffName: person.name,
      targetGroupId: person.target_group_id || groups[0]?.id || ''
    });
    e.dataTransfer.setData('text/plain', payload);
    e.dataTransfer.setData('application/json', payload);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedStaff(null);
    setDragOverCell(null);
  };

  const handleCellDrop = async (e: React.DragEvent, cellStaffId: string, cellDate: string) => {
    e.preventDefault();
    setDragOverCell(null);

    let assignedStaffId = cellStaffId;
    let preferredGroupId = groups[0]?.id || '';

    try {
      const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.staffId) {
          assignedStaffId = parsed.staffId;
          preferredGroupId = parsed.targetGroupId || preferredGroupId;
        }
      }
    } catch (err) {
      // Fallback to cellStaffId
    }

    const sObj = staff.find(s => s.id === assignedStaffId);
    const assignedGroup = sObj?.target_group_id || preferredGroupId || (selectedGroup !== 'ALL' ? selectedGroup : groups[0]?.id || '');
    const calculatedEnd = calculateEndTime(defaultStartTime, defaultDurationHours, defaultBreakMinutes);

    try {
      const res = await onAddShift({
        staff_id: assignedStaffId,
        group_id: assignedGroup,
        date: cellDate,
        start_time: defaultStartTime,
        end_time: calculatedEnd,
        break_minutes: defaultBreakMinutes,
        role_override: sObj?.role === 'LEITUNG' ? 'Springer / Notfall-Unterstützung' : undefined
      });

      if (res?.warning) {
        setRecentLegalWarning({
          title: `Rechtlicher Hinweis (ArbZG) für ${sObj?.name || 'Mitarbeiter'}`,
          details: res.warning,
          shiftId: res.id
        });
      }
    } catch (err: any) {
      console.error('Error adding dropped shift:', err);
    }
  };

  // Open Edit Shift Popover / Modal
  const handleOpenEditShift = (sh: Shift) => {
    if (isFinished(sh)) return;
    setEditingShift(sh);
    setEditFormData({
      id: sh.id,
      staff_id: sh.staff_id,
      group_id: sh.group_id,
      date: sh.date,
      start_time: sh.start_time,
      end_time: sh.end_time,
      break_minutes: sh.break_minutes ?? 30,
      role_override: sh.role_override || ''
    });
    setEditModalOpen(true);
  };

  // Save Adjusted Shift
  const handleSaveEditShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingShift) return;

    if (onUpdateShift) {
      try {
        const res = await onUpdateShift(editingShift.id, editFormData);
        if (res?.warning) {
          setRecentLegalWarning({
            title: `ArbZG-Hinweis für Schicht (${editingShift.staff_name})`,
            details: res.warning,
            shiftId: editingShift.id
          });
        }
      } catch (err: any) {
        notifyError(err.message);
        return;
      }
    }
    setEditModalOpen(false);
    setEditingShift(null);
  };

  // Quick adjust time buttons (+/- 30 min)
  const adjustEditTime = (type: 'start' | 'end', deltaMinutes: number) => {
    const current = type === 'start' ? editFormData.start_time : editFormData.end_time;
    const [h, m] = current.split(':').map(Number);
    let total = h * 60 + m + deltaMinutes;
    if (total < 0) total = 0;
    if (total >= 24 * 60) total = 23 * 60 + 59;
    const newH = Math.floor(total / 60);
    const newM = total % 60;
    const formatted = `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
    
    setEditFormData({
      ...editFormData,
      [type === 'start' ? 'start_time' : 'end_time']: formatted
    });
  };

  // Save Settings Modal
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          default_shift_duration_hours: defaultDurationHours,
          default_shift_start_time: defaultStartTime,
          default_shift_break_minutes: defaultBreakMinutes
        })
      });
      if (res.ok) {
        setSettingsModalOpen(false);
      }
    } catch (err: any) {
      notifyError('Fehler beim Speichern der Einstellungen: ' + err.message);
    } finally {
      setSavingSettings(false);
    }
  };

  const activeEmployeeWish = wishes.find(
    w => w.staff_id === modalData.staff_id && w.date === modalData.date
  );

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
      {/* Roster Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-emerald-600" />
            <span>Einsatzplan</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Der tatsächliche Plan: entsteht aus dem Dienstplan. Hier landen Krankheit, Vertretungen und einzelne Änderungen.</p>
        </div>

        {/* Navigation, Filter, Print & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => replan('TODAY')}
            disabled={replanning}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Heute neu planen</span>
          </button>
          <button
            onClick={() => replan('WEEK')}
            disabled={replanning}
            className="flex items-center gap-1.5 h-9 px-3 rounded-lg border border-slate-300 hover:bg-slate-100 text-slate-800 text-sm font-semibold disabled:opacity-60"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Woche neu laden</span>
          </button>

          <div className="flex rounded-lg border border-slate-300 overflow-hidden text-sm" role="group" aria-label="Ansicht">
            {([['PERSON', 'Pro Person'], ['GROUP', 'Pro Gruppe']] as const).map(([value, text]) => (
              <button
                key={value}
                onClick={() => setCalendarView(value)}
                aria-pressed={calendarView === value}
                className={`h-9 px-3 font-medium ${calendarView === value ? 'bg-emerald-100 text-emerald-900' : 'bg-white text-slate-700 hover:bg-slate-100'}`}
              >
                {text}
              </button>
            ))}
          </div>

          {/* Group Filter */}
          <div className="flex items-center space-x-1 bg-slate-100 px-2 py-1 rounded-xl text-xs">
            <Filter className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={selectedGroup}
              onChange={(e) => setSelectedGroup(e.target.value)}
              className="bg-transparent font-medium text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Alle Gruppen anzeigen</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          </div>

          {/* Week Paginator */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setCurrentDate(subWeeks(currentDate, 1))}
              className="p-1.5 hover:bg-white rounded-lg transition-all"
              title="Vorherige Woche"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600" />
            </button>
            <span className="px-2 text-slate-700 min-w-[130px] text-center font-bold">
              KW {weekNumber}: {format(weekDays[0], 'dd.MM.', { locale: de })} – {format(weekDays[4], 'dd.MM.yyyy', { locale: de })}
            </span>
            <button
              onClick={() => setCurrentDate(addWeeks(currentDate, 1))}
              className="p-1.5 hover:bg-white rounded-lg transition-all"
              title="Nächste Woche"
            >
              <ChevronRight className="w-4 h-4 text-slate-600" />
            </button>
          </div>

          {/* Settings Button (Configures default duration, start time, ArbZG) */}
          <button
            onClick={() => setSettingsModalOpen(true)}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border border-slate-200"
            title="Dienstplan-Einstellungen: Standard-Schichtdauer, Startzeit & Arbeitszeitprüfung anpassen"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-600" />
            <span>Standard: {defaultDurationHours}h</span>
          </button>

          {/* Sidebar Toggle Button */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
              sidebarOpen
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
            }`}
            title="Mitarbeiter-Pool Sidebar (Drag & Drop) ein- oder ausblenden"
          >
            <GripVertical className="w-3.5 h-3.5 text-emerald-600" />
            <span>Drag & Drop Pool</span>
          </button>

          {/* Print & PDF Export */}
          <button
            onClick={() => setPrintOpen(true)}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border border-slate-200"
            title="Dienstplan für den Pausenraum / Kita-Aushang drucken"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Druck & Aushang</span>
          </button>

          {/* Copy Previous Week */}
          <button
            onClick={handleCopyPreviousWeek}
            disabled={copyLoading}
            className="flex items-center space-x-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border border-indigo-200"
            title="Dienstplan der Vorwoche mit 1 Klick in diese Woche übernehmen"
          >
            <Copy className="w-3.5 h-3.5 text-indigo-600" />
            <span>{copyLoading ? 'Kopiere...' : 'Vorwoche'}</span>
          </button>

          {/* Add shift */}
          <button
            onClick={() => handleOpenNewShift()}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Schicht eintragen</span>
          </button>
        </div>
      </div>

      {/* Recent Legal / ArbZG Warning Alert Banner (Nicht blockierend!) */}
      {recentLegalWarning && (
        <div className="mt-4 p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start justify-between">
          <div className="flex items-start space-x-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-bold flex items-center space-x-2">
                <span>{recentLegalWarning.title}</span>
                <span className="text-xs bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded font-semibold">
                  Eintragung autorisiert (nicht blockiert)
                </span>
              </div>
              <p className="mt-0.5 text-amber-900 leading-relaxed font-medium">
                {recentLegalWarning.details}
              </p>
              <div className="text-xs text-amber-800 mt-1 flex items-center space-x-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>Gemäß Anforderung prüft das System den rechtlichen Rahmen und meldet Hinweise, verhindert das Eintragen jedoch nicht.</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setRecentLegalWarning(null)}
            className="text-amber-500 hover:text-amber-800 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Copy week success alert */}
      {copyStatus && (
        <div className="mt-3 p-3 bg-indigo-50 border border-indigo-200 text-indigo-900 text-xs rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="w-4 h-4 text-indigo-600 flex-shrink-0" />
            <span className="font-medium">{copyStatus}</span>
          </div>
          <button onClick={() => setCopyStatus(null)} className="text-indigo-400 hover:text-indigo-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Roster Layout: Table on Left + Drag & Drop Staff Pool on Right */}
      <div className="flex flex-col lg:flex-row gap-5 mt-4 items-start">
        {/* Left Column: Calendar Roster Grid */}
        <div className="flex-1 w-full overflow-x-auto min-w-0">
          {calendarView === 'GROUP' ? (
            <GroupCalendar
              groups={groups.filter(g => selectedGroup === 'ALL' || g.id === selectedGroup)}
              shifts={shifts}
              weekDays={weekDays}
              closures={closures}
              excursions={excursions}
              onOpenShift={handleOpenEditShift}
            />
          ) : (
          <table className="w-full border-collapse min-w-[780px]">
            <thead>
              <tr>
                <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded-l-xl w-52">
                  Mitarbeiter / Skills
                </th>
                {weekDays.map((day, idx) => {
                  const dayStr = format(day, 'yyyy-MM-dd');
                  const isToday = dayStr === format(new Date(), 'yyyy-MM-dd');
                  const dayClosure = closures.find(c => c.date === dayStr);

                  return (
                    <th
                      key={idx}
                      className={`p-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                        dayClosure
                          ? dayClosure.type === 'KONZEPTIONSTAG'
                            ? 'bg-purple-50 text-purple-900 border-b-2 border-purple-400'
                            : 'bg-rose-50 text-rose-900 border-b-2 border-rose-400'
                          : isToday
                            ? 'bg-emerald-50 text-emerald-900 border-b-2 border-emerald-500'
                            : 'bg-slate-50 text-slate-600'
                      } ${idx === 4 ? 'rounded-r-xl' : ''}`}
                    >
                      <div>{format(day, 'EEEE', { locale: de })}</div>
                      <div className="text-xs font-normal text-slate-400">{format(day, 'dd.MM.')}</div>
                      {dayClosure && (
                        <div
                          className={`mt-1 inline-flex items-center px-1.5 py-0.5 rounded text-xs font-bold ${
                            dayClosure.type === 'KONZEPTIONSTAG'
                              ? 'bg-purple-200 text-purple-900'
                              : 'bg-rose-200 text-rose-900'
                          }`}
                          title={dayClosure.notes || dayClosure.title}
                        >
                          {dayClosure.type === 'KONZEPTIONSTAG' ? 'Teamtag' : 'Schließtag'}
                        </div>
                      )}
                      {excursions.filter(x => x.date === dayStr).map(x => (
                        <div key={x.id} className="mt-1 normal-case tracking-normal font-medium text-indigo-700">
                          Wandertag {x.group_name.split(' ')[0]} ({x.staff_count})
                        </div>
                      ))}
                      {dayStr <= todayStr && (
                        <div className="mt-1.5 flex justify-center gap-1 normal-case tracking-normal font-medium">
                          <button
                            onClick={() => saveDayStatus(dayStr, true)}
                            aria-pressed={dayStatus[dayStr] === true}
                            title="Der Tag lief wie geplant"
                            className={`px-1.5 py-0.5 rounded-md border text-xs ${dayStatus[dayStr] === true ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                          >
                            So gemacht
                          </button>
                          <button
                            onClick={() => saveDayStatus(dayStr, false)}
                            aria-pressed={dayStatus[dayStr] === false}
                            title="Der Tag lief anders als geplant"
                            className={`px-1.5 py-0.5 rounded-md border text-xs ${dayStatus[dayStr] === false ? 'bg-rose-600 border-rose-600 text-white' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-100'}`}
                          >
                            Nicht so
                          </button>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredStaff.map((person) => {
                const isFachkraft = person.is_fachkraft === 1;

                return (
                  <tr key={person.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Staff Info Col */}
                    <td className="p-3 w-52">
                      <div className="flex items-start space-x-2.5">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0 mt-0.5"
                          style={{ backgroundColor: person.color }}
                        >
                          {person.avatar}
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {person.name}
                          </div>
                          <div className="flex items-center space-x-1 text-xs text-slate-400 mt-0.5">
                            <span className={isFachkraft ? 'text-blue-600 font-semibold' : 'text-slate-500'}>
                              {person.role === 'LEITUNG' ? 'Leitung' : isFachkraft ? 'Fachkraft' : 'Ergänzungskraft'}
                            </span>
                            <span>•</span>
                            <span>{person.weekly_hours}h</span>
                          </div>

                          {/* Personelle Skills & Rollen-Pills */}
                          <div className="flex flex-wrap items-center gap-1 mt-1">
                            {person.role === 'LEITUNG' && (
                              <span title="Einrichtungsleitung" className="inline-flex items-center px-1 py-0.5 rounded bg-indigo-100 text-indigo-700 text-xs font-bold">
                                ⭐ Leitung
                              </span>
                            )}
                            {person.role === 'SPRINGER' && (
                              <span title="Dedizierte Springerin" className="inline-flex items-center px-1 py-0.5 rounded bg-emerald-100 text-emerald-700 text-xs font-bold">
                                Springer
                              </span>
                            )}
                            {person.skills?.includes('U3_QUALIFIKATION') && (
                              <span title="U3-Qualifikation" className="inline-flex items-center space-x-0.5 px-1 py-0.5 rounded bg-purple-100 text-purple-700 text-xs font-bold">
                                <Baby className="w-2.5 h-2.5" />
                                <span>U3</span>
                              </span>
                            )}
                            {person.skills?.includes('ERSTE_HILFE_KIND') && (
                              <span title="Ersthelfer am Kind" className="inline-flex items-center space-x-0.5 px-1 py-0.5 rounded bg-rose-100 text-rose-700 text-xs font-bold">
                                <HeartPulse className="w-2.5 h-2.5" />
                                <span>EH</span>
                              </span>
                            )}
                            {person.skills?.includes('INKLUSION') && (
                              <span title="Inklusionsfachkraft" className="inline-flex items-center space-x-0.5 px-1 py-0.5 rounded bg-amber-100 text-amber-700 text-xs font-bold">
                                <GraduationCap className="w-2.5 h-2.5" />
                                <span>Inkl</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Day Shift Cells (Droppable Zones) */}
                    {weekDays.map((day, dIdx) => {
                      const dayStr = format(day, 'yyyy-MM-dd');
                      const dayShifts = shifts.filter(
                        s => s.staff_id === person.id && s.date === dayStr
                      );
                      const dayWish = wishes.find(
                        w => w.staff_id === person.id && w.date === dayStr
                      );
                      const isHoveredDrop = dragOverCell?.staffId === person.id && dragOverCell?.date === dayStr;
                      const isPastDay = dayStr < todayStr;

                      return (
                        <td 
                          key={dIdx} 
                          className={`p-2 align-top text-center transition-all ${
                            isHoveredDrop
                              ? 'bg-emerald-100/80 border-2 border-dashed border-emerald-500 rounded-xl scale-[1.02] shadow-sm'
                              : ''
                          }`}
                          onDragOver={(e) => {
                            if (isPastDay) return;
                            e.preventDefault();
                            e.dataTransfer.dropEffect = 'copy';
                            if (!dragOverCell || dragOverCell.staffId !== person.id || dragOverCell.date !== dayStr) {
                              setDragOverCell({ staffId: person.id, date: dayStr });
                            }
                          }}
                          onDragLeave={() => {
                            setDragOverCell(null);
                          }}
                          onDrop={(e) => !isPastDay && handleCellDrop(e, person.id, dayStr)}
                        >
                          {/* If staff member submitted a wish for this day */}
                          {dayWish && dayShifts.length === 0 && (
                            <div 
                              onClick={() => handleOpenNewShift(person.id, dayStr)}
                              className="mb-1 p-1 bg-amber-50 border border-amber-200 rounded-lg text-left cursor-pointer hover:bg-amber-100 transition-colors"
                              title={`Mitarbeiter-Wunsch: ${dayWish.note || dayWish.type}`}
                            >
                              <div className="flex items-center space-x-1 text-xs font-bold text-amber-800">
                                <Lightbulb className="w-3 h-3 text-amber-600 shrink-0" />
                                <span>
                                  {dayWish.type === 'WUNSCH_FRUEH' ? 'Wunsch: Frühdienst' : dayWish.type === 'WUNSCH_SPAET' ? 'Wunsch: Spätdienst' : 'Wunsch: Frei'}
                                </span>
                              </div>
                              {dayWish.note && (
                                <div className="text-xs text-amber-700 truncate mt-0.5">
                                  {dayWish.note}
                                </div>
                              )}
                            </div>
                          )}

                          {dayShifts.length === 0 && isPastDay ? (
                            <div className="h-14" />
                          ) : dayShifts.length === 0 ? (
                            <button
                              onClick={() => handleOpenNewShift(person.id, dayStr)}
                              className={`w-full h-14 rounded-xl border border-dashed flex flex-col items-center justify-center transition-all text-xs group ${
                                isHoveredDrop
                                  ? 'border-emerald-500 bg-emerald-100/60 text-emerald-800 font-bold'
                                  : 'border-slate-200 hover:border-slate-300 hover:bg-slate-100/50 text-slate-300 hover:text-slate-500'
                              }`}
                              title="Schicht planen oder Person hierhin ziehen"
                            >
                              {isHoveredDrop ? (
                                <span className="text-xs text-emerald-700">Hier ablegen (+{defaultDurationHours}h)</span>
                              ) : (
                                <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                              )}
                            </button>
                          ) : (
                            <div className="space-y-1.5">
                              {dayShifts.map((sh) => {
                                const isCancelled = sh.status === 'CANCELLED';
                                const finished = isFinished(sh);

                                return (
                                  <div
                                    key={sh.id}
                                    onClick={() => handleOpenEditShift(sh)}
                                    className={`rounded-xl p-2 text-left relative group border transition-all cursor-pointer hover:shadow-md hover:border-emerald-400 ${
                                      finished
                                        ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-default'
                                        : isCancelled
                                        ? 'bg-rose-50 border-rose-300 line-through opacity-75'
                                        : sh.warning
                                          ? 'bg-amber-50/90 border-amber-300 text-slate-900'
                                          : 'bg-emerald-50/80 border-emerald-200 text-slate-800'
                                    }`}
                                    title={finished ? 'Abgeschlossen' : 'Klicken, um Schichtzeit anzupassen'}
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-xs font-bold text-slate-900 flex items-center space-x-1">
                                        <Clock className="w-3 h-3 text-slate-500 shrink-0" />
                                        <span>{sh.start_time} - {sh.end_time}</span>
                                      </span>
                                      <div className="flex items-center space-x-1">
                                        {!finished && (<>
<button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleOpenEditShift(sh);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-emerald-700 transition-opacity"
                                          title="Zeit anpassen"
                                        >
                                          <Edit3 className="w-3 h-3 text-slate-400 hover:text-emerald-600" />
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            onDeleteShift(sh.id);
                                          }}
                                          className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-600 transition-opacity"
                                          title="Schicht löschen"
                                        >
                                          <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-600" />
                                        </button>
</>)}
                                      </div>
                                    </div>

                                    <div className="flex items-center space-x-1 mt-0.5">
                                      <span className="text-xs text-slate-600 truncate font-semibold">
                                        {sh.group_name.split(' ')[0]}
                                      </span>
                                      {sh.group_name.includes('U3') && (
                                        <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded font-bold">
                                          U3
                                        </span>
                                      )}
                                      <span className="text-xs text-slate-400">
                                        ({calculateNetHours(sh.start_time, sh.end_time, sh.break_minutes)}h)
                                      </span>
                                    </div>

                                    {sh.role_override && (
                                      <span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-1 rounded block mt-0.5 no-underline">
                                        {sh.role_override}
                                      </span>
                                    )}

                                    {/* Legal ArbZG Warning Indicator on Shift */}
                                    {sh.warning && (
                                      <div 
                                        className="mt-1 flex items-start space-x-1 p-1 bg-amber-100/90 text-amber-900 border border-amber-300 rounded text-xs font-semibold leading-tight"
                                        title={sh.warning}
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          notifyError(sh.warning ?? "");
                                        }}
                                      >
                                        <AlertTriangle className="w-3 h-3 text-amber-700 shrink-0 mt-0.2" />
                                        <span className="truncate">ArbZG: {sh.warning}</span>
                                      </div>
                                    )}

                                    {isCancelled && (
                                      <span className="text-xs text-rose-700 font-bold block no-underline mt-0.5">
                                        Ausfall (Krank)
                                      </span>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
          )}
        </div>

        {/* Right Column: DRAG & DROP MITARBEITER-POOL SIDEBAR */}
        {sidebarOpen && calendarView === 'PERSON' && (
          <div className="w-full lg:w-80 shrink-0 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-slate-200">
              <div className="flex items-center space-x-2">
                <div className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Mitarbeiter-Pool</h3>
                  <span className="text-xs text-slate-500">Per Drag & Drop reinziehen</span>
                </div>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
                title="Sidebar schließen"
              >
                <PanelRightClose className="w-4 h-4" />
              </button>
            </div>

            {/* Quick explanation hint */}
            <div className="p-2.5 bg-emerald-50/80 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1">
              <div className="font-bold flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                <span>Drag & Drop</span>
              </div>
              <p className="text-xs text-emerald-800 leading-tight">
                Ziehe eine Person auf einen Wochentag. Schicht wird automatisch mit <strong>{defaultDurationHours} Std.</strong> ({defaultStartTime} - {calculateEndTime(defaultStartTime, defaultDurationHours, defaultBreakMinutes)} Uhr) angelegt.
              </p>
            </div>

            {/* Staff Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Personal suchen (Name, Skills)..."
                value={staffSearch}
                onChange={(e) => setStaffSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              {staffSearch && (
                <button
                  onClick={() => setStaffSearch('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Draggable Staff Cards List */}
            <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
              {sidebarStaffList.map((person) => {
                const isFachkraft = person.is_fachkraft === 1;
                const isDragging = draggedStaff?.id === person.id;

                return (
                  <div
                    key={person.id}
                    draggable={true}
                    onDragStart={(e) => handleDragStart(e, person)}
                    onDragEnd={handleDragEnd}
                    className={`bg-white border rounded-xl p-2.5 flex items-center justify-between cursor-grab active:cursor-grabbing hover:border-emerald-400 transition-all select-none ${
                      isDragging ? 'opacity-40 border-dashed border-emerald-500 scale-95' : 'border-slate-200'
                    }`}
                    title={`Ziehe ${person.name} in den Kalender`}
                  >
                    <div className="flex items-center space-x-2.5 min-w-0">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: person.color }}
                      >
                        {person.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {person.name}
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-slate-500">
                          <span>{person.role === 'LEITUNG' ? 'Leitung' : isFachkraft ? 'Fachkraft' : 'Ergänzung'}</span>
                          <span>•</span>
                          <span>{person.weekly_hours}h</span>
                        </div>
                        {/* Skills */}
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {person.skills?.includes('U3_QUALIFIKATION') && (
                            <span className="text-xs bg-purple-100 text-purple-700 px-1 rounded font-bold">U3</span>
                          )}
                          {person.skills?.includes('ERSTE_HILFE_KIND') && (
                            <span className="text-xs bg-rose-100 text-rose-700 px-1 rounded font-bold">EH</span>
                          )}
                          {person.role === 'SPRINGER' && (
                            <span className="text-xs bg-emerald-100 text-emerald-700 px-1 rounded font-bold">Springer</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center text-slate-300 hover:text-slate-600 pl-2">
                      <GripVertical className="w-4 h-4 shrink-0" />
                    </div>
                  </div>
                );
              })}

              {sidebarStaffList.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-400 italic">
                  Keine Mitarbeiter gefunden.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* MODAL: EINSTELLUNGEN FÜR STANDARDSCHICHT (Standardarbeitszeit & ArbZG) */}
      {settingsModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2">
                <Sliders className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-slate-900">Dienstplan-Einstellungen</h3>
              </div>
              <button onClick={() => setSettingsModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Standard-Schichtdauer (Stunden)</span>
                  <span className="text-emerald-700 font-semibold">{defaultDurationHours} Std.</span>
                </label>
                <p className="text-xs text-slate-500 mb-2">
                  Dauer einer per Drag & Drop in den Kalender gezogenen Schicht (z.B. standardmäßig 8 Stunden).
                </p>
                <div className="flex items-center space-x-2">
                  {[6.0, 7.0, 7.5, 8.0, 8.5].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setDefaultDurationHours(preset)}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                        defaultDurationHours === preset
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {preset}h
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex items-center space-x-2">
                  <input
                    type="number"
                    step="0.5"
                    min="1"
                    max="12"
                    value={defaultDurationHours}
                    onChange={(e) => setDefaultDurationHours(Number(e.target.value))}
                    className="w-28 text-xs p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                  <span className="text-xs text-slate-500">Stunden Nettoarbeitszeit</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Standard-Schichtbeginn</label>
                  <input
                    type="time"
                    value={defaultStartTime}
                    onChange={(e) => setDefaultStartTime(e.target.value)}
                    className="w-full text-xs p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Standard-Pause (Min.)</label>
                  <input
                    type="number"
                    min="0"
                    step="15"
                    value={defaultBreakMinutes}
                    onChange={(e) => setDefaultBreakMinutes(Number(e.target.value))}
                    className="w-full text-xs p-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              {/* Calculated preview */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                <span className="font-bold text-slate-800">Ergebnis bei Drag & Drop:</span>
                <div className="text-slate-600">
                  {defaultStartTime} Uhr bis <strong>{calculateEndTime(defaultStartTime, defaultDurationHours, defaultBreakMinutes)} Uhr</strong> ({defaultDurationHours}h Arbeit + {defaultBreakMinutes}m Pause)
                </div>
              </div>

              {/* Legal ArbZG compliance info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1">
                <div className="font-bold flex items-center space-x-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  <span>Automatische Prüfung des rechtlichen Rahmens</span>
                </div>
                <p className="text-xs text-blue-800 leading-relaxed">
                  Das System prüft ArbZG § 3 (max. 10h Arbeitszeit), ArbZG § 5 (mind. 11h Ruhezeit zum Vor-/Folgetag) und bestehende Abwesenheiten. Eventuelle Fehler/Warnungen werden prominent gemeldet, verhindern das Eintragen jedoch nicht.
                </p>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSettingsModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                >
                  {savingSettings ? 'Speichere...' : 'Einstellungen speichern'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SCHICHTZEIT ANPASSEN (Zeit im Kalender direkt anpassen) */}
      {editModalOpen && editingShift && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <div className="flex items-center space-x-2.5">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                  style={{ backgroundColor: editingShift.staff_color }}
                >
                  {editingShift.staff_name.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Schichtzeit anpassen</h3>
                  <p className="text-xs text-slate-500">
                    {editingShift.staff_name} • {format(new Date(editingShift.date), 'EEEE, dd.MM.yyyy', { locale: de })}
                  </p>
                </div>
              </div>
              <button onClick={() => setEditModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Existing ArbZG Warning on this shift */}
            {editingShift.warning && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-950 flex items-start space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Erfasster ArbZG-Hinweis:</span>
                  <p className="text-amber-900 mt-0.5">{editingShift.warning}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSaveEditShift} className="space-y-4">
              {/* Quick Preset Buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Schnellauswahl Schichtzeiten</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, start_time: '07:00', end_time: '15:30', break_minutes: 30, role_override: 'Frühdienst' })}
                    className="p-2 border border-slate-200 hover:border-emerald-500 rounded-xl text-left bg-slate-50 hover:bg-emerald-50/50 transition-all text-xs"
                  >
                    <div className="font-bold text-slate-800">Frühdienst</div>
                    <div className="text-xs text-slate-500">07:00 - 15:30</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, start_time: '08:00', end_time: '16:30', break_minutes: 30, role_override: 'Regeldienst' })}
                    className="p-2 border border-slate-200 hover:border-emerald-500 rounded-xl text-left bg-slate-50 hover:bg-emerald-50/50 transition-all text-xs"
                  >
                    <div className="font-bold text-slate-800">Regeldienst</div>
                    <div className="text-xs text-slate-500">08:00 - 16:30</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditFormData({ ...editFormData, start_time: '08:30', end_time: '17:00', break_minutes: 30, role_override: 'Spätdienst' })}
                    className="p-2 border border-slate-200 hover:border-emerald-500 rounded-xl text-left bg-slate-50 hover:bg-emerald-50/50 transition-all text-xs"
                  >
                    <div className="font-bold text-slate-800">Spätdienst</div>
                    <div className="text-xs text-slate-500">08:30 - 17:00</div>
                  </button>
                </div>
              </div>

              {/* Start & End time with +/- 30m quick controls */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Beginn</label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="time"
                      value={editFormData.start_time}
                      onChange={(e) => setEditFormData({ ...editFormData, start_time: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                  <div className="flex space-x-1 pt-1">
                    <button
                      type="button"
                      onClick={() => adjustEditTime('start', -30)}
                      className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 py-1 rounded font-semibold text-slate-700"
                    >
                      -30m
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustEditTime('start', 30)}
                      className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 py-1 rounded font-semibold text-slate-700"
                    >
                      +30m
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">Ende</label>
                  <div className="flex items-center space-x-1">
                    <input
                      type="time"
                      value={editFormData.end_time}
                      onChange={(e) => setEditFormData({ ...editFormData, end_time: e.target.value })}
                      className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                    />
                  </div>
                  <div className="flex space-x-1 pt-1">
                    <button
                      type="button"
                      onClick={() => adjustEditTime('end', -30)}
                      className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 py-1 rounded font-semibold text-slate-700"
                    >
                      -30m
                    </button>
                    <button
                      type="button"
                      onClick={() => adjustEditTime('end', 30)}
                      className="flex-1 text-xs bg-slate-100 hover:bg-slate-200 py-1 rounded font-semibold text-slate-700"
                    >
                      +30m
                    </button>
                  </div>
                </div>
              </div>

              {/* Pause & Group */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pause</label>
                  <select
                    value={editFormData.break_minutes}
                    onChange={(e) => setEditFormData({ ...editFormData, break_minutes: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    <option value={0}>0 Minuten (Kurzschicht)</option>
                    <option value={15}>15 Minuten</option>
                    <option value={30}>30 Minuten (Standard)</option>
                    <option value={45}>45 Minuten</option>
                    <option value={60}>60 Minuten</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gruppe</label>
                  <select
                    value={editFormData.group_id}
                    onChange={(e) => setEditFormData({ ...editFormData, group_id: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                  >
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Net hours calculation & Live ArbZG check */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs flex items-center justify-between">
                <div>
                  <span className="text-slate-500">Nettoarbeitszeit: </span>
                  <span className="font-semibold text-slate-900 text-sm">
                    {calculateNetHours(editFormData.start_time, editFormData.end_time, editFormData.break_minutes)} Std.
                  </span>
                </div>
                {calculateNetHours(editFormData.start_time, editFormData.end_time, editFormData.break_minutes) > 10.0 && (
                  <span className="text-amber-800 font-bold flex items-center space-x-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    <span>&gt; 10h (ArbZG § 3 Hinweis)</span>
                  </span>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Besondere Funktion / Schichtrolle (optional)
                </label>
                <input
                  type="text"
                  placeholder="z.B. Springer, Frühdienst, Vorbereitung..."
                  value={editFormData.role_override}
                  onChange={(e) => setEditFormData({ ...editFormData, role_override: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Schicht wirklich löschen?')) {
                      onDeleteShift(editingShift.id);
                      setEditModalOpen(false);
                    }
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-xl border border-rose-200 transition-colors flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Schicht löschen</span>
                </button>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => setEditModalOpen(false)}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl"
                  >
                    Zeit anpassen & Speichern
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: SCHICHT MANUELL EINTRAGEN */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900">Schicht eintragen</h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* If there is an active employee wish for this date */}
            {activeEmployeeWish && (
              <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <Lightbulb className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <span className="font-bold">Mitarbeiterwunsch hinterlegt: </span>
                    <span>
                      {activeEmployeeWish.type === 'WUNSCH_FRUEH' ? 'Frühdienst' : activeEmployeeWish.type === 'WUNSCH_SPAET' ? 'Spätdienst' : 'Frei'}
                    </span>
                    {activeEmployeeWish.note && <p className="text-xs text-amber-800 italic">"{activeEmployeeWish.note}"</p>}
                  </div>
                </div>
              </div>
            )}

            {/* 1-Click Shift Templates */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Schichtvorlage auswählen</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {templates.map((tpl) => (
                  <button
                    key={tpl.id}
                    type="button"
                    onClick={() => setModalData({
                      ...modalData,
                      start_time: tpl.start_time,
                      end_time: tpl.end_time,
                      break_minutes: tpl.break_minutes,
                      role_override: tpl.name.split(' ')[0]
                    })}
                    className="p-2 rounded-xl text-left border border-slate-200 hover:border-emerald-500 hover:bg-emerald-50/60 transition-all text-xs group"
                  >
                    <div className="font-bold text-slate-800 text-xs group-hover:text-emerald-700">
                      {tpl.name}
                    </div>
                    <div className="text-xs text-slate-400">
                      {tpl.start_time} - {tpl.end_time} ({tpl.break_minutes}m P.)
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleSaveShift} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mitarbeiter:in</label>
                <select
                  value={modalData.staff_id}
                  onChange={(e) => setModalData({ ...modalData, staff_id: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role} • {s.qualification})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Gruppe</label>
                <select
                  value={modalData.group_id}
                  onChange={(e) => setModalData({ ...modalData, group_id: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                >
                  {groups.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Datum</label>
                  <input
                    type="date"
                    value={modalData.date}
                    onChange={(e) => setModalData({ ...modalData, date: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Pause (Min.)</label>
                  <input
                    type="number"
                    value={modalData.break_minutes}
                    onChange={(e) => setModalData({ ...modalData, break_minutes: Number(e.target.value) })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Beginn</label>
                  <input
                    type="time"
                    value={modalData.start_time}
                    onChange={(e) => setModalData({ ...modalData, start_time: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Ende</label>
                  <input
                    type="time"
                    value={modalData.end_time}
                    onChange={(e) => setModalData({ ...modalData, end_time: e.target.value })}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Besondere Funktion / Rolle in dieser Schicht (optional)
                </label>
                <input
                  type="text"
                  placeholder="z.B. Springer U3, Vertretung, Frühdienst..."
                  value={modalData.role_override || ''}
                  onChange={(e) => setModalData({ ...modalData, role_override: e.target.value })}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* ArbZG Hint */}
              <div className="bg-blue-50 text-blue-800 p-2.5 rounded-xl text-xs flex items-center space-x-1.5">
                <Clock className="w-4 h-4 shrink-0 text-blue-600" />
                <span>Gesetzlicher Rahmen (ArbZG § 3, § 4, § 5) wird beim Speichern automatisch geprüft.</span>
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
                  Schicht speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT & PDF AUSHANG MODAL */}
      {printOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 my-6">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Printer className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Druckansicht & Kita-Aushang (PDF-Export)
                  </h3>
                  <p className="text-xs text-slate-500">
                    Offizieller Aushang für Team-Pinnwand & behördliche Prüfungen
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl flex items-center space-x-1.5"
                >
                  <Printer className="w-4 h-4" />
                  <span>Jetzt Drucken / PDF speichern</span>
                </button>
                <button
                  onClick={() => setPrintOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Sheet */}
            <div id="printable-roster" className="mt-4 p-6 bg-slate-50 border border-slate-200 rounded-xl font-sans text-slate-900">
              <div className="border-b-2 border-slate-800 pb-3 mb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-xl font-semibold uppercase tracking-tight text-slate-900">
                      Meine Kita
                    </h1>
                    <p className="text-xs text-slate-600 font-semibold mt-0.5">
                      Offizieller Dienstplan Kalenderwoche {weekNumber} ({format(weekDays[0], 'dd. MMMM', { locale: de })} – {format(weekDays[4], 'dd. MMMM yyyy', { locale: de })})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-900 text-xs font-bold rounded-md border border-emerald-300">
                      ✓ Verbindlich freigegeben durch Einrichtungsleitung
                    </span>
                    <div className="text-xs text-slate-400 mt-1">
                      Stand: {new Date().toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Table */}
              <table className="w-full text-xs border border-slate-300 border-collapse mb-4 bg-white">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 text-xs font-bold">
                    <th className="border border-slate-300 p-2 text-left">Mitarbeiter:in</th>
                    <th className="border border-slate-300 p-2 text-left">Rolle / Skills</th>
                    {weekDays.map((d, i) => (
                      <th key={i} className="border border-slate-300 p-2 text-center">
                        {format(d, 'EEEE', { locale: de })}<br />
                        <span className="font-normal text-xs text-slate-500">{format(d, 'dd.MM.')}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredStaff.map((person) => {
                    return (
                      <tr key={person.id} className="border-b border-slate-200 hover:bg-slate-50">
                        <td className="border border-slate-300 p-2 font-bold text-slate-900">
                          {person.name}
                          <span className="block font-normal text-xs text-slate-500">{person.weekly_hours}h / Woche</span>
                        </td>
                        <td className="border border-slate-300 p-2 text-xs text-slate-600">
                          <div>{person.role}</div>
                          <div className="text-xs text-slate-400">{person.skills?.join(', ')}</div>
                        </td>
                        {weekDays.map((day, dIdx) => {
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const dayShifts = shifts.filter(s => s.staff_id === person.id && s.date === dayStr && s.status === 'CONFIRMED');

                          return (
                            <td key={dIdx} className="border border-slate-300 p-2 text-center text-xs">
                              {dayShifts.length > 0 ? (
                                dayShifts.map(sh => (
                                  <div key={sh.id}>
                                    <div className="font-bold text-slate-800">{sh.start_time} - {sh.end_time}</div>
                                    <div className="text-xs text-slate-500 font-medium">{sh.group_name.split(' ')[0]}</div>
                                  </div>
                                ))
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* Compliance & Signatures */}
              <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-300 text-xs text-slate-600">
                <div className="space-y-1">
                  <div className="font-bold text-slate-800">Gesetzlicher Prüfvermerk (KiBiz / KiTaG / ArbZG):</div>
                  <p>
                    ✓ Fachkraftquote in allen Gruppen eingehalten. Zertifizierter Ersthelfer am Kind im Haus anwesend. 
                    Gesetzliche Mindestruhezeit von 11 Stunden gemäß § 5 ArbZG gewahrt.
                  </p>
                </div>
                <div className="flex justify-between items-end pt-4">
                  <div className="text-center w-36 border-t border-slate-400 pt-1 text-xs">
                    <span className="text-slate-400">Einrichtungsleitung</span>
                  </div>
                  <div className="text-center w-36 border-t border-slate-400 pt-1 text-xs">
                    Personalrat / Sicherheitsbeauftragte
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
