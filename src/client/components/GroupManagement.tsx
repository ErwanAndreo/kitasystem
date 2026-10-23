import React, { useState, useEffect } from 'react';
import { Group, PolicyTemplate } from '../types';
import { 
  Users, 
  Plus, 
  Trash2, 
  Edit3, 
  ShieldCheck, 
  Baby, 
  Sparkles, 
  Layers, 
  Check, 
  X,
  AlertCircle
} from 'lucide-react';

interface GroupManagementProps {
  groups: Group[];
  onRefresh: () => Promise<void>;
}

export const GroupManagement: React.FC<GroupManagementProps> = ({ groups, onRefresh }) => {
  const [policies, setPolicies] = useState<PolicyTemplate[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<Group | null>(null);

  const [formData, setFormData] = useState<{
    name: string;
    type: 'U3' | 'UE3' | 'MIXED';
    child_count: number;
    target_ratio: number;
    min_fachkraft_percent: number;
    color: string;
    policy_id: string;
  }>({
    name: '',
    type: 'UE3',
    child_count: 25,
    target_ratio: 8.33,
    min_fachkraft_percent: 0.50,
    color: '#3b82f6',
    policy_id: 'pol_ue3'
  });

  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/policies')
      .then(r => r.json())
      .then(setPolicies)
      .catch(console.error);
  }, []);

  const handleOpenCreate = () => {
    setEditingGroup(null);
    setFormData({
      name: '',
      type: 'UE3',
      child_count: 25,
      target_ratio: 8.33,
      min_fachkraft_percent: 0.50,
      color: '#3b82f6',
      policy_id: 'pol_ue3'
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (grp: Group) => {
    setEditingGroup(grp);
    setFormData({
      name: grp.name,
      type: grp.type,
      child_count: grp.child_count,
      target_ratio: grp.target_ratio,
      min_fachkraft_percent: grp.min_fachkraft_percent,
      color: grp.color,
      policy_id: grp.policy_id || (grp.type === 'U3' ? 'pol_u3' : grp.type === 'MIXED' ? 'pol_mixed' : 'pol_ue3')
    });
    setModalOpen(true);
  };

  const handleSelectPolicy = (polId: string) => {
    const pol = policies.find(p => p.id === polId);
    if (!pol) return;
    setFormData(prev => ({
      ...prev,
      policy_id: pol.id,
      type: pol.type === 'CUSTOM' ? prev.type : pol.type,
      target_ratio: pol.target_ratio,
      min_fachkraft_percent: pol.min_fachkraft_percent,
      color: pol.type === 'U3' ? '#f43f5e' : pol.type === 'MIXED' ? '#10b981' : '#3b82f6'
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    try {
      if (editingGroup) {
        // Update
        const res = await fetch(`/api/groups/${editingGroup.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Fehler beim Aktualisieren der Gruppe');
      } else {
        // Create
        const res = await fetch('/api/groups', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        if (!res.ok) throw new Error('Fehler beim Erstellen der Gruppe');
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/groups/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Fehler beim Löschen der Gruppe');
      setDeleteConfirmId(null);
      await onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const colors = [
    { label: 'Blau', val: '#3b82f6' },
    { label: 'Rose / Rot', val: '#f43f5e' },
    { label: 'Smaragdgrün', val: '#10b981' },
    { label: 'Bernstein / Orange', val: '#f59e0b' },
    { label: 'Violett', val: '#8b5cf6' },
    { label: 'Cyan', val: '#06b6d4' }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-900">
              Gruppen & Betreuungsschlüssel-Richtlinien
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Lege Gruppen deiner Einrichtung an (z. B. Krippe, Kindergarten, Waldgruppe) und weise ihnen modulare Schlüssel-Richtlinien zu. 
            Die Richtlinien steuern die Live-Betreuungsberechnung und Fachkraftquote.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center space-x-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm active:scale-95 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ Neue Gruppe anlegen</span>
        </button>
      </div>

      {/* Group Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {groups.map((grp) => {
          const isU3 = grp.type === 'U3';
          const isMixed = grp.type === 'MIXED';

          return (
            <div
              key={grp.id}
              className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              {/* Top Color Accent */}
              <div
                className="absolute top-0 left-0 right-0 h-1.5"
                style={{ backgroundColor: grp.color }}
              />

              <div>
                {/* Header: Title and Type Badge */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="flex items-center space-x-2.5">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-xs shrink-0"
                      style={{ backgroundColor: grp.color }}
                    >
                      {grp.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight">
                        {grp.name}
                      </h3>
                      <span className="text-[10px] text-slate-400 font-medium">
                        ID: {grp.id}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isU3
                        ? 'bg-rose-100 text-rose-800'
                        : isMixed
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {isU3 ? 'Krippe (U3)' : isMixed ? 'Gemischt' : 'Kindergarten (Ü3)'}
                  </span>
                </div>

                {/* Key Metrics */}
                <div className="grid grid-cols-3 gap-2 my-4 bg-slate-50 p-3 rounded-xl border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Kinder</span>
                    <span className="text-sm font-extrabold text-slate-800 flex items-center justify-center space-x-1">
                      <Baby className="w-3.5 h-3.5 text-slate-400" />
                      <span>{grp.child_count}</span>
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Soll-Schlüssel</span>
                    <span className="text-sm font-extrabold text-slate-800">
                      1 : {grp.target_ratio.toFixed(1)}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Fachkraftquote</span>
                    <span className="text-sm font-extrabold text-emerald-700">
                      {Math.round(grp.min_fachkraft_percent * 100)} %
                    </span>
                  </div>
                </div>

                {/* Assigned Policy Description */}
                <div className="text-[11px] text-slate-500 bg-slate-50/60 p-2.5 rounded-lg border border-dashed border-slate-200">
                  <span className="font-semibold text-slate-700">Richtlinie: </span>
                  {isU3
                    ? 'Krippen-Schlüssel nach KiBiz (max. 3.3 Kinder pro Betreuer, 67% Fachkräfte)'
                    : isMixed
                    ? 'Altersgemischt (1:6.0, mind. 60% Fachkräfte)'
                    : 'Elementarbereich Ü3 (1:8.3, mind. 50% Fachkräfte)'}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <button
                  onClick={() => handleOpenEdit(grp)}
                  className="flex items-center space-x-1 text-slate-600 hover:text-slate-900 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Bearbeiten</span>
                </button>

                {deleteConfirmId === grp.id ? (
                  <div className="flex items-center space-x-1">
                    <span className="text-[10px] text-rose-600 font-bold">Wirklich?</span>
                    <button
                      onClick={() => handleDelete(grp.id)}
                      className="bg-rose-600 text-white text-[10px] px-2 py-0.5 rounded font-bold hover:bg-rose-700"
                    >
                      Ja
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="text-slate-400 text-[10px] px-1 hover:text-slate-700"
                    >
                      Nein
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(grp.id)}
                    className="flex items-center space-x-1 text-slate-400 hover:text-rose-600 text-xs font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Löschen</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Create or Edit Group */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <Users className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {editingGroup ? 'Gruppe bearbeiten' : 'Neue Kindergruppe anlegen'}
                </h3>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="mt-5 space-y-4">
              {/* Group Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Gruppenname *
                </label>
                <input
                  type="text"
                  required
                  placeholder="z.B. Krippengruppe 1, Sonnenschein, Waldmäuse..."
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-500"
                />
              </div>

              {/* Policy Selector (Modular Standards) */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Schlüssel-Richtlinie zuweisen (Vorlage)
                </label>
                <p className="text-[11px] text-slate-500 mb-2">
                  Wähle eine Standard-Richtlinie aus. Schlüssel & Fachkraftquote werden automatisch vorbelegt.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {policies.map(pol => {
                    const isSelected = formData.policy_id === pol.id;
                    return (
                      <button
                        type="button"
                        key={pol.id}
                        onClick={() => handleSelectPolicy(pol.id)}
                        className={`p-2.5 rounded-xl text-left border text-xs transition-all ${
                          isSelected
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold ring-1 ring-emerald-600'
                            : 'border-slate-200 bg-slate-50 hover:bg-white text-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-bold text-[11px] truncate">{pol.name.split('(')[0]}</span>
                          {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                        </div>
                        <div className="text-[10px] text-slate-500 font-normal">
                          1:{pol.target_ratio.toFixed(1)} • {Math.round(pol.min_fachkraft_percent * 100)}% FK
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Custom Overrides if needed */}
              <div className="grid grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Anzahl Kinder *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="50"
                    required
                    value={formData.child_count}
                    onChange={e => setFormData({ ...formData, child_count: parseInt(e.target.value, 10) || 1 })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Soll-Schlüssel (1:X)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    max="20"
                    required
                    value={formData.target_ratio}
                    onChange={e => setFormData({ ...formData, target_ratio: parseFloat(e.target.value) || 1 })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Min. Fachkräfte %
                  </label>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    max="1"
                    required
                    value={formData.min_fachkraft_percent}
                    onChange={e => setFormData({ ...formData, min_fachkraft_percent: parseFloat(e.target.value) || 0.5 })}
                    className="w-full text-xs px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                  />
                </div>
              </div>

              {/* Group Color */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Gruppenfarbe im Dienstplan
                </label>
                <div className="flex items-center space-x-2">
                  {colors.map(c => (
                    <button
                      type="button"
                      key={c.val}
                      onClick={() => setFormData({ ...formData, color: c.val })}
                      style={{ backgroundColor: c.val }}
                      className={`w-7 h-7 rounded-full flex items-center justify-center transition-transform ${
                        formData.color === c.val ? 'ring-2 ring-offset-2 ring-slate-800 scale-110' : 'hover:scale-105'
                      }`}
                      title={c.label}
                    >
                      {formData.color === c.val && <Check className="w-3.5 h-3.5 text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm active:scale-95"
                >
                  {editingGroup ? 'Änderungen speichern' : 'Gruppe anlegen'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
