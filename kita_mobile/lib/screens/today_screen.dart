import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/i18n_service.dart';

class TodayScreen extends StatefulWidget {
  final StaffModel currentUser;
  final VoidCallback onRefresh;

  const TodayScreen({
    super.key,
    required this.currentUser,
    required this.onRefresh,
  });

  @override
  State<TodayScreen> createState() => _TodayScreenState();
}

class _TodayScreenState extends State<TodayScreen> {
  List<GroupNoteModel> _groupNotes = [];
  bool _loadingNotes = true;
  Map<String, dynamic>? _pendingEmergencyRequest;

  @override
  void initState() {
    super.initState();
    _loadGroupNotes();
    _checkPendingEmergencyRequest();
  }

  Future<void> _checkPendingEmergencyRequest() async {
    final req = await ApiService.getPendingEmergencyRequest(widget.currentUser.id);
    if (mounted) {
      setState(() {
        _pendingEmergencyRequest = req;
      });
    }
  }

  Future<void> _respondToEmergency(String decision) async {
    if (_pendingEmergencyRequest == null) return;
    final cycleId = _pendingEmergencyRequest!['cycle_id'];
    final messenger = ScaffoldMessenger.of(context);
    await ApiService.respondToEmergencyCycle(cycleId, widget.currentUser.id, decision);
    if (!mounted) return;
    setState(() {
      _pendingEmergencyRequest = null;
    });
    messenger.showSnackBar(
      SnackBar(
        content: Text(decision == 'ACCEPT'
            ? '✓ Du hast zugesagt und bist für die Schicht eingeteilt!'
            : 'Absage übermittelt. Kaskade cycelt zum nächsten Kollegen weiter.'),
        backgroundColor: decision == 'ACCEPT' ? const Color(0xFF16A34A) : Colors.orange,
      ),
    );
    widget.onRefresh();
  }

  Future<void> _loadGroupNotes() async {
    final notes = await ApiService.getGroupNotes(widget.currentUser.targetGroupId ?? 'g_ue3_sonne');
    if (mounted) {
      setState(() {
        _groupNotes = notes;
        _loadingNotes = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final localeCode = AppI18n.currentLocale.value == 'fr'
        ? 'fr_FR'
        : (AppI18n.currentLocale.value == 'en' ? 'en_US' : 'de_DE');
    String todayFormatted;
    try {
      todayFormatted = DateFormat('EEEE, d. MMMM yyyy', localeCode).format(DateTime.now());
    } catch (_) {
      todayFormatted = DateFormat('dd.MM.yyyy').format(DateTime.now());
    }

    final greeting = AppI18n.currentLocale.value == 'fr'
        ? 'Bonjour, ${widget.currentUser.name.split(' ')[0]} !'
        : (AppI18n.currentLocale.value == 'en'
            ? 'Hello, ${widget.currentUser.name.split(' ')[0]}!'
            : 'Guten Tag, ${widget.currentUser.name.split(' ')[0]}!');

    return RefreshIndicator(
      onRefresh: () async {
        await _loadGroupNotes();
        widget.onRefresh();
      },
      child: ListView(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
        children: [
          // Greeting & Date
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      greeting,
                      style: theme.textTheme.titleLarge?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF0F172A),
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                    const SizedBox(height: 2),
                    Text(
                      todayFormatted,
                      style: theme.textTheme.bodySmall?.copyWith(
                        color: const Color(0xFF64748B),
                      ),
                      overflow: TextOverflow.ellipsis,
                      maxLines: 1,
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: const Color(0xFFECFDF5),
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFA7F3D0)),
                ),
                child: const Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Icon(Icons.shield_outlined, size: 14, color: Color(0xFF059669)),
                    SizedBox(width: 4),
                    Text(
                      'Schlüssel: 1:6.2 (Grün)',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF047857),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 16),

          // DRINGENDE EINSPRING-ANFRAGE (Falls Kaskade den Mitarbeiter anfragt - je nach Einstellung kritisch oder einfach)
          if (_pendingEmergencyRequest != null) ...[
            Builder(
              builder: (context) {
                final bool isCritical = _pendingEmergencyRequest!['is_critical'] != false;
                return Container(
                  margin: const EdgeInsets.only(bottom: 16),
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: isCritical ? const Color(0xFFFEF2F2) : const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(
                      color: isCritical ? const Color(0xFFEF4444) : const Color(0xFFCBD5E1),
                      width: isCritical ? 2.0 : 1.2,
                    ),
                    boxShadow: [
                      BoxShadow(
                        color: isCritical ? Colors.red.withValues(alpha: 0.12) : Colors.black.withValues(alpha: 0.04),
                        blurRadius: isCritical ? 10 : 4,
                        offset: const Offset(0, 3),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Expanded(
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(6),
                                  decoration: BoxDecoration(
                                    color: isCritical ? const Color(0xFFDC2626) : const Color(0xFF475569),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Icon(isCritical ? Icons.emergency : Icons.schedule, color: Colors.white, size: 16),
                                ),
                                const SizedBox(width: 8),
                                Expanded(
                                  child: Text(
                                    isCritical ? '🚨 NOTFALL-ALARM: AUSHELFEN' : '💬 EINSPRING-ANFRAGE (STANDARD)',
                                    style: TextStyle(
                                      fontSize: 11,
                                      fontWeight: FontWeight.bold,
                                      color: isCritical ? const Color(0xFF991B1B) : const Color(0xFF334155),
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                    maxLines: 1,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 6),
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                            decoration: BoxDecoration(
                              color: isCritical ? const Color(0xFFFEE2E2) : const Color(0xFFE2E8F0),
                              borderRadius: BorderRadius.circular(6),
                            ),
                            child: Text(
                              isCritical ? 'EILIG • ArbZG ✓' : 'ArbZG geprüft ✓',
                              style: TextStyle(
                                fontSize: 9,
                                fontWeight: FontWeight.bold,
                                color: isCritical ? const Color(0xFF991B1B) : const Color(0xFF475569),
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 10),
                      Text(
                        'Kannst du am ${_pendingEmergencyRequest!['date']} in der Gruppe "${_pendingEmergencyRequest!['group_name']}" (${_pendingEmergencyRequest!['start_time']} - ${_pendingEmergencyRequest!['end_time']} Uhr) einspringen?',
                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF1F2937)),
                      ),
                      const SizedBox(height: 12),
                      Row(
                        children: [
                          Expanded(
                            child: ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(
                                backgroundColor: const Color(0xFF16A34A),
                                foregroundColor: Colors.white,
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              onPressed: () => _respondToEmergency('ACCEPT'),
                              icon: const Icon(Icons.check, size: 16),
                              label: const Text('Ja, ich springe ein', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                            ),
                          ),
                          const SizedBox(width: 8),
                          OutlinedButton.icon(
                            style: OutlinedButton.styleFrom(
                              foregroundColor: isCritical ? const Color(0xFFDC2626) : const Color(0xFF475569),
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 10),
                              side: BorderSide(color: isCritical ? const Color(0xFFFCA5A5) : const Color(0xFFCBD5E1)),
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                            ),
                            onPressed: () => _respondToEmergency('DECLINE'),
                            icon: const Icon(Icons.close, size: 16),
                            label: const Text('Nein, kann nicht', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          ),
                        ],
                      ),
                    ],
                  ),
                );
              },
            ),
          ],

          // 1. TODAY'S SHIFT CARD
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            color: Colors.white,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: const Color(0xFFEFF6FF),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: const Icon(Icons.access_time_filled, color: Color(0xFF2563EB), size: 20),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'HEUTIGER DIENST',
                                    style: TextStyle(
                                      fontSize: 10,
                                      fontWeight: FontWeight.bold,
                                      color: Color(0xFF94A3B8),
                                      letterSpacing: 0.5,
                                    ),
                                  ),
                                  Text(
                                    '08:30 – 17:30 Uhr',
                                    style: theme.textTheme.titleMedium?.copyWith(
                                      fontWeight: FontWeight.w800,
                                      color: const Color(0xFF0F172A),
                                    ),
                                    overflow: TextOverflow.ellipsis,
                                    maxLines: 1,
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Text(
                          'Sonnenschein Ü3',
                          style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFFB45309)),
                        ),
                      ),
                    ],
                  ),
                  const Divider(height: 24, color: Color(0xFFF1F5F9)),

                  // Team in same group today
                  const Text(
                    'Mit dir im Gruppendienst:',
                    style: TextStyle(fontSize: 12, fontWeight: FontWeight.w600, color: Color(0xFF475569)),
                  ),
                  const SizedBox(height: 8),
                  SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        _buildColleagueChip('Anna S.', '07:30 - 16:00', const Color(0xFFEAB308)),
                        const SizedBox(width: 8),
                        _buildColleagueChip('Leonie W.', '08:00 - 16:30', const Color(0xFF64748B)),
                        const SizedBox(width: 8),
                        _buildColleagueChip('Sabine W.', 'Leitung', const Color(0xFF4F46E5)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 2. MEIN ARBEITSZEIT-PROFIL & VERFÜGBARKEIT
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            color: Colors.white,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text(
                    'MEIN ARBEITSZEIT-PROFIL',
                    style: TextStyle(
                      fontSize: 10,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF94A3B8),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('REGULÄRE ARBEITSZEIT', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                              const SizedBox(height: 4),
                              Text(
                                widget.currentUser.standardWorkHours ?? 'Flexibel nach Dienstplan',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('WOCHENSTUNDEN', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFF64748B))),
                              const SizedBox(height: 4),
                              Text(
                                '${widget.currentUser.weeklyHours}h / Woche',
                                style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF059669)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  if (widget.currentUser.availabilityWindow != null) ...[
                    const SizedBox(height: 10),
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: const Color(0xFFFFFBEB),
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: const Color(0xFFFDE68A)),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.event_available, size: 18, color: Color(0xFFD97706)),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text('Verfügbarkeitsrahmen für Planung:', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFB45309))),
                                const SizedBox(height: 2),
                                Text(
                                  widget.currentUser.availabilityWindow!,
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF92400E)),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 3. WICHTIGE BESONDERHEITEN & ALLERGIEN DER GRUPPE
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            color: Colors.white,
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Expanded(
                        child: Row(
                          children: [
                            Icon(Icons.warning_amber_rounded, color: Color(0xFFE11D48), size: 18),
                            SizedBox(width: 6),
                            Expanded(
                              child: Text(
                                'Wichtige Kinder-Hinweise heute',
                                style: TextStyle(
                                  fontSize: 13,
                                  fontWeight: FontWeight.bold,
                                  color: Color(0xFF0F172A),
                                ),
                                overflow: TextOverflow.ellipsis,
                                maxLines: 1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(width: 8),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFFF1F2),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Text(
                          '${_groupNotes.length} Hinweise',
                          style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFFBE123C)),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 12),

                  if (_loadingNotes)
                    const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator(strokeWidth: 2)))
                  else
                    ..._groupNotes.map((note) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(10),
                          decoration: BoxDecoration(
                            color: note.category == 'ALLERGY'
                                ? const Color(0xFFFFF1F2)
                                : const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(
                              color: note.category == 'ALLERGY'
                                  ? const Color(0xFFFECDD3)
                                  : const Color(0xFFE2E8F0),
                            ),
                          ),
                          child: Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                note.category == 'ALLERGY' ? Icons.no_food : Icons.info_outline,
                                size: 16,
                                color: note.category == 'ALLERGY' ? const Color(0xFFE11D48) : const Color(0xFF64748B),
                              ),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text(
                                      note.childName,
                                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                    ),
                                    Text(
                                      note.note,
                                      style: TextStyle(
                                        fontSize: 11,
                                        color: note.category == 'ALLERGY' ? const Color(0xFF9F1239) : const Color(0xFF475569),
                                      ),
                                    ),
                                  ],
                                ),
                              ),
                            ],
                          ),
                        )),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildColleagueChip(String name, String time, Color color) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
      decoration: BoxDecoration(
        color: const Color(0xFFF8FAFC),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFE2E8F0)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          CircleAvatar(
            radius: 8,
            backgroundColor: color,
            child: Text(name[0], style: const TextStyle(fontSize: 9, color: Colors.white, fontWeight: FontWeight.bold)),
          ),
          const SizedBox(width: 5),
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(name, style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF1E293B))),
              Text(time, style: const TextStyle(fontSize: 9, color: Color(0xFF64748B))),
            ],
          ),
        ],
      ),
    );
  }
}
