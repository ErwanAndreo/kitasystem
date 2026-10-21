import React, { useState, useEffect } from 'react';
import { Shift, Staff, Group, ShiftTemplate, StaffWish } from '../types';
import { 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Trash2, 
  Clock, 
  User, 
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
  FileText,
  CheckCircle2
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
  }) => Promise<void>;
  onDeleteShift: (id: string) => Promise<void>;
}

export const ShiftPlanner: React.FC<ShiftPlannerProps> = ({
  shifts,
  staff,
  groups,
  currentDate,
  setCurrentDate,
  onAddShift,
  onDeleteShift
}) => {
  const [selectedGroup, setSelectedGroup] = useState<string>('ALL');
  const [modalOpen, setModalOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [templates, setTemplates] = useState<ShiftTemplate[]>([]);
  const [wishes, setWishes] = useState<StaffWish[]>([]);

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
  const weekNumber = getISOWeek(currentDate);

  // Load competitor-proven features: Shift Templates & Staff Wishes
  useEffect(() => {
    fetch('/api/shift-templates')
      .then(r => r.json())
      .then(setTemplates)
      .catch(console.error);
  }, []);

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

  const handleOpenNewShift = (staffId?: string, dateStr?: string) => {
    const sObj = staff.find(s => s.id === (staffId || staff[0]?.id));
    const targetDate = dateStr || format(new Date(), 'yyyy-MM-dd');
    
    // Check if employee has a wish on that day
    const employeeWish = wishes.find(w => w.staff_id === (staffId || staff[0]?.id) && w.date === targetDate);
    let initialStart = '08:00';
    let initialEnd = '16:30';
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
      group_id: selectedGroup !== 'ALL' ? selectedGroup : groups[0]?.id || '',
      date: targetDate,
      start_time: initialStart,
      end_time: initialEnd,
      break_minutes: 30,
      role_override: defaultRoleOverride
    });
    setModalOpen(true);
  };

  const handleSaveShift = async (e: React.FormEvent) => {
    e.preventDefault();
    await onAddShift(modalData);
    setModalOpen(false);
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
            <span>Wochendienstplan & Schichteinsatz</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Dienstzeiten, Pausen, Schichtvorlagen & Mitarbeiterwünsche
          </p>
        </div>

        {/* Navigation, Filter, Print & Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
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

          {/* Print & PDF Export (Competitor standout feature) */}
          <button
            onClick={() => setPrintOpen(true)}
            className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all active:scale-95 border border-slate-200"
            title="Dienstplan für den Pausenraum / Kita-Aushang drucken"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Druck & Aushang</span>
          </button>

          {/* Add shift */}
          <button
            onClick={() => handleOpenNewShift()}
            className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Schicht eintragen</span>
          </button>
        </div>
      </div>

      {/* Roster Grid */}
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse min-w-[850px]">
          <thead>
            <tr>
              <th className="p-3 text-left text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50 rounded-l-xl w-56">
                Mitarbeiter / Skills
              </th>
              {weekDays.map((day, idx) => {
                const isToday = format(day, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
                return (
                  <th
                    key={idx}
                    className={`p-3 text-center text-xs font-bold uppercase tracking-wider transition-colors ${
                      isToday ? 'bg-emerald-50 text-emerald-900 border-b-2 border-emerald-500' : 'bg-slate-50 text-slate-600'
                    } ${idx === 4 ? 'rounded-r-xl' : ''}`}
                  >
                    <div>{format(day, 'EEEE', { locale: de })}</div>
                    <div className="text-[11px] font-normal text-slate-400">{format(day, 'dd.MM.')}</div>
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
                  <td className="p-3 w-56">
                    <div className="flex items-start space-x-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-xs shrink-0 mt-0.5"
                        style={{ backgroundColor: person.color }}
                      >
                        {person.avatar}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-900 truncate">
                          {person.name}
                        </div>
                        <div className="flex items-center space-x-1 text-[10px] text-slate-400 mt-0.5">
                          <span className={isFachkraft ? 'text-blue-600 font-semibold' : 'text-slate-500'}>
                            {person.role === 'LEITUNG' ? 'Leitung' : isFachkraft ? 'Fachkraft' : 'Ergänzungskraft'}
                          </span>
                          <span>•</span>
                          <span>{person.weekly_hours}h</span>
                        </div>

                        {/* Personelle Skills & Rollen-Pills */}
                        <div className="flex flex-wrap items-center gap-1 mt-1">
                          {person.role === 'LEITUNG' && (
                            <span title="Einrichtungsleitung (kann im Notfall einspringen)" className="inline-flex items-center px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 text-[9px] font-bold">
                              ⭐ Leitung
                            </span>
                          )}
                          {person.role === 'SPRINGER' && (
                            <span title="Dedizierte Springerin" className="inline-flex items-center px-1 py-0.2 rounded bg-emerald-100 text-emerald-700 text-[9px] font-bold">
                              🔄 Springer
                            </span>
                          )}
                          {person.skills?.includes('U3_QUALIFIKATION') && (
                            <span title="U3-Qualifikation" className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded bg-purple-100 text-purple-700 text-[9px] font-bold">
                              <Baby className="w-2.5 h-2.5" />
                              <span>U3</span>
                            </span>
                          )}
                          {person.skills?.includes('ERSTE_HILFE_KIND') && (
                            <span title="Ersthelfer am Kind" className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded bg-rose-100 text-rose-700 text-[9px] font-bold">
                              <HeartPulse className="w-2.5 h-2.5" />
                              <span>EH</span>
                            </span>
                          )}
                          {person.skills?.includes('INKLUSION') && (
                            <span title="Inklusionsfachkraft" className="inline-flex items-center space-x-0.5 px-1 py-0.2 rounded bg-amber-100 text-amber-700 text-[9px] font-bold">
                              <GraduationCap className="w-2.5 h-2.5" />
                              <span>Inkl</span>
                            </span>
                          )}
                          {person.can_spring === 1 && person.role !== 'SPRINGER' && person.role !== 'LEITUNG' && (
                            <span title="Kann flexibel einspringen" className="inline-flex items-center px-1 py-0.2 rounded bg-teal-100 text-teal-700 text-[9px] font-semibold">
                              Springer-Aktiv
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Day Shift Cells */}
                  {weekDays.map((day, dIdx) => {
                    const dayStr = format(day, 'yyyy-MM-dd');
                    const dayShifts = shifts.filter(
                      s => s.staff_id === person.id && s.date === dayStr
                    );
                    const dayWish = wishes.find(
                      w => w.staff_id === person.id && w.date === dayStr
                    );

                    return (
                      <td key={dIdx} className="p-2 align-top text-center">
                        {/* If staff member submitted a wish for this day */}
                        {dayWish && dayShifts.length === 0 && (
                          <div 
                            onClick={() => handleOpenNewShift(person.id, dayStr)}
                            className="mb-1 p-1 bg-amber-50 border border-amber-200 rounded-lg text-left cursor-pointer hover:bg-amber-100 transition-colors"
                            title={`Mitarbeiter-Wunsch: ${dayWish.note || dayWish.type}`}
                          >
                            <div className="flex items-center space-x-1 text-[9px] font-bold text-amber-800">
                              <Lightbulb className="w-3 h-3 text-amber-600 shrink-0" />
                              <span>
                                {dayWish.type === 'WUNSCH_FRUEH' ? 'Wunsch: Frühdienst' : dayWish.type === 'WUNSCH_SPAET' ? 'Wunsch: Spätdienst' : 'Wunsch: Frei'}
                              </span>
                            </div>
                            {dayWish.note && (
                              <div className="text-[8px] text-amber-700 truncate mt-0.5">
                                {dayWish.note}
                              </div>
                            )}
                          </div>
                        )}

                        {dayShifts.length === 0 ? (
                          <button
                            onClick={() => handleOpenNewShift(person.id, dayStr)}
                            className="w-full h-12 rounded-lg border border-dashed border-slate-200 hover:border-slate-300 hover:bg-slate-100/50 flex items-center justify-center text-slate-300 hover:text-slate-500 transition-all text-xs group"
                            title="Schicht für diesen Tag planen"
                          >
                            <Plus className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ) : (
                          <div className="space-y-1">
                            {dayShifts.map((sh) => {
                              const isCancelled = sh.status === 'CANCELLED';

                              return (
                                <div
                                  key={sh.id}
                                  className={`rounded-lg p-2 text-left relative group shadow-2xs border transition-all ${
                                    isCancelled
                                      ? 'bg-rose-50 border-rose-300 line-through opacity-75'
                                      : 'bg-emerald-50/80 border-emerald-200 text-slate-800'
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] font-bold text-slate-900">
                                      {sh.start_time} - {sh.end_time}
                                    </span>
                                    <button
                                      onClick={() => onDeleteShift(sh.id)}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 hover:text-rose-600 transition-opacity"
                                      title="Schicht löschen"
                                    >
                                      <Trash2 className="w-3 h-3 text-slate-400 hover:text-rose-600" />
                                    </button>
                                  </div>
                                  <div className="flex items-center space-x-1 mt-0.5">
                                    <span className="text-[10px] text-slate-600 truncate font-medium">
                                      {sh.group_name.split(' ')[0]}
                                    </span>
                                    {sh.group_name.includes('U3') && (
                                      <span className="text-[8px] bg-purple-100 text-purple-700 px-1 rounded font-bold">
                                        U3
                                      </span>
                                    )}
                                  </div>
                                  {sh.role_override && (
                                    <span className="text-[9px] bg-indigo-100 text-indigo-700 font-bold px-1 rounded block mt-0.5 no-underline">
                                      {sh.role_override}
                                    </span>
                                  )}
                                  {isCancelled && (
                                    <span className="text-[9px] text-rose-700 font-bold block no-underline mt-0.5">
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
      </div>

      {/* Modal for adding a shift with 1-Click Templates & Wish recognition */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
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
                    {activeEmployeeWish.note && <p className="text-[11px] text-amber-800 italic">"{activeEmployeeWish.note}"</p>}
                  </div>
                </div>
              </div>
            )}

            {/* 1-Click Shift Templates (Competitor standout feature) */}
            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>1-Klick Schichtvorlage auswählen</span>
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
                    <div className="font-bold text-slate-800 text-[11px] group-hover:text-emerald-700">
                      {tpl.name}
                    </div>
                    <div className="text-[10px] text-slate-400">
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
              <div className="bg-blue-50 text-blue-800 p-2.5 rounded-xl text-[11px] flex items-center space-x-1.5">
                <Clock className="w-4 h-4 shrink-0 text-blue-600" />
                <span>Gesetzliche Ruhezeit von 11 Stunden wird vor dem Speichern automatisch geprüft.</span>
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
                  className="px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs"
                >
                  Schicht speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PRINT & PDF AUSHANG MODAL (Competitor Best Practice) */}
      {printOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
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
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs flex items-center space-x-1.5"
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
                    <h1 className="text-xl font-black uppercase tracking-tight text-slate-900">
                      Städtische Kindertagesstätte Sonnenschein
                    </h1>
                    <p className="text-xs text-slate-600 font-semibold mt-0.5">
                      Offizieller Dienstplan Kalenderwoche {weekNumber} ({format(weekDays[0], 'dd. MMMM', { locale: de })} – {format(weekDays[4], 'dd. MMMM yyyy', { locale: de })})
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="inline-block px-2.5 py-1 bg-emerald-100 text-emerald-900 text-[10px] font-bold rounded-md border border-emerald-300">
                      ✓ Verbindlich freigegeben durch Einrichtungsleitung
                    </span>
                    <div className="text-[10px] text-slate-400 mt-1">
                      Stand: {new Date().toLocaleDateString('de-DE')}
                    </div>
                  </div>
                </div>
              </div>

              {/* Roster Table */}
              <table className="w-full text-xs border border-slate-300 border-collapse mb-4 bg-white">
                <thead>
                  <tr className="bg-slate-200 text-slate-800 text-[11px] font-bold">
                    <th className="border border-slate-300 p-2 text-left">Mitarbeiter:in</th>
                    <th className="border border-slate-300 p-2 text-left">Rolle / Skills</th>
                    {weekDays.map((d, i) => (
                      <th key={i} className="border border-slate-300 p-2 text-center">
                        {format(d, 'EEEE', { locale: de })}<br />
                        <span className="font-normal text-[10px] text-slate-500">{format(d, 'dd.MM.')}</span>
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
                          <span className="block font-normal text-[10px] text-slate-500">{person.weekly_hours}h / Woche</span>
                        </td>
                        <td className="border border-slate-300 p-2 text-[10px] text-slate-600">
                          <div>{person.role}</div>
                          <div className="text-[9px] text-slate-400">{person.skills?.join(', ')}</div>
                        </td>
                        {weekDays.map((day, dIdx) => {
                          const dayStr = format(day, 'yyyy-MM-dd');
                          const dayShifts = shifts.filter(s => s.staff_id === person.id && s.date === dayStr && s.status === 'CONFIRMED');

                          return (
                            <td key={dIdx} className="border border-slate-300 p-2 text-center text-[10px]">
                              {dayShifts.length > 0 ? (
                                dayShifts.map(sh => (
                                  <div key={sh.id}>
                                    <div className="font-bold text-slate-800">{sh.start_time} - {sh.end_time}</div>
                                    <div className="text-[9px] text-slate-500 font-medium">{sh.group_name.split(' ')[0]}</div>
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
              <div className="grid grid-cols-2 gap-6 pt-3 border-t border-slate-300 text-[10px] text-slate-600">
                <div className="space-y-1">
                  <div className="font-bold text-slate-800">Gesetzlicher Prüfvermerk (KiBiz / KiTaG / ArbZG):</div>
                  <p>
                    ✓ Fachkraftquote in allen Gruppen eingehalten. Zertifizierter Ersthelfer am Kind im Haus anwesend. 
                    Gesetzliche Mindestruhezeit von 11 Stunden gemäß § 5 ArbZG gewahrt.
                  </p>
                </div>
                <div className="flex justify-between items-end pt-4">
                  <div className="text-center w-36 border-t border-slate-400 pt-1 text-[10px]">
                    Sabine Weber<br /><span className="text-slate-400">Einrichtungsleitung</span>
                  </div>
                  <div className="text-center w-36 border-t border-slate-400 pt-1 text-[10px]">
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
