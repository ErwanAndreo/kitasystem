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
  Calendar,
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
  const [showAllProposals, setShowAllProposals] = useState(false);

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
        <div className="bg-white rounded-2xl p-5 border border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div className="flex items-center space-x-3">
              <div className="h-9 w-9 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <h3 className="text-base font-bold text-slate-900">
                    Vertretungsvorschläge
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800">
                    {pendingProposals.length}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Unterdeckung oder Ausfall erkannt. Prüfen und übernehmen oder verwerfen.
                </p>
              </div>
            </div>

            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="self-start sm:self-auto px-3 py-1.5 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 rounded-lg border border-slate-300 transition-colors flex items-center space-x-1.5"
            >
              <Sparkles className={`w-3.5 h-3.5 ${analyzing ? 'animate-spin' : ''}`} />
              <span>{analyzing ? 'Analysiert...' : 'Neu prüfen'}</span>
            </button>
          </div>

          {/* Proposal List */}
          <div className="space-y-3">
            {(showAllProposals ? pendingProposals : pendingProposals.slice(0, 3)).map((prop) => (
              <div
                key={prop.id}
                className="bg-slate-50 rounded-xl p-4 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md text-xs font-semibold bg-rose-100 text-rose-800 flex items-center space-x-1">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{prop.situation === 'SICKNESS' ? 'Ausfall-Kompensation' : 'Schlüssel-Sicherung'}</span>
                    </span>
                    <span className="font-semibold text-sm text-slate-900 truncate">
                      {prop.title}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    {prop.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 pt-1">
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>Datum: {prop.date}</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3.5 h-3.5" />
                      <span>Dienstzeit: {prop.start_time} - {prop.end_time} Uhr</span>
                    </span>
                    <span className="text-xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">
                      Match: {Math.round(prop.confidence_score * 100)}%
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <button
                    onClick={() => handleAccept(prop.id)}
                    disabled={actingId === prop.id}
                    className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs rounded-lg transition-colors flex items-center space-x-1.5"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{actingId === prop.id ? 'Wird gebucht...' : 'Übernehmen'}</span>
                  </button>

                  <button
                    onClick={() => handleDismiss(prop.id)}
                    disabled={actingId === prop.id}
                    className="p-2 hover:bg-slate-200 text-slate-500 hover:text-slate-800 rounded-lg transition-colors"
                    title="Vorschlag verwerfen"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {pendingProposals.length > 3 && (
            <button
              onClick={() => setShowAllProposals(!showAllProposals)}
              className="mt-3 text-xs font-semibold text-indigo-700 hover:underline"
            >
              {showAllProposals ? 'Weniger anzeigen' : `Alle ${pendingProposals.length} anzeigen`}
            </button>
          )}
        </div>
      )}

      {/* 2. 30-MINUTE NOTIFICATION BUFFER WIDGET */}
      {queueItems.length > 0 && (
        <div className="bg-amber-50/90 border border-amber-200 rounded-2xl p-4">
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
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-200 text-amber-900">
                    {queueItems.length} {queueItems.length === 1 ? 'Mitarbeiter' : 'Mitarbeiter'} in Queue
                  </span>
                </div>
                <p className="text-xs text-amber-800 mt-0.5">
                  Um Mehrfach-Pushmeldungen zu vermeiden, werden Schichtanpassungen gesammelt und nach 30 Minuten als <strong>1 gebündelte Benachrichtigung</strong> versendet.
                  <span className="block mt-1 font-semibold text-emerald-800">
                    <strong>Eil-Regel aktiv:</strong> Schichten innerhalb der nächsten 24 Std. werden ohne Verzögerung <strong>sofort zugestellt</strong>.
                  </span>
                </p>

                {/* Queue details preview */}
                <div className="flex flex-wrap gap-2 mt-2">
                  {queueItems.map((item) => (
                    <div
                      key={item.id}
                      className="inline-flex items-center space-x-1.5 bg-white border border-amber-200 px-2.5 py-1 rounded-xl text-xs font-semibold text-slate-700"
                    >
                      <span
                        className="w-5 h-5 rounded-md flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: item.staff_color || '#16a34a' }}
                      >
                        {item.staff_avatar}
                      </span>
                      <span>{item.staff_name.split(' ')[0]}:</span>
                      <span className="text-slate-500 font-normal">{item.summary}</span>
                      <span className="text-amber-700 font-bold ml-1 text-xs">
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
              className="self-start sm:self-center px-3.5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-95 text-white font-bold text-xs rounded-xl transition-all flex items-center space-x-1.5 shrink-0"
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
