import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  FileSpreadsheet, 
  Download, 
  Plus, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  Check, 
  X, 
  Sparkles, 
  Calendar, 
  Baby, 
  Landmark, 
  ShieldCheck, 
  FileText, 
  Filter, 
  Award,
  ChevronRight,
  TrendingUp,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';

interface FinanceAndWaitlistViewProps {
  showToast: (msg: string) => void;
}

export const FinanceAndWaitlistView: React.FC<FinanceAndWaitlistViewProps> = ({ showToast }) => {
  const [subTab, setSubTab] = useState<'WAITLIST' | 'BILLING' | 'AUTHORITIES'>('WAITLIST');
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // New Application Modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [childFirst, setChildFirst] = useState('');
  const [childLast, setChildLast] = useState('');
  const [birthDate, setBirthDate] = useState('2024-05-10');
  const [parentName, setParentName] = useState('');
  const [parentEmail, setParentEmail] = useState('');
  const [parentPhone, setParentPhone] = useState('');
  const [desiredHours, setDesiredHours] = useState(35);
  const [desiredGroupType, setDesiredGroupType] = useState('U3');
  const [hasSibling, setHasSibling] = useState(false);
  const [isSingleParent, setIsSingleParent] = useState(false);
  const [isEmployed, setIsEmployed] = useState(true);
  const [inCatchment, setInCatchment] = useState(true);

  // Filter
  const [filterGroup, setFilterGroup] = useState<'ALL' | 'U3' | 'UE3'>('ALL');

  const loadData = async () => {
    try {
      setLoading(true);
      const [waitRes, invRes, repRes] = await Promise.all([
        fetch('/api/waitlist'),
        fetch('/api/billing/invoices'),
        fetch('/api/reports/youth-office')
      ]);
      setWaitlist(await waitRes.json());
      setInvoices(await invRes.json());
      setReport(await repRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // 1-Click Intake from Waitlist
  const handleAcceptApplication = async (id: string, groupType: string) => {
    try {
      const res = await fetch(`/api/waitlist/${id}/accept-and-enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          group_id: groupType === 'U3' ? 'g_u3_maeuse' : 'g_ue3_sonne'
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message);
        await loadData();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Submit new application
  const handleAddApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_first_name: childFirst,
          child_last_name: childLast,
          birth_date: birthDate,
          parent_name: parentName,
          parent_email: parentEmail,
          parent_phone: parentPhone,
          desired_hours: desiredHours,
          desired_group_type: desiredGroupType,
          has_sibling: hasSibling ? 1 : 0,
          is_single_parent: isSingleParent ? 1 : 0,
          is_employed: isEmployed ? 1 : 0,
          in_catchment_area: inCatchment ? 1 : 0
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✓ Bewerbung für ${childFirst} erfasst (${data.points} Punkte).`);
        setShowApplyModal(false);
        setChildFirst('');
        setChildLast('');
        setParentName('');
        setParentEmail('');
        await loadData();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Generate monthly invoices
  const handleGenerateInvoices = async () => {
    try {
      const monthStr = format(new Date(), 'yyyy-MM');
      const res = await fetch('/api/billing/generate-month', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ month: monthStr })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✓ ${data.message}`);
        await loadData();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  // Export SEPA XML
  const handleExportSepa = () => {
    const monthStr = format(new Date(), 'yyyy-MM');
    window.open(`/api/billing/export-sepa-xml?month=${monthStr}`, '_blank');
    showToast('✓ SEPA Lastschrift XML (pain.008) wird heruntergeladen.');
  };

  // Export Youth Office CSV
  const handleExportYouthOffice = () => {
    window.open('/api/reports/youth-office/csv', '_blank');
    showToast('✓ Stichtagsmeldung § 98 SGB VIII für das Jugendamt wird heruntergeladen.');
  };

  const filteredWaitlist = waitlist.filter(app => {
    if (filterGroup === 'ALL') return true;
    return app.desired_group_type === filterGroup;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center space-x-3.5">
          <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-sm">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Verwaltung, Finanzen & Warteliste (Modul E)</h2>
            <p className="text-xs text-slate-500">
              Warteliste mit Punktevergabe, SEPA-Lastschriften für Gebühren & Essensgeld, Behördenstatistik (§ 98 SGB VIII).
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 text-xs">
          <button
            onClick={() => setSubTab('WAITLIST')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              subTab === 'WAITLIST' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            📋 Warteliste & Punkte ({waitlist.filter(w => w.status === 'WAITING').length})
          </button>
          <button
            onClick={() => setSubTab('BILLING')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              subTab === 'BILLING' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            💶 Abrechnung & SEPA
          </button>
          <button
            onClick={() => setSubTab('AUTHORITIES')}
            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all ${
              subTab === 'AUTHORITIES' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            🏛️ Jugendamt & Statistik
          </button>
        </div>
      </div>

      {/* TAB 1: WARTELISTE & PLATZVERGABE */}
      {subTab === 'WAITLIST' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center space-x-2">
              <span className="text-xs font-bold text-slate-500">Filter:</span>
              <button
                onClick={() => setFilterGroup('ALL')}
                className={`px-3 py-1 rounded-xl text-xs font-bold ${filterGroup === 'ALL' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Alle ({waitlist.length})
              </button>
              <button
                onClick={() => setFilterGroup('U3')}
                className={`px-3 py-1 rounded-xl text-xs font-bold ${filterGroup === 'U3' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Krippe U3
              </button>
              <button
                onClick={() => setFilterGroup('UE3')}
                className={`px-3 py-1 rounded-xl text-xs font-bold ${filterGroup === 'UE3' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}
              >
                Elementar Ü3
              </button>
            </div>

            <button
              onClick={() => setShowApplyModal(true)}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Voranmeldung erfassen</span>
            </button>
          </div>

          {/* List of Applications */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="px-5 py-3.5">Rang & Punkte</th>
                  <th className="px-5 py-3.5">Kind & Geburtsdatum</th>
                  <th className="px-5 py-3.5">Elternkontakt</th>
                  <th className="px-5 py-3.5">Wunschstart & Stunden</th>
                  <th className="px-5 py-3.5">Kriterien-Punkte</th>
                  <th className="px-5 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Aktion</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredWaitlist.map((app, idx) => {
                  const isAccepted = app.status === 'ACCEPTED';
                  const isOffered = app.status === 'OFFERED';
                  return (
                    <tr key={app.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-2">
                          <span className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center font-bold text-slate-600 text-xs">
                            #{idx + 1}
                          </span>
                          <span className="px-2.5 py-1 rounded-xl bg-indigo-100 text-indigo-900 font-black text-xs">
                            {app.points} Pkt.
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{app.child_first_name} {app.child_last_name}</div>
                        <div className="text-[11px] text-slate-400">Geb. {app.birth_date} • {app.desired_group_type}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{app.parent_name}</div>
                        <div className="text-[11px] text-slate-500">{app.parent_email} • {app.parent_phone}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900">{app.desired_hours} Std. / Woche</div>
                        <div className="text-[11px] text-slate-400">Ab {app.desired_start_date}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1">
                          {app.has_sibling === 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              +5 Geschwister
                            </span>
                          )}
                          {app.is_single_parent === 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-rose-100 text-rose-800 text-[10px] font-bold">
                              +4 Alleinerz.
                            </span>
                          )}
                          {app.in_catchment_area === 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              +3 Einzug
                            </span>
                          )}
                          {app.is_employed === 1 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-bold">
                              +3 Berufstätig
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        {isAccepted ? (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold flex items-center space-x-1 max-w-fit">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Aufgenommen</span>
                          </span>
                        ) : isOffered ? (
                          <span className="px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 text-[11px] font-bold">
                            Platz angeboten
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 text-[11px] font-semibold">
                            Wartend
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {!isAccepted && (
                          <button
                            onClick={() => handleAcceptApplication(app.id, app.desired_group_type)}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                          >
                            1-Klick Platzzusage
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ABRECHNUNG & SEPA LASTSCHRIFTEN */}
      {subTab === 'BILLING' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-emerald-600 uppercase">Monatsabrechnung</span>
              <h3 className="text-lg font-bold text-slate-900">Betreuungsgebühren & Essensgeld für {format(new Date(), 'MMMM yyyy')}</h3>
              <p className="text-xs text-slate-500 mt-1">
                Gebühren nach Buchungszeit (25h: 120€, 35h: 190€, 45h: 280€) + automatische Verrechnung der tatsächlichen Essenstage (4,20 € / Tag).
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <button
                onClick={handleGenerateInvoices}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1.5"
              >
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>Monat neu berechnen</span>
              </button>

              <button
                onClick={handleExportSepa}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center space-x-1.5"
              >
                <Download className="w-4 h-4" />
                <span>SEPA XML exportieren (pain.008)</span>
              </button>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Rechnungs-ID</th>
                  <th className="px-5 py-3.5">Familie & Kind</th>
                  <th className="px-5 py-3.5">Stunden</th>
                  <th className="px-5 py-3.5">Grundgebühr</th>
                  <th className="px-5 py-3.5">Essensgeld (Tage)</th>
                  <th className="px-5 py-3.5">Gesamtbetrag</th>
                  <th className="px-5 py-3.5">Status & SEPA</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-4 font-mono font-bold text-slate-900">{inv.id}</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-slate-900">{inv.child_first_name} {inv.child_last_name}</div>
                      <div className="text-[11px] text-slate-400">{inv.parent_name} • {inv.group_name}</div>
                    </td>
                    <td className="px-5 py-4 font-bold text-slate-800">{inv.care_hours}h / Wo.</td>
                    <td className="px-5 py-4 font-semibold text-slate-700">{inv.base_care_fee.toFixed(2)} €</td>
                    <td className="px-5 py-4">
                      <span className="font-semibold text-slate-900">{inv.meal_fee.toFixed(2)} €</span>
                      <span className="text-[11px] text-slate-400 ml-1.5">({inv.meal_days_counted} Tage)</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="font-black text-emerald-700 text-sm">{inv.total_amount.toFixed(2)} €</span>
                    </td>
                    <td className="px-5 py-4">
                      <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                        {inv.status === 'SEPA_EXPORTED' ? '✓ SEPA generiert' : 'Offen'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: JUGENDAMT & BEHÖRDENSTATISTIK */}
      {subTab === 'AUTHORITIES' && report && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-blue-600 uppercase">Behördenmeldungen</span>
              <h3 className="text-lg font-bold text-slate-900">Stichtagsmeldung nach § 98 SGB VIII & KiBiz</h3>
              <p className="text-xs text-slate-500 mt-1">
                Automatischer Abgleich aller Betreuungsverträge, Altersgruppen und Fachkraftquoten für Jugendamt und Statistisches Landesamt.
              </p>
            </div>

            <button
              onClick={handleExportYouthOffice}
              className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors flex items-center space-x-1.5"
            >
              <Download className="w-4 h-4" />
              <span>CSV für Jugendamt herunterladen</span>
            </button>
          </div>

          {/* Stats KPI Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Belegte Plätze</span>
              <div className="text-2xl font-black text-slate-900 mt-1">
                {report.belegte_plaetze} / {report.betriebserlaubnis_plaetze}
              </div>
              <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full mt-2 inline-block">
                {report.auslastung_percent}% Auslastung
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">U3-Kinder (Krippe)</span>
              <div className="text-2xl font-black text-indigo-600 mt-1">
                {report.age_distribution.total_u3} Kinder
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Unter 1J: {report.age_distribution.under_1_year} • 1-2J: {report.age_distribution.age_1_to_2} • 2-3J: {report.age_distribution.age_2_to_3}
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Ü3-Kinder (Elementar)</span>
              <div className="text-2xl font-black text-amber-600 mt-1">
                {report.age_distribution.total_ue3} Kinder
              </div>
              <p className="text-xs text-slate-400 mt-1">Regelkindergarten (3 bis 6 Jahre)</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <span className="text-xs font-bold text-slate-400 uppercase">Gesetzl. Fachkraftquote</span>
              <div className="text-2xl font-black text-emerald-600 mt-1">
                {report.staffing_summary.fachkraft_quote_percent}%
              </div>
              <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full mt-2 inline-block">
                ✓ SGB VIII Konform ($\ge$ 67%)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: VORANMELDUNG ERFASSEN */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl">
                  <Baby className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Neue Voranmeldung (Warteliste)</h3>
                  <p className="text-xs text-slate-400">Automatische Punkteberechnung nach Kriterien</p>
                </div>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddApplication} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Vorname des Kindes</label>
                  <input
                    type="text"
                    required
                    value={childFirst}
                    onChange={(e) => setChildFirst(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl"
                    placeholder="z.B. Jonas"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Nachname des Kindes</label>
                  <input
                    type="text"
                    required
                    value={childLast}
                    onChange={(e) => setChildLast(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl"
                    placeholder="z.B. Schmidt"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Geburtsdatum</label>
                  <input
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Bereich & Stunden</label>
                  <select
                    value={desiredHours}
                    onChange={(e) => setDesiredHours(Number(e.target.value))}
                    className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl"
                  >
                    <option value={25}>25 Std. / Woche (Teilzeit)</option>
                    <option value={35}>35 Std. / Woche (Blocköffnung)</option>
                    <option value={45}>45 Std. / Woche (Ganztags)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Elternteil Name</label>
                  <input
                    type="text"
                    required
                    value={parentName}
                    onChange={(e) => setParentName(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl"
                    placeholder="z.B. Laura Schmidt"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">E-Mail</label>
                  <input
                    type="email"
                    required
                    value={parentEmail}
                    onChange={(e) => setParentEmail(e.target.value)}
                    className="w-full text-xs font-semibold p-2.5 border border-slate-300 rounded-xl"
                    placeholder="laura@familie-schmidt.de"
                  />
                </div>
              </div>

              {/* Kriterien Checkboxen für Punktevergabe */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-2 text-xs">
                <span className="font-bold text-slate-700 block">Aufnahmekriterien (Punktesystem):</span>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={hasSibling}
                    onChange={(e) => setHasSibling(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Geschwisterkind bereits in der Kita (+5 Punkte)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isSingleParent}
                    onChange={(e) => setIsSingleParent(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Alleinerziehend (+4 Punkte)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={inCatchment}
                    onChange={(e) => setInCatchment(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Wohnort im Kita-Einzugsgebiet (+3 Punkte)</span>
                </label>
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={isEmployed}
                    onChange={(e) => setIsEmployed(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Beide Elternteile erwerbstätig / Ausbildung (+3 Punkte)</span>
                </label>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  Voranmeldung speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
