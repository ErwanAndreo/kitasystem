import React, { useState } from 'react';
import { Staff } from '../types';
import { ShieldAlert, AlertTriangle, Send, X } from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  onTriggerEmergency: (staff_id: string, days: number, reason: string) => Promise<void>;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onTriggerEmergency
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[1]?.id || '');
  const [days, setDays] = useState(2);
  const [reason, setReason] = useState('Akute Erkältung / Krankmeldung morgens');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onTriggerEmergency(selectedStaffId, days, reason);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Notfall-Krisenmanager (Krankmeldung)
              </h3>
              <p className="text-xs text-slate-500">
                Löst Betreuungsschlüssel-Neuberechnung & Sofort-Vertretung aus
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Wer hat sich krankgemeldet?
            </label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
            >
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.role} • {s.qualification})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dauer (voraussichtlich)
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white"
              >
                <option value={1}>1 Tag (Heute)</option>
                <option value={2}>2 Tage</option>
                <option value={3}>3 Tage</option>
                <option value={5}>Ganze Woche (5 Tage)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Grund / Bemerkung
              </label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
              />
            </div>
          </div>

          {/* Workflow explanation */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center space-x-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Was passiert nach dem Klick?</span>
            </div>
            <ul className="list-disc list-inside text-[11px] text-amber-800 space-y-0.5 pt-1">
              <li>Heutige Schicht des Mitarbeiters wird storniert.</li>
              <li>Betreuungsschlüssel der betroffenen Gruppe wird live neu berechnet.</li>
              <li>System prüft verfügbare Springer (z.B. Julia Fischer).</li>
              <li>Ein Vorschlag landet direkt im <strong>Freigabe-Center der Leitung</strong>.</li>
            </ul>
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs flex items-center space-x-1.5 disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Krankmeldung erfassen & Assistent starten</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
