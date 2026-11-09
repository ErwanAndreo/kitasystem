import React, { useEffect, useState } from 'react';
import { Staff, Group } from '../types';
import { notifyError } from '../notify';
import { AvailabilityRules, describeRule } from './AvailabilityRules';

const DAYS: [number, string][] = [[1, 'Mo'], [2, 'Di'], [3, 'Mi'], [4, 'Do'], [5, 'Fr']];

interface StandardShift {
  staff_id: string;
  weekday: number;
  group_id: string;
  group_name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  warnings: string[];
}

interface Editing {
  staff: Staff;
  weekday: number;
  exists: boolean;
  group_id: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  allDays: boolean;
}

interface StandardRosterProps {
  staff: Staff[];
  groups: Group[];
  onChanged: () => void;
}

const netHours = (s: Pick<StandardShift, 'start_time' | 'end_time' | 'break_minutes'>) => {
  const [startH, startM] = s.start_time.split(':').map(Number);
  const [endH, endM] = s.end_time.split(':').map(Number);
  return Math.max(0, endH * 60 + endM - (startH * 60 + startM) - s.break_minutes) / 60;
};

const toMinutes = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3));
const toTime = (m: number) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;

// Neue Schichten starten direkt passend zu den Regeln der Person.
const suggestedTimes = (person: Staff, weekday: number) => {
  const applies = (person.availability_rules ?? []).filter(r => !r.days?.length || r.days.includes(weekday));
  const earliest = applies.find(r => r.type === 'EARLIEST')?.value as string | undefined;
  const latest = applies.find(r => r.type === 'LATEST')?.value as string | undefined;
  const maxHours = applies.find(r => r.type === 'MAX_HOURS_DAY')?.value as number | undefined;

  const start = earliest && earliest > '08:00' ? earliest : '08:00';
  let end = toMinutes('16:30');
  if (latest && toMinutes(latest) < end) end = toMinutes(latest);
  if (maxHours) end = Math.min(end, toMinutes(start) + maxHours * 60);
  const span = end - toMinutes(start);
  return { start_time: start, end_time: toTime(end), break_minutes: span > 360 ? 30 : 0 };
};

const fieldClass = 'w-full h-10 px-3 rounded-lg border border-slate-300 text-sm text-slate-900';

export const StandardRoster: React.FC<StandardRosterProps> = ({ staff, groups, onChanged }) => {
  const [rows, setRows] = useState<StandardShift[]>([]);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [rulesFor, setRulesFor] = useState<Staff | null>(null);

  const loadRows = () =>
    fetch('/api/standard-shifts')
      .then(r => r.json())
      .then(setRows)
      .catch(e => notifyError(e.message));

  useEffect(() => {
    loadRows();
  }, []);

  const shiftOf = (staffId: string, weekday: number) => rows.find(r => r.staff_id === staffId && r.weekday === weekday);

  const open = (person: Staff, weekday: number) => {
    const current = shiftOf(person.id, weekday);
    setEditing({
      staff: person,
      weekday,
      exists: !!current,
      ...(current ?? suggestedTimes(person, weekday)),
      group_id: current?.group_id ?? person.target_group_id ?? groups[0]?.id ?? '',
      allDays: !rows.some(r => r.staff_id === person.id) && !(person.availability_rules ?? []).some(r => r.type === 'ONLY_DAYS' || r.type === 'MAX_DAYS_WEEK')
    });
  };

  const request = async (url: string, init: RequestInit) => {
    try {
      const res = await fetch(url, init);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setRows(json.rows);
      setEditing(null);
      onChanged();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    request('/api/standard-shifts', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        staff_id: editing.staff.id,
        weekdays: editing.allDays ? DAYS.map(([d]) => d) : [editing.weekday],
        group_id: editing.group_id,
        start_time: editing.start_time,
        end_time: editing.end_time,
        break_minutes: editing.break_minutes
      })
    });
  };

  const remove = () => {
    if (editing) request(`/api/standard-shifts/${editing.staff.id}/${editing.weekday}`, { method: 'DELETE' });
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Dienstplan</h2>
      <p className="text-sm text-slate-500 mt-1 mb-4 max-w-2xl">
        Die Standardwoche: einmal einrichten, daraus entsteht automatisch der Einsatzplan. Änderungen gelten ab morgen und überschreiben keine einzeln angepassten Schichten.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="sticky left-0 bg-white text-left font-semibold py-2 pr-4">Mitarbeitende</th>
              {DAYS.map(([d, label]) => <th key={d} className="font-semibold py-2 px-1">{label}</th>)}
              <th className="text-right font-semibold py-2 pl-3 whitespace-nowrap">Std./Woche</th>
            </tr>
          </thead>
          <tbody>
            {staff.map(person => {
              const planned = rows.filter(r => r.staff_id === person.id).reduce((sum, r) => sum + netHours(r), 0);
              const rules = person.availability_rules ?? [];
              const warnings = [...new Set(rows.filter(r => r.staff_id === person.id).flatMap(r => r.warnings))];
              return (
                <tr key={person.id} className="border-t border-slate-100">
                  <td className="sticky left-0 z-10 bg-white py-2 pr-4 w-56 min-w-56">
                    <div className="font-medium text-slate-900">{person.name}</div>
                    <button onClick={() => setRulesFor(person)} className="block text-left text-xs text-emerald-700 hover:underline">
                      {rules.length > 0 ? rules.map(describeRule).join(' · ') : 'Verfügbarkeit festlegen'}
                    </button>
                    {warnings.length > 0 && <div className="text-xs text-amber-800 mt-0.5">Passt nicht: {warnings.join(', ')}</div>}
                  </td>
                  {DAYS.map(([d, label]) => {
                    const shift = shiftOf(person.id, d);
                    const notWorking = rules.some(r => r.type === 'ONLY_DAYS' && !r.days?.includes(d));
                    return (
                      <td key={d} className="py-2 px-1">
                        <button
                          onClick={() => open(person, d)}
                          aria-label={`${person.name}, ${label}`}
                          className={`w-32 h-12 rounded-lg border text-xs transition-colors ${
                            shift?.warnings.length
                              ? 'bg-amber-50 border-amber-300 text-amber-900 hover:bg-amber-100'
                              : shift
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-900 hover:bg-emerald-100'
                              : 'border-dashed border-slate-300 text-slate-400 hover:bg-slate-50'
                          }`}
                        >
                          {shift ? (
                            <>
                              <span className="block font-semibold">{shift.start_time}–{shift.end_time}</span>
                              <span className="block truncate px-1">{shift.group_name}</span>
                            </>
                          ) : notWorking ? 'frei' : '+'}
                        </button>
                      </td>
                    );
                  })}
                  <td className={`py-2 pl-3 text-right tabular-nums whitespace-nowrap ${planned > person.weekly_hours ? 'text-rose-700 font-semibold' : 'text-slate-600'}`}>
                    {planned.toLocaleString('de-DE', { maximumFractionDigits: 1 })} / {person.weekly_hours}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {rulesFor && (
        <AvailabilityRules
          staff={rulesFor}
          onClose={() => setRulesFor(null)}
          onSaved={() => {
            loadRows();
            onChanged();
          }}
        />
      )}

      {editing && (
        <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
          <form onSubmit={save} className="bg-white rounded-2xl w-full max-w-sm p-5 space-y-3">
            <h3 className="font-bold text-slate-900">
              {editing.staff.name}, {DAYS.find(([d]) => d === editing.weekday)?.[1]}
            </h3>

            <label className="block text-sm font-medium text-slate-700">
              Gruppe
              <select required value={editing.group_id} onChange={e => setEditing({ ...editing, group_id: e.target.value })} className={`${fieldClass} mt-1 bg-white`}>
                {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>

            <div className="grid grid-cols-3 gap-2">
              <label className="block text-sm font-medium text-slate-700">
                Von
                <input type="time" required value={editing.start_time} onChange={e => setEditing({ ...editing, start_time: e.target.value })} className={`${fieldClass} mt-1 px-2`} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Bis
                <input type="time" required value={editing.end_time} onChange={e => setEditing({ ...editing, end_time: e.target.value })} className={`${fieldClass} mt-1 px-2`} />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Pause
                <input type="number" min={0} max={120} required value={editing.break_minutes} onChange={e => setEditing({ ...editing, break_minutes: Number(e.target.value) })} className={`${fieldClass} mt-1 px-2`} />
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={editing.allDays} onChange={e => setEditing({ ...editing, allDays: e.target.checked })} />
              Für Montag bis Freitag übernehmen
            </label>

            <div className="flex items-center justify-between pt-2">
              {editing.exists ? (
                <button type="button" onClick={remove} className="text-sm text-rose-700 hover:underline">Entfernen</button>
              ) : <span />}
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditing(null)} className="h-10 px-4 rounded-lg text-sm text-slate-700 hover:bg-slate-100">Abbrechen</button>
                <button type="submit" className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Speichern</button>
              </div>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
