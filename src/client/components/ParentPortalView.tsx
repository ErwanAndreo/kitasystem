import React, { useState, useEffect } from 'react';
import { 
  Baby, 
  Heart, 
  Calendar, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  FileText, 
  FileSignature, 
  Vote, 
  Award, 
  Users, 
  Phone, 
  ShieldAlert, 
  Utensils, 
  Moon, 
  Smile, 
  Sparkles, 
  Plus, 
  Send, 
  Check, 
  X, 
  ChevronRight, 
  Megaphone,
  UserCheck,
  Building2,
  Lock,
  ArrowRight,
  Image as ImageIcon,
  Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';

interface ParentPortalViewProps {
  showToast: (msg: string) => void;
}

export const ParentPortalView: React.FC<ParentPortalViewProps> = ({ showToast }) => {
  // Can switch between demo parents: Anna Bergmann (Vorstand) and Michael Bauer (Eltern)
  const [currentParentId, setCurrentParentId] = useState<string>('p_anna_bergmann');
  const [activeTab, setActiveTab] = useState<'HOME' | 'DUTIES' | 'DOCS' | 'POLLS' | 'CONFERENCES' | 'PHOTOS' | 'BILLING' | 'NOTICES' | 'CHILD_PROFILE'>('HOME');
  const [overview, setOverview] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedChildIndex, setSelectedChildIndex] = useState(0);

  // Modals
  const [showSickModal, setShowSickModal] = useState(false);
  const [sickReason, setSickReason] = useState('Fieber & Erkältung');
  const [cancelMeal, setCancelMeal] = useState(true);
  const [sickSubmitting, setSickSubmitting] = useState(false);

  // Sign Document Modal
  const [signingDoc, setSigningDoc] = useState<any | null>(null);
  const [signerName, setSignerName] = useState('');
  const [isSigning, setIsSigning] = useState(false);

  // Add Pickup Authorization Modal
  const [showPickupModal, setShowPickupModal] = useState(false);
  const [pickupName, setPickupName] = useState('');
  const [pickupRel, setPickupRel] = useState('Großeltern');
  const [pickupPhone, setPickupPhone] = useState('');

  const loadParentData = async (parentId = currentParentId) => {
    try {
      setLoading(true);
      const res = await fetch(`/api/parents/${parentId}/overview`);
      if (res.ok) {
        const data = await res.json();
        setOverview(data);
        if (data.parent?.name) {
          setSignerName(data.parent.name);
        }
      }
    } catch (e) {
      console.error('Error loading parent overview:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadParentData(currentParentId);
  }, [currentParentId]);

  const activeChild = overview?.children?.[selectedChildIndex] || overview?.children?.[0] || null;

  // 1-Tap Sick Notice Submission
  const handleReportSick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild) return;
    setSickSubmitting(true);
    try {
      const res = await fetch(`/api/parents/${currentParentId}/children/${activeChild.id}/mark-absent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'ABSENT_SICK',
          reason: sickReason,
          cancel_meal: cancelMeal
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✓ ${activeChild.first_name} für heute krankgemeldet.`);
        setShowSickModal(false);
        await loadParentData();
      } else {
        alert(data.error || 'Fehler bei der Krankmeldung');
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setSickSubmitting(false);
    }
  };

  // 1-Click Duty Sign Up
  const handleDutySignup = async (dutyId: string) => {
    try {
      const res = await fetch(`/api/parent-duties/${dutyId}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: currentParentId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ Erfolgreich für den Elterndienst eingetragen!');
        await loadParentData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // 1-Click Poll Vote
  const handleVote = async (pollId: string, optionId: string) => {
    try {
      const res = await fetch(`/api/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: currentParentId, option_id: optionId })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ Deine Stimme wurde gezählt!');
        await loadParentData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Sign Document
  const handleSignDocument = async () => {
    if (!signingDoc || !signerName.trim()) return;
    setIsSigning(true);
    try {
      const dummySignature = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="60"><text x="10" y="35" font-family="cursive" font-size="22" fill="#047857">${encodeURIComponent(signerName)}</text></svg>`;
      const res = await fetch(`/api/documents/${signingDoc.id}/sign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          signature_data: dummySignature,
          signed_by_name: signerName
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ Dokument rechtsgültig digital unterzeichnet!');
        setSigningDoc(null);
        await loadParentData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSigning(false);
    }
  };

  // Add Pickup Authorization
  const handleAddPickup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeChild || !pickupName.trim()) return;
    try {
      const res = await fetch(`/api/parents/${currentParentId}/pickup-authorizations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          child_id: activeChild.id,
          name: pickupName,
          relationship: pickupRel,
          phone: pickupPhone
        })
      });
      const data = await res.json();
      if (res.ok) {
        showToast(`✓ Abholberechtigung für ${pickupName} hinterlegt.`);
        setShowPickupModal(false);
        setPickupName('');
        setPickupPhone('');
        await loadParentData();
      } else {
        alert(data.error);
      }
    } catch (err: any) {
      alert(err.message);
    }
  };

  // Conference Booking Handlers
  const handleBookConference = async (confId: string) => {
    if (!activeChild) return;
    try {
      const res = await fetch(`/api/conferences/${confId}/book`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_id: currentParentId, child_id: activeChild.id })
      });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ Entwicklungsgespräch erfolgreich reserviert!');
        await loadParentData();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleCancelConference = async (confId: string) => {
    try {
      const res = await fetch(`/api/conferences/${confId}/cancel`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        showToast('✓ Termin freigegeben.');
        await loadParentData();
      } else {
        alert(data.error);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (loading && !overview) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400 text-sm">
        <Sparkles className="w-5 h-5 animate-spin mr-2 text-rose-500" />
        <span>Elternportal wird geladen...</span>
      </div>
    );
  }

  const parent = overview?.parent;
  const hoursCompleted = parent?.hours_confirmed || 0;
  const hoursTarget = parent?.mandatory_hours || 20;
  const percentCompleted = Math.min(100, Math.round((hoursCompleted / hoursTarget) * 100));

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner: Parent Identity & Child Switcher */}
      <div className="bg-gradient-to-r from-rose-500 via-pink-600 to-indigo-600 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-10 -translate-y-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 text-2xl shadow-inner font-black">
              {parent?.name?.charAt(0) || 'E'}
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h1 className="text-xl font-bold tracking-tight">{parent?.name}</h1>
                {parent?.role === 'VORSTAND' && (
                  <span className="px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-900 text-xs font-black shadow-xs flex items-center space-x-1">
                    <Building2 className="w-3 h-3" />
                    <span>Vorstand e.V.</span>
                  </span>
                )}
              </div>
              <p className="text-rose-100 text-xs mt-0.5">
                {parent?.email} • Kita Sonnenschein Elternportal
              </p>
            </div>
          </div>

          {/* Demo Account Switcher */}
          <div className="flex items-center space-x-2 bg-black/20 p-1.5 rounded-2xl backdrop-blur-md border border-white/20 text-xs">
            <span className="text-white/70 px-2 font-medium">Demo:</span>
            <button
              onClick={() => {
                setCurrentParentId('p_anna_bergmann');
                setSelectedChildIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                currentParentId === 'p_anna_bergmann' ? 'bg-white text-rose-600 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              Anna (Vorstand)
            </button>
            <button
              onClick={() => {
                setCurrentParentId('p_michael_bauer');
                setSelectedChildIndex(0);
              }}
              className={`px-3 py-1.5 rounded-xl font-bold transition-all ${
                currentParentId === 'p_michael_bauer' ? 'bg-white text-rose-600 shadow-sm' : 'text-white/80 hover:text-white'
              }`}
            >
              Michael (Eltern)
            </button>
          </div>
        </div>

        {/* Child Selector Tabs if multiple */}
        {overview?.children?.length > 0 && (
          <div className="mt-5 pt-4 border-t border-white/20 flex items-center space-x-3 overflow-x-auto">
            <span className="text-xs font-semibold text-rose-100 flex items-center space-x-1">
              <Baby className="w-3.5 h-3.5" />
              <span>Mein Kind:</span>
            </span>
            {overview.children.map((child: any, idx: number) => {
              const isSelected = idx === selectedChildIndex;
              return (
                <button
                  key={child.id}
                  onClick={() => setSelectedChildIndex(idx)}
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-md scale-102'
                      : 'bg-white/10 hover:bg-white/20 text-white'
                  }`}
                >
                  <span>{child.first_name} {child.last_name}</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-rose-100 text-rose-800">
                    {child.group_name}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-2 overflow-x-auto bg-white p-1.5 rounded-2xl border border-slate-200 shadow-xs">
        <button
          onClick={() => setActiveTab('HOME')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'HOME'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Smile className="w-4 h-4" />
          <span>Heute & Kita-Tag</span>
        </button>

        <button
          onClick={() => setActiveTab('DUTIES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'DUTIES'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Elterndienst-Börse</span>
          <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-indigo-100 text-indigo-800 font-black">
            {hoursCompleted}/{hoursTarget}h
          </span>
        </button>

        <button
          onClick={() => setActiveTab('DOCS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'DOCS'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <FileSignature className="w-4 h-4" />
          <span>Verträge & Signaturen</span>
          {overview?.documents?.filter((d: any) => d.status === 'PENDING_SIGNATURE').length > 0 && (
            <span className="ml-1 px-1.5 py-0.2 text-[10px] rounded-full bg-rose-500 text-white font-black animate-pulse">
              !
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('POLLS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'POLLS'
              ? 'bg-amber-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Vote className="w-4 h-4" />
          <span>Blitz-Umfragen</span>
        </button>

        <button
          onClick={() => setActiveTab('CONFERENCES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'CONFERENCES'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Entwicklungsgespräche</span>
        </button>

        <button
          onClick={() => setActiveTab('PHOTOS')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'PHOTOS'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <ImageIcon className="w-4 h-4" />
          <span>Foto-Galerie</span>
        </button>

        <button
          onClick={() => setActiveTab('BILLING')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'BILLING'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Gebühren & Rechnungen</span>
        </button>

        <button
          onClick={() => setActiveTab('NOTICES')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'NOTICES'
              ? 'bg-teal-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Schwarzes Brett</span>
        </button>

        <button
          onClick={() => setActiveTab('CHILD_PROFILE')}
          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'CHILD_PROFILE'
              ? 'bg-rose-500 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          <UserCheck className="w-4 h-4" />
          <span>Abholberechtigte & Akte</span>
        </button>
      </div>

      {/* TAB 1: HEUTE & KITA-TAG */}
      {activeTab === 'HOME' && activeChild && (
        <div className="space-y-6">
          {/* Quick Action: 1-Tap Krankmeldung Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-start space-x-4">
              <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shrink-0 mt-1">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {activeChild.first_name} heute abwesend oder krank?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Morgens mit 1 Klick abmelden. Die Gruppenleitung und die Küche werden sofort informiert.
                </p>
                {activeChild.attendance_today?.status === 'ABSENT_SICK' ? (
                  <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-rose-600" />
                    <span>Heute krankgemeldet ({activeChild.attendance_today.absence_reason || 'Krankheit'})</span>
                  </div>
                ) : activeChild.attendance_today?.status === 'PRESENT' ? (
                  <div className="mt-2 inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>In der Kita eingecheckt ({activeChild.attendance_today.check_in_time} Uhr)</span>
                  </div>
                ) : null}
              </div>
            </div>

            <button
              onClick={() => setShowSickModal(true)}
              className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-bold shadow-md transition-all flex items-center space-x-2 shrink-0"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>1-Klick Krankmeldung</span>
            </button>
          </div>

          {/* Status Grid for Today */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Status Card 1: Check-in / Check-out */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase">Anwesenheit</span>
                <Clock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="text-lg font-black text-slate-900">
                {activeChild.attendance_today?.status === 'PRESENT'
                  ? 'In der Gruppe'
                  : activeChild.attendance_today?.status === 'ABSENT_SICK'
                  ? 'Krankgemeldet'
                  : activeChild.attendance_today?.status === 'CHECKED_OUT'
                  ? 'Abgeholt'
                  : 'Noch nicht eingecheckt'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeChild.attendance_today?.check_in_time
                  ? `Ankunft um ${activeChild.attendance_today.check_in_time} Uhr`
                  : 'Gruppen-Check-in am Tablet'}
              </p>
            </div>

            {/* Status Card 2: Mittagsverpflegung */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase">Mittagessen</span>
                <Utensils className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-lg font-black text-slate-900">
                {activeChild.attendance_today?.meal_ordered ? 'Bio-Menü bestellt' : 'Abbestellt'}
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeChild.attendance_today?.meal_ordered
                  ? 'Küche: Frisches Menü zubereitet'
                  : 'Keine Abrechnung für heute'}
              </p>
            </div>

            {/* Status Card 3: Betreuungsumfang */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase">Vertrag</span>
                <FileText className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-lg font-black text-slate-900">
                {activeChild.care_hours || activeChild.contract_weekly_hours || 35} Stunden
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {activeChild.booking_model || 'Regelplatz'} • {activeChild.group_name}
              </p>
            </div>
          </div>

          {/* Tagesberichte & U3 Schlaftagebuch */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Moon className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-sm">
                  Tagesbericht & Pädagogische Notizen für {activeChild.first_name}
                </h3>
              </div>
              <span className="text-xs text-slate-400 font-medium">Heute & letzte Einträge</span>
            </div>

            {activeChild.daily_logs?.length > 0 ? (
              <div className="space-y-3">
                {activeChild.daily_logs.map((log: any) => {
                  const isSleep = log.log_type === 'SLEEP';
                  const isMeal = log.log_type === 'MEAL';
                  const isDiaper = log.log_type === 'DIAPER';
                  return (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100 flex items-start space-x-3 text-xs"
                    >
                      <div
                        className={`p-2 rounded-xl shrink-0 ${
                          isSleep
                            ? 'bg-indigo-100 text-indigo-700'
                            : isMeal
                            ? 'bg-emerald-100 text-emerald-700'
                            : isDiaper
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-rose-100 text-rose-700'
                        }`}
                      >
                        {isSleep ? (
                          <Moon className="w-4 h-4" />
                        ) : isMeal ? (
                          <Utensils className="w-4 h-4" />
                        ) : isDiaper ? (
                          <Baby className="w-4 h-4" />
                        ) : (
                          <Sparkles className="w-4 h-4" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900">
                            {isSleep
                              ? 'Mittagsschlaf'
                              : isMeal
                              ? 'Mahlzeit'
                              : isDiaper
                              ? 'Wickeln / Hygiene'
                              : 'Entwicklungsnotiz'}
                          </span>
                          <span className="text-slate-400 text-[11px]">
                            {log.time_start} {log.time_end ? `– ${log.time_end}` : ''} Uhr ({log.date})
                          </span>
                        </div>
                        <p className="text-slate-600 mt-1 leading-relaxed">{log.details}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-400 text-xs">
                <span>Noch keine Tageseinträge für heute erfasst.</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: ELTERNDIENST-BÖRSE (LAGE.app Parität) */}
      {activeTab === 'DUTIES' && (
        <div className="space-y-6">
          {/* Progress Card */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  Vereins-Pflichtstunden 2026/27
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-0.5">
                  Familienkonto {parent?.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Gemeinsam für unsere Kita: Jede Familie leistet jährlich {hoursTarget} Stunden für Pflege, Garten oder Feste.
                </p>
              </div>

              <div className="flex items-baseline space-x-2">
                <span className="text-3xl font-black text-indigo-600">{hoursCompleted}</span>
                <span className="text-slate-400 text-sm font-bold">/ {hoursTarget} Std.</span>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 ml-2">
                  {percentCompleted}% erfüllt
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-3.5 mt-4 overflow-hidden p-0.5 border border-slate-200">
              <div
                className="bg-gradient-to-r from-indigo-500 to-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${percentCompleted}%` }}
              />
            </div>
          </div>

          {/* Offene Elterndienste zur Auswahl */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Offene Arbeitseinsätze & Aktionen</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wähle einen Termin aus und trage dich mit 1 Klick als Helfer ein.
                </p>
              </div>
              <span className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2.5 py-1 rounded-xl">
                {overview?.duties?.open_duties?.length || 0} Aktionen verfügbar
              </span>
            </div>

            <div className="space-y-3">
              {overview?.duties?.open_duties?.map((duty: any) => {
                const isSignedUp = duty.is_signed_up > 0;
                return (
                  <div
                    key={duty.id}
                    className="p-4 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{duty.title}</span>
                        <span className="px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800 text-[10px] font-black">
                          +{duty.hours_credit} Std.
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{duty.description}</p>
                      <div className="flex items-center space-x-3 text-xs text-slate-400 pt-1">
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>{duty.date}</span>
                        </span>
                        {duty.time_start && (
                          <span className="flex items-center space-x-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>{duty.time_start} - {duty.time_end} Uhr</span>
                          </span>
                        )}
                        <span>• Helfer: {duty.current_helpers}/{duty.max_helpers}</span>
                      </div>
                    </div>

                    {isSignedUp ? (
                      <span className="px-4 py-2 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold flex items-center space-x-1 shrink-0">
                        <Check className="w-3.5 h-3.5" />
                        <span>Du bist eingetragen</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => handleDutySignup(duty.id)}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                      >
                        Mit 1 Klick eintragen
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: VERTRÄGE & DIGITALE SIGNATUREN (LAGE.app Parität) */}
      {activeTab === 'DOCS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Digitale Betreuungsverträge & DSGVO-Vollmachten
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Rechtsgültig und papierlos direkt auf dem Smartphone oder Tablet unterzeichnen.
                </p>
              </div>
              <ShieldAlert className="w-5 h-5 text-emerald-600" />
            </div>

            <div className="space-y-3">
              {overview?.documents?.map((doc: any) => {
                const isSigned = doc.status === 'SIGNED';
                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-50/50"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">{doc.title}</span>
                        {isSigned ? (
                          <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                            ✓ Unterzeichnet
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 text-[10px] font-black animate-pulse">
                            Unterschrift ausstehend
                          </span>
                        )}
                      </div>
                      <div
                        className="text-xs text-slate-600 prose prose-sm max-w-none line-clamp-2"
                        dangerouslySetInnerHTML={{ __html: doc.content_html }}
                      />
                      <div className="text-[11px] text-slate-400 pt-1">
                        {isSigned ? (
                          <span>Unterzeichnet am {doc.signed_at?.split('T')[0]} von {doc.signed_by_name}</span>
                        ) : (
                          <span>Bereitgestellt am {doc.created_at?.split('T')[0]}</span>
                        )}
                      </div>
                    </div>

                    {isSigned ? (
                      <span className="px-3.5 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold shrink-0 flex items-center space-x-1">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        <span>Signiert & Gültig</span>
                      </span>
                    ) : (
                      <button
                        onClick={() => setSigningDoc(doc)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0 flex items-center space-x-1.5"
                      >
                        <FileSignature className="w-4 h-4" />
                        <span>Jetzt unterzeichnen</span>
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: BLITZ-UMFRAGEN (LAGE.app Parität) */}
      {activeTab === 'POLLS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Aktuelle Eltern-Abstimmungen</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Deine Stimme zählt: Kurze Blitz-Umfragen zu Terminen, Festen und Speiseplänen.
                </p>
              </div>
              <Vote className="w-5 h-5 text-amber-500" />
            </div>

            <div className="space-y-4">
              {overview?.polls?.map((poll: any) => {
                const hasVoted = poll.user_has_voted;
                return (
                  <div key={poll.id} className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{poll.title}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">{poll.question}</p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        {poll.total_votes} Stimmen
                      </span>
                    </div>

                    {/* Options List */}
                    <div className="space-y-2 pt-1">
                      {poll.options?.map((opt: any) => {
                        const isMyVote = poll.user_voted_option_id === opt.id;
                        return (
                          <div
                            key={opt.id}
                            className={`p-3 rounded-xl border text-xs transition-all ${
                              isMyVote
                                ? 'bg-amber-50 border-amber-300 font-bold text-amber-900'
                                : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1.5">
                              <span className="flex items-center space-x-2">
                                {!hasVoted ? (
                                  <button
                                    onClick={() => handleVote(poll.id, opt.id)}
                                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-bold text-[11px] shadow-2xs transition-colors"
                                  >
                                    Stimme abgeben
                                  </button>
                                ) : (
                                  <span>{isMyVote ? '✓ Deine Wahl:' : '•'}</span>
                                )}
                                <span>{opt.option_text}</span>
                              </span>
                              <span className="font-bold text-slate-500 text-[11px]">{opt.percent}% ({opt.vote_count})</span>
                            </div>

                            {/* Percentage Bar */}
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  isMyVote ? 'bg-amber-500' : 'bg-slate-300'
                                }`}
                                style={{ width: `${opt.percent}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: SCHWARZES BRETT & ELTERNBRIEFE */}
      {activeTab === 'NOTICES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Digitales Schwarzes Brett & Elternbriefe</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Wichtige Aushänge, Schließzeiten und Neuigkeiten der Einrichtungsleitung.
                </p>
              </div>
              <Megaphone className="w-5 h-5 text-teal-600" />
            </div>

            <div className="space-y-3">
              {overview?.announcements?.map((ann: any) => (
                <div
                  key={ann.id}
                  className={`p-4 rounded-2xl border transition-all ${
                    ann.priority === 'HIGH'
                      ? 'bg-rose-50/60 border-rose-200'
                      : 'bg-slate-50/60 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900 text-sm">{ann.title}</span>
                    <span className="text-[11px] text-slate-400 font-medium">{ann.date}</span>
                  </div>
                  <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{ann.content}</p>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-200/50">
                    <span>Verfasst von: {ann.author}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: ABHOLBERECHTIGTE & GESUNDHEIT */}
      {activeTab === 'CHILD_PROFILE' && activeChild && (
        <div className="space-y-6">
          {/* Abholberechtigungen */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Hinterlegte Abholberechtigungen für {activeChild.first_name}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Nur diese Personen dürfen dein Kind von den Erzieher:innen übergeben bekommen.
                </p>
              </div>
              <button
                onClick={() => setShowPickupModal(true)}
                className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors flex items-center space-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Person berechtigen</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeChild.pickup_authorizations?.map((auth: any) => {
                const isForbidden = auth.is_forbidden === 1;
                return (
                  <div
                    key={auth.id}
                    className={`p-3.5 rounded-2xl border flex items-center justify-between text-xs ${
                      isForbidden ? 'bg-rose-50 border-rose-300' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${
                          isForbidden ? 'bg-rose-600 text-white' : 'bg-indigo-100 text-indigo-700'
                        }`}
                      >
                        {auth.name.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">
                          {auth.name}
                          {isForbidden && (
                            <span className="ml-2 text-[10px] bg-rose-200 text-rose-900 font-black px-1.5 py-0.2 rounded-md">
                              ABHOLUNG VERBOTEN
                            </span>
                          )}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          {auth.relationship} {auth.phone ? `• ${auth.phone}` : ''}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Notfallkontakte & Gesundheit */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Notfallkontakte</h3>
              <div className="space-y-2">
                {activeChild.emergency_contacts?.map((c: any) => (
                  <div key={c.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                    <div className="font-bold text-slate-900">{c.name} ({c.relationship})</div>
                    <div className="text-slate-500 flex items-center space-x-1 mt-0.5">
                      <Phone className="w-3 h-3 text-slate-400" />
                      <span>{c.phone}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
              <h3 className="font-bold text-slate-900 text-sm mb-3">Gesundheit & Ernährung</h3>
              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-bold text-slate-700">Allergien:</span>
                  <div className="text-slate-600 mt-0.5">
                    {activeChild.health?.allergies?.length > 0
                      ? activeChild.health.allergies.join(', ')
                      : 'Keine bekannten Allergien'}
                  </div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="font-bold text-slate-700">Ernährungsform:</span>
                  <div className="text-slate-600 mt-0.5">
                    {activeChild.health?.dietary_needs?.length > 0
                      ? activeChild.health.dietary_needs.join(', ')
                      : 'Reguläre Mischkost'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: ENTWICKLUNGSGESPRÄCHE (Modul C) */}
      {activeTab === 'CONFERENCES' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Entwicklungsgespräche & Elternsprechtag</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  1-Klick Slot-Buchung für das jährliche individuelle Entwicklungsgespräch mit den Bezugserzieher:innen.
                </p>
              </div>
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>

            <div className="space-y-3">
              {overview?.conferences?.length > 0 ? (
                overview.conferences.map((conf: any) => {
                  const isBookedByMe = conf.booked_by_parent_id === currentParentId;
                  const isAvailable = conf.status === 'AVAILABLE';
                  return (
                    <div
                      key={conf.id}
                      className={`p-4 rounded-2xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                        isBookedByMe ? 'bg-blue-50/70 border-blue-300' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-bold text-slate-900 text-sm">{conf.title}</span>
                          {isBookedByMe && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-600 text-white text-[10px] font-bold">
                              ✓ Dein Termin
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5">{conf.notes}</p>
                        <div className="flex items-center space-x-3 text-[11px] text-slate-400 mt-2">
                          <span className="font-semibold text-slate-700">Datum: {conf.date}</span>
                          <span>Zeit: {conf.time_start} - {conf.time_end} Uhr</span>
                          <span>Ort: {conf.room}</span>
                          <span>Erzieher: {conf.staff_name}</span>
                        </div>
                      </div>

                      {isBookedByMe ? (
                        <button
                          onClick={() => handleCancelConference(conf.id)}
                          className="px-3.5 py-1.5 border border-rose-300 text-rose-700 bg-white hover:bg-rose-50 rounded-xl text-xs font-bold transition-colors shrink-0"
                        >
                          Termin stornieren
                        </button>
                      ) : isAvailable ? (
                        <button
                          onClick={() => handleBookConference(conf.id)}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
                        >
                          Slot reservieren
                        </button>
                      ) : (
                        <span className="px-3 py-1 bg-slate-200 text-slate-500 rounded-xl text-xs font-bold">
                          Vergeben
                        </span>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Aktuell keine Sprechtag-Slots freigeschaltet.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: FOTO-GALERIE & PORTFOLIO (Modul C & B) */}
      {activeTab === 'PHOTOS' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Foto-Galerie & Kita-Portfolio</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Geschützte Fotoalben von Ausflügen, Projekten und Festen (DSGVO-konform mit Fotoerlaubnis).
                </p>
              </div>
              <ImageIcon className="w-5 h-5 text-purple-600" />
            </div>

            <div className="space-y-6">
              {overview?.photo_albums?.map((album: any) => (
                <div key={album.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{album.title}</h4>
                      <p className="text-xs text-slate-500">{album.description}</p>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium">{album.event_date}</span>
                  </div>

                  {/* Photo Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {album.photos?.map((photo: any) => (
                      <div key={photo.id} className="group relative rounded-2xl overflow-hidden shadow-xs border border-slate-200 bg-white">
                        <img
                          src={photo.image_url}
                          alt={photo.caption || 'Kita Foto'}
                          className="w-full h-44 object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        {photo.caption && (
                          <div className="p-2.5 text-[11px] text-slate-700 font-medium bg-white">
                            {photo.caption}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB: RECHNUNGEN & GEBÜHREN (Modul E) */}
      {activeTab === 'BILLING' && (
        <div className="space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">Monatsgebühren & Essensabrechnung</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Übersicht über Betreuungsbeiträge und tagesgenau abgerechnetes Essensgeld via SEPA-Lastschrift.
                </p>
              </div>
              <Receipt className="w-5 h-5 text-emerald-600" />
            </div>

            <div className="space-y-3">
              {overview?.invoices?.length > 0 ? (
                overview.invoices.map((inv: any) => (
                  <div key={inv.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-slate-900 text-sm">Monat {inv.month}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                          {inv.status === 'SEPA_EXPORTED' ? '✓ SEPA-Einzug aktiv' : 'Offen'}
                        </span>
                      </div>
                      <div className="text-slate-500 mt-1">
                        Grundgebühr: {inv.base_care_fee.toFixed(2)} € ({inv.care_hours}h) • Essensgeld: {inv.meal_fee.toFixed(2)} € ({inv.meal_days_counted} Essenstage)
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 font-mono">
                        IBAN: {inv.iban} • Mandat: {inv.mandate_ref}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-black text-emerald-700">{inv.total_amount.toFixed(2)} €</div>
                      <span className="text-[10px] text-slate-400">SEPA-Lastschrift</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Keine Rechnungen vorhanden.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: 1-KLICK KRANKMELDUNG */}
      {showSickModal && activeChild && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
            <div className="p-6 bg-gradient-to-r from-rose-600 to-pink-600 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-white/20 rounded-2xl backdrop-blur-md">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Krankmeldung für {activeChild.first_name}</h3>
                  <p className="text-xs text-rose-100">Heute, {format(new Date(), 'dd. MMMM yyyy', { locale: de })}</p>
                </div>
              </div>
              <button
                onClick={() => setShowSickModal(false)}
                className="text-white/80 hover:text-white p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleReportSick} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Grund der Abwesenheit</label>
                <select
                  value={sickReason}
                  onChange={(e) => setSickReason(e.target.value)}
                  className="w-full text-xs font-semibold p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-rose-500 bg-white"
                >
                  <option value="Fieber & Erkältung">Fieber & Erkältung</option>
                  <option value="Magen-Darm-Infekt">Magen-Darm-Infekt</option>
                  <option value="Arztbesuch / Vorsorge">Arztbesuch / U-Untersuchung</option>
                  <option value="Urlaub & Familientag">Urlaub & Familientag</option>
                  <option value="Sonstige Abwesenheit">Sonstiger Grund</option>
                </select>
              </div>

              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-slate-900">Mittagessen für heute abbestellen</div>
                  <div className="text-[11px] text-slate-500">Spart Essensgeld & Küchenressourcen</div>
                </div>
                <input
                  type="checkbox"
                  checked={cancelMeal}
                  onChange={(e) => setCancelMeal(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded-md focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowSickModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={sickSubmitting}
                  className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  {sickSubmitting ? 'Wird übermittelt...' : 'Verbindlich melden'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: DOKUMENT DIGITAL UNTERZEICHNEN */}
      {signingDoc && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
                  <FileSignature className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">{signingDoc.title}</h3>
                  <p className="text-xs text-slate-400">Digitales Signatur-Verfahren (DSGVO-konform)</p>
                </div>
              </div>
              <button onClick={() => setSigningDoc(null)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div
                className="p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs text-slate-700 max-h-48 overflow-y-auto leading-relaxed"
                dangerouslySetInnerHTML={{ __html: signingDoc.content_html }}
              />

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Name des unterzeichnenden Erziehungsberechtigten
                </label>
                <input
                  type="text"
                  value={signerName}
                  onChange={(e) => setSignerName(e.target.value)}
                  className="w-full text-xs font-semibold p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 bg-white"
                  placeholder="Vor- und Nachname"
                />
              </div>

              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] text-emerald-900 flex items-start space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  Mit dem Klick auf "Rechtsgültig unterzeichnen" bestätigst du den Inhalt. Zeitstempel und Signatur werden manipulationssicher hinterlegt.
                </span>
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSigningDoc(null)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  onClick={handleSignDocument}
                  disabled={isSigning || !signerName.trim()}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  {isSigning ? 'Wird signiert...' : 'Rechtsgültig unterzeichnen'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: NEUE ABHOLBERECHTIGUNG */}
      {showPickupModal && activeChild && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-100 overflow-hidden animate-scale-up">
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="p-2.5 bg-indigo-500/20 text-indigo-400 rounded-2xl border border-indigo-500/30">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-base">Abholberechtigte Person hinzufügen</h3>
                  <p className="text-xs text-slate-400">Für {activeChild.first_name} {activeChild.last_name}</p>
                </div>
              </div>
              <button onClick={() => setShowPickupModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddPickup} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Name der Person</label>
                <input
                  type="text"
                  required
                  value={pickupName}
                  onChange={(e) => setPickupName(e.target.value)}
                  className="w-full text-xs font-semibold p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="z.B. Helga Bergmann"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Verwandtschaftsverhältnis</label>
                <input
                  type="text"
                  required
                  value={pickupRel}
                  onChange={(e) => setPickupRel(e.target.value)}
                  className="w-full text-xs font-semibold p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="z.B. Großmutter, Nachbarin, Babysitter"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Telefonnummer für Notfälle</label>
                <input
                  type="tel"
                  value={pickupPhone}
                  onChange={(e) => setPickupPhone(e.target.value)}
                  className="w-full text-xs font-semibold p-3 border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500"
                  placeholder="z.B. 0171-9876543"
                />
              </div>

              <div className="flex items-center space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPickupModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-50"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  Berechtigung speichern
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
