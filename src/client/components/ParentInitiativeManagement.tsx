import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Clock, 
  Calendar, 
  CheckCircle2, 
  AlertTriangle, 
  Plus, 
  Vote, 
  FileSignature, 
  ArrowRightLeft, 
  Award, 
  Sparkles, 
  Check, 
  X, 
  ShieldCheck,
  Briefcase
} from 'lucide-react';
import { format } from 'date-fns';

interface ParentInitiativeManagementProps {
  showToast: (msg: string) => void;
}

export const ParentInitiativeManagement: React.FC<ParentInitiativeManagementProps> = ({ showToast }) => {
  const [subTab, setSubTab] = useState<'DUTIES' | 'BOARD' | 'POLLS' | 'DOCS'>('DUTIES');
  const [duties, setDuties] = useState<any[]>([]);
  const [familyStats, setFamilyStats] = useState<any[]>([]);
  const [boardMembers, setBoardMembers] = useState<any[]>([]);
  const [allParents, setAllParents] = useState<any[]>([]);
  const [polls, setPolls] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals
  const [showDutyModal, setShowDutyModal] = useState(false);
  const [showHandoverModal, setShowHandoverModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);

  // New Duty Form
  const [dutyTitle, setDutyTitle] = useState('');
  const [dutyDesc, setDutyDesc] = useState('');
  const [dutyCategory, setDutyCategory] = useState('GARTEN');
  const [dutyHours, setDutyHours] = useState(3.0);
  const [dutyMaxHelpers, setDutyMaxHelpers] = useState(4);
  const [dutyDate, setDutyDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [dutyLocation, setDutyLocation] = useState('Kita');

  // Handover Form
  const [handoverFrom, setHandoverFrom] = useState('');
  const [handoverTo, setHandoverTo] = useState('');
  const [handoverPos, setHandoverPos] = useState('1_VORSITZ');
  const [handoverNotes, setHandoverNotes] = useState('');

  // New Poll Form
  const [pollTitle, setPollTitle] = useState('');
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollCategory, setPollCategory] = useState('FESTE');
  const [pollOptions, setPollOptions] = useState(['Option A', 'Option B']);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [dutiesRes, statsRes, boardRes, pollsRes, docsRes] = await Promise.all([
        fetch('/api/parent-duties'),
        fetch('/api/parent-duties/family-stats'),
        fetch('/api/board/members'),
        fetch('/api/polls'),
        fetch('/api/documents')
      ]);

      if (dutiesRes.ok) setDuties(await dutiesRes.json());
      if (statsRes.ok) setFamilyStats(await statsRes.json());
      if (boardRes.ok) {
        const bm = await boardRes.json();
        setBoardMembers(bm);
        if (bm.length > 0) setHandoverFrom(bm[0].id);
      }
      if (pollsRes.ok) setPolls(await pollsRes.json());
      if (docsRes.ok) setDocuments(await docsRes.json());

      // Also load all parents for handover selection
      const parentsRes = await fetch('/api/children');
      if (parentsRes.ok) {
        // Fallback demo parents
        setAllParents([
          { id: 'p_anna_bergmann', name: 'Anna Bergmann', role: 'VORSTAND' },
          { id: 'p_michael_bauer', name: 'Michael Bauer', role: 'ELTERN' }
        ]);
      }
    } catch (e) {
      console.error(e);
      showToast('Fehler beim Laden der Trägervereinsdaten');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleCreateDuty = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/parent-duties', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: dutyTitle,
          description: dutyDesc,
          category: dutyCategory,
          hours_credit: dutyHours,
          max_helpers: dutyMaxHelpers,
          date: dutyDate,
          location: dutyLocation
        })
      });

      if (res.ok) {
        showToast('✓ Elterndienst erfolgreich ausgeschrieben');
        setShowDutyModal(false);
        setDutyTitle('');
        setDutyDesc('');
        loadAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirmHours = async (signupId: string, hours: number) => {
    try {
      const res = await fetch(`/api/parent-duties/duty_1/confirm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signup_id: signupId,
          hours_credited: hours,
          confirmed_by: 'Einrichtungsleitung / Vorstand'
        })
      });

      if (res.ok) {
        showToast(`✓ ${hours} Stunden erfolgreich gutgeschrieben!`);
        loadAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleExecuteHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTo) return;

    try {
      const res = await fetch('/api/board/handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          current_parent_id: handoverFrom || null,
          new_parent_id: handoverTo,
          position: handoverPos,
          notes: handoverNotes
        })
      });

      if (res.ok) {
        const data = await res.json();
        showToast(data.message);
        setShowHandoverModal(false);
        loadAllData();
      }
    } catch (e) {
      console.error(e);
      showToast('Fehler bei der Amtsübergabe');
    }
  };

  const handleCreatePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: pollTitle,
          question: pollQuestion,
          category: pollCategory,
          options: pollOptions.filter(o => o.trim().length > 0)
        })
      });

      if (res.ok) {
        showToast('✓ Umfrage für Eltern freigeschaltet');
        setShowPollModal(false);
        setPollTitle('');
        setPollQuestion('');
        loadAllData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <span>Elterninitiative & Trägerverein (LAGE.app Parität)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pflichtstunden-Börse • 1-Klick-Vorstandswechsel • Blitz-Umfragen • Digitale Verträge
          </p>
        </div>

        {/* Sub-tab Navigation */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs font-bold overflow-x-auto">
          <button
            onClick={() => setSubTab('DUTIES')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              subTab === 'DUTIES' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Elterndienste & Pflichtstunden</span>
          </button>

          <button
            onClick={() => setSubTab('BOARD')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              subTab === 'BOARD' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Vorstand & Amtsübergabe</span>
          </button>

          <button
            onClick={() => setSubTab('POLLS')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              subTab === 'POLLS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Vote className="w-3.5 h-3.5" />
            <span>Eltern-Umfragen</span>
          </button>

          <button
            onClick={() => setSubTab('DOCS')}
            className={`px-3.5 py-2 rounded-xl transition-all whitespace-nowrap flex items-center space-x-1.5 ${
              subTab === 'DOCS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <FileSignature className="w-3.5 h-3.5" />
            <span>Verträge & Signaturen</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB 1: ELTERNDIENSTE & PFLICHTSTUNDEN */}
      {subTab === 'DUTIES' && (
        <div className="space-y-6">
          {/* Action Header */}
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-800">
              Ausgeschriebene Arbeitseinsätze ({duties.length})
            </h3>
            <button
              onClick={() => setShowDutyModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Neuen Elterndienst ausschreiben</span>
            </button>
          </div>

          {/* Duties Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {duties.map(d => {
              const isFilled = d.status === 'FILLED';
              return (
                <div key={d.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                        {d.category}
                      </span>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                        +{d.hours_credit} Std. Gutschrift
                      </span>
                    </div>

                    <h4 className="font-extrabold text-sm text-slate-900 mb-1 leading-snug">
                      {d.title}
                    </h4>
                    <p className="text-xs text-slate-500 mb-3 leading-relaxed">
                      {d.description}
                    </p>

                    <div className="space-y-1 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-100 mb-3">
                      <div className="flex items-center space-x-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>Datum: <strong>{d.date}</strong> ({d.time_start || '09:00'} - {d.time_end || '13:00'} Uhr)</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <Users className="w-3.5 h-3.5 text-slate-400" />
                        <span>Helfer: <strong>{d.signup_count} / {d.max_helpers}</strong> eingetragen</span>
                      </div>
                    </div>

                    {/* Signups List */}
                    {d.signups && d.signups.length > 0 && (
                      <div className="space-y-1 mb-3">
                        <span className="text-[10px] font-bold uppercase text-slate-400">Angemeldete Eltern:</span>
                        {d.signups.map((s: any) => (
                          <div key={s.id} className="flex items-center justify-between text-xs bg-white p-2 rounded-lg border border-slate-200">
                            <span className="font-bold text-slate-800">{s.parent_name}</span>
                            {s.status === 'CONFIRMED' ? (
                              <span className="text-emerald-700 font-bold text-[10px] bg-emerald-50 px-2 py-0.5 rounded flex items-center space-x-1">
                                <Check className="w-3 h-3" />
                                <span>{s.hours_credited}h bestätigt</span>
                              </span>
                            ) : (
                              <button
                                onClick={() => handleConfirmHours(s.id, d.hours_credit)}
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[10px] font-bold"
                              >
                                Bestätigen (+{d.hours_credit}h)
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Family Hours Overview Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center space-x-2">
              <Award className="w-4 h-4 text-amber-500" />
              <span>Pflichtstunden-Konto pro Familie (Soll: 20 Std. / Kita-Jahr)</span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-600 font-bold uppercase text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-xl">Familie / Elternteil</th>
                    <th className="py-2.5 px-3">Pflichtstunden Soll</th>
                    <th className="py-2.5 px-3">Geleistet</th>
                    <th className="py-2.5 px-3">Noch offen</th>
                    <th className="py-2.5 px-3 rounded-r-xl">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                  {familyStats.map(f => (
                    <tr key={f.parent_id} className="hover:bg-slate-50">
                      <td className="py-3 px-3 font-bold">{f.parent_name}</td>
                      <td className="py-3 px-3">{f.mandatory_hours}h</td>
                      <td className="py-3 px-3 text-emerald-700 font-bold">{f.completed_hours}h</td>
                      <td className="py-3 px-3 text-rose-600 font-bold">{f.open_hours}h</td>
                      <td className="py-3 px-3">
                        {f.is_fulfilled ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[10px]">
                            ✓ Erfüllt
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-full text-[10px]">
                            In Bearbeitung
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB 2: VORSTAND & 1-KLICK-AMTSÜBERGABE */}
      {subTab === 'BOARD' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Aktueller Eltern-Vorstand des Trägervereins (e.V.)</h3>
              <p className="text-xs text-slate-500">
                Vorstandsmitglieder haben automatisch Zugriff auf das Träger-Webportal und behalten gleichzeitig ihren Eltern-App-Zugang.
              </p>
            </div>

            <button
              onClick={() => setShowHandoverModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <ArrowRightLeft className="w-4 h-4" />
              <span>1-Klick Amtsübergabe durchführen</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {boardMembers.map(m => (
              <div key={m.id} className="bg-white rounded-3xl p-5 border border-indigo-200 shadow-sm flex items-start justify-between">
                <div className="flex items-start space-x-3.5">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100 border border-indigo-300 flex items-center justify-center font-black text-indigo-800 text-sm">
                    {m.name[0]}V
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <h4 className="font-extrabold text-sm text-slate-900">{m.name}</h4>
                      <span className="px-2 py-0.5 bg-indigo-600 text-white font-bold rounded-full text-[10px]">
                        {m.board_position === '1_VORSITZ' ? '1. Vorsitzende:r' : m.board_position}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{m.email} • {m.phone || 'Kein Telefon'}</p>
                    {m.children && m.children.length > 0 && (
                      <div className="mt-2 text-[11px] text-slate-600">
                        Kind(er): <strong>{m.children.map((c: any) => `${c.first_name} (${c.group_name})`).join(', ')}</strong>
                      </div>
                    )}
                  </div>
                </div>

                <span className="inline-flex items-center space-x-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Träger-Rechte aktiv</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 3: BLITZ-UMFRAGEN */}
      {subTab === 'POLLS' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Aktive Eltern-Umfragen ({polls.length})</h3>
            <button
              onClick={() => setShowPollModal(true)}
              className="flex items-center space-x-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Neue Umfrage starten</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {polls.map(p => (
              <div key={p.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
                <div className="flex items-center justify-between mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-50 text-indigo-700 border border-indigo-200 uppercase">
                    {p.category}
                  </span>
                  <span className="text-xs font-bold text-slate-400">
                    {p.total_votes} Stimmen abgegeben
                  </span>
                </div>

                <h4 className="font-extrabold text-sm text-slate-900 mb-1">{p.title}</h4>
                <p className="text-xs text-slate-600 mb-4">{p.question}</p>

                {/* Progress bars per option */}
                <div className="space-y-2.5">
                  {p.options?.map((o: any) => (
                    <div key={o.id} className="space-y-1">
                      <div className="flex justify-between text-xs font-semibold text-slate-800">
                        <span>{o.option_text}</span>
                        <span>{o.percent}% ({o.vote_count})</span>
                      </div>
                      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all duration-500"
                          style={{ width: `${o.percent}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 4: DIGITALE VERTRÄGE & SIGNATUREN */}
      {subTab === 'DOCS' && (
        <div className="space-y-6">
          <h3 className="text-sm font-bold text-slate-900">Digitale Betreuungsverträge & In-App Signaturen ({documents.length})</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {documents.map(doc => {
              const isSigned = doc.status === 'SIGNED';
              return (
                <div key={doc.id} className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-start justify-between">
                  <div className="space-y-1">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 uppercase">
                      {doc.document_type}
                    </span>
                    <h4 className="font-bold text-sm text-slate-900">{doc.title}</h4>
                    <p className="text-xs text-slate-500">Erstellt: {doc.created_at?.split('T')[0]}</p>
                    {isSigned && (
                      <div className="mt-2 text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-xl border border-emerald-200 font-bold inline-flex items-center space-x-1">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Digital unterschrieben von {doc.signed_by_name} ({doc.signed_at?.split('T')[0]})</span>
                      </div>
                    )}
                  </div>

                  <div>
                    {isSigned ? (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-100 text-emerald-800">
                        Gültig
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-100 text-amber-800">
                        Unterschrift offen
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Modal: 1-Klick Amtsübergabe */}
      {showHandoverModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
                <span>1-Klick-Amtsübergabe (Vorstand)</span>
              </h3>
              <button onClick={() => setShowHandoverModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleExecuteHandover} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Vorstandsposition:</label>
                <select
                  value={handoverPos}
                  onChange={e => setHandoverPos(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                >
                  <option value="1_VORSITZ">1. Vorsitzende:r (Gesamtleitung e.V.)</option>
                  <option value="2_VORSITZ">2. Vorsitzende:r</option>
                  <option value="KASSIER">Finanzvorstand / Kassier</option>
                  <option value="PERSONAL">Personalvorstand</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Bisheriges Vorstandsmitglied (wird wieder Elternteil):</label>
                <select
                  value={handoverFrom}
                  onChange={e => setHandoverFrom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                >
                  <option value="">-- Keine Herabstufung --</option>
                  {boardMembers.map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.board_position})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Neues Vorstandsmitglied (erhält Träger-Rechte):</label>
                <select
                  required
                  value={handoverTo}
                  onChange={e => setHandoverTo(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-indigo-700"
                >
                  <option value="">-- Elternteil auswählen --</option>
                  {allParents.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.role})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Beschluss / Notiz zur Mitgliederversammlung:</label>
                <input
                  type="text"
                  placeholder="z. B. Gewählt auf JHV am 20.10.2026"
                  value={handoverNotes}
                  onChange={e => setHandoverNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowHandoverModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Amtsübergabe ausführen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Duty */}
      {showDutyModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Plus className="w-5 h-5 text-indigo-600" />
                <span>Neuen Elterndienst ausschreiben</span>
              </h3>
              <button onClick={() => setShowDutyModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateDuty} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titel der Aktion *</label>
                <input
                  type="text"
                  required
                  value={dutyTitle}
                  onChange={e => setDutyTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="z. B. Sandkasten reinigen & befüllen"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kategorie</label>
                  <select
                    value={dutyCategory}
                    onChange={e => setDutyCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  >
                    <option value="GARTEN">Garten & Außengelände</option>
                    <option value="RENOVIERUNG">Renovierung & Handwerk</option>
                    <option value="NOTFALL_KOCHEN">Notfall-Kochen</option>
                    <option value="FEST">Feste & Veranstaltungen</option>
                    <option value="WAESCHE">Wäsche & Hygiene</option>
                    <option value="SONSTIGES">Sonstiges</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stundengutschrift</label>
                  <input
                    type="number"
                    step="0.5"
                    value={dutyHours}
                    onChange={e => setDutyHours(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Datum *</label>
                  <input
                    type="date"
                    required
                    value={dutyDate}
                    onChange={e => setDutyDate(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max. Helfer</label>
                  <input
                    type="number"
                    value={dutyMaxHelpers}
                    onChange={e => setDutyMaxHelpers(parseInt(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Beschreibung & benötigte Utensilien</label>
                <textarea
                  rows={2}
                  value={dutyDesc}
                  onChange={e => setDutyDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="z. B. Schubkarre, Schaufel mitbringen..."
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowDutyModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Dienst ausschreiben
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: New Poll */}
      {showPollModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-2">
                <Vote className="w-5 h-5 text-indigo-600" />
                <span>Neue Eltern-Umfrage erstellen</span>
              </h3>
              <button onClick={() => setShowPollModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePoll} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Titel der Umfrage *</label>
                <input
                  type="text"
                  required
                  value={pollTitle}
                  onChange={e => setPollTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="z. B. Laternenumzug Route"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Frage an die Eltern *</label>
                <input
                  type="text"
                  required
                  value={pollQuestion}
                  onChange={e => setPollQuestion(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
                  placeholder="z. B. Welche Route bevorzugt ihr?"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Antwortoptionen</label>
                {pollOptions.map((opt, idx) => (
                  <input
                    key={idx}
                    type="text"
                    required
                    value={opt}
                    onChange={e => {
                      const updated = [...pollOptions];
                      updated[idx] = e.target.value;
                      setPollOptions(updated);
                    }}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl mb-1.5"
                    placeholder={`Option ${idx + 1}`}
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-indigo-600 font-bold hover:underline"
                >
                  + Weitere Option hinzufügen
                </button>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowPollModal(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 rounded-xl font-bold"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs"
                >
                  Umfrage freischalten
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
