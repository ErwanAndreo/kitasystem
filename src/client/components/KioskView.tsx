import React, { useState } from 'react';
import { Staff } from '../types';
import { Tablet, Play, Pause, Square, Check, X, Lock } from 'lucide-react';
import { format } from 'date-fns';

interface KioskViewProps {
  staffList: Staff[];
  onStamp: (staff_id: string, action: 'CLOCK_IN' | 'BREAK' | 'CLOCK_OUT', pin?: string) => Promise<void>;
}

export const KioskView: React.FC<KioskViewProps> = ({ staffList, onStamp }) => {
  const [selectedStaff, setSelectedStaff] = useState<Staff | null>(null);
  const [pin, setPin] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleNumClick = (num: string) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
    }
  };

  const handleClear = () => {
    setPin('');
    setError(null);
  };

  const handleExecuteStamp = async (action: 'CLOCK_IN' | 'BREAK' | 'CLOCK_OUT') => {
    if (!selectedStaff) return;
    try {
      await onStamp(selectedStaff.id, action, pin);
      setFeedback(`Erfolgreich gebucht für ${selectedStaff.name}!`);
      setTimeout(() => {
        setSelectedStaff(null);
        setPin('');
        setFeedback(null);
      }, 2500);
    } catch (err: any) {
      setError(err.message || 'Falsche PIN oder Fehler beim Stempeln');
      setPin('');
    }
  };

  return (
    <div className="max-w-4xl mx-auto my-6 p-6 bg-slate-900 rounded-3xl text-white shadow-2xl border-4 border-slate-800">
      {/* Kiosk Header */}
      <div className="flex items-center justify-between pb-6 border-b border-slate-800">
        <div className="flex items-center space-x-3">
          <div className="p-3 bg-emerald-600 rounded-2xl">
            <Tablet className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight">Kiosk Zeiterfassung</h2>
            <p className="text-xs text-slate-400">Stationäres Terminal • Eingang / Personalraum</p>
          </div>
        </div>

        <div className="text-right">
          <div className="text-3xl font-mono font-bold text-emerald-400">
            {format(new Date(), 'HH:mm:ss')}
          </div>
          <div className="text-xs text-slate-400">
            {format(new Date(), 'EEEE, dd.MM.yyyy')}
          </div>
        </div>
      </div>

      {feedback ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-20 h-20 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-4 ring-emerald-500/40 animate-bounce">
            <Check className="w-10 h-10" />
          </div>
          <h3 className="text-2xl font-bold text-emerald-400">{feedback}</h3>
          <p className="text-xs text-slate-400">Terminal wird zurückgesetzt...</p>
        </div>
      ) : !selectedStaff ? (
        /* STEP 1: SELECT PERSON */
        <div className="mt-6">
          <div className="text-sm font-semibold text-slate-300 mb-4 text-center">
            Tippe auf deinen Namen oder dein Foto:
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {staffList.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setSelectedStaff(s);
                  setPin('');
                  setError(null);
                }}
                className="flex items-center space-x-3 p-3.5 bg-slate-800 hover:bg-slate-700/80 active:scale-95 rounded-2xl transition-all border border-slate-700 text-left"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-md"
                  style={{ backgroundColor: s.color }}
                >
                  {s.avatar}
                </div>
                <div className="min-w-0">
                  <div className="font-bold text-sm text-slate-100 truncate">{s.name.split(' ')[0]}</div>
                  <div className="text-[10px] text-slate-400 truncate">{s.role}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        /* STEP 2: PIN + ACTION BUTTONS */
        <div className="mt-6 max-w-sm mx-auto">
          <div className="text-center mb-4">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center font-bold text-lg text-white mx-auto mb-2 shadow-lg"
              style={{ backgroundColor: selectedStaff.color }}
            >
              {selectedStaff.avatar}
            </div>
            <h3 className="font-bold text-base">{selectedStaff.name}</h3>
            <p className="text-xs text-slate-400">PIN eingeben (Standard: {selectedStaff.pin}):</p>
          </div>

          {/* PIN Dots */}
          <div className="flex justify-center space-x-3 mb-4">
            {[0, 1, 2, 3].map((idx) => (
              <div
                key={idx}
                className={`w-4 h-4 rounded-full border-2 transition-all ${
                  pin.length > idx
                    ? 'bg-emerald-400 border-emerald-400 scale-110'
                    : 'border-slate-600 bg-slate-800'
                }`}
              />
            ))}
          </div>

          {error && (
            <div className="text-xs text-rose-400 text-center mb-3 font-semibold">
              {error}
            </div>
          )}

          {/* PIN Pad */}
          <div className="grid grid-cols-3 gap-2 mb-5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', 'C', '0', '⌫'].map((btn) => (
              <button
                key={btn}
                onClick={() => {
                  if (btn === 'C') handleClear();
                  else if (btn === '⌫') setPin(p => p.slice(0, -1));
                  else handleNumClick(btn);
                }}
                className="h-12 bg-slate-800 hover:bg-slate-700 active:bg-slate-600 rounded-xl font-bold text-base text-slate-200 transition-all flex items-center justify-center"
              >
                {btn}
              </button>
            ))}
          </div>

          {/* Large Action Buttons */}
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => handleExecuteStamp('CLOCK_IN')}
              className="py-3 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <Play className="w-4 h-4 mb-1" />
              <span>Kommen</span>
            </button>
            <button
              onClick={() => handleExecuteStamp('BREAK')}
              className="py-3 bg-amber-600 hover:bg-amber-500 rounded-xl font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <Pause className="w-4 h-4 mb-1" />
              <span>Pause</span>
            </button>
            <button
              onClick={() => handleExecuteStamp('CLOCK_OUT')}
              className="py-3 bg-rose-600 hover:bg-rose-500 rounded-xl font-bold text-xs flex flex-col items-center justify-center shadow-lg active:scale-95 transition-all"
            >
              <Square className="w-4 h-4 mb-1" />
              <span>Gehen</span>
            </button>
          </div>

          <button
            onClick={() => setSelectedStaff(null)}
            className="w-full mt-4 py-2 text-xs text-slate-400 hover:text-white transition-colors"
          >
            ← Zurück zur Personalauswahl
          </button>
        </div>
      )}
    </div>
  );
};
