import React from 'react';
import { RatioStatusGroup } from '../types';
import { Users, AlertTriangle, CheckCircle, ShieldAlert, UserCheck } from 'lucide-react';

interface RatioRadarProps {
  groupsStatus: RatioStatusGroup[];
  date: string;
}

export const RatioRadar: React.FC<RatioRadarProps> = ({ groupsStatus, date }) => {
  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center space-x-2">
            <span>Live-Betreuungsschlüssel Wächter</span>
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700">
              {date}
            </span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Gesetzliche Fachkraft-Kind-Relation gemäß Landesrecht (KiBiz / KiTaG) in Echtzeit
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {groupsStatus.map((g) => {
          const isCritical = g.status === 'CRITICAL';
          const isWarning = g.status === 'WARNING';
          const isOptimal = g.status === 'OPTIMAL';

          return (
            <div
              key={g.group_id}
              className={`rounded-xl p-4 border transition-all ${
                isCritical
                  ? 'bg-rose-50/60 border-rose-300 ring-1 ring-rose-300'
                  : isWarning
                  ? 'bg-amber-50/60 border-amber-300'
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
                      : 'bg-emerald-600 text-white'
                  }`}
                >
                  {isCritical ? (
                    <>
                      <ShieldAlert className="w-3 h-3" />
                      <span>Unterbesetzt</span>
                    </>
                  ) : isWarning ? (
                    <>
                      <AlertTriangle className="w-3 h-3" />
                      <span>Grenzbereich</span>
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
              <div className="grid grid-cols-2 gap-2 my-3 p-2.5 bg-white rounded-lg border border-slate-200/80 shadow-xs">
                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Schlüssel Ist</div>
                  <div className={`text-lg font-extrabold ${isCritical ? 'text-rose-600' : 'text-slate-800'}`}>
                    1 : {g.actual_ratio > 50 ? '—' : g.actual_ratio.toFixed(1)}
                  </div>
                  <div className="text-[10px] text-slate-400">Soll: 1 : {g.target_ratio}</div>
                </div>

                <div>
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Fachkraftquote</div>
                  <div className="text-lg font-extrabold text-slate-800">
                    {(g.actual_fachkraft_percent * 100).toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Min: {(g.min_fachkraft_percent * 100).toFixed(0)}%
                  </div>
                </div>
              </div>

              {/* Status Message */}
              <p
                className={`text-xs mb-3 font-medium ${
                  isCritical ? 'text-rose-700 font-semibold' : isWarning ? 'text-amber-800' : 'text-emerald-700'
                }`}
              >
                {g.message}
              </p>

              {/* Active Staff Badges */}
              <div className="border-t border-slate-200/60 pt-2.5">
                <div className="text-[11px] font-medium text-slate-500 mb-1.5 flex items-center justify-between">
                  <span>Anwesend im Dienst ({g.total_staff}):</span>
                  <span className="text-[10px] text-slate-400">
                    {g.fachkraefte} FK / {g.ergaenzungskraefte} EK
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {g.staff.length === 0 ? (
                    <span className="text-xs text-rose-600 font-semibold italic">Niemand im Dienst!</span>
                  ) : (
                    g.staff.map((s, idx) => (
                      <span
                        key={idx}
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                          s.is_fachkraft
                            ? 'bg-blue-50 text-blue-800 border-blue-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title={`${s.staff_name} (${s.qualification}) - ${s.start_time} bis ${s.end_time} Uhr`}
                      >
                        <UserCheck className="w-2.5 h-2.5" />
                        <span>{s.staff_name.split(' ')[0]}</span>
                        <span className="text-[9px] text-slate-400">{s.start_time.slice(0, 5)}</span>
                      </span>
                    ))
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
