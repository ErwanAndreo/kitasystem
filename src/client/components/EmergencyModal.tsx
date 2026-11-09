import React, { useState, useEffect } from 'react';
import { Staff } from '../types';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Send, 
  X, 
  Sparkles, 
  HeartPulse, 
  Baby, 
  GraduationCap 
} from 'lucide-react';

interface EmergencyModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffList: Staff[];
  onTriggerEmergency: (staff_id: string, days: number, reason: string, substitute_id?: string) => Promise<void>;
}

interface Suggestion {
  staff_id: string;
  name: string;
  role: string;
  qualification: string;
  is_fachkraft: boolean;
  can_spring: boolean;
  skills: string[];
  secondary_roles: string[];
  matching_skills: string[];
  has_all_required: boolean;
  is_already_working: boolean;
  score: number;
  note: string;
}

export const EmergencyModal: React.FC<EmergencyModalProps> = ({
  isOpen,
  onClose,
  staffList,
  onTriggerEmergency
}) => {
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[1]?.id || staffList[0]?.id || '');
  const [days, setDays] = useState(1);
  const [reason, setReason] = useState('Akute Krankmeldung / Schnupfen & Fieber');
  const [loading, setLoading] = useState(false);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [requiredSkills, setRequiredSkills] = useState<string[]>([]);
  const [groupName, setGroupName] = useState<string>('');
  const [chosenSubstituteId, setChosenSubstituteId] = useState<string>('');

  const selectedStaff = staffList.find(s => s.id === selectedStaffId);

  // Fetch intelligent skill-based substitute suggestions whenever selected person changes
  useEffect(() => {
    if (!isOpen || !selectedStaffId) return;

    const staffMember = staffList.find(s => s.id === selectedStaffId);
    const groupId = staffMember?.target_group_id || 'g_u3_maeuse';

    setSuggestionsLoading(true);
    fetch(`/api/emergency/suggestions?group_id=${groupId}`)
      .then(res => res.json())
      .then(data => {
        setGroupName(data.group || 'Gruppe');
        setRequiredSkills(data.required_skills || []);
        const filteredSuggestions = (data.suggestions || []).filter(
          (s: Suggestion) => s.staff_id !== selectedStaffId
        );
        setSuggestions(filteredSuggestions);
        if (filteredSuggestions.length > 0) {
          setChosenSubstituteId(filteredSuggestions[0].staff_id);
        }
      })
      .catch(err => console.error('Error fetching suggestions:', err))
      .finally(() => setSuggestionsLoading(false));
  }, [isOpen, selectedStaffId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onTriggerEmergency(selectedStaffId, days, reason, chosenSubstituteId);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const getSkillBadge = (skill: string) => {
    switch (skill) {
      case 'U3_QUALIFIKATION':
        return (
          <span key={skill} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
            <Baby className="w-3 h-3 text-purple-600" />
            <span>U3-Zertifikat</span>
          </span>
        );
      case 'ERSTE_HILFE_KIND':
        return (
          <span key={skill} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
            <HeartPulse className="w-3 h-3 text-rose-600" />
            <span>Ersthelfer</span>
          </span>
        );
      case 'INKLUSION':
        return (
          <span key={skill} className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded-md text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
            <GraduationCap className="w-3 h-3 text-amber-600" />
            <span>Inklusion</span>
          </span>
        );
      default:
        return (
          <span key={skill} className="inline-flex items-center px-1.5 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-700">
            {skill}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 my-8">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="p-2 bg-rose-100 text-rose-700 rounded-xl">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Notfall- & Vertretungsassistent (Skill-Match)
              </h3>
              <p className="text-xs text-slate-500">
                Erfasst Krankmeldungen, sichert den Betreuungsschlüssel & schlägt passende Vertretungen vor
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
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
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

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dauer
              </label>
              <select
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
                className="w-full text-xs p-2.5 border border-slate-300 rounded-xl bg-white font-medium"
              >
                <option value={1}>1 Tag (Heute)</option>
                <option value={2}>2 Tage</option>
                <option value={3}>3 Tage</option>
                <option value={5}>Ganze Woche (5 Tage)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Grund / Notiz
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2.5 border border-slate-300 rounded-xl"
            />
          </div>

          {/* Group requirement radar header */}
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900">
                Betroffene Stammgruppe: <span className="text-emerald-700">{groupName}</span>
              </span>
              <div className="flex items-center space-x-1.5">
                <span className="text-xs text-slate-500 font-medium">Pflicht-Skills:</span>
                <div className="flex space-x-1">
                  {requiredSkills.map(getSkillBadge)}
                </div>
              </div>
            </div>
          </div>

          {/* Intelligent Substitute Suggestions Section */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                <span>Intelligente Springer- & Vertretungsvorschläge (nach Skill-Match gerankt)</span>
              </label>
              <span className="text-xs text-slate-400">
                Klicken zum Auswählen
              </span>
            </div>

            {suggestionsLoading ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Berechne Skill-Matching & Betreuungsschlüssel...
              </div>
            ) : suggestions.length === 0 ? (
              <div className="p-4 bg-rose-50 text-rose-800 rounded-xl text-xs border border-rose-200">
                Keine Springer verfügbar!
              </div>
            ) : (
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {suggestions.slice(0, 4).map((item) => {
                  const isSelected = chosenSubstituteId === item.staff_id;
                  const isLeitung = item.role === 'LEITUNG';
                  const isSpringer = item.role === 'SPRINGER';

                  return (
                    <div
                      key={item.staff_id}
                      onClick={() => setChosenSubstituteId(item.staff_id)}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/30'
                          : 'bg-white hover:bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start space-x-2.5">
                          <input
                            type="radio"
                            checked={isSelected}
                            onChange={() => setChosenSubstituteId(item.staff_id)}
                            className="mt-1 text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                          />
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-xs font-bold text-slate-900">
                                {item.name}
                              </span>
                              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                                isSpringer
                                  ? 'bg-indigo-100 text-indigo-800'
                                  : isLeitung
                                  ? 'bg-purple-100 text-purple-800'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {item.role}
                              </span>
                              {item.can_spring && !isSpringer && (
                                <span className="text-xs font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                                  Springer-Bereitschaft
                                </span>
                              )}
                            </div>

                            <p className="text-xs text-slate-600 mt-0.5">
                              {item.note}
                            </p>

                            <div className="flex flex-wrap items-center gap-1 mt-1.5">
                              {item.skills.map(getSkillBadge)}
                            </div>
                          </div>
                        </div>

                        {/* Match Score Badge */}
                        <div className="text-right shrink-0">
                          <span className={`inline-block px-2 py-0.5 rounded-lg text-xs font-bold ${
                            item.has_all_required
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {item.has_all_required ? '100% Match' : 'Teil-Match'}
                          </span>
                          {item.is_already_working && (
                            <span className="block text-xs text-amber-600 font-semibold mt-0.5">
                              Bereits im Dienst
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Workflow guidance */}
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900 space-y-1">
            <div className="font-bold flex items-center space-x-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Sicherheit & Einrichtungsleitung-Freigabe</span>
            </div>
            <p className="text-xs text-amber-800 leading-relaxed">
              Nach dem Absenden wird der Krankheitsausfall dokumentiert. Der ausgewählte Vertretungsvorschlag 
              wird im <strong>Freigabe-Center der Leitung</strong> angelegt, wo die Leitung mit 1 Klick die verbindliche 
              Schichtaktivierung freigibt.
            </p>
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={loading || !chosenSubstituteId}
              className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-700 text-white rounded-xl flex items-center space-x-1.5 disabled:opacity-50 transition-all active:scale-95"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Krankmeldung & Vertretungsvorschlag einreichen</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
