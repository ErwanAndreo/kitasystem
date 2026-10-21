import React, { useState, useEffect } from 'react';
import { DirectorNote, DirectorChecklistItem } from '../types';
import { 
  BookOpen, 
  Plus, 
  Pin, 
  Trash2, 
  CheckSquare, 
  Square, 
  Search, 
  Sparkles, 
  Tag, 
  Save, 
  X, 
  Edit3,
  Calendar,
  FolderOpen
} from 'lucide-react';

export const DirectorNotebook: React.FC = () => {
  const [notes, setNotes] = useState<DirectorNote[]>([]);
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Modal / Editor State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Partial<DirectorNote> | null>(null);
  const [newChecklistText, setNewChecklistText] = useState('');

  const loadNotes = async () => {
    try {
      let url = '/api/director-notes?';
      if (categoryFilter !== 'ALL') url += `category=${categoryFilter}&`;
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      const res = await fetch(url);
      setNotes(await res.json());
    } catch (e) {
      console.error('Error loading director notes:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotes();
  }, [categoryFilter, searchQuery]);

  const handleOpenNewNote = (category = 'TEAM') => {
    setEditingNote({
      category: category as any,
      title: '',
      content: '',
      color: '#fef08a',
      is_pinned: 0,
      checklist: []
    });
    setNewChecklistText('');
    setModalOpen(true);
  };

  const handleEditNote = (note: DirectorNote) => {
    setEditingNote({ ...note });
    setNewChecklistText('');
    setModalOpen(true);
  };

  const handleSaveNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingNote?.title) return;

    try {
      if (editingNote.id) {
        await fetch(`/api/director-notes/${editingNote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingNote)
        });
      } else {
        await fetch('/api/director-notes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editingNote)
        });
      }
      setModalOpen(false);
      setEditingNote(null);
      await loadNotes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteNote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Diese Notiz wirklich löschen?')) return;
    try {
      await fetch(`/api/director-notes/${id}`, { method: 'DELETE' });
      await loadNotes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleTogglePin = async (note: DirectorNote, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/director-notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...note, is_pinned: note.is_pinned ? 0 : 1 })
      });
      await loadNotes();
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleChecklistItem = async (note: DirectorNote, itemId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updatedChecklist = note.checklist.map(item => 
      item.id === itemId ? { ...item, done: !item.done } : item
    );
    try {
      await fetch(`/api/director-notes/${note.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...note, checklist: updatedChecklist })
      });
      await loadNotes();
    } catch (err) {
      console.error(err);
    }
  };

  const addChecklistItemToEditing = () => {
    if (!newChecklistText.trim() || !editingNote) return;
    const newItem: DirectorChecklistItem = {
      id: 'c_' + Date.now(),
      text: newChecklistText.trim(),
      done: false
    };
    setEditingNote({
      ...editingNote,
      checklist: [...(editingNote.checklist || []), newItem]
    });
    setNewChecklistText('');
  };

  const removeChecklistItemFromEditing = (id: string) => {
    if (!editingNote) return;
    setEditingNote({
      ...editingNote,
      checklist: (editingNote.checklist || []).filter(c => c.id !== id)
    });
  };

  const categories = [
    { id: 'ALL', label: 'Alle Notizen', icon: FolderOpen },
    { id: 'TEAM', label: 'Team & Personal', icon: Tag },
    { id: 'ELTERN', label: 'Elternbeirat & Feste', icon: Tag },
    { id: 'TRAEGER', label: 'Träger & Behörden', icon: Tag },
    { id: 'KONZEPTE', label: 'Pädagogik & Schutz', icon: Tag },
    { id: 'ALLGEMEIN', label: 'Schnelle Notizen', icon: Tag },
  ];

  const colorPalettes = [
    { color: '#fef08a', name: 'Zitronengelb (OneNote Classic)' },
    { color: '#bfdbfe', name: 'Himmelblau' },
    { color: '#bbf7d0', name: 'Pfefferminzgrün' },
    { color: '#e9d5ff', name: 'Flieder / Lavendel' },
    { color: '#fecdd3', name: 'Pfirsichrosa' },
    { color: '#ffffff', name: 'Klassisch Weiß' },
  ];

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Leitungs-Notizbuch (OneNote-Style)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Vertrauliche Notizen, Team-Besprechungen, To-Do-Checklisten & Träger-Konzepte für Sabine Weber
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Notizen durchsuchen..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 w-48 md:w-56"
            />
          </div>

          <button
            onClick={() => handleOpenNewNote(categoryFilter !== 'ALL' ? categoryFilter : 'TEAM')}
            className="flex items-center space-x-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-all active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Neue Notiz anlegen</span>
          </button>
        </div>
      </div>

      {/* Category Section Tabs (OneNote Binder Tabs) */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1">
        {categories.map((cat) => {
          const Icon = cat.icon;
          const isSelected = categoryFilter === cat.id;

          return (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notes Grid */}
      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">
          Notizbuch wird geladen...
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-semibold text-slate-700">Keine Notizen in diesem Bereich</p>
          <p className="text-xs text-slate-400 mt-0.5">Erstelle jetzt deine erste Besprechungs- oder Planungsnotiz.</p>
          <button
            onClick={() => handleOpenNewNote()}
            className="mt-3 inline-flex items-center space-x-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-xl"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Jetzt Notiz schreiben</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {notes.map((note) => {
            const hasChecklist = note.checklist && note.checklist.length > 0;
            const doneCount = note.checklist ? note.checklist.filter(c => c.done).length : 0;

            return (
              <div
                key={note.id}
                onClick={() => handleEditNote(note)}
                style={{ backgroundColor: note.color }}
                className={`p-5 rounded-2xl border border-black/10 shadow-xs hover:shadow-md transition-all cursor-pointer relative group flex flex-col justify-between min-h-[220px] ${
                  note.is_pinned ? 'ring-2 ring-indigo-500/40' : ''
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 pb-2">
                    <div className="flex items-center space-x-1.5">
                      <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-black/10 text-slate-800">
                        {note.category}
                      </span>
                      {hasChecklist && (
                        <span className="text-[10px] font-bold text-slate-700 bg-white/60 px-1.5 py-0.5 rounded-md">
                          {doneCount}/{note.checklist.length} Erledigt
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        type="button"
                        onClick={(e) => handleTogglePin(note, e)}
                        className={`p-1 rounded-lg transition-colors ${
                          note.is_pinned 
                            ? 'text-indigo-700 bg-white/70' 
                            : 'text-slate-400 hover:text-slate-700 hover:bg-black/5 opacity-0 group-hover:opacity-100'
                        }`}
                        title={note.is_pinned ? 'Notiz loslösen' : 'Notiz oben anpinnen'}
                      >
                        <Pin className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteNote(note.id, e)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Notiz löschen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Title */}
                  <h3 className="font-bold text-sm text-slate-900 mt-1 line-clamp-2">
                    {note.title}
                  </h3>

                  {/* Content snippet */}
                  <p className="text-xs text-slate-700 mt-1.5 whitespace-pre-line line-clamp-4 leading-relaxed font-sans">
                    {note.content}
                  </p>

                  {/* Interactive Checklist inside note card */}
                  {hasChecklist && (
                    <div className="mt-3 pt-2.5 border-t border-black/10 space-y-1.5">
                      {note.checklist.slice(0, 3).map((item) => (
                        <div
                          key={item.id}
                          onClick={(e) => handleToggleChecklistItem(note, item.id, e)}
                          className="flex items-center space-x-2 text-xs cursor-pointer select-none"
                        >
                          {item.done ? (
                            <CheckSquare className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                          ) : (
                            <Square className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          )}
                          <span className={`text-[11px] truncate ${item.done ? 'line-through text-slate-500' : 'text-slate-800 font-medium'}`}>
                            {item.text}
                          </span>
                        </div>
                      ))}
                      {note.checklist.length > 3 && (
                        <div className="text-[10px] text-slate-500 italic">
                          +{note.checklist.length - 3} weitere Aufgaben...
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Footer timestamp */}
                <div className="text-[10px] text-slate-500 mt-4 pt-2 border-t border-black/5 flex items-center justify-between">
                  <span>Aktualisiert: {new Date(note.updated_at).toLocaleDateString('de-DE')}</span>
                  <span className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity font-semibold text-slate-700">
                    <Edit3 className="w-3 h-3" />
                    <span>Bearbeiten</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for creating / editing note */}
      {modalOpen && editingNote && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div 
            style={{ backgroundColor: editingNote.color || '#fef08a' }}
            className="rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-black/10 my-6 transition-colors"
          >
            <div className="flex items-center justify-between pb-3 border-b border-black/10">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                {editingNote.id ? 'Notiz bearbeiten' : 'Neue Leitungs-Notiz'}
              </span>
              <button
                onClick={() => setModalOpen(false)}
                className="p-1 text-slate-500 hover:text-slate-800 rounded-lg hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveNote} className="mt-4 space-y-4">
              {/* Category & Color Picker */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <label className="text-xs font-bold text-slate-700">Kategorie:</label>
                  <select
                    value={editingNote.category || 'TEAM'}
                    onChange={(e) => setEditingNote({ ...editingNote, category: e.target.value as any })}
                    className="text-xs p-1.5 bg-white/80 border border-black/10 rounded-xl font-bold"
                  >
                    <option value="TEAM">Team & Personal</option>
                    <option value="ELTERN">Elternbeirat & Feste</option>
                    <option value="TRAEGER">Träger & Behörden</option>
                    <option value="KONZEPTE">Pädagogik & Schutz</option>
                    <option value="ALLGEMEIN">Schnelle Notizen</option>
                  </select>
                </div>

                {/* Color swatches */}
                <div className="flex items-center space-x-1.5">
                  <span className="text-[11px] font-bold text-slate-600 mr-1">Farbe:</span>
                  {colorPalettes.map((cp) => (
                    <button
                      key={cp.color}
                      type="button"
                      onClick={() => setEditingNote({ ...editingNote, color: cp.color })}
                      style={{ backgroundColor: cp.color }}
                      title={cp.name}
                      className={`w-6 h-6 rounded-full border-2 transition-transform ${
                        editingNote.color === cp.color ? 'border-slate-800 scale-110 shadow-xs' : 'border-black/20 hover:scale-105'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Title input */}
              <div>
                <input
                  type="text"
                  placeholder="Notiz-Titel (z.B. Team-Besprechung, Elterngespräch...)"
                  value={editingNote.title || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                  className="w-full text-base font-bold p-2.5 bg-white/80 border border-black/10 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>

              {/* Content textarea */}
              <div>
                <textarea
                  rows={6}
                  placeholder="Inhalt, Gedanken, Besprechungspunkte..."
                  value={editingNote.content || ''}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  className="w-full text-xs font-medium p-3 bg-white/80 border border-black/10 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                />
              </div>

              {/* Checklist Section */}
              <div className="p-3 bg-black/5 rounded-2xl border border-black/5">
                <label className="text-xs font-bold text-slate-800 block mb-2">
                  Aufgaben & To-Do-Checkliste
                </label>

                {/* Items */}
                <div className="space-y-1.5 mb-2.5 max-h-40 overflow-y-auto">
                  {(editingNote.checklist || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-white/90 px-2.5 py-1.5 rounded-xl border border-black/5">
                      <div className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={item.done}
                          onChange={() => {
                            const updated = (editingNote.checklist || []).map(c => 
                              c.id === item.id ? { ...c, done: !c.done } : c
                            );
                            setEditingNote({ ...editingNote, checklist: updated });
                          }}
                          className="rounded text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={`text-xs ${item.done ? 'line-through text-slate-400' : 'text-slate-800 font-medium'}`}>
                          {item.text}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeChecklistItemFromEditing(item.id)}
                        className="text-slate-400 hover:text-rose-600 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add new checklist item */}
                <div className="flex items-center space-x-2">
                  <input
                    type="text"
                    placeholder="Neue Aufgabe hinzufügen..."
                    value={newChecklistText}
                    onChange={(e) => setNewChecklistText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addChecklistItemToEditing();
                      }
                    }}
                    className="flex-1 text-xs p-2 bg-white rounded-xl border border-black/10"
                  />
                  <button
                    type="button"
                    onClick={addChecklistItemToEditing}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold"
                  >
                    Hinzufügen
                  </button>
                </div>
              </div>

              {/* Pin switch & Action buttons */}
              <div className="flex items-center justify-between pt-2 border-t border-black/10">
                <label className="flex items-center space-x-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingNote.is_pinned === 1}
                    onChange={(e) => setEditingNote({ ...editingNote, is_pinned: e.target.checked ? 1 : 0 })}
                    className="rounded text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>Notiz oben anpinnen</span>
                </label>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-black/5 rounded-xl"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-slate-900 hover:bg-black text-white rounded-xl shadow-xs flex items-center space-x-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Notiz speichern</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
