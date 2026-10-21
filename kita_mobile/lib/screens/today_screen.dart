import 'dart:async';
import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../models/models.dart';
import '../services/api_service.dart';

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
  String _currentTime = '';
  Timer? _timer;
  String _clockStatus = 'NOT_CLOCKED'; // NOT_CLOCKED, CLOCKED_IN, IN_BREAK, COMPLETED
  String? _statusMessage;
  List<GroupNoteModel> _groupNotes = [];
  bool _loadingNotes = true;

  @override
  void initState() {
    super.initState();
    _updateTime();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) => _updateTime());
    _loadGroupNotes();
  }

  @override
  void dispose() {
    _timer?.cancel();
    super.dispose();
  }

  void _updateTime() {
    if (mounted) {
      setState(() {
        _currentTime = DateFormat('HH:mm:ss').format(DateTime.now());
      });
    }
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

  Future<void> _stamp(String action) async {
    final success = await ApiService.stampTime(widget.currentUser.id, action);
    if (!mounted) return;

    if (success) {
      setState(() {
        if (action == 'CLOCK_IN') {
          _clockStatus = 'CLOCKED_IN';
          _statusMessage = 'Erfolgreich eingestempelt!';
        } else if (action == 'BREAK') {
          _clockStatus = _clockStatus == 'IN_BREAK' ? 'CLOCKED_IN' : 'IN_BREAK';
          _statusMessage = _clockStatus == 'IN_BREAK' ? 'Pause gestartet. Gute Erholung!' : 'Pause beendet. Willkommen zurück!';
        } else if (action == 'CLOCK_OUT') {
          _clockStatus = 'COMPLETED';
          _statusMessage = 'Schönen Feierabend!';
        }
      });
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(_statusMessage ?? 'Gebucht'),
          backgroundColor: const Color(0xFF16A34A),
          behavior: SnackBarBehavior.floating,
        ),
      );
      widget.onRefresh();
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final todayFormatted = DateFormat('EEEE, d. MMMM yyyy', 'de_DE').format(DateTime.now());

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
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Guten Tag, ${widget.currentUser.name.split(' ')[0]}!',
                    style: theme.textTheme.titleLarge?.copyWith(
                      fontWeight: FontWeight.bold,
                      color: const Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    todayFormatted,
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: const Color(0xFF64748B),
                    ),
                  ),
                ],
              ),
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
                      Row(
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
                          Column(
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
                              ),
                            ],
                          ),
                        ],
                      ),
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
                  Row(
                    children: [
                      _buildColleagueChip('Anna S.', '07:30 - 16:00', const Color(0xFFEAB308)),
                      const SizedBox(width: 8),
                      _buildColleagueChip('Leonie W.', '08:00 - 16:30', const Color(0xFF64748B)),
                      const SizedBox(width: 8),
                      _buildColleagueChip('Sabine W.', 'Leitung', const Color(0xFF4F46E5)),
                    ],
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),

          // 2. 1-TAP STEMPELUHR
          Card(
            elevation: 0,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(20),
              side: const BorderSide(color: Color(0xFFE2E8F0)),
            ),
            color: Colors.white,
            child: Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  const Text(
                    'DIGITALE STEMPELUHR',
                    style: TextStyle(
                      fontSize: 11,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF64748B),
                      letterSpacing: 0.5,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _currentTime.isEmpty ? '...' : _currentTime,
                    style: const TextStyle(
                      fontFamily: 'monospace',
                      fontSize: 32,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF0F172A),
                    ),
                  ),
                  const SizedBox(height: 8),

                  // Live Status Pill
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                    decoration: BoxDecoration(
                      color: _clockStatus == 'CLOCKED_IN'
                          ? const Color(0xFFDCFCE7)
                          : _clockStatus == 'IN_BREAK'
                              ? const Color(0xFFFEF3C7)
                              : const Color(0xFFF1F5F9),
                      borderRadius: BorderRadius.circular(20),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Container(
                          width: 8,
                          height: 8,
                          decoration: BoxDecoration(
                            shape: BoxShape.circle,
                            color: _clockStatus == 'CLOCKED_IN'
                                ? const Color(0xFF16A34A)
                                : _clockStatus == 'IN_BREAK'
                                    ? const Color(0xFFD97706)
                                    : const Color(0xFF94A3B8),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          _clockStatus == 'CLOCKED_IN'
                              ? 'Eingestempelt (Aktiv)'
                              : _clockStatus == 'IN_BREAK'
                                  ? 'In der Pause'
                                  : 'Nicht eingestempelt',
                          style: TextStyle(
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: _clockStatus == 'CLOCKED_IN'
                                ? const Color(0xFF15803D)
                                : _clockStatus == 'IN_BREAK'
                                    ? const Color(0xFFB45309)
                                    : const Color(0xFF64748B),
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 18),

                  // 3 Big Action Buttons
                  Row(
                    children: [
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _stamp('CLOCK_IN'),
                          icon: const Icon(Icons.play_arrow, size: 18),
                          label: const Text('Kommen'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF16A34A),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 0,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _stamp('BREAK'),
                          icon: const Icon(Icons.coffee, size: 18),
                          label: const Text('Pause'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFFEAB308),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 0,
                          ),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ElevatedButton.icon(
                          onPressed: () => _stamp('CLOCK_OUT'),
                          icon: const Icon(Icons.stop, size: 18),
                          label: const Text('Gehen'),
                          style: ElevatedButton.styleFrom(
                            backgroundColor: const Color(0xFF334155),
                            foregroundColor: Colors.white,
                            padding: const EdgeInsets.symmetric(vertical: 14),
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(14),
                            ),
                            elevation: 0,
                          ),
                        ),
                      ),
                    ],
                  ),
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
                      const Row(
                        children: [
                          Icon(Icons.warning_amber_rounded, color: Color(0xFFE11D48), size: 18),
                          SizedBox(width: 6),
                          Text(
                            'Wichtige Kinder-Hinweise heute',
                            style: TextStyle(
                              fontSize: 13,
                              fontWeight: FontWeight.bold,
                              color: Color(0xFF0F172A),
                            ),
                          ),
                        ],
                      ),
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
