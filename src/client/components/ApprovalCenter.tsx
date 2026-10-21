import React, { useState } from 'react';
import { Approval } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  ArrowRightLeft, 
  Palmtree, 
  AlertOctagon, 
  ShieldCheck, 
  MessageSquare,
  User,
  Calendar,
  Sparkles
} from 'lucide-react';

interface ApprovalCenterProps {
  approvals: Approval[];
  onDecide: (id: string, action: 'APPROVED' | 'REJECTED', note?: string) => Promise<void>;
  onRefresh: () => void;
}

export const ApprovalCenter: React.FC<ApprovalCenterProps> = ({ approvals, onDecide, onRefresh }) => {
  const [filter, setFilter] = useState<'ALL' | 'PENDING' | 'DECIDED'>('PENDING');
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const filteredApprovals = approvals.filter(a => {
    if (filter === 'PENDING') return a.status === 'PENDING';
    if (filter === 'DECIDED') return a.status !== 'PENDING';
    return true;
  });

  const pendingCount = approvals.filter(a => a.status === 'PENDING').length;

  const handleApprove = async (id: string) => {
    setLoadingId(id);
    try {
      await onDecide(id, 'APPROVED');
    } finally {
      setLoadingId(null);
    }
  };

  const handleConfirmReject = async () => {
    if (!rejectingId) return;
    setLoadingId(rejectingId);
    try {
      await onDecide(rejectingId, 'REJECTED', rejectNote);
      setRejectingId(null);
      setRejectNote('');
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm mb-6">
      {/* Title & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-base font-bold text-slate-900">
              Freigabe-Center der Einrichtungsleitung
            </h2>
            {pendingCount > 0 && (
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white animate-pulse">
                {pendingCount} offen
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Verbindliche Leitungsfreigaben für Schichtwechsel, Urlaub und Notfallmaßnahmen
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          <button
            onClick={() => setFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'PENDING' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Ausstehend ({pendingCount})
          </button>
          <button
            onClick={() => setFilter('DECIDED')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'DECIDED' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Historie
          </button>
          <button
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg transition-all ${
              filter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Alle ({approvals.length})
          </button>
        </div>
      </div>

      {/* Approvals List */}
      <div className="mt-4 space-y-4">
        {filteredApprovals.length === 0 ? (
          <div className="text-center py-10 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2 opacity-80" />
            <p className="text-sm font-semibold text-slate-700">Keine offenen Freigaben!</p>
            <p className="text-xs text-slate-400 mt-0.5">Alle Anträge wurden bearbeitet.</p>
          </div>
        ) : (
          filteredApprovals.map((appr) => {
            const isPending = appr.status === 'PENDING';
            const isApproved = appr.status === 'APPROVED';
            const isRejected = appr.status === 'REJECTED';

            const isSwap = appr.type === 'SHIFT_SWAP';
            const isVacation = appr.type === 'VACATION_REQUEST';
            const isEmergency = appr.type === 'EMERGENCY_REPLACEMENT';

            return (
              <div
                key={appr.id}
                className={`rounded-xl border p-4.5 transition-all ${
                  isPending
                    ? 'bg-amber-50/20 border-amber-200 shadow-xs ring-1 ring-amber-100'
                    : isApproved
                    ? 'bg-emerald-50/20 border-emerald-200 opacity-90'
                    : 'bg-slate-50 border-slate-200 opacity-75'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Left: Type Icon & Content */}
                  <div className="flex items-start space-x-3.5">
                    <div
                      className={`p-2.5 rounded-xl text-white shadow-xs shrink-0 ${
                        isSwap
                          ? 'bg-blue-600'
                          : isVacation
                          ? 'bg-emerald-600'
                          : isEmergency
                          ? 'bg-rose-600'
                          : 'bg-indigo-600'
                      }`}
                    >
                      {isSwap && <ArrowRightLeft className="w-5 h-5" />}
                      {isVacation && <Palmtree className="w-5 h-5" />}
                      {isEmergency && <AlertOctagon className="w-5 h-5" />}
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">
                          {appr.details.title}
                        </span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            isPending
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : isApproved
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {isPending ? 'Wartet auf Leitungs-Freigabe' : isApproved ? '✓ Freigegeben' : '✗ Abgelehnt'}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Eingereicht: {new Date(appr.created_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })} Uhr
                        </span>
                      </div>

                      <p className="text-xs text-slate-700 font-medium">
                        {appr.details.description}
                      </p>

                      {/* Safety / Compliance Checks */}
                      <div className="flex flex-wrap items-center gap-3 pt-1 text-xs">
                        {appr.details.ratio_impact && (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60 font-medium text-[11px]">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{appr.details.ratio_impact}</span>
                          </span>
                        )}
                        {appr.details.arbzg_check && (
                          <span className="inline-flex items-center space-x-1 text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200/60 font-medium text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-blue-600" />
                            <span>{appr.details.arbzg_check}</span>
                          </span>
                        )}
                        {appr.details.remaining_vacation && (
                          <span className="text-slate-500 text-[11px]">
                            Resturlaub: <strong>{appr.details.remaining_vacation}</strong>
                          </span>
                        )}
                      </div>

                      {/* Decision Details if already decided */}
                      {appr.decided_at && (
                        <div className="text-[11px] text-slate-500 pt-1 italic">
                          Entscheidung durch {appr.decision_by} am{' '}
                          {new Date(appr.decided_at).toLocaleDateString('de-DE')}
                          {appr.decision_note && ` (Notiz: "${appr.decision_note}")`}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right: 1-Click Action Buttons for Einrichtungsleitung */}
                  {isPending && (
                    <div className="flex items-center space-x-2 shrink-0 self-end lg:self-center">
                      <button
                        disabled={loadingId === appr.id}
                        onClick={() => handleApprove(appr.id)}
                        className="inline-flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-4 py-2 rounded-xl shadow-xs transition-all active:scale-95 disabled:opacity-50"
                        title="Antrag sofort verbindlich freigeben und im Dienstplan aktivieren"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Freigeben</span>
                      </button>

                      <button
                        disabled={loadingId === appr.id}
                        onClick={() => setRejectingId(appr.id)}
                        className="inline-flex items-center space-x-1 bg-white hover:bg-rose-50 text-rose-700 border border-slate-300 hover:border-rose-300 font-semibold text-xs px-3 py-2 rounded-xl transition-all disabled:opacity-50"
                        title="Antrag ablehnen"
                      >
                        <XCircle className="w-4 h-4" />
                        <span>Ablehnen</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Reject Note Modal / Inline input */}
                {rejectingId === appr.id && (
                  <div className="mt-3 p-3 bg-white rounded-lg border border-rose-200">
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Grund für die Ablehnung (wird dem Mitarbeiter angezeigt):
                    </label>
                    <input
                      type="text"
                      value={rejectNote}
                      onChange={(e) => setRejectNote(e.target.value)}
                      placeholder="z.B. Schlüssel an diesem Tag leider nicht gedeckt / Vorrang für..."
                      className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500 mb-2"
                    />
                    <div className="flex justify-end space-x-2">
                      <button
                        onClick={() => setRejectingId(null)}
                        className="text-xs px-3 py-1 text-slate-600 hover:bg-slate-100 rounded-lg"
                      >
                        Abbrechen
                      </button>
                      <button
                        onClick={handleConfirmReject}
                        className="text-xs px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg"
                      >
                        Verbindlich ablehnen
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
