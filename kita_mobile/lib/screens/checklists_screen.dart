import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/i18n_service.dart';

class ChecklistsScreen extends StatefulWidget {
  final StaffModel currentUser;

  const ChecklistsScreen({
    super.key,
    required this.currentUser,
  });

  @override
  State<ChecklistsScreen> createState() => _ChecklistsScreenState();
}

class _ChecklistsScreenState extends State<ChecklistsScreen> {
  List<ChecklistModel> _checklists = [];
  bool _loading = true;
  String _visibilityFilter = 'ALL'; // ALL, SHARED, PRIVATE
  String _selectedCategory = 'ALL';

  final Map<String, TextEditingController> _inlineControllers = {};

  @override
  void initState() {
    super.initState();
    _loadChecklists();
  }

  Future<void> _loadChecklists() async {
    setState(() => _loading = true);
    final lists = await ApiService.getChecklists(staffId: widget.currentUser.id);
    if (mounted) {
      setState(() {
        _checklists = lists;
        _loading = false;
      });
    }
  }

  Future<void> _toggleItem(String checklistId, String itemId) async {
    // Optimistic local update
    setState(() {
      _checklists = _checklists.map((c) {
        if (c.id != checklistId) return c;
        final updatedItems = c.items.map((it) {
          if (it.id != itemId) return it;
          final nextDone = !it.done;
          return ChecklistItemModel(
            id: it.id,
            text: it.text,
            done: nextDone,
            completedBy: nextDone ? widget.currentUser.name : null,
            completedAt: nextDone ? '${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}' : null,
          );
        }).toList();

        final completed = updatedItems.where((i) => i.done).length;
        final pct = updatedItems.isNotEmpty ? ((completed / updatedItems.length) * 100).round() : 0;

        return ChecklistModel(
          id: c.id,
          title: c.title,
          category: c.category,
          createdById: c.createdById,
          createdByName: c.createdByName,
          isShared: c.isShared,
          color: c.color,
          items: updatedItems,
          totalItems: updatedItems.length,
          completedItems: completed,
          progressPercent: pct,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        );
      }).toList();
    });

    await ApiService.toggleChecklistItem(
      checklistId: checklistId,
      itemId: itemId,
      completedBy: widget.currentUser.name,
    );
  }

  Future<void> _toggleSharing(ChecklistModel checklist) async {
    final nextShared = !checklist.isShared;
    setState(() {
      _checklists = _checklists.map((c) {
        if (c.id != checklist.id) return c;
        return ChecklistModel(
          id: c.id,
          title: c.title,
          category: c.category,
          createdById: c.createdById,
          createdByName: c.createdByName,
          isShared: nextShared,
          color: c.color,
          items: c.items,
          totalItems: c.totalItems,
          completedItems: c.completedItems,
          progressPercent: c.progressPercent,
          createdAt: c.createdAt,
          updatedAt: c.updatedAt,
        );
      }).toList();
    });

    await ApiService.updateChecklist(checklist.id, isShared: nextShared);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            nextShared
                ? '👥 Checkliste "${checklist.title}" ist jetzt für das gesamte Team sichtbar!'
                : '🔒 Checkliste "${checklist.title}" ist jetzt nur noch für dich sichtbar.',
          ),
          duration: const Duration(seconds: 3),
        ),
      );
    }
  }

  Future<void> _addInlineItem(String checklistId) async {
    final ctrl = _inlineControllers[checklistId];
    if (ctrl == null || ctrl.text.trim().isEmpty) return;

    final text = ctrl.text.trim();
    ctrl.clear();

    await ApiService.addChecklistItem(checklistId, text);
    _loadChecklists();
  }

  Future<void> _deleteChecklist(ChecklistModel checklist) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Checkliste löschen?'),
        content: Text('Möchtest du "${checklist.title}" wirklich unwiderruflich löschen?'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx, false), child: const Text('Abbrechen')),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Löschen', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );

    if (confirmed == true) {
      await ApiService.deleteChecklist(checklist.id);
      _loadChecklists();
    }
  }

  void _showCreateBottomSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => _CreateChecklistSheet(
        currentUser: widget.currentUser,
        onCreated: () {
          Navigator.pop(ctx);
          _loadChecklists();
        },
      ),
    );
  }

  Color _parseColor(String hex) {
    try {
      final h = hex.replaceAll('#', '');
      return Color(int.parse('FF$h', radix: 16));
    } catch (_) {
      return const Color(0xFF16A34A);
    }
  }

  @override
  Widget build(BuildContext context) {
    final filtered = _checklists.where((c) {
      if (_visibilityFilter == 'SHARED' && !c.isShared) return false;
      if (_visibilityFilter == 'PRIVATE' && c.isShared) return false;
      if (_selectedCategory != 'ALL' && c.category != _selectedCategory) return false;
      return true;
    }).toList();

    final sharedCount = _checklists.where((c) => c.isShared).length;
    final privateCount = _checklists.where((c) => !c.isShared).length;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: Text(
          AppI18n.t('checklists_title'),
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 18),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadChecklists,
            tooltip: AppI18n.t('refresh'),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: _showCreateBottomSheet,
        backgroundColor: const Color(0xFF16A34A),
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add_task),
        label: Text(AppI18n.t('new_list'), style: const TextStyle(fontWeight: FontWeight.bold)),
      ),
      body: Column(
        children: [
          // Visibility Segmented Control
          Container(
            color: Colors.white,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
            child: Row(
              children: [
                Expanded(
                  child: _FilterTabButton(
                    label: '${AppI18n.t('filter_all')} (${_checklists.length})',
                    isSelected: _visibilityFilter == 'ALL',
                    onTap: () => setState(() => _visibilityFilter = 'ALL'),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: _FilterTabButton(
                    label: '${AppI18n.t('filter_team')} ($sharedCount)',
                    isSelected: _visibilityFilter == 'SHARED',
                    onTap: () => setState(() => _visibilityFilter = 'SHARED'),
                  ),
                ),
                const SizedBox(width: 6),
                Expanded(
                  child: _FilterTabButton(
                    label: '${AppI18n.t('filter_private')} ($privateCount)',
                    isSelected: _visibilityFilter == 'PRIVATE',
                    onTap: () => setState(() => _visibilityFilter = 'PRIVATE'),
                  ),
                ),
              ],
            ),
          ),

          // Category Chips
          Container(
            color: Colors.white,
            height: 44,
            child: ListView(
              scrollDirection: Axis.horizontal,
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
              children: [
                _CategoryChip(label: 'Alle Kategorien', isSelected: _selectedCategory == 'ALL', onTap: () => setState(() => _selectedCategory = 'ALL')),
                _CategoryChip(label: 'Sicherheit', isSelected: _selectedCategory == 'SICHERHEIT', onTap: () => setState(() => _selectedCategory = 'SICHERHEIT')),
                _CategoryChip(label: 'Routine', isSelected: _selectedCategory == 'ROUTINE', onTap: () => setState(() => _selectedCategory = 'ROUTINE')),
                _CategoryChip(label: 'Ausflug', isSelected: _selectedCategory == 'AUSFLUG', onTap: () => setState(() => _selectedCategory = 'AUSFLUG')),
                _CategoryChip(label: 'Hygiene', isSelected: _selectedCategory == 'HYGIENE', onTap: () => setState(() => _selectedCategory = 'HYGIENE')),
                _CategoryChip(label: 'Pädagogik', isSelected: _selectedCategory == 'PAEDAGOGIK', onTap: () => setState(() => _selectedCategory = 'PAEDAGOGIK')),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // Body
          Expanded(
            child: _loading
                ? const Center(
                    child: CircularProgressIndicator(color: Color(0xFF16A34A)),
                  )
                : filtered.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(Icons.fact_check_outlined, size: 48, color: Colors.grey.shade400),
                            const SizedBox(height: 12),
                            Text(
                              'Keine passenden Checklisten',
                              style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Colors.grey.shade700),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Erstelle eine eigene Liste oder ändere die Filter.',
                              style: TextStyle(fontSize: 12, color: Colors.grey.shade500),
                            ),
                          ],
                        ),
                      )
                    : RefreshIndicator(
                        onRefresh: _loadChecklists,
                        color: const Color(0xFF16A34A),
                        child: ListView.builder(
                          padding: const EdgeInsets.fromLTRB(16, 12, 16, 80),
                          itemCount: filtered.length,
                          itemBuilder: (context, idx) {
                            final c = filtered[idx];
                            _inlineControllers.putIfAbsent(c.id, () => TextEditingController());
                            final barColor = _parseColor(c.color);

                            return Card(
                              elevation: 0,
                              margin: const EdgeInsets.only(bottom: 12),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                                side: const BorderSide(color: Color(0xFFE2E8F0)),
                              ),
                              clipBehavior: Clip.antiAlias,
                              color: Colors.white,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  // Top Colored Stripe
                                  Container(height: 4, color: barColor),

                                  // Card Header
                                  Padding(
                                    padding: const EdgeInsets.fromLTRB(14, 12, 14, 8),
                                    child: Column(
                                      crossAxisAlignment: CrossAxisAlignment.start,
                                      children: [
                                        Row(
                                          children: [
                                            // Category Badge
                                            Container(
                                              padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                                              decoration: BoxDecoration(
                                                color: const Color(0xFFF1F5F9),
                                                borderRadius: BorderRadius.circular(6),
                                              ),
                                              child: Text(
                                                c.category,
                                                style: const TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                              ),
                                            ),
                                            const SizedBox(width: 8),

                                            // Sharing Scope Badge
                                            GestureDetector(
                                              onTap: () => _toggleSharing(c),
                                              child: Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                                decoration: BoxDecoration(
                                                  color: !c.isShared || c.shareScope == 'PRIVATE'
                                                      ? const Color(0xFFF1F5F9)
                                                      : c.shareScope == 'TODAY_GROUP'
                                                      ? const Color(0xFFEFF6FF)
                                                      : c.shareScope == 'GROUP'
                                                      ? const Color(0xFFEEF2FF)
                                                      : c.shareScope == 'PERSONS'
                                                      ? const Color(0xFFFAF5FF)
                                                      : c.shareScope == 'LEITUNG'
                                                      ? const Color(0xFFFFFBEB)
                                                      : const Color(0xFFDCFCE7),
                                                  borderRadius: BorderRadius.circular(6),
                                                  border: Border.all(
                                                    color: !c.isShared || c.shareScope == 'PRIVATE'
                                                        ? const Color(0xFFCBD5E1)
                                                        : c.shareScope == 'TODAY_GROUP'
                                                        ? const Color(0xFF93C5FD)
                                                        : c.shareScope == 'GROUP'
                                                        ? const Color(0xFFA5B4FC)
                                                        : c.shareScope == 'PERSONS'
                                                        ? const Color(0xFFD8B4FE)
                                                        : c.shareScope == 'LEITUNG'
                                                        ? const Color(0xFFFCD34D)
                                                        : const Color(0xFF86EFAC),
                                                  ),
                                                ),
                                                child: Row(
                                                  mainAxisSize: MainAxisSize.min,
                                                  children: [
                                                    Icon(
                                                      !c.isShared || c.shareScope == 'PRIVATE'
                                                          ? Icons.lock_outline
                                                          : c.shareScope == 'TODAY_GROUP'
                                                          ? Icons.schedule
                                                          : c.shareScope == 'GROUP'
                                                          ? Icons.group_work_outlined
                                                          : c.shareScope == 'PERSONS'
                                                          ? Icons.person_outline
                                                          : c.shareScope == 'LEITUNG'
                                                          ? Icons.admin_panel_settings_outlined
                                                          : Icons.people_outline,
                                                      size: 11,
                                                      color: !c.isShared || c.shareScope == 'PRIVATE'
                                                          ? const Color(0xFF64748B)
                                                          : c.shareScope == 'TODAY_GROUP'
                                                          ? const Color(0xFF1D4ED8)
                                                          : c.shareScope == 'GROUP'
                                                          ? const Color(0xFF4338CA)
                                                          : c.shareScope == 'PERSONS'
                                                          ? const Color(0xFF7E22CE)
                                                          : c.shareScope == 'LEITUNG'
                                                          ? const Color(0xFFB45309)
                                                          : const Color(0xFF15803D),
                                                    ),
                                                    const SizedBox(width: 4),
                                                    Text(
                                                      !c.isShared || c.shareScope == 'PRIVATE'
                                                          ? 'Privat'
                                                          : c.shareScope == 'TODAY_GROUP'
                                                          ? 'Heutige Gruppe'
                                                          : c.shareScope == 'GROUP'
                                                          ? (c.sharedGroupName ?? 'Kindergruppe')
                                                          : c.shareScope == 'PERSONS'
                                                          ? (c.sharedStaffNames.isNotEmpty ? c.sharedStaffNames.first : 'Personen')
                                                          : c.shareScope == 'LEITUNG'
                                                          ? 'Leitung'
                                                          : 'Gesamt (Alle)',
                                                      style: TextStyle(
                                                        fontSize: 10,
                                                        fontWeight: FontWeight.bold,
                                                        color: !c.isShared || c.shareScope == 'PRIVATE'
                                                            ? const Color(0xFF64748B)
                                                            : c.shareScope == 'TODAY_GROUP'
                                                            ? const Color(0xFF1D4ED8)
                                                            : c.shareScope == 'GROUP'
                                                            ? const Color(0xFF4338CA)
                                                            : c.shareScope == 'PERSONS'
                                                            ? const Color(0xFF7E22CE)
                                                            : c.shareScope == 'LEITUNG'
                                                            ? const Color(0xFFB45309)
                                                            : const Color(0xFF15803D),
                                                      ),
                                                    ),
                                                  ],
                                                ),
                                              ),
                                            ),

                                            const Spacer(),

                                            // Progress Pill
                                            Text(
                                              '${c.completedItems}/${c.totalItems} (${c.progressPercent}%)',
                                              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B)),
                                            ),

                                            if (c.createdById == widget.currentUser.id || widget.currentUser.role == 'LEITUNG')
                                              IconButton(
                                                padding: EdgeInsets.zero,
                                                constraints: const BoxConstraints(),
                                                icon: const Icon(Icons.delete_outline, size: 18, color: Color(0xFF94A3B8)),
                                                onPressed: () => _deleteChecklist(c),
                                              ),
                                          ],
                                        ),
                                        const SizedBox(height: 6),

                                        // Title
                                        Text(
                                          c.title,
                                          style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                        ),
                                        const SizedBox(height: 2),
                                        Text(
                                          'Erstellt von ${c.createdByName}',
                                          style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                                        ),
                                      ],
                                    ),
                                  ),

                                  // Progress Bar
                                  LinearProgressIndicator(
                                    value: c.totalItems > 0 ? c.completedItems / c.totalItems : 0,
                                    backgroundColor: const Color(0xFFF1F5F9),
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      c.progressPercent == 100 ? const Color(0xFF16A34A) : barColor,
                                    ),
                                    minHeight: 3,
                                  ),

                                  // Checklist Items
                                  ListView.separated(
                                    shrinkWrap: true,
                                    physics: const NeverScrollableScrollPhysics(),
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                    itemCount: c.items.length,
                                    separatorBuilder: (_, _) => const Divider(height: 1, color: Color(0xFFF1F5F9)),
                                    itemBuilder: (ctx, itemIdx) {
                                      final item = c.items[itemIdx];
                                      return InkWell(
                                        onTap: () => _toggleItem(c.id, item.id),
                                        borderRadius: BorderRadius.circular(8),
                                        child: Padding(
                                          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 8),
                                          child: Row(
                                            crossAxisAlignment: CrossAxisAlignment.start,
                                            children: [
                                              Icon(
                                                item.done ? Icons.check_box : Icons.check_box_outline_blank,
                                                size: 20,
                                                color: item.done ? const Color(0xFF16A34A) : const Color(0xFF94A3B8),
                                              ),
                                              const SizedBox(width: 8),
                                              Expanded(
                                                child: Column(
                                                  crossAxisAlignment: CrossAxisAlignment.start,
                                                  children: [
                                                    Text(
                                                      item.text,
                                                      style: TextStyle(
                                                        fontSize: 12,
                                                        color: item.done ? const Color(0xFF94A3B8) : const Color(0xFF1E293B),
                                                        decoration: item.done ? TextDecoration.lineThrough : null,
                                                        fontWeight: item.done ? FontWeight.normal : FontWeight.w500,
                                                      ),
                                                    ),
                                                    if (item.done && item.completedBy != null) ...[
                                                      const SizedBox(height: 2),
                                                      Text(
                                                        '✓ Erledigt von ${item.completedBy}${item.completedAt != null ? ' (${item.completedAt})' : ''}',
                                                        style: const TextStyle(fontSize: 10, color: Color(0xFF16A34A), fontWeight: FontWeight.bold),
                                                      ),
                                                    ],
                                                  ],
                                                ),
                                              ),
                                            ],
                                          ),
                                        ),
                                      );
                                    },
                                  ),

                                  // Inline Add Item Field
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                    decoration: const BoxDecoration(
                                      color: Color(0xFFF8FAFC),
                                      border: Border(top: BorderSide(color: Color(0xFFF1F5F9))),
                                    ),
                                    child: Row(
                                      children: [
                                        Expanded(
                                          child: TextField(
                                            controller: _inlineControllers[c.id],
                                            style: const TextStyle(fontSize: 12),
                                            decoration: const InputDecoration(
                                              hintText: '+ Punkt ergänzen...',
                                              hintStyle: TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                                              border: InputBorder.none,
                                              isDense: true,
                                              contentPadding: EdgeInsets.symmetric(vertical: 4),
                                            ),
                                            onSubmitted: (_) => _addInlineItem(c.id),
                                          ),
                                        ),
                                        IconButton(
                                          padding: EdgeInsets.zero,
                                          constraints: const BoxConstraints(),
                                          icon: const Icon(Icons.arrow_circle_up_rounded, size: 22, color: Color(0xFF16A34A)),
                                          onPressed: () => _addInlineItem(c.id),
                                        ),
                                      ],
                                    ),
                                  ),
                                ],
                              ),
                            );
                          },
                        ),
                      ),
          ),
        ],
      ),
    );
  }
}

class _FilterTabButton extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _FilterTabButton({required this.label, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 7),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF0F172A) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(10),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  final String label;
  final bool isSelected;
  final VoidCallback onTap;

  const _CategoryChip({required this.label, required this.isSelected, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 6),
      child: ChoiceChip(
        label: Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
        selected: isSelected,
        onSelected: (_) => onTap(),
        selectedColor: const Color(0xFFDCFCE7),
        backgroundColor: const Color(0xFFF8FAFC),
        labelStyle: TextStyle(color: isSelected ? const Color(0xFF15803D) : const Color(0xFF64748B)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
        side: BorderSide(color: isSelected ? const Color(0xFF86EFAC) : const Color(0xFFE2E8F0)),
        padding: const EdgeInsets.symmetric(horizontal: 4),
      ),
    );
  }
}

class _CreateChecklistSheet extends StatefulWidget {
  final StaffModel currentUser;
  final VoidCallback onCreated;

  const _CreateChecklistSheet({required this.currentUser, required this.onCreated});

  @override
  State<_CreateChecklistSheet> createState() => _CreateChecklistSheetState();
}

class _CreateChecklistSheetState extends State<_CreateChecklistSheet> {
  final _titleController = TextEditingController();
  String _category = 'ROUTINE';
  bool _isShared = true;
  String _shareScope = 'ALL';
  String _selectedGroup = 'g_u3_maeuse';
  String _selectedGroupName = 'Mäusegruppe (U3)';
  String _selectedStaffId = '';
  String _selectedStaffName = '';
  String _color = '#16a34a';
  final List<TextEditingController> _itemControllers = [TextEditingController()];
  bool _saving = false;
  List<ShareFavoriteModel> _favorites = [];
  List<StaffModel> _staffList = [];
  String? _favoriteNotice;

  @override
  void initState() {
    super.initState();
    _loadFavoritesAndStaff();
  }

  Future<void> _loadFavoritesAndStaff() async {
    final favs = await ApiService.getShareFavorites(widget.currentUser.id);
    final staff = await ApiService.getStaff();
    if (mounted) {
      setState(() {
        _favorites = favs;
        _staffList = staff.where((s) => s.id != widget.currentUser.id).toList();
        if (_staffList.isNotEmpty) {
          _selectedStaffId = _staffList.first.id;
          _selectedStaffName = _staffList.first.name;
        }
      });
    }
  }

  void _applyFavorite(ShareFavoriteModel fav) {
    setState(() {
      if (fav.type == 'GESAMT') {
        _shareScope = 'ALL';
        _isShared = true;
      } else if (fav.type == 'TODAY_GROUP') {
        _shareScope = 'TODAY_GROUP';
        _isShared = true;
      } else if (fav.type == 'LEITUNG') {
        _shareScope = 'LEITUNG';
        _isShared = true;
      } else if (fav.type == 'GROUP') {
        _shareScope = 'GROUP';
        _isShared = true;
        if (fav.targetId != null) {
          _selectedGroup = fav.targetId!;
          _selectedGroupName = fav.targetName ?? fav.label;
        }
      } else if (fav.type == 'PERSON') {
        _shareScope = 'PERSONS';
        _isShared = true;
        if (fav.targetId != null) {
          _selectedStaffId = fav.targetId!;
          _selectedStaffName = fav.targetName ?? fav.label;
        }
      }
    });
  }

  Future<void> _pinFavorite(String type, String label, String? targetId, String? targetName) async {
    final updated = await ApiService.pinShareFavorite(widget.currentUser.id, {
      'type': type,
      'label': label,
      'targetId': targetId,
      'targetName': targetName,
    });
    if (updated != null && mounted) {
      setState(() {
        _favorites = updated;
        _favoriteNotice = '⭐ "$label" als Favorit gespeichert (von unten nach oben ersetzt)!';
      });
      Future.delayed(const Duration(seconds: 4), () {
        if (mounted) setState(() => _favoriteNotice = null);
      });
    }
  }

  void _applyTemplate(String title, String cat, String color, bool shared, List<String> items) {
    setState(() {
      _titleController.text = title;
      _category = cat;
      _color = color;
      _isShared = shared;
      _shareScope = shared ? 'ALL' : 'PRIVATE';
      _itemControllers.clear();
      for (final it in items) {
        _itemControllers.add(TextEditingController(text: it));
      }
    });
  }

  Future<void> _submit() async {
    final title = _titleController.text.trim();
    if (title.isEmpty) return;

    setState(() => _saving = true);
    final items = _itemControllers.map((c) => c.text.trim()).where((t) => t.isNotEmpty).toList();

    _isShared = _shareScope != 'PRIVATE';

    await ApiService.createChecklist(
      title: title,
      category: _category,
      createdById: widget.currentUser.id,
      createdByName: widget.currentUser.name,
      isShared: _isShared,
      shareScope: _shareScope,
      sharedGroupId: _shareScope == 'GROUP' ? _selectedGroup : null,
      sharedGroupName: _shareScope == 'GROUP' ? _selectedGroupName : null,
      sharedStaffIds: _shareScope == 'PERSONS' && _selectedStaffId.isNotEmpty ? [_selectedStaffId] : null,
      sharedStaffNames: _shareScope == 'PERSONS' && _selectedStaffName.isNotEmpty ? [_selectedStaffName] : null,
      color: _color,
      items: items,
    );

    widget.onCreated();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: EdgeInsets.fromLTRB(16, 16, 16, MediaQuery.of(context).viewInsets.bottom + 16),
      decoration: const BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'Neue Checkliste anlegen',
                  style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                ),
                IconButton(
                  icon: const Icon(Icons.close),
                  onPressed: () => Navigator.pop(context),
                ),
              ],
            ),
            const SizedBox(height: 8),

            // Kita Vorlagen
            const Text('⚡ Vorlage wählen:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: [
                ActionChip(
                  label: const Text('Schließdienst', style: TextStyle(fontSize: 11)),
                  onPressed: () => _applyTemplate(
                    'Schließdienst & Sicherheitsrundgang',
                    'SICHERHEIT',
                    '#ef4444',
                    true,
                    ['Fenster schließen', 'Terrassentüren verriegeln', 'Gartentor abschließen', 'Alarmanlage scharfstellen'],
                  ),
                ),
                ActionChip(
                  label: const Text('Morgenroutine', style: TextStyle(fontSize: 11)),
                  onPressed: () => _applyTemplate(
                    'Morgenroutine & Ankommen',
                    'ROUTINE',
                    '#3b82f6',
                    true,
                    ['Lüften', 'Teewasser kochen', 'Begrüßungszone vorbereiten', 'Notfallhandy einschalten'],
                  ),
                ),
                ActionChip(
                  label: const Text('Waldtag', style: TextStyle(fontSize: 11)),
                  onPressed: () => _applyTemplate(
                    'Waldtag-Exkursion',
                    'AUSFLUG',
                    '#10b981',
                    true,
                    ['Notfallkontakte prüfen', 'Erste-Hilfe-Rucksack einpacken', 'Trinkflaschen auffüllen', 'Warnwesten anlegen'],
                  ),
                ),
                ActionChip(
                  label: const Text('Persönliches Portfolio', style: TextStyle(fontSize: 11)),
                  onPressed: () => _applyTemplate(
                    'Meine Portfolio-Dokumentation',
                    'PAEDAGOGIK',
                    '#f59e0b',
                    false,
                    ['Beobachtungsbögen ausfüllen', 'Fotos ausdrucken', 'Entwicklungsnotizen eintragen'],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),

            // Title Field
            TextField(
              controller: _titleController,
              decoration: InputDecoration(
                labelText: 'Titel der Checkliste *',
                labelStyle: const TextStyle(fontSize: 12),
                filled: true,
                fillColor: const Color(0xFFF8FAFC),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12), borderSide: const BorderSide(color: Color(0xFFCBD5E1))),
                contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              ),
            ),
            const SizedBox(height: 10),

            // Top 3 Favorites Bar
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: const Color(0xFFF8FAFC),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: const [
                      Icon(Icons.star, size: 14, color: Color(0xFFF59E0B)),
                      SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          '3 Favoriten oben (Schnellauswahl):',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                      Text(
                        'Ersetzt 3→2→1 (unten→oben)',
                        style: TextStyle(fontSize: 9, color: Color(0xFF94A3B8)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),

                  Row(
                    children: _favorites.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final fav = entry.value;
                      final isSelected = 
                          (fav.type == 'GESAMT' && _shareScope == 'ALL') ||
                          (fav.type == 'TODAY_GROUP' && _shareScope == 'TODAY_GROUP') ||
                          (fav.type == 'LEITUNG' && _shareScope == 'LEITUNG') ||
                          (fav.type == 'GROUP' && _shareScope == 'GROUP' && _selectedGroup == fav.targetId) ||
                          (fav.type == 'PERSON' && _shareScope == 'PERSONS' && _selectedStaffId == fav.targetId);

                      return Expanded(
                        child: Padding(
                          padding: EdgeInsets.only(right: idx < 2 ? 6 : 0),
                          child: InkWell(
                            onTap: () => _applyFavorite(fav),
                            borderRadius: BorderRadius.circular(10),
                            child: Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
                              decoration: BoxDecoration(
                                color: isSelected ? const Color(0xFF16A34A) : Colors.white,
                                borderRadius: BorderRadius.circular(10),
                                border: Border.all(
                                  color: isSelected ? const Color(0xFF16A34A) : const Color(0xFFCBD5E1),
                                ),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                    children: [
                                      Text(
                                        'Slot ${idx + 1} ${idx == 2 ? '(unten)' : idx == 1 ? '(Mitte)' : '(oben)'}',
                                        style: TextStyle(
                                          fontSize: 8,
                                          fontWeight: FontWeight.bold,
                                          color: isSelected ? Colors.white70 : const Color(0xFF94A3B8),
                                        ),
                                      ),
                                      Icon(
                                        Icons.star,
                                        size: 10,
                                        color: isSelected ? Colors.amberAccent : const Color(0xFFF59E0B),
                                      ),
                                    ],
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    fav.label,
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: isSelected ? Colors.white : const Color(0xFF0F172A),
                                    ),
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],
                              ),
                            ),
                          ),
                        ),
                      );
                    }).toList(),
                  ),

                  if (_favoriteNotice != null) ...[
                    const SizedBox(height: 6),
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFEF3C7),
                        borderRadius: BorderRadius.circular(6),
                      ),
                      child: Text(
                        _favoriteNotice!,
                        style: const TextStyle(fontSize: 10, color: Color(0xFF92400E), fontWeight: FontWeight.bold),
                      ),
                    ),
                  ],

                  const SizedBox(height: 10),
                  const Divider(height: 1, color: Color(0xFFE2E8F0)),
                  const SizedBox(height: 10),

                  // Granular Target Selector
                  const Text(
                    'Mit wem teilen? (Gruppe / Kindergruppe / Personen / Leitung):',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF334155)),
                  ),
                  const SizedBox(height: 6),

                  Wrap(
                    spacing: 6,
                    runSpacing: 6,
                    children: [
                      ChoiceChip(
                        label: const Text('👥 Gesamt (Alle)', style: TextStyle(fontSize: 10)),
                        selected: _shareScope == 'ALL',
                        onSelected: (sel) => setState(() => _shareScope = 'ALL'),
                      ),
                      ChoiceChip(
                        label: const Text('🏫 Heutige Gruppe', style: TextStyle(fontSize: 10)),
                        selected: _shareScope == 'TODAY_GROUP',
                        onSelected: (sel) => setState(() => _shareScope = 'TODAY_GROUP'),
                      ),
                      ChoiceChip(
                        label: const Text('🏛️ Kindergruppe', style: TextStyle(fontSize: 10)),
                        selected: _shareScope == 'GROUP',
                        onSelected: (sel) => setState(() => _shareScope = 'GROUP'),
                      ),
                      ChoiceChip(
                        label: const Text('👤 Personen', style: TextStyle(fontSize: 10)),
                        selected: _shareScope == 'PERSONS',
                        onSelected: (sel) => setState(() => _shareScope = 'PERSONS'),
                      ),
                      ChoiceChip(
                        label: const Text('🛡️ Leitung', style: TextStyle(fontSize: 10)),
                        selected: _shareScope == 'LEITUNG',
                        onSelected: (sel) => setState(() => _shareScope = 'LEITUNG'),
                      ),
                      ChoiceChip(
                        label: const Text('🔒 Privat', style: TextStyle(fontSize: 10)),
                        selected: _shareScope == 'PRIVATE',
                        onSelected: (sel) => setState(() => _shareScope = 'PRIVATE'),
                      ),
                    ],
                  ),

                  if (_shareScope == 'TODAY_GROUP') ...[
                    const SizedBox(height: 8),
                    Container(
                      padding: const EdgeInsets.all(8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEFF6FF),
                        borderRadius: BorderRadius.circular(8),
                        border: Border.all(color: const Color(0xFFBFDBFE)),
                      ),
                      child: const Text(
                        'ℹ️ Bleibt bei der Gruppe immer – wird allen angezeigt, wenn die in der Gruppe heute Schicht haben. Dem Ersteller aber immer!',
                        style: TextStyle(fontSize: 10, color: Color(0xFF1E40AF)),
                      ),
                    ),
                  ],

                  if (_shareScope == 'GROUP') ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            isExpanded: true,
                            initialValue: _selectedGroup,
                            decoration: InputDecoration(
                              labelText: 'Kindergruppe wählen',
                              labelStyle: const TextStyle(fontSize: 10),
                              filled: true,
                              fillColor: Colors.white,
                              isDense: true,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            items: const [
                              DropdownMenuItem(value: 'g_u3_maeuse', child: Text('Mäusegruppe (U3)', style: TextStyle(fontSize: 11), overflow: TextOverflow.ellipsis, maxLines: 1)),
                              DropdownMenuItem(value: 'g_ue3_sonne', child: Text('Sonnengruppe (Ü3)', style: TextStyle(fontSize: 11), overflow: TextOverflow.ellipsis, maxLines: 1)),
                              DropdownMenuItem(value: 'g_ue3_wald', child: Text('Regenbogengruppe (Hort)', style: TextStyle(fontSize: 11), overflow: TextOverflow.ellipsis, maxLines: 1)),
                            ],
                            onChanged: (val) {
                              if (val != null) {
                                setState(() {
                                  _selectedGroup = val;
                                  _selectedGroupName = val == 'g_u3_maeuse' ? 'Mäusegruppe (U3)' : val == 'g_ue3_sonne' ? 'Sonnengruppe (Ü3)' : 'Regenbogengruppe (Hort)';
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFEF3C7),
                            foregroundColor: const Color(0xFFB45309),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            elevation: 0,
                          ),
                          onPressed: () => _pinFavorite('GROUP', _selectedGroupName, _selectedGroup, _selectedGroupName),
                          icon: const Icon(Icons.star, size: 12),
                          label: const Text('Zu Favoriten', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],

                  if (_shareScope == 'PERSONS') ...[
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Expanded(
                          child: DropdownButtonFormField<String>(
                            isExpanded: true,
                            initialValue: _selectedStaffId.isNotEmpty ? _selectedStaffId : (_staffList.isNotEmpty ? _staffList.first.id : null),
                            decoration: InputDecoration(
                              labelText: 'Kollege auswählen',
                              labelStyle: const TextStyle(fontSize: 10),
                              filled: true,
                              fillColor: Colors.white,
                              isDense: true,
                              border: OutlineInputBorder(borderRadius: BorderRadius.circular(8)),
                            ),
                            items: _staffList.map((s) => DropdownMenuItem(
                              value: s.id,
                              child: Text('${s.name} (${s.role})', style: const TextStyle(fontSize: 11), overflow: TextOverflow.ellipsis, maxLines: 1),
                            )).toList(),
                            onChanged: (val) {
                              if (val != null) {
                                final s = _staffList.firstWhere((st) => st.id == val);
                                setState(() {
                                  _selectedStaffId = s.id;
                                  _selectedStaffName = s.name;
                                });
                              }
                            },
                          ),
                        ),
                        const SizedBox(width: 8),
                        ElevatedButton.icon(
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFFEF3C7),
                            foregroundColor: const Color(0xFFB45309),
                            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                            elevation: 0,
                          ),
                          onPressed: () => _pinFavorite('PERSON', _selectedStaffName, _selectedStaffId, _selectedStaffName),
                          icon: const Icon(Icons.star, size: 12),
                          label: const Text('Zu Favoriten', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                  ],
                ],
              ),
            ),
            const SizedBox(height: 12),

            // Items List
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text('Aufgabenpunkte:', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                TextButton.icon(
                  onPressed: () => setState(() => _itemControllers.add(TextEditingController())),
                  icon: const Icon(Icons.add, size: 14),
                  label: const Text('Punkt hinzufügen', style: TextStyle(fontSize: 11)),
                ),
              ],
            ),
            ..._itemControllers.asMap().entries.map((entry) {
              final idx = entry.key;
              final ctrl = entry.value;
              return Padding(
                padding: const EdgeInsets.only(bottom: 6),
                child: Row(
                  children: [
                    Text('${idx + 1}. ', style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8), fontWeight: FontWeight.bold)),
                    Expanded(
                      child: TextField(
                        controller: ctrl,
                        style: const TextStyle(fontSize: 12),
                        decoration: InputDecoration(
                          hintText: 'Aufgabe beschreiben...',
                          hintStyle: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                          filled: true,
                          fillColor: const Color(0xFFF8FAFC),
                          isDense: true,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(8), borderSide: const BorderSide(color: Color(0xFFE2E8F0))),
                        ),
                      ),
                    ),
                    if (_itemControllers.length > 1)
                      IconButton(
                        icon: const Icon(Icons.remove_circle_outline, size: 18, color: Colors.red),
                        onPressed: () => setState(() => _itemControllers.removeAt(idx)),
                      ),
                  ],
                ),
              );
            }),
            const SizedBox(height: 14),

            // Submit Button
            SizedBox(
              width: double.infinity,
              height: 44,
              child: ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF16A34A),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _saving ? null : _submit,
                child: _saving
                    ? const CircularProgressIndicator(color: Colors.white)
                    : const Text('Checkliste speichern', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white)),
              ),
            ),
          ],
        ),
      ),
    );
  }
}
