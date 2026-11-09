import React, { useState } from 'react';
import { X } from 'lucide-react';
import { AvailabilityRule, Staff } from '../types';
import { notifyError } from '../notify';

const DAYS: [number, string][] = [[1, 'Mo'], [2, 'Di'], [3, 'Mi'], [4, 'Do'], [5, 'Fr']];
const dayNames = (days?: number[]) => DAYS.filter(([d]) => days?.includes(d)).map(([, n]) => n).join(', ');
const onDays = (days?: number[]) => (days?.length ? ` (${dayNames(days)})` : '');

export const describeRule = (r: AvailabilityRule): string => {
  switch (r.type) {
    case 'ONLY_DAYS': return `Nur ${dayNames(r.days)}`;
    case 'MAX_DAYS_WEEK': return `Max. ${r.value} Tage/Woche`;
    case 'MAX_HOURS_DAY': return `Max. ${r.value} Std./Tag${onDays(r.days)}`;
    case 'EARLIEST': return `Ab ${r.value}${onDays(r.days)}`;
    case 'LATEST': return `Bis ${r.value}${onDays(r.days)}`;
    case 'NOT_BEFORE_VACATION': return `Nicht direkt vor Urlaub${onDays(r.days)}`;
    case 'WEEK_RHYTHM': return `${r.value === 'EVEN' ? 'Gerade' : 'Ungerade'} Wochen${onDays(r.days)}`;
    case 'NOTE': return String(r.value);
  }
};

const TEMPLATES: { label: string; rule: AvailabilityRule }[] = [
  { label: 'Nur bestimmte Tage', rule: { type: 'ONLY_DAYS', days: [1, 2] } },
  { label: 'Tage pro Woche', rule: { type: 'MAX_DAYS_WEEK', value: 2 } },
  { label: 'Stunden pro Tag', rule: { type: 'MAX_HOURS_DAY', days: [], value: 3 } },
  { label: 'Frühestens ab', rule: { type: 'EARLIEST', days: [], value: '08:15' } },
  { label: 'Spätestens bis', rule: { type: 'LATEST', days: [], value: '14:00' } },
  { label: 'Nicht vor Urlaub', rule: { type: 'NOT_BEFORE_VACATION', days: [5] } },
  { label: 'Jede zweite Woche', rule: { type: 'WEEK_RHYTHM', days: [], value: 'EVEN' } },
  { label: 'Sonstiges', rule: { type: 'NOTE', value: '' } }
];

const inputClass = 'h-9 px-2 rounded-lg border border-slate-300 bg-white text-sm text-slate-900';

interface AvailabilityRulesProps {
  staff: Staff;
  onClose: () => void;
  onSaved: () => void;
}

export const AvailabilityRules: React.FC<AvailabilityRulesProps> = ({ staff, onClose, onSaved }) => {
  const [rules, setRules] = useState<AvailabilityRule[]>(staff.availability_rules ?? []);

  const update = (index: number, patch: Partial<AvailabilityRule>) =>
    setRules(prev => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));

  const toggleDay = (index: number, day: number) => {
    const days = rules[index].days ?? [];
    update(index, { days: days.includes(day) ? days.filter(d => d !== day) : [...days, day].sort() });
  };

  const save = async () => {
    try {
      const res = await fetch(`/api/staff/${staff.id}/availability`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rules })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      onSaved();
      onClose();
    } catch (e: any) {
      notifyError(e.message);
    }
  };

  const sentence = (rule: AvailabilityRule, i: number) => {
    switch (rule.type) {
      case 'ONLY_DAYS':
        return <span>Arbeitet nur an diesen Tagen</span>;
      case 'MAX_DAYS_WEEK':
        return (
          <span>Höchstens <input type="number" aria-label="Tage pro Woche" min={1} max={5} value={rule.value as number} onChange={e => update(i, { value: Number(e.target.value) })} className={`${inputClass} w-16 mx-1`} /> Tage pro Woche</span>
        );
      case 'MAX_HOURS_DAY':
        return (
          <span>Höchstens <input type="number" aria-label="Stunden pro Tag" min={0.5} max={12} step={0.5} value={rule.value as number} onChange={e => update(i, { value: Number(e.target.value) })} className={`${inputClass} w-16 mx-1`} /> Stunden am Tag</span>
        );
      case 'EARLIEST':
        return (
          <span>Frühestens ab <input type="time" aria-label="Frühester Beginn" value={rule.value as string} onChange={e => update(i, { value: e.target.value })} className={`${inputClass} mx-1`} /> Uhr</span>
        );
      case 'LATEST':
        return (
          <span>Spätestens bis <input type="time" aria-label="Spätestes Ende" value={rule.value as string} onChange={e => update(i, { value: e.target.value })} className={`${inputClass} mx-1`} /> Uhr</span>
        );
      case 'NOT_BEFORE_VACATION':
        return <span>Nicht am letzten Arbeitstag vor dem Urlaub</span>;
      case 'WEEK_RHYTHM':
        return (
          <span>Nur in
            <select aria-label="Wochenrhythmus" value={rule.value as string} onChange={e => update(i, { value: e.target.value })} className={`${inputClass} mx-1`}>
              <option value="EVEN">geraden</option>
              <option value="ODD">ungeraden</option>
            </select>
            Kalenderwochen
          </span>
        );
      case 'NOTE':
        return (
          <input aria-label="Sonstiges" maxLength={200} placeholder="z. B. Mittwochs nur nach Absprache" value={rule.value as string} onChange={e => update(i, { value: e.target.value })} className={`${inputClass} w-full`} />
        );
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto p-5">
        <div className="flex items-start justify-between mb-1">
          <h3 className="font-bold text-slate-900">Wann kann {staff.name} arbeiten?</h3>
          <button onClick={onClose} aria-label="Schließen" className="p-1 text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-slate-500 mb-4">
          Kombiniere beliebig viele Regeln. Ohne Regeln ist die Person immer verfügbar. „Sonstiges“ ist nur ein Hinweis für dich und wird nicht geprüft.
        </p>

        <div className="space-y-2 mb-4">
          {rules.map((rule, i) => (
            <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-800">
              <div className="flex items-center justify-between gap-2">
                <div className="flex-1 min-w-0">{sentence(rule, i)}</div>
                <button onClick={() => setRules(rules.filter((_, x) => x !== i))} aria-label="Regel entfernen" className="p-1 text-slate-400 hover:text-rose-700"><X className="w-4 h-4" /></button>
              </div>
              {rule.type !== 'MAX_DAYS_WEEK' && rule.type !== 'NOTE' && (
                <div className="flex flex-wrap items-center gap-1 mt-2">
                  {DAYS.map(([d, label]) => (
                    <button
                      key={d}
                      type="button"
                      aria-pressed={rule.days?.includes(d)}
                      onClick={() => toggleDay(i, d)}
                      className={`w-9 h-8 rounded-lg border text-xs ${rule.days?.includes(d) ? 'bg-emerald-100 border-emerald-300 text-emerald-900 font-semibold' : 'border-slate-300 text-slate-600 hover:bg-white'}`}
                    >
                      {label}
                    </button>
                  ))}
                  {rule.type !== 'ONLY_DAYS' && !rule.days?.length && <span className="text-xs text-slate-500 ml-1">gilt jeden Tag</span>}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="text-xs font-semibold text-slate-500 mb-1.5">Regel hinzufügen</div>
        <div className="flex flex-wrap gap-1.5 mb-5">
          {TEMPLATES.map(t => (
            <button key={t.label} type="button" onClick={() => setRules([...rules, { ...t.rule }])} className="h-9 px-3 rounded-lg border border-slate-300 text-sm text-slate-700 hover:bg-slate-100">
              + {t.label}
            </button>
          ))}
        </div>

        <div className="flex justify-end gap-2">
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg text-sm text-slate-700 hover:bg-slate-100">Abbrechen</button>
          <button type="button" onClick={save} className="h-10 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold">Speichern</button>
        </div>
      </div>
    </div>
  );
};
