import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class RequestsScreen extends StatefulWidget {
  final StaffModel currentUser;

  const RequestsScreen({super.key, required this.currentUser});

  @override
  State<RequestsScreen> createState() => _RequestsScreenState();
}

class _RequestsScreenState extends State<RequestsScreen> {
  List<ApprovalModel> _approvals = [];
  List<StaffModel> _allStaff = [];
  List<ShiftModel> _userShifts = [];
  List<StaffWishModel> _userWishes = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadData();
  }

  Future<void> _loadData() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      ApiService.getApprovals(),
      ApiService.getStaff(),
      ApiService.getShifts(staffId: widget.currentUser.id),
      ApiService.getStaffWishes(staffId: widget.currentUser.id),
    ]);

    if (mounted) {
      setState(() {
        _approvals = results[0] as List<ApprovalModel>;
        _allStaff = results[1] as List<StaffModel>;
        _userShifts = results[2] as List<ShiftModel>;
        _userWishes = results[3] as List<StaffWishModel>;
        _loading = false;
      });
    }
  }

  void _openWishDialog() {
    DateTime selectedDate = DateTime.now().add(const Duration(days: 2));
    String selectedType = 'WUNSCH_FRUEH';
    final noteController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
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
              const Text('Schichtwunsch einreichen', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('Wunschdienste werden der Einrichtungsleitung direkt im Dienstplaner angezeigt.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 16),

              const Text('Datum des Wunschdienstes', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              OutlinedButton.icon(
                icon: const Icon(Icons.calendar_today, size: 16),
                label: Text(DateFormat('dd.MM.yyyy').format(selectedDate)),
                onPressed: () async {
                  final picked = await showDatePicker(
                    context: ctx,
                    initialDate: selectedDate,
                    firstDate: DateTime.now(),
                    lastDate: DateTime.now().add(const Duration(days: 90)),
                  );
                  if (picked != null) {
                    setSheetState(() => selectedDate = picked);
                  }
                },
                style: OutlinedButton.styleFrom(
                  minimumSize: const Size(double.infinity, 44),
                  alignment: Alignment.centerLeft,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),

              const Text('Art des Wunsches', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: selectedType,
                items: const [
                  DropdownMenuItem(value: 'WUNSCH_FRUEH', child: Text('🌅 Frühdienst (7:30 - 15:30)')),
                  DropdownMenuItem(value: 'WUNSCH_SPAET', child: Text('🌆 Spätdienst (8:30 - 17:30)')),
                  DropdownMenuItem(value: 'WUNSCH_FREI', child: Text('🚫 Wunschfrei (Ruhetag / Termin)')),
                ],
                onChanged: (val) => setSheetState(() => selectedType = val ?? 'WUNSCH_FRUEH'),
                decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: noteController,
                decoration: InputDecoration(
                  labelText: 'Begründung / Notiz (optional)',
                  hintText: 'z.B. Wichtiger Facharzttermin...',
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
                      date: DateFormat('yyyy-MM-dd').format(selectedDate),
                      type: selectedType,
                      note: noteController.text,
                    );
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Schichtwunsch hinterlegt! Leitung sieht diesen bei der Planung.'),
                        backgroundColor: Color(0xFF4F46E5),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                    _loadData();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF4F46E5),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Wunschdienst einreichen', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openSwapDialog() {
    String? selectedShiftId = _userShifts.isNotEmpty ? _userShifts.first.id : null;
    String? selectedTargetId = _allStaff.where((s) => s.id != widget.currentUser.id).isNotEmpty
        ? _allStaff.where((s) => s.id != widget.currentUser.id).first.id
        : null;
    final noteController = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
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
              const Text('Schichttausch anfragen', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('Frage eine Kollegin/einen Kollegen an. Nach deren Zusage geht es zur Freigabe an die Leitung.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 16),

              const Text('Welche Schicht möchtest du tauschen?', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: selectedShiftId,
                items: _userShifts.map((s) => DropdownMenuItem(
                  value: s.id,
                  child: Text('${s.date} (${s.startTime} - ${s.endTime} Uhr)', style: const TextStyle(fontSize: 12)),
                )).toList(),
                onChanged: (val) => setSheetState(() => selectedShiftId = val),
                decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
              ),
              const SizedBox(height: 12),

              const Text('Wen möchtest du um Übernahme bitten?', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                initialValue: selectedTargetId,
                items: _allStaff.where((s) => s.id != widget.currentUser.id).map((s) => DropdownMenuItem(
                  value: s.id,
                  child: Text('${s.name} (${s.qualification})', style: const TextStyle(fontSize: 12)),
                )).toList(),
                onChanged: (val) => setSheetState(() => selectedTargetId = val),
                decoration: InputDecoration(border: OutlineInputBorder(borderRadius: BorderRadius.circular(12))),
              ),
              const SizedBox(height: 12),

              TextField(
                controller: noteController,
                decoration: InputDecoration(
                  labelText: 'Grund / Notiz (optional)',
                  hintText: 'z.B. Wichtiger Termin...',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    if (selectedShiftId != null && selectedTargetId != null) {
                      final messenger = ScaffoldMessenger.of(context);
                      Navigator.pop(ctx);
                      await ApiService.requestSwap(
                        requesterId: widget.currentUser.id,
                        targetId: selectedTargetId!,
                        shiftId: selectedShiftId!,
                        note: noteController.text,
                      );
                      messenger.showSnackBar(
                        const SnackBar(
                          content: Text('Tauschanfrage eingereicht! Wartet auf Freigabe der Leitung.'),
                          backgroundColor: Color(0xFF16A34A),
                          behavior: SnackBarBehavior.floating,
                        ),
                      );
                      _loadData();
                    }
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Tausch anfragen', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openVacationDialog() {
    DateTime start = DateTime.now().add(const Duration(days: 7));
    DateTime end = DateTime.now().add(const Duration(days: 7));
    String reason = 'Erholungsurlaub';

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(borderRadius: BorderRadius.vertical(top: Radius.circular(24))),
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
              const Text('Urlaub / Abwesenheit einreichen', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
              const SizedBox(height: 6),
              const Text('Geht direkt zur verbindlichen Genehmigung an die Einrichtungsleitung.',
                  style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
              const SizedBox(height: 16),

              DropdownButtonFormField<String>(
                initialValue: reason,
                items: const [
                  DropdownMenuItem(value: 'Erholungsurlaub', child: Text('Erholungsurlaub')),
                  DropdownMenuItem(value: 'Brückentag', child: Text('Brückentag')),
                  DropdownMenuItem(value: 'Sonderurlaub', child: Text('Sonderurlaub')),
                  DropdownMenuItem(value: 'Fortbildungstag', child: Text('Fortbildungstag')),
                ],
                onChanged: (val) => setSheetState(() => reason = val ?? 'Erholungsurlaub'),
                decoration: InputDecoration(
                  labelText: 'Art des Urlaubs',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: start,
                          firstDate: DateTime.now(),
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) {
                          setSheetState(() {
                            start = picked;
                            if (end.isBefore(start)) end = start;
                          });
                        }
                      },
                      child: Text('Von: ${DateFormat('dd.MM.yy').format(start)}'),
                    ),
                  ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: OutlinedButton(
                      onPressed: () async {
                        final picked = await showDatePicker(
                          context: ctx,
                          initialDate: end,
                          firstDate: start,
                          lastDate: DateTime.now().add(const Duration(days: 365)),
                        );
                        if (picked != null) setSheetState(() => end = picked);
                      },
                      child: Text('Bis: ${DateFormat('dd.MM.yy').format(end)}'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),

              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: () async {
                    final messenger = ScaffoldMessenger.of(context);
                    Navigator.pop(ctx);
                    await ApiService.requestVacation(
                      requesterId: widget.currentUser.id,
                      startDate: DateFormat('yyyy-MM-dd').format(start),
                      endDate: DateFormat('yyyy-MM-dd').format(end),
                      reason: reason,
                    );
                    messenger.showSnackBar(
                      const SnackBar(
                        content: Text('Urlaubsantrag eingereicht! Wartet auf Freigabe der Leitung.'),
                        backgroundColor: Color(0xFF16A34A),
                        behavior: SnackBarBehavior.floating,
                      ),
                    );
                    _loadData();
                  },
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF16A34A),
                    foregroundColor: Colors.white,
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  child: const Text('Urlaub verbindlich beantragen', style: TextStyle(fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _openSickNoticeDialog() {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Row(
          children: [
            Icon(Icons.shield_outlined, color: Color(0xFFE11D48)),
            SizedBox(width: 8),
            Text('Krankmeldung morgens', style: TextStyle(fontSize: 16)),
          ],
        ),
        content: const Text(
          'Möchtest du dich für heute krankmelden? Die Einrichtungsleitung wird sofort alarmiert und die Vertretungsplanung aktiviert.',
          style: TextStyle(fontSize: 13),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Abbrechen')),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Krankmeldung übermittelt. Gute Besserung!'),
                  backgroundColor: Color(0xFFE11D48),
                  behavior: SnackBarBehavior.floating,
                ),
              );
            },
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFE11D48), foregroundColor: Colors.white),
            child: const Text('Jetzt krankmelden'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Tausch & Anträge', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadData,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: _buildActionTile(
                          icon: Icons.swap_horiz,
                          label: 'Schicht\ntauschen',
                          color: const Color(0xFF2563EB),
                          bg: const Color(0xFFEFF6FF),
                          onTap: _openSwapDialog,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildActionTile(
                          icon: Icons.event_available,
                          label: 'Wunschdienst\nhinterlegen',
                          color: const Color(0xFF4F46E5),
                          bg: const Color(0xFFEEF2FF),
                          onTap: _openWishDialog,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _buildActionTile(
                          icon: Icons.beach_access,
                          label: 'Urlaub\nbeantragen',
                          color: const Color(0xFF059669),
                          bg: const Color(0xFFECFDF5),
                          onTap: _openVacationDialog,
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _buildActionTile(
                          icon: Icons.sick,
                          label: 'Krank-\nmeldung',
                          color: const Color(0xFFE11D48),
                          bg: const Color(0xFFFFF1F2),
                          onTap: _openSickNoticeDialog,
                        ),
                      ),
                    ],
                  ),
                  if (_userWishes.isNotEmpty) ...[
                    const SizedBox(height: 20),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text(
                          'Meine Schichtwünsche',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                        ),
                        Text(
                          '${_userWishes.length} aktiv',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    ..._userWishes.map((w) {
                      final isFrueh = w.type == 'WUNSCH_FRUEH';
                      final isSpaet = w.type == 'WUNSCH_SPAET';
                      final typeLabel = isFrueh
                          ? '🌅 Frühdienst'
                          : isSpaet
                              ? '🌆 Spätdienst'
                              : '🚫 Wunschfrei';
                      final chipBg = isFrueh
                          ? const Color(0xFFFEF3C7)
                          : isSpaet
                              ? const Color(0xFFE0E7FF)
                              : const Color(0xFFFEE2E2);
                      final chipColor = isFrueh
                          ? const Color(0xFFB45309)
                          : isSpaet
                              ? const Color(0xFF4338CA)
                              : const Color(0xFFB91C1C);

                      DateTime? parsedDate = DateTime.tryParse(w.date);

                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                              decoration: BoxDecoration(color: chipBg, borderRadius: BorderRadius.circular(8)),
                              child: Text(typeLabel, style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: chipColor)),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    parsedDate != null ? DateFormat('dd.MM.yyyy').format(parsedDate) : w.date,
                                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                  ),
                                  if (w.note != null && w.note!.isNotEmpty)
                                    Text(w.note!, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)), maxLines: 1, overflow: TextOverflow.ellipsis),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.delete_outline, size: 18, color: Color(0xFF94A3B8)),
                              onPressed: () async {
                                final messenger = ScaffoldMessenger.of(context);
                                await ApiService.deleteWish(w.id);
                                messenger.showSnackBar(
                                  const SnackBar(
                                    content: Text('Schichtwunsch entfernt.'),
                                    duration: Duration(seconds: 2),
                                    behavior: SnackBarBehavior.floating,
                                  ),
                                );
                                _loadData();
                              },
                            ),
                          ],
                        ),
                      );
                    }),
                  ],
                  const SizedBox(height: 20),

                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'Status meiner Anträge',
                        style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        '${_approvals.length} Vorgänge',
                        style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (_approvals.isEmpty)
                    const Center(
                      child: Padding(
                        padding: EdgeInsets.all(32),
                        child: Text('Keine offenen Anträge.'),
                      ),
                    )
                  else
                    ..._approvals.map((appr) {
                      final isPending = appr.status == 'PENDING';
                      final isApproved = appr.status == 'APPROVED';

                      return Container(
                        margin: const EdgeInsets.only(bottom: 12),
                        padding: const EdgeInsets.all(14),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(16),
                          border: Border.all(
                            color: isPending
                                ? const Color(0xFFFDE68A)
                                : isApproved
                                    ? const Color(0xFFA7F3D0)
                                    : const Color(0xFFFECDD3),
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    appr.details['title'] ?? 'Antrag',
                                    style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                  decoration: BoxDecoration(
                                    color: isPending
                                        ? const Color(0xFFFEF3C7)
                                        : isApproved
                                            ? const Color(0xFFECFDF5)
                                            : const Color(0xFFFFF1F2),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Text(
                                    isPending ? '⏳ Wartet auf Leitung' : isApproved ? '✓ Freigegeben' : '✗ Abgelehnt',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: isPending
                                          ? const Color(0xFFB45309)
                                          : isApproved
                                              ? const Color(0xFF047857)
                                              : const Color(0xFFBE123C),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 6),
                            Text(
                              appr.details['description'] ?? '',
                              style: const TextStyle(fontSize: 12, color: Color(0xFF475569)),
                            ),
                            if (appr.decisionNote != null && appr.decisionNote!.isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Container(
                                padding: const EdgeInsets.all(8),
                                decoration: BoxDecoration(
                                  color: const Color(0xFFF8FAFC),
                                  borderRadius: BorderRadius.circular(8),
                                ),
                                child: Text(
                                  'Notiz der Leitung: "${appr.decisionNote}"',
                                  style: const TextStyle(fontSize: 11, fontStyle: FontStyle.italic, color: Color(0xFF334155)),
                                ),
                              ),
                            ],
                          ],
                        ),
                      );
                    }),
                ],
              ),
            ),
    );
  }

  Widget _buildActionTile({
    required IconData icon,
    required String label,
    required Color color,
    required Color bg,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(16),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 8),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(16),
          border: Border.all(color: const Color(0xFFE2E8F0)),
        ),
        child: Column(
          children: [
            Container(
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(color: bg, shape: BoxShape.circle),
              child: Icon(icon, color: color, size: 22),
            ),
            const SizedBox(height: 8),
            Text(
              label,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
            ),
          ],
        ),
      ),
    );
  }
}
