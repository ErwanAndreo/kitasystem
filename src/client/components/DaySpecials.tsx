import React, { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Excursion, Group, KitaClosure } from '../types';
import { notifyError } from '../notify';

const german = (date: string) => date.split('-').reverse().join('.');
const fieldClass = 'w-full h-10 px-3 mt-1 rounded-lg border border-slate-300 bg-white text-sm text-slate-900';
const submitClass = 'h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold';

interface DaySpecialsProps {
  groups: Group[];
  onChanged: () => void;
  showToast: (msg: string) => void;
}

export const DaySpecials: React.FC<DaySpecialsProps> = ({ groups, onChanged, showToast }) => {
  const today = format(new Date(), 'yyyy-MM-dd');
  const [excursions, setExcursions] = useState<Excursion[]>([]);
  const [closures, setClosures] = useState<KitaClosure[]>([]);
  const [tripDate, setTripDate] = useState('');
  const [tripGroup, setTripGroup] = useState('');
  const [tripStaff, setTripStaff] = useState(3);
  const [closedDate, setClosedDate] = useState('');
  const [closedTitle, setClosedTitle] = useState('');

  const load = async () => {
    try {
      const [e, c] = await Promise.all([fetch('/api/excursions'), fetch('/api/closures')]);
      setExcursions(await e.json());
      setClosures(await c.json());
    } catch (err: any) {
      notifyError(err.message);
    }
  };

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
      if (json.message) showToast(json.message);
      await load();
      onChanged();
      return true;
    } catch (err: any) {
      notifyError(err.message);
      return false;
    }
  };

  const addTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send('/api/excursions', 'POST', { date: tripDate, group_id: tripGroup, staff_count: tripStaff })) setTripDate('');
  };

  const addClosure = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await send('/api/closures', 'POST', { date: closedDate, title: closedTitle.trim() || 'Schließtag', type: 'SCHLIESSTAG' })) {
      setClosedDate('');
      setClosedTitle('');
    }
  };

  const upcomingTrips = excursions.filter(x => x.date >= today);
  const upcomingClosures = closures.filter(c => c.date >= today);
  const removeClass = 'text-sm text-rose-700 hover:underline';

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900">Wandertage</h3>
        <p className="text-sm text-slate-500 mt-0.5 mb-3">An dem Tag wird die Gruppe automatisch mit dieser Anzahl besetzt.</p>
        <form onSubmit={addTrip} className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700">
            Datum
            <input type="date" required min={today} value={tripDate} onChange={e => setTripDate(e.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Betreuende
            <input type="number" required min={1} max={20} value={tripStaff} onChange={e => setTripStaff(Number(e.target.value))} className={fieldClass} />
          </label>
          <label className="block text-sm font-medium text-slate-700 col-span-2">
            Gruppe
            <select required value={tripGroup} onChange={e => setTripGroup(e.target.value)} className={fieldClass}>
              <option value="">Bitte wählen</option>
              {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
          </label>
          <div className="col-span-2"><button type="submit" className={submitClass}>Wandertag eintragen</button></div>
        </form>
        <ul className="mt-3 divide-y divide-slate-100">
          {upcomingTrips.map(x => (
            <li key={x.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-800">{german(x.date)}, {x.group_name}, {x.staff_count} Betreuende</span>
              <button onClick={() => send(`/api/excursions/${x.id}`, 'DELETE')} className={removeClass}>Löschen</button>
            </li>
          ))}
        </ul>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
        <h3 className="font-bold text-slate-900">Schließtage</h3>
        <p className="text-sm text-slate-500 mt-0.5 mb-3">An dem Tag wird kein Plan erstellt, bestehende Schichten fallen weg.</p>
        <form onSubmit={addClosure} className="grid grid-cols-2 gap-3">
          <label className="block text-sm font-medium text-slate-700">
            Datum
            <input type="date" required min={today} value={closedDate} onChange={e => setClosedDate(e.target.value)} className={fieldClass} />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Bezeichnung
            <input maxLength={80} placeholder="z. B. Brückentag" value={closedTitle} onChange={e => setClosedTitle(e.target.value)} className={fieldClass} />
          </label>
          <div className="col-span-2"><button type="submit" className={submitClass}>Schließtag eintragen</button></div>
        </form>
        <ul className="mt-3 divide-y divide-slate-100">
          {upcomingClosures.map(c => (
            <li key={c.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-slate-800">{german(c.date)}, {c.title}</span>
              <button onClick={() => send(`/api/closures/${c.id}`, 'DELETE')} className={removeClass}>Löschen</button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};
