import React, { useEffect, useState } from 'react';
import { addDays, addMonths, format, parseISO } from 'date-fns';
import { Staff } from '../types';
import { notifyError } from '../notify';

interface Absence {
  id: string;
  staff_id: string;
  staff_name: string;
  type: 'SICK' | 'VACATION';
  start_date: string;
  end_date: string | null;
}

interface AbsenceManagementProps {
  staff: Staff[];
  onChanged: () => void;
}

const iso = (d: Date) => format(d, 'yyyy-MM-dd');
const german = (date: string) => date.split('-').reverse().join('.');
const fieldClass = 'w-full h-10 px-3 mt-1 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 disabled:bg-slate-100 disabled:text-slate-400';

const DURATIONS: { label: string; end: (start: Date) => Date }[] = [
  { label: '1 Woche', end: s => addDays(s, 6) },
  { label: '2 Wochen', end: s => addDays(s, 13) },
  { label: '1 Monat', end: s => addDays(addMonths(s, 1), -1) },
  { label: '2 Monate', end: s => addDays(addMonths(s, 2), -1) }
];

export const AbsenceManagement: React.FC<AbsenceManagementProps> = ({ staff, onChanged }) => {
  const today = iso(new Date());
  const [absences, setAbsences] = useState<Absence[]>([]);
  const [remaining, setRemaining] = useState<Record<string, number>>({});
  const [staffId, setStaffId] = useState('');
  const [type, setType] = useState<'SICK' | 'VACATION'>('SICK');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState(today);
  const [openEnded, setOpenEnded] = useState(false);

  const load = () =>
    fetch('/api/absences')
      .then(r => r.json())
      .then(d => {
        setAbsences(d.absences);
        setRemaining(d.remaining_vacation);
      })
      .catch(e => notifyError(e.message));

  useEffect(() => {
    load();
  }, []);

  const send = async (url: string, method: string, body?: object) => {
    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: body ? JSON.stringify(body) : undefined
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await load();
      onChanged();
      return true;
    } catch (e: any) {
      notifyError(e.message);
      return false;
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const saved = await send('/api/absences', 'POST', { staff_id: staffId, type, start_date: start, end_date: openEnded ? null : end });
    if (saved) setStaffId('');
  };

  const chooseType = (next: 'SICK' | 'VACATION') => {
    setType(next);
    if (next === 'VACATION') setOpenEnded(false);
  };

  const changeStart = (value: string) => {
    setStart(value);
    if (end < value) setEnd(value);
  };

  const remove = (a: Absence) => {
    if (confirm(`Eintrag von ${a.staff_name} löschen?`)) send(`/api/absences/${a.id}`, 'DELETE');
  };

  const typeButton = (value: 'SICK' | 'VACATION', label: string) => (
    <button
      type="button"
      aria-pressed={type === value}
      onClick={() => chooseType(value)}
      className={`flex-1 h-10 rounded-lg text-sm font-medium border transition-colors ${
        type === value ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'border-slate-300 text-slate-700 hover:bg-slate-100'
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Krank & Urlaub</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">Einträge gelten sofort: Betroffene Schichten werden im Einsatzplan abgesagt.</p>

        <form onSubmit={submit} className="space-y-3 max-w-xl">
          <div className="flex gap-2">
            {typeButton('SICK', 'Krankmeldung')}
            {typeButton('VACATION', 'Urlaub')}
          </div>

          <label className="block text-sm font-medium text-slate-700">
            Mitarbeitende
            <select required value={staffId} onChange={e => setStaffId(e.target.value)} className={fieldClass}>
              <option value="">Bitte wählen</option>
              {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          {type === 'VACATION' && staffId && remaining[staffId] !== undefined && (
            <p className="text-sm text-slate-600">Resturlaub dieses Jahr: {remaining[staffId]} Tage</p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm font-medium text-slate-700">
              Von
              <input type="date" required value={start} onChange={e => changeStart(e.target.value)} className={fieldClass} />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Bis
              <input type="date" required={!openEnded} disabled={openEnded} min={start} value={openEnded ? '' : end} onChange={e => setEnd(e.target.value)} className={fieldClass} />
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            {DURATIONS.map(d => (
              <button
                key={d.label}
                type="button"
                onClick={() => {
                  setOpenEnded(false);
                  setEnd(iso(d.end(parseISO(start))));
                }}
                className="h-9 px-3 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-100"
              >
                {d.label}
              </button>
            ))}
            {type === 'SICK' && (
              <button
                type="button"
                aria-pressed={openEnded}
                onClick={() => setOpenEnded(!openEnded)}
                className={`h-9 px-3 rounded-lg border text-sm ${openEnded ? 'bg-emerald-100 border-emerald-300 text-emerald-900' : 'border-slate-300 text-slate-700 hover:bg-slate-100'}`}
              >
                Unbestimmte Zeit
              </button>
            )}
          </div>

          <button type="submit" className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">
            Eintragen
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900 mb-3">Aktuell und geplant</h3>
        {absences.length === 0 ? (
          <p className="text-sm text-slate-500">Keine Einträge.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-slate-500 text-left">
                  <th className="font-semibold py-2 pr-4">Mitarbeitende</th>
                  <th className="font-semibold py-2 pr-4">Art</th>
                  <th className="font-semibold py-2 pr-4">Von</th>
                  <th className="font-semibold py-2 pr-4">Bis</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {absences.map(a => (
                  <tr key={a.id} className="border-t border-slate-100">
                    <td className="py-2 pr-4 font-medium text-slate-900 whitespace-nowrap">{a.staff_name}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{a.type === 'SICK' ? 'Krank' : 'Urlaub'}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{german(a.start_date)}</td>
                    <td className="py-2 pr-4 whitespace-nowrap">{a.end_date ? german(a.end_date) : 'unbestimmt'}</td>
                    <td className="py-2 text-right whitespace-nowrap space-x-3">
                      {a.start_date <= today && a.end_date !== today && (
                        <button onClick={() => send(`/api/absences/${a.id}/end`, 'PUT', { end_date: today })} className="text-sm text-emerald-700 hover:underline">
                          Heute beenden
                        </button>
                      )}
                      <button onClick={() => remove(a)} className="text-sm text-rose-700 hover:underline">Löschen</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
