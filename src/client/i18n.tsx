import React, { createContext, useContext, useState, } from 'react';

export type Language = 'de' | 'fr' | 'en';

export interface Translations {
  [key: string]: string;
}

export const translations: Record<Language, Translations> = {
  de: {
    // Header
    'header.title': 'Kitasystem',
    'header.pro': 'PRO',
    'header.kita_name': 'Meine Kita',
    'header.subtitle': 'Personal- & Dienstplanung mit Live-Schlüsselwächter',
    'header.view_director': 'Leitung',
    'header.view_mobile': 'Mitarbeiter-App',
    'header.autopilot': 'Auto-Pilot:',
    'header.autopilot_on': 'AN',
    'header.autopilot_off': 'AUS',
    'header.ratio_alert': 'Schlüssel-Alarm!',
    'header.emergency_sick': 'Krankmeldung',
    'header.language': 'Sprache',

    // Navigation Tabs
    'tabs.dashboard': 'Übersicht',
    'tabs.roster': 'Einsatzplan',
    'tabs.groups': 'Gruppen',
    'tabs.staff': 'Personal',
    'tabs.notebook': 'Notizbuch',
    'tabs.checklists': 'Checklisten',
    'nav.today': 'Tagesgeschäft',
    'nav.people': 'Menschen',
    'nav.organisation': 'Organisation',
    'nav.admin': 'Grundeinstellungen',
    'nav.children': 'Kinderzahlen',
    'nav.standard': 'Dienstplan',
    'nav.absences': 'Krank & Urlaub',
    'nav.finance': 'Finanzen & Warteliste',
    'nav.initiative': 'Träger & Verein',
    'nav.ratio': 'Betreuungsschlüssel',
    'header.view_tablet': 'Gruppen-Tablet',
    'header.view_parents': 'Eltern-Portal',
    'header.view': 'Ansicht',

    // Common
    'common.save': 'Speichern',
    'common.cancel': 'Abbrechen',
    'common.delete': 'Löschen',
    'common.edit': 'Bearbeiten',
    'common.add': 'Hinzufügen',
    'common.close': 'Schließen',
    'common.loading': 'Daten werden geladen...',
    'common.search': 'Suchen...',
    'common.all': 'Alle',
    'common.actions': 'Aktionen',
    'common.date': 'Datum',
    'common.status': 'Status',
    'common.completed': 'Abgeschlossen',

    // Checklists
    'checklists.title': 'Checklisten & Qualitätsstandards',
    'checklists.desc': 'Offizielle Leitungs-Checklisten für das gesamte Kita-Team & persönliche Listen für Erzieher.',
    'checklists.new_button': 'Neue Checkliste anlegen',
    'checklists.all_lists': 'Alle Listen',
    'checklists.team_lists': 'Team-Listen',
    'checklists.private_lists': 'Persönlich / Privat',
    'checklists.filter_category': 'Kategorie: Alle',
    'checklists.completed_of': 'von',
    'checklists.completed_suffix': 'erledigt',
    'checklists.badge_team': 'Team-Freigabe',
    'checklists.badge_private': 'Nur privat',
    'checklists.created_by': 'Erstellt von',
    'checklists.add_item_placeholder': '+ Weiteren Punkt hinzufügen...',
    'checklists.add_item_btn': 'Hinzufügen',
    'checklists.modal_title': 'Neue Checkliste anlegen',
    'checklists.modal_templates': 'Schnellauswahl aus Kita-Vorlagen:',
    'checklists.modal_name_label': 'Titel der Checkliste *',
    'checklists.modal_cat_label': 'Kategorie',
    'checklists.modal_creator_label': 'Erstellt von',
    'checklists.modal_share_team': 'Mit gesamtem Kita-Team geteilt',
    'checklists.modal_share_team_desc': 'Alle Mitarbeiter sehen diese Liste und können Aufgaben gemeinsam abhaken.',
    'checklists.modal_share_private': 'Nur für mich (Privat)',
    'checklists.modal_share_private_desc': 'Nur für dich sichtbar – perfekt für persönliche Vorbereitung oder Notizen.',
    'checklists.modal_items_label': 'Checklisten-Punkte',
    'checklists.modal_add_item': '+ Punkt hinzufügen',
    'checklists.modal_submit': 'Checkliste anlegen',

    // Autopilot
    'autopilot.widget_title': 'Auto-Pilot Dienstplan-Optimierung',
    'autopilot.widget_desc': 'Reagiert auf Ausfälle & Unterdeckung. Schlägt sofortige Dienstplananpassungen vor.',
    'autopilot.active': 'Aktiv',
    'autopilot.paused': 'Pausiert',
    'autopilot.check_now': 'Dienstplan jetzt prüfen',
    'autopilot.flush_notifications': 'Push-Mitteilungen sofort senden',
    'autopilot.accept': 'Akzeptieren & Übernehmen',
    'autopilot.dismiss': 'Verwerfen',
    'autopilot.queue_header': 'Gepufferte Benachrichtigungen (30-Min. Sammelpause):',
    'autopilot.no_proposals': 'Alle Gruppen sind optimal besetzt. Keine Vertretungen erforderlich.',

    // Mobile View
    'mobile.today': 'Heute',
    'mobile.plan': 'Plan',
    'mobile.checklists': 'Listen',
    'mobile.requests': 'Anträge',
    'mobile.changes': 'Änderung',
    'mobile.account': 'Konto',
    'mobile.shift_today': 'Heutiger Dienst',
    'mobile.coworkers': 'Mit dir im Gruppendienst:',
    'mobile.my_week': 'Mein Dienstplan diese Woche',
    'mobile.swap_request': 'Schicht abgeben / Kollegen anfragen',
    'mobile.vacation_request': 'Urlaubsantrag einreichen',
    'mobile.wish_request': 'Wunschdienst einreichen'
  },

  fr: {
    // Header
    'header.title': 'Kitasystem',
    'header.pro': 'PRO',
    'header.kita_name': 'Ma crèche',
    'header.subtitle': 'Planification du personnel et des shifts avec surveillance des ratios en direct',
    'header.view_director': 'Direction',
    'header.view_mobile': 'App Employé',
    'header.autopilot': 'Auto-Pilote :',
    'header.autopilot_on': 'ACTIF',
    'header.autopilot_off': 'INACTIF',
    'header.ratio_alert': 'Alerte Ratio !',
    'header.emergency_sick': 'Arrêt Maladie',
    'header.language': 'Langue',

    // Navigation Tabs
    'tabs.dashboard': 'Aperçu',
    'tabs.roster': 'Plan d\'intervention',
    'tabs.groups': 'Groupes',
    'tabs.staff': 'Personnel',
    'tabs.notebook': 'Carnet',
    'tabs.checklists': 'Listes de contrôle',
    'nav.today': 'Au quotidien',
    'nav.people': 'Personnes',
    'nav.organisation': 'Organisation',
    'nav.admin': 'Réglages de base',
    'nav.children': 'Effectifs',
    'nav.standard': 'Planning type',
    'nav.absences': 'Maladie & Congés',
    'nav.finance': 'Finances & Liste d\'attente',
    'nav.initiative': 'Association',
    'nav.ratio': 'Taux d\'encadrement',
    'header.view_tablet': 'Tablette de groupe',
    'header.view_parents': 'Portail parents',
    'header.view': 'Vue',

    // Common
    'common.save': 'Enregistrer',
    'common.cancel': 'Annuler',
    'common.delete': 'Supprimer',
    'common.edit': 'Modifier',
    'common.add': 'Ajouter',
    'common.close': 'Fermer',
    'common.loading': 'Chargement des données...',
    'common.search': 'Rechercher...',
    'common.all': 'Tous',
    'common.actions': 'Actions',
    'common.date': 'Date',
    'common.status': 'Statut',
    'common.completed': 'Terminé',

    // Checklists
    'checklists.title': 'Listes de contrôle & Standards de qualité',
    'checklists.desc': 'Checklists officielles de direction pour toute l\'équipe & listes personnelles pour les éducateurs.',
    'checklists.new_button': 'Créer une nouvelle liste',
    'checklists.all_lists': 'Toutes les listes',
    'checklists.team_lists': 'Listes d\'équipe',
    'checklists.private_lists': 'Personnel / Privé',
    'checklists.filter_category': 'Catégorie : Toutes',
    'checklists.completed_of': 'sur',
    'checklists.completed_suffix': 'terminé(s)',
    'checklists.badge_team': 'Partage d\'équipe',
    'checklists.badge_private': 'Privé uniquement',
    'checklists.created_by': 'Créé par',
    'checklists.add_item_placeholder': '+ Ajouter une tâche...',
    'checklists.add_item_btn': 'Ajouter',
    'checklists.modal_title': 'Créer une liste de contrôle',
    'checklists.modal_templates': 'Modèles prédéfinis de crèche :',
    'checklists.modal_name_label': 'Titre de la liste *',
    'checklists.modal_cat_label': 'Catégorie',
    'checklists.modal_creator_label': 'Créé par',
    'checklists.modal_share_team': 'Partagé avec toute l\'équipe',
    'checklists.modal_share_team_desc': 'Tous les collègues voient cette liste et peuvent cocher les tâches ensemble.',
    'checklists.modal_share_private': 'Privé (pour moi seul)',
    'checklists.modal_share_private_desc': 'Visible uniquement par vous – idéal pour vos préparatifs ou notes personnelles.',
    'checklists.modal_items_label': 'Points de contrôle',
    'checklists.modal_add_item': '+ Ajouter un point',
    'checklists.modal_submit': 'Enregistrer la liste',

    // Autopilot
    'autopilot.widget_title': 'Auto-Pilote : Optimisation des plannings',
    'autopilot.widget_desc': 'Réagit aux absences et sous-effectifs. Propose des adaptations immédiates.',
    'autopilot.active': 'Actif',
    'autopilot.paused': 'En pause',
    'autopilot.check_now': 'Vérifier le planning maintenant',
    'autopilot.flush_notifications': 'Envoyer les notifications push maintenant',
    'autopilot.accept': 'Accepter & Appliquer',
    'autopilot.dismiss': 'Rejeter',
    'autopilot.queue_header': 'Notifications groupées en attente (temporisation 30 min) :',
    'autopilot.no_proposals': 'Tous les groupes sont parfaitement couverts. Aucun remplacement nécessaire.',

    // Mobile View
    'mobile.today': 'Aujourd\'hui',
    'mobile.plan': 'Planning',
    'mobile.checklists': 'Listes',
    'mobile.requests': 'Demandes',
    'mobile.changes': 'Modifs',
    'mobile.account': 'Compte',
    'mobile.shift_today': 'Service du jour',
    'mobile.coworkers': 'Avec vous en section :',
    'mobile.my_week': 'Mon planning cette semaine',
    'mobile.swap_request': 'Échanger ou céder un shift',
    'mobile.vacation_request': 'Demande de congés',
    'mobile.wish_request': 'Souhait d\'horaire'
  },

  en: {
    // Header
    'header.title': 'Kitasystem',
    'header.pro': 'PRO',
    'header.kita_name': 'Sunshine Daycare',
    'header.subtitle': 'Staff & shift planning with live child-to-staff ratio guardian',
    'header.view_director': 'Director',
    'header.view_mobile': 'Staff App',
    'header.autopilot': 'Auto-Pilot:',
    'header.autopilot_on': 'ON',
    'header.autopilot_off': 'OFF',
    'header.ratio_alert': 'Ratio Alert!',
    'header.emergency_sick': 'Sick Report',
    'header.language': 'Language',

    // Navigation Tabs
    'tabs.dashboard': 'Overview',
    'tabs.roster': 'Deployment Plan',
    'tabs.groups': 'Groups',
    'tabs.staff': 'Staff',
    'tabs.notebook': 'Notebook',
    'tabs.checklists': 'Checklists',
    'nav.today': 'Daily',
    'nav.people': 'People',
    'nav.organisation': 'Organisation',
    'nav.admin': 'Basic Setup',
    'nav.children': 'Child Counts',
    'nav.standard': 'Standard Roster',
    'nav.absences': 'Sick & Vacation',
    'nav.finance': 'Finance & Waitlist',
    'nav.initiative': 'Association',
    'nav.ratio': 'Staffing Ratio',
    'header.view_tablet': 'Group Tablet',
    'header.view_parents': 'Parent Portal',
    'header.view': 'View',

    // Common
    'common.save': 'Save',
    'common.cancel': 'Cancel',
    'common.delete': 'Delete',
    'common.edit': 'Edit',
    'common.add': 'Add',
    'common.close': 'Close',
    'common.loading': 'Loading data...',
    'common.search': 'Search...',
    'common.all': 'All',
    'common.actions': 'Actions',
    'common.date': 'Date',
    'common.status': 'Status',
    'common.completed': 'Completed',

    // Checklists
    'checklists.title': 'Checklists & Quality Standards',
    'checklists.desc': 'Official director checklists for the entire daycare team & personal lists for educators.',
    'checklists.new_button': 'Create New Checklist',
    'checklists.all_lists': 'All Lists',
    'checklists.team_lists': 'Team Lists',
    'checklists.private_lists': 'Personal / Private',
    'checklists.filter_category': 'Category: All',
    'checklists.completed_of': 'of',
    'checklists.completed_suffix': 'completed',
    'checklists.badge_team': 'Team Shared',
    'checklists.badge_private': 'Private only',
    'checklists.created_by': 'Created by',
    'checklists.add_item_placeholder': '+ Add another task...',
    'checklists.add_item_btn': 'Add',
    'checklists.modal_title': 'Create New Checklist',
    'checklists.modal_templates': 'Quick Selection from Daycare Templates:',
    'checklists.modal_name_label': 'Checklist Title *',
    'checklists.modal_cat_label': 'Category',
    'checklists.modal_creator_label': 'Created by',
    'checklists.modal_share_team': 'Shared with entire team',
    'checklists.modal_share_team_desc': 'All colleagues can view this checklist and check off tasks together.',
    'checklists.modal_share_private': 'Private (for me only)',
    'checklists.modal_share_private_desc': 'Visible only to you – perfect for personal preparation or notes.',
    'checklists.modal_items_label': 'Checklist Items',
    'checklists.modal_add_item': '+ Add Item',
    'checklists.modal_submit': 'Create Checklist',

    // Autopilot
    'autopilot.widget_title': 'Auto-Pilot Roster Optimization',
    'autopilot.widget_desc': 'Monitors absences & staffing shortages. Suggests instant roster adaptations.',
    'autopilot.active': 'Active',
    'autopilot.paused': 'Paused',
    'autopilot.check_now': 'Check Roster Now',
    'autopilot.flush_notifications': 'Send Push Notifications Now',
    'autopilot.accept': 'Accept & Apply',
    'autopilot.dismiss': 'Dismiss',
    'autopilot.queue_header': 'Buffered Push Notifications (30-Min Batching):',
    'autopilot.no_proposals': 'All groups are optimally staffed. No replacements needed.',

    // Mobile View
    'mobile.today': 'Today',
    'mobile.plan': 'Roster',
    'mobile.checklists': 'Lists',
    'mobile.requests': 'Requests',
    'mobile.changes': 'Changes',
    'mobile.account': 'Account',
    'mobile.shift_today': 'Today\'s Shift',
    'mobile.coworkers': 'Co-workers in your group today:',
    'mobile.my_week': 'My Schedule This Week',
    'mobile.swap_request': 'Shift Swap Request',
    'mobile.vacation_request': 'Submit Vacation Request',
    'mobile.wish_request': 'Submit Shift Wish'
  }
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'de',
  setLanguage: () => {},
  t: (key) => key
});

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('kitaplaner_lang') as Language;
    if (saved && (saved === 'de' || saved === 'fr' || saved === 'en')) {
      return saved;
    }
    return 'de';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('kitaplaner_lang', lang);
  };

  const t = (key: string): string => {
    return translations[language][key] || translations['de'][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => useContext(LanguageContext);
