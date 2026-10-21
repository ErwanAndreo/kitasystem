import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class RosterScreen extends StatefulWidget {
  final StaffModel currentUser;

  const RosterScreen({super.key, required this.currentUser});

  @override
  State<RosterScreen> createState() => _RosterScreenState();
}

class _RosterScreenState extends State<RosterScreen> {
  List<ShiftModel> _shifts = [];
  List<ClosureModel> _closures = [];
  bool _loading = true;
  bool _onlyMine = true;

  @override
  void initState() {
    super.initState();
    _loadShifts();
  }

  Future<void> _loadShifts() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      ApiService.getShifts(staffId: _onlyMine ? widget.currentUser.id : null),
      ApiService.getClosures(),
    ]);
    if (mounted) {
      setState(() {
        _shifts = results[0] as List<ShiftModel>;
        _closures = results[1] as List<ClosureModel>;
        _loading = false;
      });
    }
  }

  void _openShiftWishDialog() {
    final noteController = TextEditingController();
    String wishType = 'WUNSCH_FRUEH';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
      ),
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setSheetState) => Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  const Text(
                    'Schichtwunsch einreichen',
                    style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 6),
              const Text(
                'Wird direkt der Leitung bei der Dienstplanerstellung als Indikator angezeigt.',
                style: TextStyle(fontSize: 12, color: Color(0xFF64748B)),
              ),
              const SizedBox(height: 14),

              DropdownButtonFormField<String>(
                initialValue: wishType,
                items: const [
                  DropdownMenuItem(value: 'WUNSCH_FRUEH', child: Text('🌅 Frühdienst bevorzugt')),
                  DropdownMenuItem(value: 'WUNSCH_SPAET', child: Text('🌆 Spätdienst bevorzugt')),
                  DropdownMenuItem(value: 'WUNSCH_FREI', child: Text('🚫 Wunschfrei (Termin/Ruhetag)')),
                ],
                onChanged: (val) => setSheetState(() => wishType = val ?? 'WUNSCH_FRUEH'),
                decoration: InputDecoration(
                  labelText: 'Art des Wunsches',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: noteController,
                maxLines: 2,
                decoration: InputDecoration(
                  labelText: 'Notiz / Begründung (optional)',
                  hintText: 'z.B. Dienstags Facharzttermin...',
                  hintStyle: const TextStyle(fontSize: 12, color: Color(0xFF94A3B8)),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    Navigator.pop(ctx);
                    await ApiService.requestWish(
                      staffId: widget.currentUser.id,
                      date: DateTime.now().add(const Duration(days: 2)).toIso8601String().split('T')[0],
                      type: wishType,
                      note: noteController.text,
                    );
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Schichtwunsch an Einrichtungsleitung übermittelt!'),
                        backgroundColor: Color(0xFF16A34A),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16A34A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  ),
                  child: const Text('Wunsch verbindlich senden', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Dienstplan', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0,
        actions: [
          IconButton(
            icon: const Icon(Icons.edit_calendar_outlined, color: Color(0xFF16A34A)),
            tooltip: 'Schichtwunsch einreichen',
            onPressed: _openShiftWishDialog,
          ),
        ],
        bottom: PreferredSize(
          preferredSize: const Size.fromHeight(48),
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
            child: Row(
              children: [
                ChoiceChip(
                  label: const Text('Meine Schichten'),
                  selected: _onlyMine,
                  onSelected: (val) {
                    setState(() => _onlyMine = true);
                    _loadShifts();
                  },
                  selectedColor: const Color(0xFFDCFCE7),
                  labelStyle: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: _onlyMine ? const Color(0xFF15803D) : const Color(0xFF64748B),
                  ),
                ),
                const SizedBox(width: 8),
                ChoiceChip(
                  label: const Text('Gesamtes Team'),
                  selected: !_onlyMine,
                  onSelected: (val) {
                    setState(() => _onlyMine = false);
                    _loadShifts();
                  },
                  selectedColor: const Color(0xFFDCFCE7),
                  labelStyle: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 12,
                    color: !_onlyMine ? const Color(0xFF15803D) : const Color(0xFF64748B),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadShifts,
              child: _shifts.isEmpty
                  ? const Center(child: Text('Keine Schichten gefunden.'))
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: _shifts.length + (_closures.isNotEmpty ? 1 : 0),
                      itemBuilder: (ctx, idx) {
                        if (_closures.isNotEmpty && idx == 0) {
                          final c = _closures.first;
                          final isKonz = c.type == 'KONZEPTIONSTAG';
                          return Container(
                            margin: const EdgeInsets.only(bottom: 12),
                            padding: const EdgeInsets.all(12),
                            decoration: BoxDecoration(
                              color: isKonz ? const Color(0xFFFAF5FF) : const Color(0xFFFFF1F2),
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(
                                color: isKonz ? const Color(0xFFE9D5FF) : const Color(0xFFFECDD3),
                              ),
                            ),
                            child: Row(
                              children: [
                                Icon(
                                  isKonz ? Icons.school_outlined : Icons.door_front_door_outlined,
                                  color: isKonz ? const Color(0xFF7E22CE) : const Color(0xFFE11D48),
                                  size: 22,
                                ),
                                const SizedBox(width: 10),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        '${c.title} (${c.date})',
                                        style: TextStyle(
                                          fontWeight: FontWeight.bold,
                                          fontSize: 12,
                                          color: isKonz ? const Color(0xFF581C87) : const Color(0xFF9F1239),
                                        ),
                                      ),
                                      if (c.notes != null)
                                        Text(
                                          c.notes!,
                                          style: TextStyle(
                                            fontSize: 11,
                                            color: isKonz ? const Color(0xFF7E22CE) : const Color(0xFFBE123C),
                                          ),
                                        ),
                                    ],
                                  ),
                                ),
                              ],
                            ),
                          );
                        }

                        final sh = _shifts[_closures.isNotEmpty ? idx - 1 : idx];
                        final isCancelled = sh.status == 'CANCELLED';

                        return Container(
                          margin: const EdgeInsets.only(bottom: 12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(16),
                            border: Border.all(
                              color: isCancelled ? const Color(0xFFFECDD3) : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.all(14),
                            child: Row(
                              children: [
                                Container(
                                  width: 48,
                                  height: 48,
                                  decoration: BoxDecoration(
                                    color: isCancelled ? const Color(0xFFFFF1F2) : const Color(0xFFEFF6FF),
                                    borderRadius: BorderRadius.circular(12),
                                  ),
                                  child: Center(
                                    child: Icon(
                                      isCancelled ? Icons.sick_outlined : Icons.calendar_today_rounded,
                                      color: isCancelled ? const Color(0xFFE11D48) : const Color(0xFF2563EB),
                                      size: 20,
                                    ),
                                  ),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Row(
                                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                        children: [
                                          Text(
                                            sh.date,
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                          ),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: const Color(0xFFF1F5F9),
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Text(
                                              sh.groupName.split(' ')[0],
                                              style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF475569)),
                                            ),
                                          ),
                                        ],
                                      ),
                                      const SizedBox(height: 4),
                                      Text(
                                        '${sh.startTime} – ${sh.endTime} Uhr  (Pause: ${sh.breakMinutes}m)',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.w600,
                                          color: isCancelled ? const Color(0xFFE11D48) : const Color(0xFF16A34A),
                                          decoration: isCancelled ? TextDecoration.lineThrough : null,
                                        ),
                                      ),
                                      if (!_onlyMine) ...[
                                        const SizedBox(height: 2),
                                        Text(
                                          '${sh.staffName} (${sh.isFachkraft ? 'Fachkraft' : 'Ergänzung'})',
                                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                        ),
                                      ],
                                      if (isCancelled) ...[
                                        const SizedBox(height: 2),
                                        const Text('Krankheitsausfall (storniert)', style: TextStyle(fontSize: 11, color: Color(0xFFBE123C), fontWeight: FontWeight.bold)),
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
            ),
    );
  }
}
