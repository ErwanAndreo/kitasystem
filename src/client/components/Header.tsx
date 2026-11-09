import React from 'react';
import { useLanguage, Language } from '../i18n';
import { ShieldAlert, Calendar, AlertTriangle, Bot, Bell, X } from 'lucide-react';

type View = 'LEITUNG' | 'MOBILE' | 'TABLET' | 'ELTERN';

interface HeaderProps {
  currentView: View;
  setCurrentView: (view: View) => void;
  onOpenEmergency: () => void;
  criticalRatioAlert: boolean;
  autopilotEnabled: boolean;
  onToggleAutopilot: () => void;
}

const selectClass = 'h-9 rounded-lg border border-slate-300 bg-white px-2 text-sm text-slate-800';

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  onOpenEmergency,
  criticalRatioAlert,
  autopilotEnabled,
  onToggleAutopilot
}) => {
  const { language, setLanguage, t } = useLanguage();

  // Critical Notification Mode (Kritisch vs. Einfach)
  const [showAlertSettingsModal, setShowAlertSettingsModal] = React.useState(false);
  const [criticalAlertsMode, setCriticalAlertsMode] = React.useState<'CRITICAL' | 'SIMPLE'>('CRITICAL');

  React.useEffect(() => {
    fetch('/api/staff/s_sabine/notification-settings')
      .then(r => r.json())
      .then(d => {
        if (d.critical_alerts_mode) setCriticalAlertsMode(d.critical_alerts_mode);
      })
      .catch(() => {});
  }, []);

  const handleToggleAlertsMode = async (mode: 'CRITICAL' | 'SIMPLE') => {
    setCriticalAlertsMode(mode);
    try {
      await fetch('/api/staff/s_sabine/notification-settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ critical_alerts_mode: mode })
      });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 py-2.5">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
              <Calendar className="w-5 h-5" />
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-slate-900">{t('header.title')}</div>
              <div className="text-xs text-slate-500">{t('header.kita_name')}</div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {criticalRatioAlert && (
              <span className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg bg-rose-50 border border-rose-200 text-sm font-medium text-rose-800">
                <AlertTriangle className="w-4 h-4" />
                <span>{t('header.ratio_alert')}</span>
              </span>
            )}

            {/* <select
              aria-label={t('header.view')}
              value={currentView}
              onChange={(e) => setCurrentView(e.target.value as View)}
              className={selectClass}
            >
              <option value="LEITUNG">{t('header.view_director')}</option>
              <option value="MOBILE">{t('header.view_mobile')}</option>
              <option value="TABLET">{t('header.view_tablet')}</option>
              <option value="ELTERN">{t('header.view_parents')}</option>
            </select> */}

            <button
              onClick={onToggleAutopilot}
              aria-pressed={autopilotEnabled}
              className="flex items-center gap-1.5 h-9 px-2.5 rounded-lg border border-slate-300 text-sm text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Bot className={`w-4 h-4 ${autopilotEnabled ? 'text-emerald-600' : 'text-slate-400'}`} />
              <span>{t('header.autopilot')} {autopilotEnabled ? t('header.autopilot_on') : t('header.autopilot_off')}</span>
            </button>

            <button
              onClick={() => setShowAlertSettingsModal(true)}
              aria-label="Benachrichtigungen einstellen"
              title="Benachrichtigungen einstellen"
              className="flex items-center justify-center h-9 w-9 rounded-lg border border-slate-300 hover:bg-slate-100 transition-colors"
            >
              <Bell className={`w-4 h-4 ${criticalAlertsMode === 'CRITICAL' ? 'text-rose-600' : 'text-slate-500'}`} />
            </button>

            <select
              aria-label={t('header.language')}
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className={selectClass}
            >
              <option value="de">DE</option>
              <option value="fr">FR</option>
              <option value="en">EN</option>
            </select>

            <button
              onClick={onOpenEmergency}
              className="flex items-center gap-1.5 h-9 px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-sm font-semibold transition-colors"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{t('header.emergency_sick')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Critical Notification Mode Modal (Kritisch vs. Einfach) */}
      {showAlertSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Handhabung kritischer Benachrichtigungen</h3>
                  <p className="text-xs text-slate-500">Persönliche Voreinstellung für die Leitung</p>
                </div>
              </div>
              <button onClick={() => setShowAlertSettingsModal(false)} className="p-1 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                Du entscheidest selbst, wie Notfall-Ereignisse (z.B. akute Krankmeldungen oder spontane Vertretungsanfragen) bei dir ankommen:
              </p>

              <div className="space-y-2.5">
                <div 
                  onClick={() => handleToggleAlertsMode('CRITICAL')}
                  className={`p-3.5 rounded-xl border-2 flex items-start space-x-3 cursor-pointer transition-all ${
                    criticalAlertsMode === 'CRITICAL'
                      ? 'border-rose-500 bg-rose-50/70 text-rose-950'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="alertsMode" 
                    checked={criticalAlertsMode === 'CRITICAL'} 
                    onChange={() => handleToggleAlertsMode('CRITICAL')}
                    className="mt-0.5 text-rose-600 focus:ring-rose-500" 
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>Kritisch handhaben (Notfall-Alarm)</span>
                      <span className="text-xs bg-rose-200 text-rose-900 px-1.5 py-0.5 rounded font-semibold">AKTIV</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Krankmeldungen lösen bei der Leitung sofort eine auffällige rote Notfall-Warnung mit hoher Priorität und Signalton aus. Mitarbeiter erhalten bei Einspring-Anfragen einen dringenden Prioritäts-Alarm.
                    </p>
                  </div>
                </div>

                <div 
                  onClick={() => handleToggleAlertsMode('SIMPLE')}
                  className={`p-3.5 rounded-xl border-2 flex items-start space-x-3 cursor-pointer transition-all ${
                    criticalAlertsMode === 'SIMPLE'
                      ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950'
                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <input 
                    type="radio" 
                    name="alertsMode" 
                    checked={criticalAlertsMode === 'SIMPLE'} 
                    onChange={() => handleToggleAlertsMode('SIMPLE')}
                    className="mt-0.5 text-indigo-600 focus:ring-indigo-500" 
                  />
                  <div>
                    <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                      <span>Einfach handhaben (Standard-Modus)</span>
                      {criticalAlertsMode === 'SIMPLE' && (
                        <span className="text-xs bg-indigo-200 text-indigo-900 px-1.5 py-0.5 rounded font-semibold">AKTIV</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                      Krankmeldungen und Einspring-Anfragen werden als ruhige, normale Standard-Benachrichtigung gehandhabt (kein Notfall-Alarm, kein lauter Warnton).
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAlertSettingsModal(false)}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-colors"
                >
                  Fertig
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};
