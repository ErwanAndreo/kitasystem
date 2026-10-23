import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';

class AppI18n {
  static final ValueNotifier<String> currentLocale = ValueNotifier<String>('de');

  static const String _prefKey = 'app_language';

  static final Map<String, Map<String, String>> _strings = {
    'de': {
      // Navigation
      'nav_today': 'Heute',
      'nav_roster': 'Dienstplan',
      'nav_checklists': 'Checklisten',
      'nav_requests': 'Anträge',
      'nav_board': 'Pinnwand',

      // General
      'app_title': 'KitaPlaner Mitarbeiter',
      'loading': 'Lade KitaPlaner Mitarbeiter-App...',
      'language': 'Sprache',
      'select_language': 'Sprache auswählen',
      'german': 'Deutsch',
      'french': 'Französisch',
      'english': 'Englisch',
      'save': 'Speichern',
      'cancel': 'Abbrechen',
      'delete': 'Löschen',
      'close': 'Schließen',
      'refresh': 'Aktualisieren',
      'status': 'Status',
      'completed': 'erledigt',
      'all_done': 'Abgeschlossen',

      // Today Screen
      'today_title': 'Heutiger Dienst',
      'today_role': 'Fachkraft',
      'today_ratio_label': 'Personalschlüssel',
      'today_ratio_optimal': 'Optimal (1:6.2)',
      'today_shift': 'Heutige Arbeitszeit',
      'today_pause': 'Pause',
      'today_group': 'Gruppe',
      'today_coworkers': 'Mit dir im Gruppendienst',

      // Roster Screen
      'roster_title': 'Mein Dienstplan',
      'roster_week': 'Diese Woche',
      'roster_empty': 'Keine Schichten eingeteilt',

      // Checklists Screen
      'checklists_title': 'Checklisten & Standards',
      'filter_all': 'Alle',
      'filter_team': '👥 Team',
      'filter_private': '🔒 Meine',
      'new_list': 'Neue Liste',
      'create_checklist': 'Neue Checkliste anlegen',
      'template_select': '⚡ Vorlage wählen:',
      'template_closing': 'Schließdienst',
      'template_morning': 'Morgenroutine',
      'template_forest': 'Waldtag',
      'template_portfolio': 'Persönliches Portfolio',
      'share_with_team': '👥 Mit gesamtem Team teilen',
      'share_team_sub': 'Alle Kollegen können Aufgaben abhaken',
      'share_private': '🔒 Nur privat (für mich)',
      'share_private_sub': 'Nur für dich sichtbar',
      'tasks_label': 'Aufgabenpunkte:',
      'add_task': 'Punkt hinzufügen',
      'save_checklist': 'Checkliste speichern',
      'empty_checklists': 'Keine passenden Checklisten',
      'empty_checklists_sub': 'Erstelle eine eigene Liste oder ändere die Filter.',
      'shared_badge': '👥 Team-Freigabe',
      'private_badge': '🔒 Nur privat',
      'created_by': 'Erstellt von',

      // Requests Screen
      'requests_title': 'Tausch & Anträge',
      'wish_service': 'Wunschdienst\nhinterlegen',
      'swap_shift': 'Schicht\ntauschen',
      'vacation': 'Urlaub\nbeantragen',
      'sick_leave': 'Krank-\nmeldung',
      'wish_modal_title': 'Schichtwunsch einreichen',
      'wish_submit': 'Wunschdienst einreichen',

      // Board & Stats Screen
      'board_title': 'Konto & Kita-Pinnwand',
      'my_account': 'Mein Arbeitszeit-Konto',
      'weekly_hours': 'Vertragliche Wochenstunden',
      'overtime': 'Überstunden',
      'vacation_remaining': 'Resturlaub',
      'days': 'Tage',
      'hours': 'Std.',
      'announcements': 'Kita-Aushänge & Ankündigungen',
      'switch_user': 'Benutzer wechseln (Simulation)',
      'login_title': 'Login & Zugangsdaten',
      'default_login_note': 'Standard-Login: admin / admin',
      'login_status': 'Login-Status',
      'test_login': 'Standard-Login (admin/admin) testen',
      'change_password': 'Passwort ändern',
      'reset_to_admin': 'Auf "admin" zurücksetzen',
    },

    'fr': {
      // Navigation
      'nav_today': 'Aujourd\'hui',
      'nav_roster': 'Planning',
      'nav_checklists': 'Listes',
      'nav_requests': 'Demandes',
      'nav_board': 'Tableau',

      // General
      'app_title': 'KitaPlaner Employé',
      'loading': 'Chargement de l\'application...',
      'language': 'Langue',
      'select_language': 'Choisir la langue',
      'german': 'Allemand (Deutsch)',
      'french': 'Français',
      'english': 'Anglais (English)',
      'save': 'Enregistrer',
      'cancel': 'Annuler',
      'delete': 'Supprimer',
      'close': 'Fermer',
      'refresh': 'Actualiser',
      'status': 'Statut',
      'completed': 'terminé',
      'all_done': 'Terminé',

      // Today Screen
      'today_title': 'Service du jour',
      'today_role': 'Éducateur',
      'today_ratio_label': 'Taux d\'encadrement',
      'today_ratio_optimal': 'Optimal (1:6.2)',
      'today_shift': 'Horaires du jour',
      'today_pause': 'Pause',
      'today_group': 'Section',
      'today_coworkers': 'Avec vous en section',

      // Roster Screen
      'roster_title': 'Mon planning',
      'roster_week': 'Cette semaine',
      'roster_empty': 'Aucun shift prévu',

      // Checklists Screen
      'checklists_title': 'Listes de contrôle & Standards',
      'filter_all': 'Toutes',
      'filter_team': '👥 Équipe',
      'filter_private': '🔒 Privé',
      'new_list': 'Nouvelle liste',
      'create_checklist': 'Créer une liste de contrôle',
      'template_select': '⚡ Choisir un modèle :',
      'template_closing': 'Fermeture & Sécurité',
      'template_morning': 'Routine matinale',
      'template_forest': 'Journée forêt',
      'template_portfolio': 'Portfolio personnel',
      'share_with_team': '👥 Partager avec toute l\'équipe',
      'share_team_sub': 'Tous les collègues peuvent cocher les tâches',
      'share_private': '🔒 Privé (pour moi)',
      'share_private_sub': 'Visible uniquement par vous',
      'tasks_label': 'Points à vérifier :',
      'add_task': 'Ajouter un point',
      'save_checklist': 'Enregistrer la liste',
      'empty_checklists': 'Aucune liste correspondante',
      'empty_checklists_sub': 'Créez votre propre liste ou modifiez les filtres.',
      'shared_badge': '👥 Partage d\'équipe',
      'private_badge': '🔒 Privé uniquement',
      'created_by': 'Créé par',

      // Requests Screen
      'requests_title': 'Échanges & Demandes',
      'wish_service': 'Souhait\nd\'horaire',
      'swap_shift': 'Échanger\nun shift',
      'vacation': 'Demande\nde congés',
      'sick_leave': 'Arrêt\nmaladie',
      'wish_modal_title': 'Soumettre un souhait d\'horaire',
      'wish_submit': 'Enregistrer le souhait',

      // Board & Stats Screen
      'board_title': 'Compte & Tableau d\'affichage',
      'my_account': 'Mon compte de temps',
      'weekly_hours': 'Heures hebdomadaires',
      'overtime': 'Heures sup.',
      'vacation_remaining': 'Congés restants',
      'days': 'jours',
      'hours': 'h',
      'announcements': 'Annonces & Communications',
      'switch_user': 'Changer d\'utilisateur (Simulation)',
      'login_title': 'Connexion & Identifiants',
      'default_login_note': 'Connexion standard : admin / admin',
      'login_status': 'Statut de connexion',
      'test_login': 'Tester la connexion (admin/admin)',
      'change_password': 'Modifier le mot de passe',
      'reset_to_admin': 'Réinitialiser sur "admin"',
    },

    'en': {
      // Navigation
      'nav_today': 'Today',
      'nav_roster': 'Roster',
      'nav_checklists': 'Checklists',
      'nav_requests': 'Requests',
      'nav_board': 'Board',

      // General
      'app_title': 'KitaPlaner Staff',
      'loading': 'Loading KitaPlaner Staff App...',
      'language': 'Language',
      'select_language': 'Select Language',
      'german': 'German (Deutsch)',
      'french': 'French (Français)',
      'english': 'English',
      'save': 'Save',
      'cancel': 'Cancel',
      'delete': 'Delete',
      'close': 'Close',
      'refresh': 'Refresh',
      'status': 'Status',
      'completed': 'completed',
      'all_done': 'Completed',

      // Today Screen
      'today_title': 'Today\'s Shift',
      'today_role': 'Educator',
      'today_ratio_label': 'Staff Ratio',
      'today_ratio_optimal': 'Optimal (1:6.2)',
      'today_shift': 'Today\'s Hours',
      'today_pause': 'Break',
      'today_group': 'Group',
      'today_coworkers': 'With you in group today',

      // Roster Screen
      'roster_title': 'My Schedule',
      'roster_week': 'This Week',
      'roster_empty': 'No shifts assigned',

      // Checklists Screen
      'checklists_title': 'Checklists & Standards',
      'filter_all': 'All',
      'filter_team': '👥 Team',
      'filter_private': '🔒 Private',
      'new_list': 'New List',
      'create_checklist': 'Create New Checklist',
      'template_select': '⚡ Select a template:',
      'template_closing': 'Lock-up & Security',
      'template_morning': 'Morning Routine',
      'template_forest': 'Forest Excursion',
      'template_portfolio': 'Personal Portfolio',
      'share_with_team': '👥 Share with entire team',
      'share_team_sub': 'All colleagues can check off tasks together',
      'share_private': '🔒 Private (for me only)',
      'share_private_sub': 'Visible only to you',
      'tasks_label': 'Checklist Tasks:',
      'add_task': 'Add task',
      'save_checklist': 'Save Checklist',
      'empty_checklists': 'No matching checklists',
      'empty_checklists_sub': 'Create a new list or adjust filters.',
      'shared_badge': '👥 Team Shared',
      'private_badge': '🔒 Private only',
      'created_by': 'Created by',

      // Requests Screen
      'requests_title': 'Swaps & Requests',
      'wish_service': 'Shift\nWish',
      'swap_shift': 'Swap\nShift',
      'vacation': 'Request\nVacation',
      'sick_leave': 'Sick\nReport',
      'wish_modal_title': 'Submit Shift Wish',
      'wish_submit': 'Submit Shift Wish',

      // Board & Stats Screen
      'board_title': 'Account & Notice Board',
      'my_account': 'My Time Account',
      'weekly_hours': 'Contract Hours',
      'overtime': 'Overtime',
      'vacation_remaining': 'Remaining Vacation',
      'days': 'days',
      'hours': 'hrs',
      'announcements': 'Notices & Announcements',
      'switch_user': 'Switch User (Simulation)',
      'login_title': 'Login & Credentials',
      'default_login_note': 'Default login: admin / admin',
      'login_status': 'Login Status',
      'test_login': 'Test default login (admin/admin)',
      'change_password': 'Change Password',
      'reset_to_admin': 'Reset to "admin"',
    }
  };

  static Future<void> init() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final saved = prefs.getString(_prefKey);
      if (saved != null && (saved == 'de' || saved == 'fr' || saved == 'en')) {
        currentLocale.value = saved;
      }
    } catch (_) {}
  }

  static String t(String key) {
    final lang = currentLocale.value;
    return _strings[lang]?[key] ?? _strings['de']?[key] ?? key;
  }

  static Future<void> setLocale(String lang) async {
    if (lang == 'de' || lang == 'fr' || lang == 'en') {
      currentLocale.value = lang;
      try {
        final prefs = await SharedPreferences.getInstance();
        await prefs.setString(_prefKey, lang);
      } catch (_) {}
    }
  }

  static String get currentFlag {
    switch (currentLocale.value) {
      case 'fr':
        return '🇫🇷 FR';
      case 'en':
        return '🇬🇧 EN';
      case 'de':
      default:
        return '🇩🇪 DE';
    }
  }
}
