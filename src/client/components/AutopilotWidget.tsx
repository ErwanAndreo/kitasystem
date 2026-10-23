import React, { useState } from 'react';
import { AutopilotProposal, NotificationQueueItem } from '../types';
import { 
  Bot, 
  CheckCircle2, 
  X, 
  Clock, 
  AlertTriangle, 
  Sparkles, 
  Send, 
  Layers, 
  UserCheck, 
  Calendar,
  PackageCheck
} from 'lucide-react';

interface AutopilotWidgetProps {
  proposals: AutopilotProposal[];
  queueItems: NotificationQueueItem[];
  autopilotEnabled: boolean;
  onAcceptProposal: (id: string) => Promise<void>;
  onDismissProposal: (id: string) => Promise<void>;
  onFlushQueue: () => Promise<void>;
  onTriggerAnalysis: () => Promise<void>;
}

export const AutopilotWidget: React.FC<AutopilotWidgetProps> = ({
  proposals,
  queueItems,
  autopilotEnabled,
  onAcceptProposal,
  onDismissProposal,
  onFlushQueue,
  onTriggerAnalysis
}) => {
  const [actingId, setActingId] = useState<string | null>(null);
  const [flushing, setFlushing] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const pendingProposals = proposals.filter(p => p.status === 'PENDING');

  const handleAccept = async (id: string) => {
    setActingId(id);
    try {
      await onAcceptProposal(id);
    } finally {
      setActingId(null);
    }
  };

  const handleDismiss = async (id: string) => {
    setActingId(id);
    try {
      await onDismissProposal(id);
    } finally {
      setActingId(null);
    }
  };

  const handleFlush = async () => {
    setFlushing(true);
    try {
      await onFlushQueue();
    } finally {
      setFlushing(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      await onTriggerAnalysis();
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4 mb-6">
      {/* 1. AUTO-PILOT SITUATION REACTION / PROPOSALS */}
      {pendingProposals.length > 0 && (
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-3xl p-5 text-white shadow-lg border border-indigo-700/50 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 rounded-2xl bg-indigo-500/30 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="font-extrabold text-sm sm:text-base text-white">
                    Auto-Pilot Situations-Anpassung
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-500/40 text-indigo-200 border border-indigo-400/30">
                    {pendingProposals.length} {pendingProposals.length === 1 ? 'Vorschlag bereit' : 'Vorschläge bereit'}
                  </span>
                </div>
                <p className="text-xs text-indigo-200 mt-0.5">
                  Unterdeckung oder Ausfall erkannt. Du musst den optimierten Dienstplan nur mit 1 Klick akzeptieren:
                </p>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="self-start sm:self-auto px-3 py-1.5 bg-indigo-700/60 hover:bg-indigo-700 text-xs font-semibold text-indigo-100 rounded-xl border border-indigo-500/30 transition-all flex items-center space-x-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'Analysiert...' : 'Neu prüfen'}</span>
            </button>
          </div>

          {/* Proposal List */}
          <div className="space-y-3">
            {pendingProposals.map((prop) => (
              <div
                key={prop.id}
                className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/15 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-500/30 text-rose-200 border border-rose-400/30 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3 text-rose-300" />
                      <span>{prop.situation === 'SICKNESS' ? 'Ausfall-Kompensation' : 'Schlüssel-Sicherung'}</span>
                    </span>
                    <span className="font-bold text-xs text-white truncate">
                      {prop.title}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed">
                    {prop.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-indigo-200 pt-1">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Datum: {prop.date}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5 text-indigo-300" />
                      <span>Dienstzeit: {prop.start_time} - {prop.end_time} Uhr</span>
                    </span>
                    <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-1.5 py-0.5 rounded">
                      Match: {Math.round(prop.confidence_score * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleAccept(prop.id)}
                    disabled={actingId === prop.id}
                    className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 active:scale-95 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{actingId === prop.id ? 'Wird gebucht...' : 'Akzeptieren & Schicht buchen'}</span>
                  </button>

                  <button
                    onClick={() => handleDismiss(prop.id)}
                    disabled={actingId === prop.id}
                    className="p-2 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl transition-colors"
                    title="Vorschlag verwerfen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. 30-MINUTE NOTIFICATION BUFFER WIDGET */}
      {queueItems.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="h-9 w-9 rounded-xl bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                <Clock className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h4 className="text-xs font-bold text-amber-950">
                    Benachrichtigungspuffer aktiv (30-Minuten-Bündelung)
                  </h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-200 text-amber-900">
                    {queueItems.length} {queueItems.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'} in Queue
                  </span>
                </div>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Um Mehrfach-Pushmeldungen zu vermeiden, werden Schichtanpassungen gesammelt und nach 30 Minuten als <strong>1 gebündelte Benachrichtigung</strong> versendet.
                  <span className="block mt-1 font-semibold text-emerald-800">
                    ⚡ <strong>Eil-Regel aktiv:</strong> Schichten innerhalb der nächsten 24 Std. werden ohne Verzögerung <strong>sofort zugestellt</strong>.
                  </span>
                </p>

                {/* Queue details preview */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {queueItems.map((item) => (
                    <div
                      key={item.id}
                      className="inline-flex items-center space-x-1.5 bg-white border border-amber-200 px-2.5 py-1 rounded-xl text-[11px] font-semibold text-slate-700 shadow-xs"
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white text-[9px] font-bold"
                        style={{ backgroundColor: item.staff_color || '#16a34a' }}
                      >
                        {item.staff_avatar}
                      </span>
                      <span>{item.staff_name.split(' ')[0]}:</span>
                      <span className="text-slate-500 font-normal">{item.summary}</span>
                      <span className="text-amber-700 font-bold ml-1 text-[10px]">
                        (~{item.minutes_remaining} Min.)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <button
              onClick={handleFlush}
              disabled={flushing}
              className="self-start sm:self-center px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center space-x-1.5 shrink-0"
              title="Sofortige Auslieferung aller gebündelten Schicht-Updates an die Mitarbeiter"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{flushing ? 'Wird versendet...' : 'Jetzt sofort gebündelt senden'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
