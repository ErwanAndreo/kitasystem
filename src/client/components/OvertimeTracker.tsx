import React, { useState, useEffect } from 'react';
import { TimeOverviewItem, Staff } from '../types';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  PlusCircle, 
  MinusCircle, 
  Calendar, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  History,
  X
} from 'lucide-react';
import { format } from 'date-fns';

interface OvertimeTrackerProps {
  staffList: Staff[];
  onRefresh: () => void;
}

export const OvertimeTracker: React.FC<OvertimeTrackerProps> = ({ staffList, onRefresh }) => {
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [overview, setOverview] = useState<TimeOverviewItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal for new overtime adjustment
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '');
  const [adjHours, setAdjHours] = useState('2.5');
  const [adjReason, setAdjReason] = useState('Elternabend Vorschulkinder (18:00 - 20:30 Uhr)');
  const [adjDate, setAdjDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [submitting, setSubmitting] = useState(false);

  // History inspection modal
  const [historyStaff, setHistoryStaff] = useState<Staff | null>(null);
  const [historyItems, setHistoryItems] = useState<any[]>([]);

  useEffect(() => {
    loadOverview();
  }, [month]);

  const loadOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/time-overview?month=${month}`);
      const json = await res.json();
      setOverview(json.overview || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAdjustment = (staffId?: string) => {
    if (staffId) setSelectedStaffId(staffId);
    setModalOpen(true);
  };

  const handleSubmitAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/staff/${selectedStaffId}/overtime-adjustment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          hours: parseFloat(adjHours),
          reason: adjReason,
          date: adjDate
        })
      });

      if (!res.ok) throw new Error('Buchung fehlgeschlagen');
      setModalOpen(false);
      await loadOverview();
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleViewHistory = async (staff: Staff) => {
    setHistoryStaff(staff);
    try {
      const res = await fetch(`/api/staff/${staff.id}/overtime-adjustments`);
      const data = await res.json();
      setHistoryItems(data);
    } catch (e) {
      console.error(e);
    }
  };

  const totalOvertime = overview.reduce((acc, curr) => acc + curr.overtime_hours, 0);
  const positiveOvertimeCount = overview.filter(o => o.overtime_hours > 0).length;

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mt-6">
      {/* Header with Month Selector & New Adjustment Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
              <Clock className="w-5 h-5 text-indigo-600" />
              <span>Überstunden- & Zeitkonten-Tracking</span>
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Leitungs-Cockpit
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Vertragliche Sollstunden, geleistete Arbeitszeit, Sonderbuchungen & Ausgleich
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 bg-slate-100 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-700">
            <Calendar className="w-4 h-4 text-slate-500" />
            <span>Monat:</span>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="bg-transparent font-bold focus:outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => handleOpenAdjustment()}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Überstunden anpassen</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-5">
        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Gesamter Teamsaldo ({month})
          </div>
          <div className={`text-2xl font-black mt-1 ${totalOvertime >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
            {totalOvertime >= 0 ? `+${totalOvertime.toFixed(1)}` : totalOvertime.toFixed(1)} Std.
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Netto-Differenz über alle Mitarbeiter
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Mitarbeiter mit Mehrarbeit
          </div>
          <div className="text-2xl font-black text-slate-900 mt-1">
            {positiveOvertimeCount} von {overview.length}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5 flex items-center space-x-1">
            <TrendingUp className="w-3 h-3" />
            <span>Im Plus oder ausgeglichen</span>
          </div>
        </div>

        <div className="bg-slate-50 rounded-xl p-4 border border-slate-200/80">
          <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Transparenz & Änderungsprotokoll
          </div>
          <div className="text-2xl font-black text-indigo-600 mt-1">
            100%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Jede Gutschrift ist für die Mitarbeiterin in der App einsehbar
          </div>
        </div>
      </div>

      {/* Time Tracking Table */}
      <div className="overflow-x-auto border border-slate-200 rounded-xl">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
            <tr>
              <th className="p-3">Mitarbeiter:in</th>
              <th className="p-3">Erwartete Wochenstunden</th>
              <th className="p-3">Monatssoll</th>
              <th className="p-3">Geleistet (Ist)</th>
              <th className="p-3">Sonderstunden / Gutschrift</th>
              <th className="p-3">Überstundensaldo</th>
              <th className="p-3 text-right">Aktionen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {overview.map((item) => {
              const staffObj = staffList.find(s => s.id === item.staff_id);
              const isPositive = item.overtime_hours >= 0;

              return (
                <tr key={item.staff_id} className="hover:bg-slate-50/70 transition-colors">
                  {/* Name & Role */}
                  <td className="p-3 font-semibold text-slate-900">
                    <div className="flex items-center space-x-2.5">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                        style={{ backgroundColor: item.color }}
                      >
                        {item.avatar}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{item.name}</div>
                        <div className="text-[10px] text-slate-400 font-normal">{item.role}</div>
                      </div>
                    </div>
                  </td>

                  {/* Weekly Hours */}
                  <td className="p-3 font-bold text-slate-700">
                    {item.weekly_hours} Std./Woche
                  </td>

                  {/* Monthly Target */}
                  <td className="p-3 text-slate-600">
                    {item.target_month_hours} Std.
                  </td>

                  {/* Logged actual */}
                  <td className="p-3 font-bold text-slate-900">
                    {item.actual_hours} Std.
                  </td>

                  {/* Adjustments */}
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[10px] ${
                        item.adjustments_hours > 0
                          ? 'bg-blue-100 text-blue-800'
                          : item.adjustments_hours < 0
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {item.adjustments_hours > 0 ? `+${item.adjustments_hours}h` : `${item.adjustments_hours}h`}
                    </span>
                  </td>

                  {/* Overtime Saldo */}
                  <td className="p-3">
                    <span
                      className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg font-black text-xs ${
                        isPositive
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                      <span>{isPositive ? `+${item.overtime_hours}h` : `${item.overtime_hours}h`}</span>
                    </span>
                  </td>

                  {/* Action Buttons */}
                  <td className="p-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleOpenAdjustment(item.staff_id)}
                        className="p-1.5 bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg transition-colors"
                        title="Überstundengutschrift oder Ausgleich buchen"
                      >
                        <PlusCircle className="w-4 h-4" />
                      </button>

                      {staffObj && (
                        <button
                          onClick={() => handleViewHistory(staffObj)}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors"
                          title="Korrekturhistorie ansehen"
                        >
                          <History className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal: Add Overtime Adjustment */}
      {modalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span>Überstunden anpassen / Gutschrift buchen</span>
              </h3>
              <button onClick={() => setModalOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitAdjustment} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Mitarbeiter:in</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
                >
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role} • {s.weekly_hours}h/Woche)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stunden (+ Gutschrift / - Ausgleich)
                  </label>
                  <input
                    type="number"
                    step="0.25"
                    required
                    value={adjHours}
                    onChange={(e) => setAdjHours(e.target.value)}
                    placeholder="z.B. 2.5 oder -8.0"
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-bold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Datum</label>
                  <input
                    type="date"
                    required
                    value={adjDate}
                    onChange={(e) => setAdjDate(e.target.value)}
                    className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Offizielle Begründung</label>
                <input
                  type="text"
                  required
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  placeholder="z.B. Elternabend Vorschulkinder, Sommerfest, Zeitausgleich"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
                />
              </div>

              {/* Notice for transparency */}
              <div className="p-3 bg-blue-50 rounded-xl border border-blue-200 text-xs text-blue-900 flex items-start space-x-2">
                <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Transparenz-Garantie:</strong> Diese Buchung wird sofort mit Datum und Begründung in das digitale Zeitkonto der Mitarbeiterin übertragen und in ihrer App angezeigt.
                </span>
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-xs disabled:opacity-50"
                >
                  Verbindlich buchen & Mitarbeiterin benachrichtigen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: View Overtime Adjustment History for Staff */}
      {historyStaff && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Überstunden-Historie: {historyStaff.name}
                </h3>
                <p className="text-xs text-slate-500">Alle gebuchten Gutschriften & Ausgleiche</p>
              </div>
              <button onClick={() => setHistoryStaff(null)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="mt-4 max-h-[340px] overflow-y-auto space-y-2">
              {historyItems.length === 0 ? (
                <div className="text-xs text-slate-400 py-6 text-center">
                  Bisher keine manuellen Überstundenbuchungen vorhanden.
                </div>
              ) : (
                historyItems.map((item) => (
                  <div key={item.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>{item.reason}</span>
                      <span className={`px-2 py-0.5 rounded-md text-[11px] font-black ${item.hours >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                        {item.hours >= 0 ? `+${item.hours}h` : `${item.hours}h`}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                      <span>Gebucht von: {item.created_by}</span>
                      <span>Datum: {item.date}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => setHistoryStaff(null)}
                className="px-4 py-2 text-xs font-semibold bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl"
              >
                Schließen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
