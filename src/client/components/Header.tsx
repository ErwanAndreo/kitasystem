import React from 'react';
import { 
  ShieldAlert, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Smartphone, 
  Monitor, 
  Tablet, 
  FileSpreadsheet, 
  AlertTriangle,
  UserCheck
} from 'lucide-react';

interface HeaderProps {
  currentView: 'LEITUNG' | 'MOBILE' | 'KIOSK';
  setCurrentView: (view: 'LEITUNG' | 'MOBILE' | 'KIOSK') => void;
  pendingApprovalsCount: number;
  onOpenEmergency: () => void;
  onOpenDatev: () => void;
  criticalRatioAlert: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  pendingApprovalsCount,
  onOpenEmergency,
  onOpenDatev,
  criticalRatioAlert
}) => {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Kita Name */}
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-white font-bold shadow-md shadow-emerald-500/20">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-lg text-slate-900 tracking-tight">KitaPlaner</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">PRO</span>
                <span className="text-xs text-slate-400 hidden sm:inline">| Kita Sonnenschein</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">Personal- & Dienstplanung mit Live-Schlüsselwächter</p>
            </div>
          </div>

          {/* Device & Mode Selector */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setCurrentView('LEITUNG')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'LEITUNG'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Windows Desktop & Web-Applikation für die Einrichtungsleitung"
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-600" />
              <span>Leitung (Windows & Web)</span>
              {pendingApprovalsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-amber-500 text-white">
                  {pendingApprovalsCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setCurrentView('MOBILE')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'MOBILE'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Mobile Ansicht für Erzieher:innen (iOS & Android Smartphone)"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>Mitarbeiter-App</span>
            </button>

            <button
              onClick={() => setCurrentView('KIOSK')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'KIOSK'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Kiosk-Modus für das Zeiterfassungs-Tablet am Kita-Eingang"
            >
              <Tablet className="w-3.5 h-3.5 text-blue-600" />
              <span>Eingangs-Terminal</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center space-x-2">
            {criticalRatioAlert && (
              <span className="flex items-center space-x-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span className="hidden md:inline">Schlüssel-Alarm!</span>
              </span>
            )}

            <button
              onClick={onOpenEmergency}
              className="flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              title="Spontanen Personalausfall melden & Sofort-Lösung vorschlagen lassen"
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">Krankmeldung</span>
            </button>

            <button
              onClick={onOpenDatev}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
              title="Monatsabschluss & DATEV-Lohnexport"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-700" />
              <span className="hidden md:inline">DATEV-Export</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
