import React, { useState, useEffect } from 'react';
import { Checklist, Staff, ShareFavorite, ChecklistShareScope } from '../types';
import { useLanguage } from '../i18n';
import { 
  CheckSquare, 
  Plus, 
  Trash2, 
  Lock, 
  Users, 
  Clock, 
  Search,
  Check,
  Star,
  User,
  ShieldCheck,
} from 'lucide-react';

interface ChecklistManagementProps {
  staffList: Staff[];
}

const TEMPLATES = [
  {
    title: 'Schließdienst & Sicherheitsrundgang',
    category: 'SICHERHEIT' as const,
    color: '#ef4444',
    is_shared: true,
    items: [
      'Alle Gruppenräume & Nebenzimmer: Fenster geschlossen und verriegelt',
      'Terrassentüren zum Außengelände abgeschlossen',
      'Gartentor und Hoftor mit Vorhängeschloss gesichert',
      'Küche: Elektrogeräte, Kaffeemaschine & Herd ausgeschaltet',
      'Hauptwasserhahn der Teeküche kontrolliert',
      'Lichter in allen Räumen, Sanitär & Fluren gelöscht',
      'Müll- & Windeleimer geleert und verschlossen',
      'Alarmanlage am Haupteingang aktiviert & Haupteingangstür abgeschlossen'
    ]
  },
  {
    title: 'Morgenroutine & Ankommensvorbereitung',
    category: 'ROUTINE' as const,
    color: '#3b82f6',
    is_shared: true,
    items: [
      'Haupteingang & Gruppenräume aufschließen und Stoßlüften (10 Min)',
      'Teewasser kochen und frisches Obst bereitstellen',
      'Anwesenheitstafel & Begrüßungsbereich vorbereiten',
      'Materialien für Freispiel-Angebote bereitstellen',
      'Erste-Hilfe-Notfallhandy einschalten und Akku prüfen'
    ]
  },
  {
    title: 'Wald- & Außengelände-Exkursion',
    category: 'AUSFLUG' as const,
    color: '#10b981',
    is_shared: true,
    items: [
      'Teilnehmerliste der Kinder mit Notfallkontakten prüfen',
      'Erste-Hilfe-Rucksack auf Vollständigkeit prüfen (Pflaster, Zeckenzange)',
      'Zeckenspray und Sonnencreme aufgetragen',
      'Ausreichend Wasserflaschen & gesunde Snacks eingepackt',
      'Warnwesten für alle Kinder angelegt',
      'Kita-Notfallhandy eingepackt und Akku voll'
    ]
  },
  {
    title: 'Wöchentliche Hygiene- & Desinfektionsroutine',
    category: 'HYGIENE' as const,
    color: '#8b5cf6',
    is_shared: true,
    items: [
      'Wickeltische und Matten gründlich desinfizieren',
      'Handwaschbecken und Sanitärarmaturen reinigen',
      'Handtuchrollen und Seifenspender auffüllen',
      'Spielsachen der U3-Gruppe desinfizierend reinigen',
      'Kühlschranktemperatur prüfen und Dokumentation eintragen'
    ]
  },
  {
    title: 'Meine persönliche Portfolio-Dokumentation',
    category: 'PAEDAGOGIK' as const,
    color: '#f59e0b',
    is_shared: false,
    items: [
      'Beobachtungsbögen der Bezugskinder aktualisieren',
      'Entwicklungsfotos ausdrucken und in Portfolio-Ordner einkleben',
      'Notizen für anstehendes Elterngespräch zusammenfassen',
      'Individuelle Förderziele für nächste Woche notieren'
    ]
  }
];

export const ChecklistManagement: React.FC<ChecklistManagementProps> = ({ staffList }) => {
  const { t } = useLanguage();
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'SHARED' | 'PRIVATE'>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // New checklist modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState('');
  const [modalCategory, setModalCategory] = useState<'ROUTINE' | 'SICHERHEIT' | 'AUSFLUG' | 'HYGIENE' | 'PAEDAGOGIK' | 'SONSTIGES'>('ROUTINE');
  const [modalIsShared, setModalIsShared] = useState(true);
  const [modalColor, setModalColor] = useState('#3b82f6');
  const [modalCreatorId, setModalCreatorId] = useState('s_sabine');
  const [modalItems, setModalItems] = useState<string[]>(['']);
  const [modalError, setModalError] = useState<string | null>(null);

  // Groups and Sharing Targets
  const [groups, setGroups] = useState<any[]>([]);
  const [favorites, setFavorites] = useState<ShareFavorite[]>([
    { id: 'fav_gesamt', type: 'GESAMT', label: 'Gesamt (Alle)', icon: 'users', targetId: null },
    { id: 'fav_today_group', type: 'TODAY_GROUP', label: 'Heutige Gruppe', icon: 'clock-group', targetId: null },
    { id: 'fav_leitung', type: 'LEITUNG', label: 'Leitung', icon: 'shield-check', targetId: null }
  ]);
  const [favoriteFeedback, setFavoriteFeedback] = useState<string | null>(null);

  const [modalShareScope, setModalShareScope] = useState<ChecklistShareScope>('ALL');
  const [modalSelectedGroup, setModalSelectedGroup] = useState<string>('g_u3_maeuse');
  const [modalSelectedGroupName, setModalSelectedGroupName] = useState<string>('Mäusegruppe (U3)');
  const [modalSelectedStaffIds, setModalSelectedStaffIds] = useState<string[]>([]);
  const [modalSelectedStaffNames, setModalSelectedStaffNames] = useState<string[]>([]);
  const [activeShareTab, setActiveShareTab] = useState<'FAVORITES' | 'GROUP' | 'PERSONS' | 'LEITUNG' | 'ALL' | 'PRIVATE'>('FAVORITES');

  // Quick inline add item
  const [newItemText, setNewItemText] = useState<{ [checklistId: string]: string }>({});

  const loadChecklists = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/checklists');
      if (res.ok) {
        const data = await res.json();
        setChecklists(data);
      }
    } catch (e) {
      console.error('Error fetching checklists:', e);
    } finally {
      setLoading(false);
    }
  };

  const loadFavorites = async (staffId: string) => {
    try {
      const res = await fetch(`/api/staff/${staffId}/share-favorites`);
      if (res.ok) {
        const data = await res.json();
        setFavorites(data);
      }
    } catch (e) {
      console.error('Error fetching favorites:', e);
    }
  };

  const loadGroups = async () => {
    try {
      const res = await fetch('/api/groups');
      if (res.ok) {
        const data = await res.json();
        setGroups(data);
        if (data.length > 0 && !modalSelectedGroup) {
          setModalSelectedGroup(data[0].id);
          setModalSelectedGroupName(data[0].name);
        }
      }
    } catch (e) {
      console.error('Error fetching groups:', e);
    }
  };

  useEffect(() => {
    loadChecklists();
    loadGroups();
    loadFavorites(modalCreatorId);
  }, []);

  useEffect(() => {
    loadFavorites(modalCreatorId);
  }, [modalCreatorId]);

  const handleSelectFavorite = (fav: ShareFavorite) => {
    if (fav.type === 'GESAMT') {
      setModalShareScope('ALL');
      setModalIsShared(true);
      setActiveShareTab('ALL');
    } else if (fav.type === 'TODAY_GROUP') {
      setModalShareScope('TODAY_GROUP');
      setModalIsShared(true);
      setActiveShareTab('FAVORITES');
    } else if (fav.type === 'LEITUNG') {
      setModalShareScope('LEITUNG');
      setModalIsShared(true);
      setActiveShareTab('LEITUNG');
    } else if (fav.type === 'GROUP') {
      setModalShareScope('GROUP');
      setModalIsShared(true);
      setModalSelectedGroup(fav.targetId || 'g_u3_maeuse');
      setModalSelectedGroupName(fav.targetName || fav.label);
      setActiveShareTab('GROUP');
    } else if (fav.type === 'PERSON') {
      setModalShareScope('PERSONS');
      setModalIsShared(true);
      setModalSelectedStaffIds([fav.targetId || '']);
      setModalSelectedStaffNames([fav.targetName || fav.label]);
      setActiveShareTab('PERSONS');
    }
  };

  const handlePinFavorite = async (fav: { type: string; label: string; targetId?: string | null; targetName?: string | null }) => {
    try {
      const res = await fetch(`/api/staff/${modalCreatorId}/share-favorites`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ favorite: fav })
      });
      if (res.ok) {
        const data = await res.json();
        setFavorites(data.favorites);
        const slotName = data.replacedIndex === 2 
          ? 'Platz 3 (unten: Leitung)' 
          : data.replacedIndex === 1 
          ? 'Platz 2 (Mitte: Heutige Gruppe)' 
          : 'Platz 1 (oben: Gesamt)';
        setFavoriteFeedback(`⭐ "${fav.label}" zu Favoriten hinzugefügt! Ersetzt ${slotName}.`);
        setTimeout(() => setFavoriteFeedback(null), 4500);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleItem = async (checklistId: string, itemId: string) => {
    try {
      // Optimistic update
      setChecklists(prev => prev.map(c => {
        if (c.id !== checklistId) return c;
        const updatedItems = c.items.map(item => {
          if (item.id !== itemId) return item;
          const nextDone = !item.done;
          return {
            ...item,
            done: nextDone,
            completed_by: nextDone ? 'Einrichtungsleitung' : undefined,
            completed_at: nextDone ? new Date().toISOString() : undefined
          };
        });
        const completed = updatedItems.filter(i => i.done).length;
        return {
          ...c,
          items: updatedItems,
          completed_items: completed,
          progress_percent: updatedItems.length > 0 ? Math.round((completed / updatedItems.length) * 100) : 0
        };
      }));

      const res = await fetch(`/api/checklists/${checklistId}/toggle-item`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          item_id: itemId,
          completed_by: 'Einrichtungsleitung'
        })
      });

      if (!res.ok) {
        await loadChecklists();
      }
    } catch (e) {
      console.error(e);
      await loadChecklists();
    }
  };

  const handleToggleSharing = async (checklist: Checklist) => {
    try {
      const nextShared = !checklist.is_shared;
      setChecklists(prev => prev.map(c => c.id === checklist.id ? { ...c, is_shared: nextShared, share_scope: nextShared ? 'ALL' : 'PRIVATE' } : c));
      
      const res = await fetch(`/api/checklists/${checklist.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_shared: nextShared, share_scope: nextShared ? 'ALL' : 'PRIVATE' })
      });
      if (!res.ok) await loadChecklists();
    } catch (e) {
      console.error(e);
      await loadChecklists();
    }
  };

  const handleAddInlineItem = async (checklistId: string) => {
    const text = newItemText[checklistId]?.trim();
    if (!text) return;

    try {
      const res = await fetch(`/api/checklists/${checklistId}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });

      if (res.ok) {
        setNewItemText(prev => ({ ...prev, [checklistId]: '' }));
        await loadChecklists();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteChecklist = async (id: string, title: string) => {
    if (!window.confirm(`Möchtest du die Checkliste "${title}" wirklich löschen?`)) return;

    try {
      const res = await fetch(`/api/checklists/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setChecklists(prev => prev.filter(c => c.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const applyTemplate = (t: typeof TEMPLATES[0]) => {
    setModalTitle(t.title);
    setModalCategory(t.category);
    setModalColor(t.color);
    setModalIsShared(t.is_shared);
    setModalShareScope(t.is_shared ? 'ALL' : 'PRIVATE');
    setModalItems(t.items);
  };

  const handleCreateChecklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTitle.trim()) {
      setModalError('Bitte einen Titel angeben');
      return;
    }

    const filteredItems = modalItems
      .filter(i => i.trim().length > 0)
      .map(i => ({
        id: 'i_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
        text: i.trim(),
        done: false
      }));

    const creator = staffList.find(s => s.id === modalCreatorId);
    const creatorName = creator ? `${creator.name} (${creator.role === 'LEITUNG' ? 'Leitung' : 'Mitarbeiter'})` : 'Einrichtungsleitung';

    try {
      const isShared = modalShareScope !== 'PRIVATE';
      const res = await fetch('/api/checklists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: modalTitle.trim(),
          category: modalCategory,
          created_by_id: modalCreatorId,
          created_by_name: creatorName,
          is_shared: isShared,
          share_scope: modalShareScope,
          shared_group_id: modalShareScope === 'GROUP' ? modalSelectedGroup : null,
          shared_group_name: modalShareScope === 'GROUP' ? modalSelectedGroupName : null,
          shared_staff_ids: modalShareScope === 'PERSONS' ? modalSelectedStaffIds : [],
          shared_staff_names: modalShareScope === 'PERSONS' ? modalSelectedStaffNames : [],
          color: modalColor,
          items: filteredItems
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        setModalTitle('');
        setModalItems(['']);
        setModalShareScope('ALL');
        setModalSelectedStaffIds([]);
        setModalSelectedStaffNames([]);
        setModalError(null);
        await loadChecklists();
      } else {
        const json = await res.json();
        setModalError(json.error || 'Fehler beim Erstellen');
      }
    } catch (e: any) {
      setModalError(e.message);
    }
  };

  // Filter checklists
  const filteredChecklists = checklists.filter(c => {
    if (filterType === 'SHARED' && !c.is_shared) return false;
    if (filterType === 'PRIVATE' && c.is_shared) return false;
    if (selectedCategory !== 'ALL' && c.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = c.title.toLowerCase().includes(q);
      const matchCreator = c.created_by_name.toLowerCase().includes(q);
      const matchItems = c.items.some(i => i.text.toLowerCase().includes(q));
      if (!matchTitle && !matchCreator && !matchItems) return false;
    }
    return true;
  });

  const sharedCount = checklists.filter(c => c.is_shared).length;
  const privateCount = checklists.filter(c => !c.is_shared).length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-600">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">{t('checklists.title')}</h2>
              <p className="text-xs text-slate-500">
                {t('checklists.desc')}
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={() => {
            setModalTitle('');
            setModalItems(['', '', '']);
            setModalError(null);
            setIsModalOpen(true);
          }}
          className="flex items-center justify-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>{t('checklists.new_button')}</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Visibility Filter Tabs */}
        <div className="flex items-center space-x-1.5 w-full md:w-auto">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'ALL'
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {t('checklists.all_lists')} ({checklists.length})
          </button>
          <button
            onClick={() => setFilterType('SHARED')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'SHARED'
                ? 'bg-emerald-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>{t('checklists.team_lists')} ({sharedCount})</span>
          </button>
          <button
            onClick={() => setFilterType('PRIVATE')}
            className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              filterType === 'PRIVATE'
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Lock className="w-3.5 h-3.5" />
            <span>{t('checklists.private_lists')} ({privateCount})</span>
          </button>
        </div>

        {/* Category Pills & Search */}
        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Kategorie: Alle</option>
            <option value="ROUTINE">Routine</option>
            <option value="SICHERHEIT">Sicherheit & Schließen</option>
            <option value="AUSFLUG">Ausflug & Waldtag</option>
            <option value="HYGIENE">Hygiene & Desinfektion</option>
            <option value="PAEDAGOGIK">Pädagogik & Portfolio</option>
            <option value="SONSTIGES">Sonstiges</option>
          </select>

          <div className="relative flex-1 md:w-48">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Suchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-3 py-1.5 text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Checklist Cards Grid */}
      {loading ? (
        <div className="text-center py-16 text-slate-400 text-xs">Checklisten werden synchronisiert...</div>
      ) : filteredChecklists.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
          <CheckSquare className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-sm font-bold text-slate-700">Keine passenden Checklisten gefunden</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Erstelle jetzt eine neue Checkliste oder nutze eine unserer vorgefertigten Kita-Vorlagen.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredChecklists.map((c) => {
            const completedCount = c.items.filter(i => i.done).length;
            const totalCount = c.items.length;
            const percent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const isAllDone = totalCount > 0 && completedCount === totalCount;

            return (
              <div 
                key={c.id} 
                className="bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden transition-all hover:shadow-md"
              >
                {/* Header with Color Banner */}
                <div 
                  className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3"
                  style={{ borderTop: `4px solid ${c.color || '#3b82f6'}` }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1.5">
                      <span className={`px-2 py-0.5 rounded-md text-xs font-bold tracking-wider uppercase ${
                        c.category === 'SICHERHEIT' ? 'bg-rose-100 text-rose-700' :
                        c.category === 'ROUTINE' ? 'bg-blue-100 text-blue-700' :
                        c.category === 'AUSFLUG' ? 'bg-emerald-100 text-emerald-700' :
                        c.category === 'HYGIENE' ? 'bg-purple-100 text-purple-700' :
                        'bg-amber-100 text-amber-700'
                      }`}>
                        {c.category}
                      </span>

                      {/* Interactive Sharing Scope Badge */}
                      <button
                        onClick={() => handleToggleSharing(c)}
                        title="Klicken, um Freigabestatus schnell umzuschalten"
                        className={`flex items-center space-x-1 px-2.5 py-0.5 rounded-md text-xs font-bold transition-all ${
                          !c.is_shared || c.share_scope === 'PRIVATE'
                            ? 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                            : c.share_scope === 'TODAY_GROUP'
                            ? 'bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100'
                            : c.share_scope === 'GROUP'
                            ? 'bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100'
                            : c.share_scope === 'PERSONS'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100'
                            : c.share_scope === 'LEITUNG'
                            ? 'bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {!c.is_shared || c.share_scope === 'PRIVATE' ? (
                          <>
                            <Lock className="w-3 h-3 text-slate-500" />
                            <span>Nur privat</span>
                          </>
                        ) : c.share_scope === 'TODAY_GROUP' ? (
                          <>
                            <Clock className="w-3 h-3 text-blue-600" />
                            <span>Heutige Gruppe {c.shared_group_name ? `(${c.shared_group_name})` : ''}</span>
                          </>
                        ) : c.share_scope === 'GROUP' ? (
                          <>
                            <Users className="w-3 h-3 text-indigo-600" />
                            <span>Gruppe: {c.shared_group_name || 'Gruppe'}</span>
                          </>
                        ) : c.share_scope === 'PERSONS' ? (
                          <>
                            <User className="w-3 h-3 text-purple-600" />
                            <span>{c.shared_staff_names && c.shared_staff_names.length > 0 ? c.shared_staff_names.join(', ') : 'Personen'}</span>
                          </>
                        ) : c.share_scope === 'LEITUNG' ? (
                          <>
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            <span>Nur Leitung</span>
                          </>
                        ) : (
                          <>
                            <Users className="w-3 h-3 text-emerald-600" />
                            <span>Gesamt (Alle)</span>
                          </>
                        )}
                      </button>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug break-words">
                      {c.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5 flex items-center space-x-1">
                      <span>Erstellt von {c.created_by_name}</span>
                    </p>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleDeleteChecklist(c.id, c.title)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all shrink-0"
                    title="Checkliste löschen"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Progress Bar */}
                <div className="px-5 py-2.5 bg-slate-50/70 border-b border-slate-100 flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-slate-700">
                      {completedCount} von {totalCount} erledigt
                    </span>
                    {isAllDone && (
                      <span className="flex items-center space-x-1 text-emerald-600 font-bold text-xs bg-emerald-100 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        <span>Abgeschlossen</span>
                      </span>
                    )}
                  </div>
                  <span className="font-mono text-slate-500 font-bold">{percent}%</span>
                </div>
                <div className="w-full bg-slate-100 h-1.5">
                  <div 
                    className={`h-full transition-all duration-300 ${isAllDone ? 'bg-emerald-500' : 'bg-emerald-600'}`}
                    style={{ width: `${percent}%` }}
                  />
                </div>

                {/* Items List */}
                <div className="p-5 flex-1 space-y-2 overflow-y-auto max-h-72">
                  {c.items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Noch keine Aufgaben eingetragen.</p>
                  ) : (
                    c.items.map((item) => (
                      <div 
                        key={item.id}
                        onClick={() => handleToggleItem(c.id, item.id)}
                        className={`flex items-start space-x-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                          item.done 
                            ? 'bg-emerald-50/50 border-emerald-100 text-slate-500' 
                            : 'bg-white border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 text-slate-800'
                        }`}
                      >
                        <div className="pt-0.5 shrink-0">
                          {item.done ? (
                            <div className="w-4 h-4 rounded bg-emerald-600 text-white flex items-center justify-center">
                              <Check className="w-3 h-3 stroke-[3]" />
                            </div>
                          ) : (
                            <div className="w-4 h-4 rounded border-2 border-slate-300 hover:border-emerald-500 transition-colors" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-xs leading-relaxed ${item.done ? 'line-through text-slate-400' : 'font-medium'}`}>
                            {item.text}
                          </p>
                          {item.done && item.completed_by && (
                            <p className="text-xs text-emerald-700 mt-1 flex items-center space-x-1">
                              <span>✓ Erledigt von {item.completed_by}</span>
                              {item.completed_at && (
                                <span className="text-slate-400">
                                  ({new Date(item.completed_at).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})
                                </span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Add Inline Item Footer */}
                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="+ Weiteren Punkt hinzufügen..."
                    value={newItemText[c.id] || ''}
                    onChange={(e) => setNewItemText({ ...newItemText, [c.id]: e.target.value })}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddInlineItem(c.id);
                      }
                    }}
                    className="flex-1 text-xs bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleAddInlineItem(c.id)}
                    disabled={!newItemText[c.id]?.trim()}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CREATE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <CheckSquare className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-slate-900">Neue Checkliste anlegen</h3>
              </div>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Template Presets Picker */}
            <div className="mt-4 mb-4">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
                Schnellauswahl aus Kita-Vorlagen:
              </label>
              <div className="flex flex-wrap gap-2">
                {TEMPLATES.map((tmpl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyTemplate(tmpl)}
                    className="text-xs bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 text-slate-700 px-2.5 py-1.5 rounded-xl transition-all text-left font-medium"
                  >
                    {tmpl.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateChecklist} className="space-y-4">
              {modalError && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                  {modalError}
                </div>
              )}

              {/* Title */}
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Titel der Checkliste *</label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Schließdienst, Brandschutzrundgang, Ausflug..."
                  value={modalTitle}
                  onChange={(e) => setModalTitle(e.target.value)}
                  className="w-full text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Category & Creator */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Kategorie</label>
                  <select
                    value={modalCategory}
                    onChange={(e: any) => setModalCategory(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    <option value="ROUTINE">Routine</option>
                    <option value="SICHERHEIT">Sicherheit & Schließen</option>
                    <option value="AUSFLUG">Ausflug & Waldtag</option>
                    <option value="HYGIENE">Hygiene & Desinfektion</option>
                    <option value="PAEDAGOGIK">Pädagogik & Portfolio</option>
                    <option value="SONSTIGES">Sonstiges</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Erstellt von</label>
                  <select
                    value={modalCreatorId}
                    onChange={(e) => setModalCreatorId(e.target.value)}
                    className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500 font-semibold"
                  >
                    {staffList.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.role === 'LEITUNG' ? 'Leitung' : s.role})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* SHARING TARGETS & TOP 3 FAVORITES */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3.5">
                {/* Top 3 Favorites Bar */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                      <span>3 Favoriten oben (Schnellauswahl):</span>
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      Ersetzt von unten nach oben (3 → 2 → 1)
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    {favorites.map((fav, idx) => {
                      const isActive = 
                        (fav.type === 'GESAMT' && modalShareScope === 'ALL') ||
                        (fav.type === 'TODAY_GROUP' && modalShareScope === 'TODAY_GROUP') ||
                        (fav.type === 'LEITUNG' && modalShareScope === 'LEITUNG') ||
                        (fav.type === 'GROUP' && modalShareScope === 'GROUP' && modalSelectedGroup === fav.targetId) ||
                        (fav.type === 'PERSON' && modalShareScope === 'PERSONS' && modalSelectedStaffIds.includes(fav.targetId || ''));

                      return (
                        <button
                          key={fav.id || idx}
                          type="button"
                          onClick={() => handleSelectFavorite(fav)}
                          className={`p-2 rounded-xl text-left border transition-all relative ${
                            isActive
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/40'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-0.5">
                            <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                              isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                            }`}>
                              Slot {idx + 1} {idx === 2 ? '(unten)' : idx === 1 ? '(Mitte)' : '(oben)'}
                            </span>
                            <Star className={`w-3 h-3 ${isActive ? 'text-amber-300 fill-amber-300' : 'text-amber-400 fill-amber-400'}`} />
                          </div>
                          <div className="text-xs font-bold truncate">{fav.label}</div>
                          <div className={`text-xs truncate ${isActive ? 'text-emerald-100' : 'text-slate-400'}`}>
                            {fav.type === 'GESAMT' ? 'Gesamtes Team' : fav.type === 'TODAY_GROUP' ? 'Heutige Schicht' : fav.type === 'LEITUNG' ? 'Nur Leitung' : 'Benutzerdefiniert'}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {favoriteFeedback && (
                    <div className="mt-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-1.5 flex items-center space-x-1.5 font-medium">
                      <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      <span>{favoriteFeedback}</span>
                    </div>
                  )}
                </div>

                {/* Granular Sharing Scope Selection */}
                <div className="pt-2 border-t border-slate-200">
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">
                    Mit wem teilen? (Gruppe / Kindergruppe / Personen / Leitung):
                  </label>

                  <div className="flex flex-wrap gap-1.5 mb-3">
                    <button
                      type="button"
                      onClick={() => { setModalShareScope('ALL'); setModalIsShared(true); }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        modalShareScope === 'ALL'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Gesamt (Alle)
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModalShareScope('TODAY_GROUP'); setModalIsShared(true); }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        modalShareScope === 'TODAY_GROUP'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Heutige Gruppe
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModalShareScope('GROUP'); setModalIsShared(true); }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        modalShareScope === 'GROUP'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Kindergruppe
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModalShareScope('PERSONS'); setModalIsShared(true); }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        modalShareScope === 'PERSONS'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Personen
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModalShareScope('LEITUNG'); setModalIsShared(true); }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        modalShareScope === 'LEITUNG'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Leitung
                    </button>
                    <button
                      type="button"
                      onClick={() => { setModalShareScope('PRIVATE'); setModalIsShared(false); }}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                        modalShareScope === 'PRIVATE'
                          ? 'bg-rose-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      Privat (Nur ich)
                    </button>
                  </div>

                  {/* Scope Detailed Controls */}
                  {modalShareScope === 'TODAY_GROUP' && (
                    <div className="bg-blue-50/70 border border-blue-200 rounded-xl p-2.5 text-xs text-blue-800">
                      <p className="font-bold flex items-center space-x-1">
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>Dynamische Schicht-Zuweisung:</span>
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Bleibt bei der Gruppe immer zugeordnet – wird allen Mitarbeitern angezeigt, die heute in dieser Gruppe arbeiten. Dem Ersteller aber immer!
                      </p>
                    </div>
                  )}

                  {modalShareScope === 'GROUP' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Feste Kindergruppe wählen:</span>
                        <button
                          type="button"
                          onClick={() => handlePinFavorite({
                            type: 'GROUP',
                            label: modalSelectedGroupName,
                            targetId: modalSelectedGroup,
                            targetName: modalSelectedGroupName
                          })}
                          className="text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 px-2 py-0.5 rounded-lg flex items-center space-x-1"
                        >
                          <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                          <span>Zu Favoriten (von unten nach oben)</span>
                        </button>
                      </div>
                      <select
                        value={modalSelectedGroup}
                        onChange={(e) => {
                          const grp = groups.find(g => g.id === e.target.value);
                          setModalSelectedGroup(e.target.value);
                          if (grp) setModalSelectedGroupName(grp.name);
                        }}
                        className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 font-medium"
                      >
                        {groups.map(g => (
                          <option key={g.id} value={g.id}>{g.name} ({g.type})</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {modalShareScope === 'PERSONS' && (
                    <div className="bg-white border border-slate-200 rounded-xl p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-700">Bestimmte Personen auswählen:</span>
                        <span className="text-xs text-slate-400">
                          {modalSelectedStaffIds.length} ausgewählt
                        </span>
                      </div>
                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {staffList.filter(s => s.id !== modalCreatorId).map(s => {
                          const isChecked = modalSelectedStaffIds.includes(s.id);
                          return (
                            <div key={s.id} className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-50 border border-transparent hover:border-slate-100">
                              <label className="flex items-center space-x-2 text-xs text-slate-700 cursor-pointer flex-1">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setModalSelectedStaffIds([...modalSelectedStaffIds, s.id]);
                                      setModalSelectedStaffNames([...modalSelectedStaffNames, s.name]);
                                    } else {
                                      setModalSelectedStaffIds(modalSelectedStaffIds.filter(id => id !== s.id));
                                      setModalSelectedStaffNames(modalSelectedStaffNames.filter(name => name !== s.name));
                                    }
                                  }}
                                  className="rounded text-emerald-600 focus:ring-emerald-500 w-3.5 h-3.5"
                                />
                                <span className="font-medium">{s.name}</span>
                                <span className="text-xs text-slate-400">({s.role})</span>
                              </label>

                              <button
                                type="button"
                                title={`${s.name} zu den 3 Favoriten hinzufügen`}
                                onClick={() => handlePinFavorite({
                                  type: 'PERSON',
                                  label: s.name,
                                  targetId: s.id,
                                  targetName: s.name
                                })}
                                className="text-xs text-amber-700 hover:text-amber-800 bg-amber-50 hover:bg-amber-100 px-2 py-0.5 rounded border border-amber-200 flex items-center space-x-1"
                              >
                                <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />
                                <span>Favorit</span>
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {modalShareScope === 'LEITUNG' && (
                    <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-900">
                      <p className="font-bold flex items-center space-x-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                        <span>Nur Kita-Leitung:</span>
                      </p>
                      <p className="text-xs text-amber-800 mt-0.5">
                        Nur für Einrichtungsleitung und Administratoren sichtbar (z.B. für vertrauliche Sicherheits- oder Brandschutz-Prüfungen).
                      </p>
                    </div>
                  )}

                  {modalShareScope === 'ALL' && (
                    <p className="text-xs text-slate-500 mt-1">
                      Alle Mitarbeiter der Kita sehen diese Liste und können Aufgaben gemeinsam abhaken.
                    </p>
                  )}

                  {modalShareScope === 'PRIVATE' && (
                    <p className="text-xs text-slate-500 mt-1">
                      Nur für dich sichtbar – perfekt für persönliche Portfolio-Vorbereitungen oder Notizen.
                    </p>
                  )}
                </div>
              </div>

              {/* Items List */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-700">Checklisten-Punkte</label>
                  <button
                    type="button"
                    onClick={() => setModalItems([...modalItems, ''])}
                    className="text-xs text-emerald-600 font-bold hover:underline flex items-center space-x-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Punkt hinzufügen</span>
                  </button>
                </div>

                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {modalItems.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-2">
                      <span className="text-xs font-mono text-slate-400 w-5 text-right">{idx + 1}.</span>
                      <input
                        type="text"
                        placeholder="Aufgabe beschreiben..."
                        value={item}
                        onChange={(e) => {
                          const updated = [...modalItems];
                          updated[idx] = e.target.value;
                          setModalItems(updated);
                        }}
                        className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                      {modalItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setModalItems(modalItems.filter((_, i) => i !== idx))}
                          className="text-slate-400 hover:text-rose-500 p-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-all"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl transition-all"
                >
                  Checkliste anlegen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
