import 'package:flutter/material.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/i18n_service.dart';

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
  String _criticalAlertsMode = 'CRITICAL';
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
      ApiService.getNotificationSettings(widget.currentUser.id),
    ]);

    if (mounted) {
      setState(() {
        _stats = results[0] as StaffStatsModel;
        _announcements = results[1] as List<AnnouncementModel>;
        _auditLogs = results[2] as List<AuditLogModel>;
        _criticalAlertsMode = results[3] as String;
        _loading = false;
      });
    }
  }

  Future<void> _updateAlertsMode(String newMode) async {
    setState(() => _criticalAlertsMode = newMode);
    await ApiService.updateNotificationSettings(widget.currentUser.id, newMode);
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(newMode == 'CRITICAL'
              ? '🚨 Kritische Benachrichtigungen aktiviert (Notfall-Alarm bei Einspring-Anfragen).'
              : '💬 Einfache Benachrichtigungen aktiviert (Standard-Modus ohne Alarm).'),
          behavior: SnackBarBehavior.floating,
        ),
      );
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
                  const SizedBox(height: 16),

                  // 1b. EINSTELLUNGEN: KRITISCHE BENACHRICHTIGUNGEN (Kritisch vs. Einfach)
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
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Row(
                              children: [
                                Icon(Icons.notification_important_outlined, color: Color(0xFFE11D48), size: 20),
                                SizedBox(width: 8),
                                Text(
                                  'Kritische Benachrichtigungen',
                                  style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: _criticalAlertsMode == 'CRITICAL' ? const Color(0xFFFEE2E2) : const Color(0xFFF1F5F9),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                _criticalAlertsMode == 'CRITICAL' ? '🚨 Notfall-Alarm' : '💬 Einfach',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: _criticalAlertsMode == 'CRITICAL' ? const Color(0xFFBE123C) : const Color(0xFF475569),
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 6),
                        const Text(
                          'Entscheide selbst, ob Notfall-Ereignisse (z.B. spontane Einspring-Anfragen) als lauter Notfall-Alarm oder dezent als normale Nachricht gehandhabt werden:',
                          style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(
                              child: InkWell(
                                onTap: () => _updateAlertsMode('CRITICAL'),
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                                  decoration: BoxDecoration(
                                    color: _criticalAlertsMode == 'CRITICAL' ? const Color(0xFFFFF1F2) : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: _criticalAlertsMode == 'CRITICAL' ? const Color(0xFFFB7185) : const Color(0xFFE2E8F0),
                                      width: _criticalAlertsMode == 'CRITICAL' ? 1.5 : 1.0,
                                    ),
                                  ),
                                  child: Column(
                                    children: [
                                      Text(
                                        '🚨 Kritisch',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: _criticalAlertsMode == 'CRITICAL' ? const Color(0xFFBE123C) : const Color(0xFF475569),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      const Text('Notfall-Alarm & Priorität', style: TextStyle(fontSize: 9, color: Color(0xFF64748B)), textAlign: TextAlign.center),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: InkWell(
                                onTap: () => _updateAlertsMode('SIMPLE'),
                                borderRadius: BorderRadius.circular(12),
                                child: Container(
                                  padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
                                  decoration: BoxDecoration(
                                    color: _criticalAlertsMode == 'SIMPLE' ? const Color(0xFFEFF6FF) : const Color(0xFFF8FAFC),
                                    borderRadius: BorderRadius.circular(12),
                                    border: Border.all(
                                      color: _criticalAlertsMode == 'SIMPLE' ? const Color(0xFF60A5FA) : const Color(0xFFE2E8F0),
                                      width: _criticalAlertsMode == 'SIMPLE' ? 1.5 : 1.0,
                                    ),
                                  ),
                                  child: Column(
                                    children: [
                                      Text(
                                        '💬 Einfach',
                                        style: TextStyle(
                                          fontSize: 12,
                                          fontWeight: FontWeight.bold,
                                          color: _criticalAlertsMode == 'SIMPLE' ? const Color(0xFF1D4ED8) : const Color(0xFF475569),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      const Text('Normale Nachricht', style: TextStyle(fontSize: 9, color: Color(0xFF64748B)), textAlign: TextAlign.center),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
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

                  // 3. SPRACHE / LANGUE / LANGUAGE
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
                        Row(
                          children: [
                            const Icon(Icons.language, size: 18, color: Color(0xFF16A34A)),
                            const SizedBox(width: 8),
                            Text(
                              AppI18n.t('language'),
                              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Expanded(child: _buildLangButton('de', '🇩🇪 DE')),
                            const SizedBox(width: 8),
                            Expanded(child: _buildLangButton('fr', '🇫🇷 FR')),
                            const SizedBox(width: 8),
                            Expanded(child: _buildLangButton('en', '🇬🇧 EN')),
                          ],
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // 4. PROFIL & TEST-BENUTZER WECHSEL
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
                        // 4.1 ZUGANGSDATEN / LOGIN (Standard: admin / admin)
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: const Color(0xFFF8FAFC),
                            borderRadius: BorderRadius.circular(12),
                            border: Border.all(color: const Color(0xFFE2E8F0)),
                          ),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Row(
                                    children: [
                                      const Icon(Icons.key, size: 16, color: Color(0xFF16A34A)),
                                      const SizedBox(width: 6),
                                      Text(
                                        AppI18n.t('login_title'),
                                        style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                      ),
                                    ],
                                  ),
                                  Container(
                                    padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                    decoration: BoxDecoration(
                                      color: const Color(0xFFDCFCE7),
                                      borderRadius: BorderRadius.circular(6),
                                    ),
                                    child: const Text(
                                      'admin / admin',
                                      style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF166534), fontFamily: 'monospace'),
                                    ),
                                  ),
                                ],
                              ),
                              const SizedBox(height: 6),
                              Text(
                                'Benutzer: ${widget.currentUser.username} • Passwort: ${widget.currentUser.passwordChanged ? "••••••••" : "admin (Standard)"}',
                                style: const TextStyle(fontSize: 11, color: Color(0xFF475569)),
                              ),
                              const SizedBox(height: 10),
                              Row(
                                children: [
                                  Expanded(
                                    child: OutlinedButton.icon(
                                      style: OutlinedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(vertical: 8),
                                        side: const BorderSide(color: Color(0xFF16A34A)),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      onPressed: _showLoginTestModal,
                                      icon: const Icon(Icons.login, size: 14, color: Color(0xFF16A34A)),
                                      label: const Text(
                                        'Login (admin/admin)',
                                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Color(0xFF16A34A)),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 8),
                                  OutlinedButton(
                                    style: OutlinedButton.styleFrom(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                    ),
                                    onPressed: () async {
                                      final messenger = ScaffoldMessenger.of(context);
                                      final ok = await ApiService.resetPassword(widget.currentUser.id);
                                      if (!mounted) return;
                                      messenger.showSnackBar(
                                        SnackBar(
                                          content: Text(ok
                                              ? '✓ Passwort auf Standard "admin" zurückgesetzt (Login: admin / admin)'
                                              : 'Fehler beim Zurücksetzen'),
                                          backgroundColor: ok ? const Color(0xFF16A34A) : Colors.red,
                                        ),
                                      );
                                    },
                                    child: const Text(
                                      'Reset admin',
                                      style: TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                        const Divider(height: 24),
                        const Text('Mitarbeiter-Ansicht wechseln (Simulation):', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Color(0xFF475569))),
                        const SizedBox(height: 6),
                        DropdownButtonFormField<String>(
                          isExpanded: true,
                          initialValue: widget.currentUser.id,
                          items: widget.allStaff.map((s) => DropdownMenuItem(
                            value: s.id,
                            child: Text('${s.name} (${s.role})', style: const TextStyle(fontSize: 12), overflow: TextOverflow.ellipsis, maxLines: 1),
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

  void _showLoginTestModal() {
    final usernameCtrl = TextEditingController(text: widget.currentUser.username);
    final passwordCtrl = TextEditingController(text: widget.currentUser.passwordChanged ? '' : widget.currentUser.password);
    bool loading = false;
    String? statusMsg;
    bool isSuccess = false;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setModalState) => Container(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 20,
            bottom: MediaQuery.of(ctx).viewInsets.bottom + 20,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
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
                          color: const Color(0xFFDCFCE7),
                          borderRadius: BorderRadius.circular(12),
                        ),
                        child: const Icon(Icons.lock_open, color: Color(0xFF16A34A), size: 20),
                      ),
                      const SizedBox(width: 10),
                      Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            AppI18n.t('login_title'),
                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                          ),
                          Text(
                            AppI18n.t('default_login_note'),
                            style: const TextStyle(fontSize: 11, color: Color(0xFF16A34A), fontWeight: FontWeight.w600),
                          ),
                        ],
                      ),
                    ],
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, color: Color(0xFF64748B)),
                    onPressed: () => Navigator.pop(ctx),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              Container(
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: const Color(0xFFF0FDF4),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFBBF7D0)),
                ),
                child: const Row(
                  children: [
                    Icon(Icons.info_outline, color: Color(0xFF16A34A), size: 18),
                    SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Neu eingerichtete Accounts haben standardmäßig admin / admin als Login. Melde dich damit an oder überprüfe den Status.',
                        style: TextStyle(fontSize: 11, color: Color(0xFF166534)),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),
              TextField(
                controller: usernameCtrl,
                decoration: InputDecoration(
                  labelText: 'Benutzername / E-Mail',
                  hintText: 'admin',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.person_outline),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: passwordCtrl,
                obscureText: true,
                decoration: InputDecoration(
                  labelText: 'Passwort',
                  hintText: 'admin',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  prefixIcon: const Icon(Icons.key),
                ),
              ),
              if (statusMsg != null) ...[
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: isSuccess ? const Color(0xFFDCFCE7) : const Color(0xFFFEE2E2),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Row(
                    children: [
                      Icon(isSuccess ? Icons.check_circle : Icons.error, color: isSuccess ? const Color(0xFF16A34A) : const Color(0xFFDC2626), size: 16),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          statusMsg!,
                          style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: isSuccess ? const Color(0xFF166534) : const Color(0xFF991B1B)),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF16A34A),
                        foregroundColor: Colors.white,
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      onPressed: loading
                          ? null
                          : () async {
                              setModalState(() {
                                loading = true;
                                statusMsg = null;
                              });
                              final res = await ApiService.login(usernameCtrl.text.trim(), passwordCtrl.text);
                              setModalState(() {
                                loading = false;
                                if (res != null && res['success'] == true) {
                                  isSuccess = true;
                                  statusMsg = '✓ Login erfolgreich als ${res['user']?['name'] ?? 'Benutzer'}!';
                                } else {
                                  isSuccess = false;
                                  statusMsg = '✗ Ungültige Zugangsdaten. Standardmäßig lautet der Login: admin / admin';
                                }
                              });
                            },
                      icon: loading
                          ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                          : const Icon(Icons.login),
                      label: const Text('Anmelden / Testen (admin/admin)', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildLangButton(String lang, String label) {
    final isSelected = AppI18n.currentLocale.value == lang;
    return GestureDetector(
      onTap: () {
        setState(() {
          AppI18n.setLocale(lang);
        });
      },
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 8),
        decoration: BoxDecoration(
          color: isSelected ? const Color(0xFF16A34A) : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(color: isSelected ? const Color(0xFF16A34A) : const Color(0xFFE2E8F0)),
        ),
        alignment: Alignment.center,
        child: Text(
          label,
          style: TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}
