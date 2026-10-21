import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';

class BoardAndStatsScreen extends StatefulWidget {
  final StaffModel currentUser;
  final List<StaffModel> allStaff;
  final ValueChanged<StaffModel> onSwitchUser;

  const BoardAndStatsScreen({
    super.key,
    required this.currentUser,
    required this.allStaff,
    required this.onSwitchUser,
  });

  @override
  State<BoardAndStatsScreen> createState() => _BoardAndStatsScreenState();
}

class _BoardAndStatsScreenState extends State<BoardAndStatsScreen> {
  StaffStatsModel? _stats;
  List<AnnouncementModel> _announcements = [];
  List<AuditLogModel> _auditLogs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    setState(() => _loading = true);
    final results = await Future.wait([
      ApiService.getStaffStats(widget.currentUser.id),
      ApiService.getAnnouncements(),
      ApiService.getAuditLogs(widget.currentUser.id),
    ]);

    if (mounted) {
      setState(() {
        _stats = results[0] as StaffStatsModel;
        _announcements = results[1] as List<AnnouncementModel>;
        _auditLogs = results[2] as List<AuditLogModel>;
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Konto & Kita-Pinnwand', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 18)),
        backgroundColor: Colors.white,
        elevation: 0,
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(16),
                children: [
                  // 1. STATS OVERVIEW CARDS (Überstunden & Urlaub)
                  Row(
                    children: [
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('ÜBERSTUNDEN-SALDO', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
                              const SizedBox(height: 4),
                              Text(
                                '${(_stats?.overtimeHours ?? 0) >= 0 ? '+' : ''}${_stats?.overtimeHours ?? 0}h',
                                style: TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                  color: (_stats?.overtimeHours ?? 0) >= 0 ? const Color(0xFF16A34A) : const Color(0xFFDC2626),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'Soll: ${_stats?.targetMonthHours.toStringAsFixed(0)}h / Monat',
                                style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Container(
                          padding: const EdgeInsets.all(16),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(18),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text('RESTURLAUB 2026', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
                              const SizedBox(height: 4),
                              Text(
                                '${_stats?.remainingVacationDays ?? 24} Tage',
                                style: const TextStyle(
                                  fontSize: 22,
                                  fontWeight: FontWeight.w900,
                                  color: Color(0xFF0F172A),
                                ),
                              ),
                              const SizedBox(height: 2),
                              Text(
                                'von ${_stats?.totalVacationDays ?? 30} Tagen gesamt',
                                style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                              ),
                            ],
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 20),

                  // 2. ÄNDERUNGEN DURCH DIE LEITUNG (Transparenz-Log)
                  const Row(
                    children: [
                      Icon(Icons.notifications_active, color: Color(0xFF4F46E5), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Änderungen durch die Leitung',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  if (_auditLogs.isEmpty)
                    Container(
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: const Color(0xFFE2E8F0)),
                      ),
                      child: const Text('Keine Änderungen protokolliert.', style: TextStyle(fontSize: 12, color: Color(0xFF64748B))),
                    )
                  else
                    ..._auditLogs.map((log) => Container(
                          margin: const EdgeInsets.only(bottom: 8),
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(color: const Color(0xFFE0E7FF)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text(log.title, style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF1E1B4B))),
                                  Text(
                                    log.createdAt.length >= 10 ? log.createdAt.substring(0, 10) : '',
                                    style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8)),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 4),
                              Text(log.description, style: const TextStyle(fontSize: 11, color: Color(0xFF475569))),
                              const SizedBox(height: 4),
                              Text('Eingetragen von: ${log.changedBy}', style: const TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Color(0xFF6366F1))),
                            ],
                          ),
                        )),

                  const SizedBox(height: 20),

                  // 3. PINNWAND (Aushänge der Leitung)
                  const Row(
                    children: [
                      Icon(Icons.campaign, color: Color(0xFF2563EB), size: 20),
                      SizedBox(width: 8),
                      Text(
                        'Kita-Pinnwand (Aushänge)',
                        style: TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),

                  ..._announcements.map((ann) {
                    final isHigh = ann.priority == 'HIGH';

                    return Container(
                      margin: const EdgeInsets.only(bottom: 12),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(
                          color: isHigh ? const Color(0xFFFECDD3) : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              if (isHigh)
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                  decoration: BoxDecoration(
                                    color: const Color(0xFFFFF1F2),
                                    borderRadius: BorderRadius.circular(6),
                                  ),
                                  child: const Text('WICHTIG', style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Color(0xFFBE123C))),
                                )
                              else
                                const SizedBox.shrink(),
                              Text(ann.date, style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                            ],
                          ),
                          const SizedBox(height: 4),
                          Text(ann.title, style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                          const SizedBox(height: 4),
                          Text(ann.content, style: const TextStyle(fontSize: 12, color: Color(0xFF475569))),
                          const SizedBox(height: 6),
                          Text('Von: ${ann.author}', style: const TextStyle(fontSize: 10, fontStyle: FontStyle.italic, color: Color(0xFF94A3B8))),
                        ],
                      ),
                    );
                  }),
                  const SizedBox(height: 16),

                  // 3. PROFIL & TEST-BENUTZER WECHSEL
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text('MEIN PROFIL', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF94A3B8))),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 22,
                              backgroundColor: const Color(0xFF16A34A),
                              child: Text(widget.currentUser.avatar, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(widget.currentUser.name, style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold)),
                                  Text(widget.currentUser.qualification, style: const TextStyle(fontSize: 11, color: Color(0xFF64748B))),
                                  Text('${widget.currentUser.weeklyHours} Std./Woche • Kiosk-PIN: ••••', style: const TextStyle(fontSize: 10, color: Color(0xFF94A3B8))),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const Divider(height: 24),
                        const Text('Mitarbeiter-Ansicht wechseln (Simulation):', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          initialValue: widget.currentUser.id,
                          items: widget.allStaff.map((s) => DropdownMenuItem(
                            value: s.id,
                            child: Text('${s.name} (${s.role})', style: const TextStyle(fontSize: 12)),
                          )).toList(),
                          onChanged: (id) {
                            if (id != null) {
                              final found = widget.allStaff.firstWhere((s) => s.id == id);
                              widget.onSwitchUser(found);
                            }
                          },
                          decoration: InputDecoration(
                            contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                            border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
