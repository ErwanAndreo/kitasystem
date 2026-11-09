import React from 'react';
import { format } from 'date-fns';
import { de } from 'date-fns/locale';
import { Excursion, Group, KitaClosure, Shift } from '../types';

const FIRST_HOUR = 7;
const LAST_HOUR = 18;
const PX_PER_HOUR = 48;
const HOURS = Array.from({ length: LAST_HOUR - FIRST_HOUR }, (_, i) => FIRST_HOUR + i);

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));

// Überlappende Termine liegen wie im Kalender nebeneinander.
const withLanes = (shifts: Shift[]) => {
  const laneEnds: number[] = [];
  const placed = [...shifts]
    .sort((a, b) => a.start_time.localeCompare(b.start_time))
    .map(shift => {
      let lane = laneEnds.findIndex(end => end <= toMinutes(shift.start_time));
      if (lane === -1) lane = laneEnds.length;
      laneEnds[lane] = toMinutes(shift.end_time);
      return { shift, lane };
    });
  return { placed, laneCount: Math.max(1, laneEnds.length) };
};

interface GroupCalendarProps {
  groups: Group[];
  shifts: Shift[];
  weekDays: Date[];
  closures: KitaClosure[];
  excursions: Excursion[];
  onOpenShift: (shift: Shift) => void;
}

export const GroupCalendar: React.FC<GroupCalendarProps> = ({ groups, shifts, weekDays, closures, excursions, onOpenShift }) => (
  <div className="space-y-6 min-w-[640px]">
    {groups.map(group => (
      <section key={group.id} aria-label={group.name}>
        <h3 className="font-bold text-slate-900 mb-2">{group.name}</h3>
        <div className="grid border border-slate-200 rounded-xl overflow-hidden" style={{ gridTemplateColumns: '48px repeat(5, minmax(0, 1fr))' }}>
          <div className="bg-slate-50 border-b border-slate-200" />
          {weekDays.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const closure = closures.find(c => c.date === dayStr);
            const excursion = excursions.find(e => e.date === dayStr && e.group_id === group.id);
            return (
              <div key={dayStr} className="bg-slate-50 border-b border-l border-slate-200 p-2 text-center text-xs">
                <div className="font-semibold text-slate-800">{format(day, 'EEE dd.MM.', { locale: de })}</div>
                {closure && <div className="text-rose-700 font-medium">{closure.title}</div>}
                {excursion && <div className="text-indigo-700 font-medium">Wandertag, {excursion.staff_count} Betreuende</div>}
              </div>
            );
          })}

          <div className="relative" style={{ height: HOURS.length * PX_PER_HOUR }}>
            {HOURS.map((h, i) => (
              <div key={h} className="absolute right-1 text-xs text-slate-400" style={{ top: i * PX_PER_HOUR + 2 }}>{h}:00</div>
            ))}
          </div>

          {weekDays.map(day => {
            const dayStr = format(day, 'yyyy-MM-dd');
            const { placed, laneCount } = withLanes(shifts.filter(s => s.group_id === group.id && s.date === dayStr));
            return (
              <div key={dayStr} className="relative border-l border-slate-200" style={{ height: HOURS.length * PX_PER_HOUR }}>
                {HOURS.map((h, i) => (
                  <div key={h} className="absolute inset-x-0 border-t border-slate-100" style={{ top: i * PX_PER_HOUR }} />
                ))}
                {placed.map(({ shift, lane }) => {
                  const start = toMinutes(shift.start_time);
                  const duration = toMinutes(shift.end_time) - start;
                  const cancelled = shift.status === 'CANCELLED';
                  return (
                    <button
                      key={shift.id}
                      onClick={() => onOpenShift(shift)}
                      title={`${shift.staff_name}, ${shift.start_time}–${shift.end_time} Uhr`}
                      className={`absolute flex flex-col justify-start rounded-md px-1.5 py-0.5 text-left text-xs overflow-hidden border-l-4 hover:brightness-95 ${cancelled ? 'line-through text-slate-400' : 'text-slate-900'}`}
                      style={{
                        top: ((start - FIRST_HOUR * 60) / 60) * PX_PER_HOUR + 1,
                        height: Math.max(22, (duration / 60) * PX_PER_HOUR - 2),
                        left: `${(lane / laneCount) * 100}%`,
                        width: `calc(${100 / laneCount}% - 2px)`,
                        borderLeftColor: cancelled ? '#cbd5e1' : shift.staff_color,
                        backgroundColor: cancelled ? '#f1f5f9' : `${shift.staff_color}26`
                      }}
                    >
                      <span className="block font-semibold truncate">{laneCount > 2 ? shift.staff_name.split(' ')[0] : shift.staff_name.replace(/\s*\(.*\)$/, '')}</span>
                      <span className="block">{shift.start_time}–{shift.end_time}</span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
    ))}
  </div>
);
