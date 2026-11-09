import React, { useState } from 'react';
import { Group } from '../types';
import { notifyError } from '../notify';

type Field = 'target_ratio' | 'quota';

interface GroupRatiosProps {
  groups: Group[];
  onChanged: () => void;
}

const inputClass = 'w-20 h-9 text-center rounded-lg border border-slate-300 text-slate-900 focus:outline-emerald-500';

export const GroupRatios: React.FC<GroupRatiosProps> = ({ groups, onChanged }) => {
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const clearDraft = (key: string) =>
    setDrafts(prev => {
      const { [key]: _removed, ...rest } = prev;
      return rest;
    });

  const saved = (group: Group, field: Field) =>
    field === 'target_ratio' ? group.target_ratio : Math.round(group.min_fachkraft_percent * 100);

  const save = async (group: Group, field: Field) => {
    const key = `${group.id}-${field}`;
    const raw = drafts[key];
    if (raw === undefined || raw.trim() === '' || Number(raw) === saved(group, field)) {
      clearDraft(key);
      return;
    }
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(field === 'target_ratio' ? { target_ratio: Number(raw) } : { min_fachkraft_percent: Number(raw) / 100 })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      await onChanged();
    } catch (e: any) {
      notifyError(e.message);
    } finally {
      clearDraft(key);
    }
  };

  const input = (group: Group, field: Field, label: string, props: React.InputHTMLAttributes<HTMLInputElement>) => {
    const key = `${group.id}-${field}`;
    return (
      <input
        type="number"
        aria-label={`${group.name}: ${label}`}
        value={drafts[key] ?? saved(group, field)}
        onChange={e => setDrafts(prev => ({ ...prev, [key]: e.target.value }))}
        onBlur={() => save(group, field)}
        onKeyDown={e => e.key === 'Enter' && e.currentTarget.blur()}
        className={inputClass}
        {...props}
      />
    );
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
      <h2 className="text-lg font-bold text-slate-900">Betreuungsschlüssel</h2>
      <p className="text-sm text-slate-500 mt-1 mb-4 max-w-2xl">
        Trag pro Gruppe ein, wie viele Kinder auf eine Betreuungskraft kommen dürfen. Gespeichert wird automatisch.
      </p>

      <div className="overflow-x-auto">
        <table className="text-sm">
          <thead>
            <tr className="text-xs text-slate-500 text-left">
              <th className="font-semibold py-2 pr-8">Gruppe</th>
              <th className="font-semibold py-2 pr-8">Schlüssel</th>
              <th className="font-semibold py-2">Fachkraftquote</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(group => (
              <tr key={group.id} className="border-t border-slate-100">
                <td className="py-2 pr-8 font-medium text-slate-900 whitespace-nowrap">{group.name}</td>
                <td className="py-2 pr-8 whitespace-nowrap">1 : {input(group, 'target_ratio', 'Schlüssel', { min: 0.5, max: 30, step: 'any' })}</td>
                <td className="py-2 whitespace-nowrap">{input(group, 'quota', 'Fachkraftquote', { min: 0, max: 100, step: 1 })} %</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
