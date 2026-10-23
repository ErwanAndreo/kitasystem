import React from 'react';
import { RatioStatusGroup } from '../types';
import { Users, AlertTriangle, CheckCircle, ShieldAlert, UserCheck, HeartPulse, Award } from 'lucide-react';

interface RatioRadarProps {
  groupsStatus: RatioStatusGroup[];
  date: string;
}

export const RatioRadar: React.FC<RatioRadarProps> = ({ groupsStatus, date }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-2">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <span>Live-Betreuungsschlüssel & Skill-Wächter</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {date}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Echtzeit-Prüfung nach Fachkraftquote, Kind-Betreuer-Relation & Pflicht-Skills (U3-Zertifikat, Ersthelfer)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center space-x-1 text-xs font-semibold px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <HeartPulse className="w-3.5 h-3.5 text-emerald-600" />
            <span>Ersthelfer am Kind im Haus: ✓ Gesichert</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {groupsStatus.map((g) => {
          const isCritical = g.status === 'CRITICAL';
          const isWarning = g.status === 'WARNING';
          const isBalanced = g.status === 'BALANCED_OK';

          return (
            <div
              key={g.group_id}
              className={`rounded-xl p-4 border transition-all ${
                isCritical
                  ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-300'
                  : isWarning
                  ? 'bg-amber-50/60 border-amber-300'
                  : isBalanced
                  ? 'bg-teal-50/50 border-teal-300 ring-1 ring-teal-200'
                  : 'bg-emerald-50/40 border-emerald-200'
              }`}
            >
              {/* Group Header */}
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-slate-900 truncate">
                  {g.group_name}
                </span>
                <span
                  className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${
                    isCritical
                      ? 'bg-rose-600 text-white animate-pulse'
                      : isWarning
                      ? 'bg-amber-500 text-white'
                      : isBalanced
                      ? 'bg-teal-600 text-white'
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isCritical ? (
                    <>
                      <ShieldAlert className="w-3 h-3" />
                      <span>Alarm</span>
                    </>
                  ) : isWarning ? (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      <span>Grenzbereich</span>
                    </>
                  ) : isBalanced ? (
                    <>
                      <UserCheck className="w-3 h-3" />
                      <span>Auto-Balancing ✓</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-3 h-3" />
                      <span>Optimal</span>
                    </>
                  )}
                </span>
              </div>

              {/* Ratios Metrics */}
              <div className="grid grid-cols-2 gap-2 my-2.5 p-2 bg-white rounded-lg border border-slate-200/80 shadow-2xs">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    {isBalanced ? 'Real-Schlüssel' : 'Schlüssel Ist'}
                  </div>
                  <div className={`text-lg font-extrabold ${isCritical ? 'text-rose-600' : isBalanced ? 'text-teal-700' : 'text-slate-800'}`}>
                    1 : {g.actual_ratio > 50 ? '—' : g.actual_ratio.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Soll: 1 : {g.target_ratio}
                    {g.static_ratio && g.static_ratio !== g.actual_ratio && (
                      <span className="block text-[9px] text-slate-500 line-through">
                        Soll-Besetzung: 1:{g.static_ratio.toFixed(1)}
                      </span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    {g.effective_children !== undefined ? 'Kinder im Haus' : 'Fachkraftquote'}
                  </div>
                  {g.effective_children !== undefined ? (
                    <>
                      <div className="text-lg font-extrabold text-slate-800">
                        {g.effective_children} <span className="text-xs font-normal text-slate-500">/ {g.enrolled_children || g.child_count}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {(g.absent_children ?? 0) > 0 ? (
                          <span className="text-emerald-600 font-semibold">{g.absent_children} abgemeldet</span>
                        ) : (
                          'Vollzählig'
                        )}
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="text-lg font-extrabold text-slate-800">
                        {(g.actual_fachkraft_percent * 100).toFixed(0)}%
                      </div>
                      <div className="text-[10px] text-slate-400">
                        Min: {(g.min_fachkraft_percent * 100).toFixed(0)}%
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Status Message */}
              <p
                className={`text-xs mb-2.5 font-medium ${
                  isCritical
                    ? 'text-rose-700 font-semibold'
                    : isWarning
                    ? 'text-amber-800'
                    : isBalanced
                    ? 'text-teal-800 bg-teal-100/60 p-1.5 rounded-lg border border-teal-200'
                    : 'text-emerald-700'
                }`}
              >
                {g.message}
              </p>

              {/* Skill Requirements Pill */}
              <div className="mb-2 text-[10px] text-slate-500 flex items-center space-x-1">
                <span className="font-semibold text-slate-700">Pflicht-Skills:</span>
                <span className="inline-flex gap-1">
                  {g.group_type === 'U3' ? (
                    <span className="px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-bold">U3-Zertifikat</span>
                  ) : (
                    <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded font-bold">Elementar-Fachkraft</span>
                  )}
                </span>
              </div>

              {/* Active Staff with their Skills */}
              <div className="border-t border-slate-200/60 pt-2">
                <div className="text-[11px] font-medium text-slate-500 mb-1 flex items-center justify-between">
                  <span>Anwesend ({g.total_staff}):</span>
                  <span className="text-[10px] text-slate-400">
                    {g.fachkraefte} FK / {g.ergaenzungskraefte} EK
                  </span>
                </div>
                <div className="flex flex-wrap gap-1">
                  {g.staff.length === 0 ? (
                    <span className="text-xs text-rose-600 font-semibold italic">Niemand im Dienst!</span>
                  ) : (
                    g.staff.map((s, idx) => {
                      const skills: string[] = s.skills || [];
                      const isU3 = skills.includes('U3_QUALIFIKATION');
                      const isFirstAid = skills.includes('ERSTE_HILFE_KIND');

                      return (
                        <div
                          key={idx}
                          className={`px-2 py-1 rounded-md text-[11px] border flex flex-col ${
                            s.is_fachkraft
                              ? 'bg-blue-50/80 text-blue-900 border-blue-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center space-x-1 font-bold">
                            <UserCheck className="w-3 h-3 text-emerald-600" />
                            <span>{s.staff_name.split(' ')[0]}</span>
                            <span className="text-[9px] text-slate-400 font-normal">({s.start_time})</span>
                          </div>

                          {/* Skill Tags */}
                          <div className="flex items-center space-x-1 mt-0.5 text-[9px]">
                            {isU3 && <span className="text-rose-700 font-bold">👶 U3</span>}
                            {isFirstAid && <span className="text-emerald-700 font-bold">🩺 Ersthelfer</span>}
                            {s.can_spring === 1 && <span className="text-indigo-700 font-bold">🔄 Springer</span>}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
