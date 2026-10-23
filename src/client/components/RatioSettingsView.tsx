import React, { useState, useEffect } from 'react';
import { RatioSetting } from '../types';
import { 
  Sliders, 
  ShieldCheck, 
  Clock, 
  HelpCircle, 
  Check, 
  Sparkles, 
  AlertTriangle, 
  Info,
  BookOpen
} from 'lucide-react';

interface RatioSettingsViewProps {
  showToast: (msg: string) => void;
}

export const RatioSettingsView: React.FC<RatioSettingsViewProps> = ({ showToast }) => {
  const [settings, setSettings] = useState<RatioSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [activePreset, setActivePreset] = useState('NRW_KIBIZ');

  // Form state for facility default
  const [targetUe3, setTargetUe3] = useState(8.0);
  const [targetU3, setTargetU3] = useState(3.33);
  const [warningThreshold, setWarningThreshold] = useState(15.0);
  const [criticalThreshold, setCriticalThreshold] = useState(25.0);
  const [twoPersonRule, setTwoPersonRule] = useState(true);
  const [coreTimeStart, setCoreTimeStart] = useState('09:00');
  const [coreTimeEnd, setCoreTimeEnd] = useState('13:00');
  const [minFachkraft, setMinFachkraft] = useState(0.50);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/ratio-settings');
      if (res.ok) {
        const data: RatioSetting[] = await res.json();
        setSettings(data);
        const def = data.find(s => !s.group_id) || data[0];
        const u3Set = data.find(s => s.group_id === 'g_u3_maeuse');
        if (def) {
          setTargetUe3(def.target_ratio);
          setWarningThreshold(def.warning_threshold_percent);
          setCriticalThreshold(def.critical_threshold_percent);
          setTwoPersonRule(def.two_person_rule !== 0);
          setCoreTimeStart(def.core_time_start || '09:00');
          setCoreTimeEnd(def.core_time_end || '13:00');
          setMinFachkraft(def.min_qualification_quote || 0.50);
          setActivePreset(def.bundesland_preset || 'NRW_KIBIZ');
        }
        if (u3Set) {
          setTargetU3(u3Set.target_ratio);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleApplyPreset = async (preset: string) => {
    try {
      const res = await fetch('/api/ratio-settings/apply-preset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preset })
      });

      if (res.ok) {
        const data = await res.json();
        setActivePreset(preset);
        setTargetU3(data.u3Ratio);
        setTargetUe3(data.ue3Ratio);
        showToast(`✓ Vorlage für ${preset} erfolgreich angewendet!`);
        loadSettings();
      }
    } catch (e) {
      console.error(e);
      showToast('Fehler beim Anwenden der Vorlage');
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await Promise.all([
        fetch('/api/ratio-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'rs_default',
            group_id: null,
            target_ratio: targetUe3,
            warning_threshold_percent: warningThreshold,
            critical_threshold_percent: criticalThreshold,
            two_person_rule: twoPersonRule ? 1 : 0,
            core_time_start: coreTimeStart,
            core_time_end: coreTimeEnd,
            min_qualification_quote: minFachkraft,
            bundesland_preset: activePreset
          })
        }),
        fetch('/api/ratio-settings', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: 'rs_u3',
            group_id: 'g_u3_maeuse',
            target_ratio: targetU3,
            warning_threshold_percent: warningThreshold,
            critical_threshold_percent: criticalThreshold,
            two_person_rule: twoPersonRule ? 1 : 0,
            core_time_start: coreTimeStart,
            core_time_end: coreTimeEnd,
            min_qualification_quote: 0.67,
            bundesland_preset: activePreset
          })
        })
      ]);

      showToast('✓ Betreuungsschlüssel-Konfiguration gespeichert');
      loadSettings();
    } catch (e) {
      console.error(e);
      showToast('Fehler beim Speichern');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-indigo-600" />
            <span>Betreuungsschlüssel & Gesetzes-Konfiguration</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ebene 3: Gesetzliche Vorgaben, Bundesland-Standards, Toleranzgrenzen & Zwei-Kräfte-Aufsichtspflicht
          </p>
        </div>

        <div className="flex items-center space-x-2 bg-indigo-50 border border-indigo-200 px-3.5 py-2 rounded-2xl text-xs text-indigo-800 font-bold">
          <BookOpen className="w-4 h-4 text-indigo-600" />
          <span>Aktive Vorlage: {activePreset}</span>
        </div>
      </div>

      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* 1. Bundesland 1-Click Presets */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>1-Klick Bundesland-Vorlagen</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Wähle dein Bundesland, um die offiziell empfohlenen Fachkraft-Kind-Schlüssel und Fachkraftquoten zu laden:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { id: 'NRW_KIBIZ', name: 'NRW (KiBiz)', u3: '1 : 3.33', ue3: '1 : 8.0', desc: 'Kinderbildungsgesetz NRW' },
              { id: 'BAYERN_BAYKIBIG', name: 'Bayern (BayKiBiG)', u3: '1 : 3.0', ue3: '1 : 7.5', desc: 'Bayerisches Kinderbildungs- und -betreuungsgesetz' },
              { id: 'BAWUE_KITAG', name: 'Baden-Württ. (KiTaG)', u3: '1 : 3.0', ue3: '1 : 7.0', desc: '70% Fachkraftquote U3' },
              { id: 'BERLIN_KITAFOEG', name: 'Berlin (KitaFöG)', u3: '1 : 3.5', ue3: '1 : 8.0', desc: 'Kindertagesförderungsgesetz' },
            ].map(p => {
              const isSelected = activePreset === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => handleApplyPreset(p.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-50/70 border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/60'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-extrabold text-xs text-slate-900">{p.name}</span>
                    {isSelected && <Check className="w-4 h-4 text-indigo-600" />}
                  </div>
                  <div className="text-[11px] font-bold text-indigo-700">
                    U3: {p.u3} • Ü3: {p.ue3}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2. Detailed Parameter Sliders & Number Inputs */}
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm space-y-6">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Individuelle Schlüssel & Toleranzen</h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* U3 Target Ratio */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">Soll-Schlüssel Krippe (U3)</label>
                <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                  1 : {targetU3.toFixed(2)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Rechnerische Kinderanzahl pro Fachkraft in der Krippe.</p>
              <input
                type="range"
                min="2.5"
                max="5.5"
                step="0.1"
                value={targetU3}
                onChange={e => setTargetU3(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Ü3 Target Ratio */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">Soll-Schlüssel Kindergarten (Ü3)</label>
                <span className="text-xs font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-200">
                  1 : {targetUe3.toFixed(1)}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Rechnerische Kinderanzahl pro Fachkraft im Elementarbereich.</p>
              <input
                type="range"
                min="6.0"
                max="12.0"
                step="0.5"
                value={targetUe3}
                onChange={e => setTargetUe3(parseFloat(e.target.value))}
                className="w-full accent-indigo-600"
              />
            </div>

            {/* Warning Threshold */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">Gelbe Ampel (Toleranzpuffer)</label>
                <span className="text-xs font-mono font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                  +{warningThreshold}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Ab welcher prozentualen Überschreitung die Ampel auf Gelb springt.</p>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={warningThreshold}
                onChange={e => setWarningThreshold(parseFloat(e.target.value))}
                className="w-full accent-amber-500"
              />
            </div>

            {/* Critical Threshold */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-bold text-slate-800">Rote Ampel (Akuter Notfallalarm)</label>
                <span className="text-xs font-mono font-black text-rose-600 bg-rose-50 px-2 py-0.5 rounded-lg border border-rose-200">
                  +{criticalThreshold}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500 mb-3">Löst automatische Einspring-Kaskade und Leitungs-Warnung aus.</p>
              <input
                type="range"
                min="15"
                max="50"
                step="5"
                value={criticalThreshold}
                onChange={e => setCriticalThreshold(parseFloat(e.target.value))}
                className="w-full accent-rose-600"
              />
            </div>
          </div>

          {/* 3. Supervision & Core Time Rules */}
          <div className="pt-4 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Two-person rule */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex items-start justify-between">
              <div>
                <span className="text-xs font-bold text-slate-900 block">Zwei-Kräfte-Aufsichtsregel</span>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Verpflichtet mind. 2 Betreuungspersonen pro geöffneter Gruppe (unabhängig von der Kinderzahl), außer in Randzeiten.
                </p>
              </div>
              <input
                type="checkbox"
                checked={twoPersonRule}
                onChange={e => setTwoPersonRule(e.target.checked)}
                className="w-5 h-5 rounded text-indigo-600 focus:ring-indigo-500 accent-indigo-600 mt-1 cursor-pointer"
              />
            </div>

            {/* Core time window */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200">
              <span className="text-xs font-bold text-slate-900 block mb-1">Kernzeit-Fenster (strenge Fachkraftquote)</span>
              <div className="flex items-center space-x-2 text-xs">
                <input
                  type="time"
                  value={coreTimeStart}
                  onChange={e => setCoreTimeStart(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold"
                />
                <span className="text-slate-400">bis</span>
                <input
                  type="time"
                  value={coreTimeEnd}
                  onChange={e => setCoreTimeEnd(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl font-bold"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Außerhalb dieser Zeiten gelten Randzeiten-Regelungen.</p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-3 border-t border-slate-100 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-2xl shadow-sm transition-all"
            >
              Einstellungen speichern
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};
