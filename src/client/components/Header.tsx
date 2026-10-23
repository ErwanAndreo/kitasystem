import React from 'react';
import { useLanguage, Language } from '../i18n';
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
  UserCheck,
  Bot,
  Globe,
  Key,
  Lock,
  Bell,
  Volume2,
  VolumeX,
  X,
  Heart
} from 'lucide-react';

interface HeaderProps {
  currentView: 'LEITUNG' | 'MOBILE' | 'TABLET' | 'ELTERN';
  setCurrentView: (view: 'LEITUNG' | 'MOBILE' | 'TABLET' | 'ELTERN') => void;
  pendingApprovalsCount: number;
  onOpenEmergency: () => void;
  criticalRatioAlert: boolean;
  autopilotEnabled: boolean;
  onToggleAutopilot: () => void;
  queuedNotificationsCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  currentView,
  setCurrentView,
  pendingApprovalsCount,
  onOpenEmergency,
  criticalRatioAlert,
  autopilotEnabled,
  onToggleAutopilot,
  queuedNotificationsCount
}) => {
  const { language, setLanguage, t } = useLanguage();
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const [loginUsername, setLoginUsername] = React.useState('admin');
  const [loginPassword, setLoginPassword] = React.useState('admin');
  const [loginStatus, setLoginStatus] = React.useState<{ success?: boolean; message?: string } | null>(null);
  const [loginLoading, setLoginLoading] = React.useState(false);

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

  const handleTestLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginStatus(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername, password: loginPassword })
      });
      const data = await res.json();
      if (res.ok) {
        setLoginStatus({ success: true, message: `✓ ${data.message} (${data.user.name} - ${data.user.role})` });
      } else {
        setLoginStatus({ success: false, message: `✗ ${data.error}` });
      }
    } catch (err: any) {
      setLoginStatus({ success: false, message: `✗ Netzwerkfehler: ${err.message}` });
    } finally {
      setLoginLoading(false);
    }
  };

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
                <span className="font-bold text-lg text-slate-900 tracking-tight">{t('header.title')}</span>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">{t('header.pro')}</span>
                <span className="text-xs text-slate-400 hidden sm:inline">| {t('header.kita_name')}</span>
              </div>
              <p className="text-xs text-slate-500 hidden sm:block">{t('header.subtitle')}</p>
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
              title="Windows Desktop & Web"
            >
              <Monitor className="w-3.5 h-3.5 text-indigo-600" />
              <span>{t('header.view_director')}</span>
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
              title="iOS & Android Smartphone"
            >
              <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
              <span>{t('header.view_mobile')}</span>
            </button>

            <button
              onClick={() => setCurrentView('TABLET')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'TABLET'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="iPad & Android Tablet Kiosk für Gruppen"
            >
              <Tablet className="w-3.5 h-3.5 text-amber-600" />
              <span>Gruppen-Tablet</span>
            </button>

            <button
              onClick={() => setCurrentView('ELTERN')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                currentView === 'ELTERN'
                  ? 'bg-white text-slate-900 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Eltern-Portal & Eltern-App (1-Klick Krankmeldung, Elterndienste, Verträge)"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              <span>Eltern-Portal</span>
            </button>
          </div>

          {/* Quick Action Buttons & Language Switcher */}
          <div className="flex items-center space-x-2">
            {/* Language Switcher (DE / FR / EN) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
              <button
                onClick={() => setLanguage('de')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  language === 'de' ? 'bg-white shadow-xs text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Deutsch"
              >
                🇩🇪 DE
              </button>
              <button
                onClick={() => setLanguage('fr')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  language === 'fr' ? 'bg-white shadow-xs text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Français"
              >
                🇫🇷 FR
              </button>
              <button
                onClick={() => setLanguage('en')}
                className={`px-2 py-1 rounded-lg transition-all ${
                  language === 'en' ? 'bg-white shadow-xs text-slate-900 font-extrabold' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="English"
              >
                🇬🇧 EN
              </button>
            </div>

            {/* Auto-Pilot Toggle Button */}
            <button
              onClick={onToggleAutopilot}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
                autopilotEnabled
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300 shadow-xs'
                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
              }`}
              title="Auto-Pilot"
            >
              <Bot className={`w-4 h-4 ${autopilotEnabled ? 'text-emerald-600 animate-pulse' : 'text-slate-400'}`} />
              <span className="hidden sm:inline">{t('header.autopilot')}</span>
              <span className={`font-bold ${autopilotEnabled ? 'text-emerald-700' : 'text-slate-500'}`}>
                {autopilotEnabled ? t('header.autopilot_on') : t('header.autopilot_off')}
              </span>
            </button>

            {/* Critical Notification Mode Switcher */}
            <button
              onClick={() => setShowAlertSettingsModal(true)}
              className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                criticalAlertsMode === 'CRITICAL'
                  ? 'bg-rose-50 text-rose-800 border-rose-300 shadow-2xs'
                  : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
              }`}
              title="Kritische Benachrichtigungen: Alarm-Modus (Kritisch vs. Einfach) konfigurieren"
            >
              <Bell className={`w-3.5 h-3.5 ${criticalAlertsMode === 'CRITICAL' ? 'text-rose-600 animate-pulse' : 'text-slate-500'}`} />
              <span className="hidden xl:inline">Alarme:</span>
              <span className="font-bold">{criticalAlertsMode === 'CRITICAL' ? '🚨 Kritisch' : '💬 Einfach'}</span>
            </button>

            {/* Standard-Login Info & Test Trigger */}
            <button
              onClick={() => {
                setShowLoginModal(true);
                setLoginStatus(null);
              }}
              className="flex items-center space-x-1.5 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 transition-colors"
              title="Standard-Login: admin / admin"
            >
              <Key className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline text-slate-500">Login:</span>
              <span className="font-mono font-bold text-slate-900">admin/admin</span>
            </button>

            {criticalRatioAlert && (
              <span className="flex items-center space-x-1 text-xs font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2.5 py-1.5 rounded-lg animate-pulse">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                <span className="hidden md:inline">{t('header.ratio_alert')}</span>
              </span>
            )}

            <button
              onClick={onOpenEmergency}
              className="flex items-center space-x-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
              title={t('header.emergency_sick')}
            >
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span className="hidden sm:inline">{t('header.emergency_sick')}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Login Test & Verification Modal */}
      {showLoginModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-700">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Kita-Zugang & Authentifizierung</h3>
                  <p className="text-xs text-emerald-700 font-semibold">Standard: admin / admin</p>
                </div>
              </div>
              <button
                onClick={() => setShowLoginModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg text-xs"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleTestLogin} className="p-5 space-y-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900">
                <p className="font-bold mb-1">Standard-Zugangsdaten & Rollen</p>
                <p className="text-slate-600 mb-2">
                  Einheitliche Accounts: Rollen steuern portalübergreifend den Zugriff (Web-Cockpit, Mitarbeiter-App, Elternportal).
                </p>
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => { setLoginUsername('admin'); setLoginPassword('admin'); }}
                    className="p-1.5 bg-white border border-emerald-300 rounded-lg text-[10px] font-bold text-left hover:bg-emerald-100/60"
                  >
                    👑 Leitung: <span className="font-mono text-emerald-800">admin</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginUsername('s_lukas'); setLoginPassword('admin'); }}
                    className="p-1.5 bg-white border border-emerald-300 rounded-lg text-[10px] font-bold text-left hover:bg-emerald-100/60"
                  >
                    👩‍🏫 Mitarbeiter: <span className="font-mono text-emerald-800">s_lukas</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginUsername('eltern@kita.de'); setLoginPassword('admin'); }}
                    className="p-1.5 bg-white border border-emerald-300 rounded-lg text-[10px] font-bold text-left hover:bg-emerald-100/60"
                  >
                    🤝 Vorstand: <span className="font-mono text-emerald-800">eltern@kita.de</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginUsername('kiosk_krabbelmaeuse'); setLoginPassword('1234'); }}
                    className="p-1.5 bg-white border border-emerald-300 rounded-lg text-[10px] font-bold text-left hover:bg-emerald-100/60"
                  >
                    📱 Kiosk-Tablet: <span className="font-mono text-emerald-800">PIN 1234</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Benutzername / E-Mail</label>
                <input
                  type="text"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:outline-emerald-500"
                  placeholder="admin"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Passwort</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:outline-emerald-500"
                  placeholder="admin"
                  required
                />
              </div>

              {loginStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold ${
                    loginStatus.success
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-rose-100 text-rose-800 border border-rose-300'
                  }`}
                >
                  {loginStatus.message}
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLoginModal(false)}
                  className="px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Schließen
                </button>
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="flex items-center space-x-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
                >
                  <Lock className="w-3.5 h-3.5" />
                  <span>{loginLoading ? 'Prüfe...' : 'Login testen (admin/admin)'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Critical Notification Mode Modal (Kritisch vs. Einfach) */}
      {showAlertSettingsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-scale-up">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 rounded-xl bg-rose-100 text-rose-700">
                  <Bell className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Handhabung kritischer Benachrichtigungen</h3>
                  <p className="text-xs text-slate-500">Persönliche Voreinstellung für Sabine Weber (Leitung)</p>
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
                      ? 'border-rose-500 bg-rose-50/70 text-rose-950 shadow-2xs'
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
                      <span>🚨 Kritisch handhaben (Notfall-Alarm)</span>
                      <span className="text-[10px] bg-rose-200 text-rose-900 px-1.5 py-0.2 rounded font-black">AKTIV</span>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                      Krankmeldungen lösen bei der Leitung sofort eine auffällige rote Notfall-Warnung mit hoher Priorität und Signalton aus. Mitarbeiter erhalten bei Einspring-Anfragen einen dringenden Prioritäts-Alarm.
                    </p>
                  </div>
                </div>

                <div 
                  onClick={() => handleToggleAlertsMode('SIMPLE')}
                  className={`p-3.5 rounded-xl border-2 flex items-start space-x-3 cursor-pointer transition-all ${
                    criticalAlertsMode === 'SIMPLE'
                      ? 'border-indigo-500 bg-indigo-50/70 text-indigo-950 shadow-2xs'
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
                      <span>💬 Einfach handhaben (Standard-Modus)</span>
                      {criticalAlertsMode === 'SIMPLE' && (
                        <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded font-black">AKTIV</span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
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
