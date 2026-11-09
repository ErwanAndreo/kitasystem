import React, { useEffect, useState } from 'react';
import { Group } from '../types';
import { notifyError } from '../notify';

type Counts = Record<string, Record<number, number>>;

interface ChildCountPlannerProps {
  groups: Group[];
  onChanged: () => void;
}

const label = (slot: number) => `${Math.floor(slot / 60)}:${String(slot % 60).padStart(2, '0')}`;
const QUARTERS = [15, 30, 45];

export const ChildCountPlanner: React.FC<ChildCountPlannerProps> = ({ groups, onChanged }) => {
  const [slots, setSlots] = useState<number[]>([]);
  const [counts, setCounts] = useState<Counts>({});
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetch('/api/hourly-children')
      .then(r => r.json())
      .then(d => {
        setSlots(d.slots);
        setCounts(d.groups);
      })
      .catch(e => notifyError(e.message));
  }, []);

  const clearDraft = (key: string) =>
    setDrafts(prev => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });

  const save = async (groupId: string, slot: number) => {
    const key = `${groupId}-${slot}`;
    const raw = drafts[key];
    if (raw === undefined || raw.trim() === '' || Number(raw) === counts[groupId]?.[slot]) {
      clearDraft(key);
      return;
    }
    try {
      const res = await fetch(`/api/groups/${groupId}/hourly-children/${slot}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ child_count: Number(raw) })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setCounts(prev => ({ ...prev, [groupId]: json.counts }));
      onChanged();
    } catch (e: any) {
      notifyError(e.message);
    } finally {
      clearDraft(key);
    }
  };

  const reset = async (group: Group) => {
    if (!confirm(`Alle Kinderzahlen für ${group.name} löschen?`)) return;
    try {
      const res = await fetch(`/api/groups/${group.id}/hourly-children`, { method: 'DELETE' });
      if (!res.ok) throw new Error((await res.json()).error);
      setCounts(prev => ({ ...prev, [group.id]: {} }));
      onChanged();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const hours = slots.filter(s => s % 60 === 0);

  const cell = (group: Group, slot: number, small = false) => {
    const key = `${group.id}-${slot}`;
    return (
      <input
        type="number"
        min={0}
        max={200}
        aria-label={`${group.name}, ${label(slot)} Uhr`}
        value={drafts[key] ?? counts[group.id]?.[slot] ?? ''}
        onChange={e => setDrafts(prev => ({ ...prev, [key]: e.target.value }))}
        onBlur={() => save(group.id, slot)}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        className={`${small ? 'w-11 h-8 text-xs' : 'w-14 h-9 text-sm'} text-center rounded-lg border border-slate-300 text-slate-900 focus:outline-emerald-500`}
      />
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Kinderzahlen</h2>
      <p className="text-sm text-slate-500 mt-1 mb-4 max-w-2xl">
        Der erste Wert gilt für alle Zeiten. Ein Wert bei einer vollen Stunde gilt danach für diese ganze Stunde. Unter „Viertelstunden“ passt du einzelne Viertelstunden an. Die Zahlen gelten für jeden Öffnungstag.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-slate-500">
              <th className="sticky left-0 z-10 bg-white text-left font-semibold py-2 pr-4">Gruppe</th>
              {hours.map(h => (
                <th key={h} className="font-semibold py-2 px-1">{label(h)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map(group => {
              const c = counts[group.id] ?? {};
              const differs = hours.some(h => QUARTERS.some(q => c[h + q] !== c[h]));
              const open = expanded[group.id] ?? differs;
              return (
                <tr key={group.id} className="border-t border-slate-100 align-top">
                  <td className="sticky left-0 z-10 bg-white py-2 pr-4">
                    <div className="font-medium text-slate-900 whitespace-nowrap">{group.name}</div>
                    <div className="flex gap-3 mt-0.5">
                      <button onClick={() => setExpanded(prev => ({ ...prev, [group.id]: !open }))} aria-expanded={open} className="text-xs text-emerald-700 hover:underline">
                        Viertelstunden
                      </button>
                      {Object.keys(c).length > 0 && (
                        <button onClick={() => reset(group)} className="text-xs text-slate-500 hover:text-slate-800 hover:underline">Zurücksetzen</button>
                      )}
                    </div>
                  </td>
                  {hours.map(h => (
                    <td key={h} className="py-2 px-1 text-center">
                      {cell(group, h)}
                      {open && QUARTERS.map(q => (
                        <div key={q} className="mt-1 flex items-center justify-center gap-0.5">
                          <span className="text-xs text-slate-400 w-5 text-right">:{q}</span>
                          {cell(group, h + q, true)}
                        </div>
                      ))}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
