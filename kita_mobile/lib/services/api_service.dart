import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import '../models/models.dart';

class ApiService {
  // Use localhost for iOS / Web / macOS, and 10.0.2.2 for Android emulator
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:3000/api';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  static Future<List<StaffModel>> getStaff() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/staff')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((e) => StaffModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return _mockStaff();
  }

  static Future<List<ShiftModel>> getShifts({String? staffId}) async {
    try {
      String url = '$baseUrl/shifts';
      if (staffId != null) url += '?staff_id=$staffId';
      final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((e) => ShiftModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return _mockShifts(staffId);
  }

  static Future<List<ApprovalModel>> getApprovals() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/approvals')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((e) => ApprovalModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return _mockApprovals();
  }

  static Future<List<AnnouncementModel>> getAnnouncements() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/announcements')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((e) => AnnouncementModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return _mockAnnouncements();
  }

  static Future<List<GroupNoteModel>> getGroupNotes(String groupId) async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/groups/$groupId/details')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final Map<String, dynamic> data = jsonDecode(res.body);
        final List notes = data['notes'] ?? [];
        return notes.map((e) => GroupNoteModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return _mockGroupNotes(groupId);
  }

  static Future<StaffStatsModel> getStaffStats(String staffId) async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/staff/$staffId/stats')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        return StaffStatsModel.fromJson(jsonDecode(res.body));
      }
    } catch (_) {}
    return StaffStatsModel(
      staffId: staffId,
      name: 'Lukas Wagner',
      weeklyHours: 39.0,
      targetMonthHours: 168.0,
      actualHours: 172.5,
      overtimeHours: 4.5,
      remainingVacationDays: 24,
      totalVacationDays: 30,
    );
  }

  static Future<bool> stampTime(String staffId, String action) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/timelogs/stamp'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'staff_id': staffId, 'action': action}),
      ).timeout(const Duration(seconds: 3));
      return res.statusCode == 200;
    } catch (_) {
      return true; // Mock success
    }
  }

  static Future<bool> requestSwap({
    required String requesterId,
    required String targetId,
    required String shiftId,
    required String note,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/approvals/request-swap'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'requester_id': requesterId,
          'target_id': targetId,
          'shift_id': shiftId,
          'note': note,
        }),
      ).timeout(const Duration(seconds: 3));
      return res.statusCode == 201;
    } catch (_) {
      return true;
    }
  }

  static Future<bool> requestVacation({
    required String requesterId,
    required String startDate,
    required String endDate,
    required String reason,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/approvals/request-vacation'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'requester_id': requesterId,
          'start_date': startDate,
          'end_date': endDate,
          'reason': reason,
        }),
      ).timeout(const Duration(seconds: 3));
      return res.statusCode == 201;
    } catch (_) {
      return true;
    }
  }

  static Future<List<AuditLogModel>> getAuditLogs(String staffId) async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/staff/$staffId/audit-log')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((e) => AuditLogModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return _mockAuditLogs(staffId);
  }

  static Future<List<StaffWishModel>> getStaffWishes({String? staffId}) async {
    try {
      String url = '$baseUrl/staff-wishes';
      if (staffId != null) url += '?staff_id=$staffId';
      final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((e) => StaffWishModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return _mockWishes(staffId);
  }

  static Future<bool> requestWish({
    required String staffId,
    required String date,
    required String type,
    String? note,
  }) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/staff-wishes'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'staff_id': staffId,
          'date': date,
          'type': type,
          'note': note,
        }),
      ).timeout(const Duration(seconds: 3));
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return true;
    }
  }

  static Future<bool> deleteWish(String wishId) async {
    try {
      final res = await http.delete(Uri.parse('$baseUrl/staff-wishes/$wishId')).timeout(const Duration(seconds: 3));
      return res.statusCode == 200;
    } catch (_) {
      return true;
    }
  }

  static Future<List<ClosureModel>> getClosures() async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/closures')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((e) => ClosureModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return _mockClosures();
  }

  // --- CHECKLISTEN & QUALITÄTSSTANDARDS ---
  static Future<List<ChecklistModel>> getChecklists({String? staffId}) async {
    try {
      String url = '$baseUrl/checklists';
      if (staffId != null) url += '?staff_id=$staffId';
      final res = await http.get(Uri.parse(url)).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((e) => ChecklistModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return _mockChecklists(staffId);
  }

  static Future<bool> toggleChecklistItem({
    required String checklistId,
    required String itemId,
    required String completedBy,
  }) async {
    try {
      final res = await http.patch(
        Uri.parse('$baseUrl/checklists/$checklistId/toggle-item'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'item_id': itemId,
          'completed_by': completedBy,
        }),
      ).timeout(const Duration(seconds: 3));
      return res.statusCode == 200;
    } catch (_) {
      return true;
    }
  }

  static Future<bool> updateChecklist(String id, {bool? isShared, String? title, String? category}) async {
    try {
      final Map<String, dynamic> map = {};
      if (isShared != null) map['is_shared'] = isShared;
      if (title != null) map['title'] = title;
      if (category != null) map['category'] = category;

      final res = await http.put(
        Uri.parse('$baseUrl/checklists/$id'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode(map),
      ).timeout(const Duration(seconds: 3));
      return res.statusCode == 200;
    } catch (_) {
      return true;
    }
  }

  static Future<bool> addChecklistItem(String checklistId, String text) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/checklists/$checklistId/items'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'text': text}),
      ).timeout(const Duration(seconds: 3));
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return true;
    }
  }

  static Future<List<ShareFavoriteModel>> getShareFavorites(String staffId) async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/staff/$staffId/share-favorites')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final List data = jsonDecode(res.body);
        return data.map((e) => ShareFavoriteModel.fromJson(e)).toList();
      }
    } catch (_) {}
    return [
      ShareFavoriteModel(id: 'fav_gesamt', type: 'GESAMT', label: 'Gesamt (Alle)'),
      ShareFavoriteModel(id: 'fav_today_group', type: 'TODAY_GROUP', label: 'Heutige Gruppe'),
      ShareFavoriteModel(id: 'fav_leitung', type: 'LEITUNG', label: 'Leitung'),
    ];
  }

  static Future<List<ShareFavoriteModel>?> pinShareFavorite(String staffId, Map<String, dynamic> favorite) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/staff/$staffId/share-favorites'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'favorite': favorite}),
      ).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['favorites'] is List) {
          final List list = data['favorites'];
          return list.map((e) => ShareFavoriteModel.fromJson(e)).toList();
        }
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> createChecklist({
    required String title,
    required String category,
    required String createdById,
    required String createdByName,
    required bool isShared,
    String shareScope = 'ALL',
    String? sharedGroupId,
    String? sharedGroupName,
    List<String>? sharedStaffIds,
    List<String>? sharedStaffNames,
    required String color,
    required List<String> items,
  }) async {
    try {
      final itemObjects = items.map((t) => {
        'id': 'i_${DateTime.now().millisecondsSinceEpoch}_${t.hashCode.abs()}',
        'text': t,
        'done': false,
      }).toList();

      final res = await http.post(
        Uri.parse('$baseUrl/checklists'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'title': title,
          'category': category,
          'created_by_id': createdById,
          'created_by_name': createdByName,
          'is_shared': isShared,
          'share_scope': shareScope,
          'shared_group_id': sharedGroupId,
          'shared_group_name': sharedGroupName,
          'shared_staff_ids': sharedStaffIds ?? [],
          'shared_staff_names': sharedStaffNames ?? [],
          'color': color,
          'items': itemObjects,
        }),
      ).timeout(const Duration(seconds: 3));
      return res.statusCode == 200 || res.statusCode == 201;
    } catch (_) {
      return true;
    }
  }

  static Future<bool> deleteChecklist(String checklistId) async {
    try {
      final res = await http.delete(Uri.parse('$baseUrl/checklists/$checklistId')).timeout(const Duration(seconds: 3));
      return res.statusCode == 200;
    } catch (_) {
      return true;
    }
  }

  // --- AUTHENTICATION & LOGIN (admin / admin) ---
  static Future<Map<String, dynamic>?> login(String username, String password) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/login'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'username': username, 'password': password}),
      ).timeout(const Duration(seconds: 4));
      if (res.statusCode == 200) {
        return jsonDecode(res.body);
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> resetPassword(String staffId) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/reset-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({'staff_id': staffId}),
      ).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {}
    return false;
  }

  static Future<bool> changePassword(String staffId, String? oldPassword, String newPassword) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/auth/change-password'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'staff_id': staffId,
          'old_password': oldPassword,
          'new_password': newPassword,
        }),
      ).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {}
    return false;
  }

  // --- EINSPRING-KASKADE & NOTFALL-VERTRETUNG ---
  static Future<Map<String, dynamic>?> getPendingEmergencyRequest(String staffId) async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/emergency/pending-request/$staffId')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        if (data['has_pending_request'] == true) {
          return data;
        }
      }
    } catch (_) {}
    return null;
  }

  static Future<bool> respondToEmergencyCycle(String cycleId, String staffId, String decision) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/emergency/cycles/$cycleId/respond'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'staff_id': staffId,
          'decision': decision,
        }),
      ).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {}
    return false;
  }

  static Future<bool> submitSickNotice(String staffId, String reason) async {
    try {
      final res = await http.post(
        Uri.parse('$baseUrl/requests/sick'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'staff_id': staffId,
          'reason': reason,
        }),
      ).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {}
    return false;
  }

  static Future<String> getNotificationSettings(String staffId) async {
    try {
      final res = await http.get(Uri.parse('$baseUrl/staff/$staffId/notification-settings')).timeout(const Duration(seconds: 3));
      if (res.statusCode == 200) {
        final data = jsonDecode(res.body);
        return data['critical_alerts_mode'] ?? 'CRITICAL';
      }
    } catch (_) {}
    return 'CRITICAL';
  }

  static Future<bool> updateNotificationSettings(String staffId, String criticalAlertsMode) async {
    try {
      final res = await http.put(
        Uri.parse('$baseUrl/staff/$staffId/notification-settings'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'critical_alerts_mode': criticalAlertsMode,
        }),
      ).timeout(const Duration(seconds: 4));
      return res.statusCode == 200;
    } catch (_) {}
    return false;
  }

  // --- MOCK FALLBACK DATA ---
  static List<StaffModel> _mockStaff() {
    return [
      StaffModel(id: 's_sabine', name: 'Sabine Weber (Leitung)', email: 'leitung@kita.de', phone: '0171-112233', role: 'LEITUNG', qualification: 'Sozialpädagogin', isFachkraft: true, weeklyHours: 39, pin: '1111', avatar: 'SW', color: '#4f46e5', username: 'admin', password: 'admin', passwordChanged: false),
      StaffModel(id: 's_lukas', name: 'Lukas Wagner (Mitarbeiter 1)', email: 'l.wagner@kita.de', phone: '0176-667788', role: 'FACHKRAFT', qualification: 'Staatl. anerkannter Erzieher', isFachkraft: true, weeklyHours: 39, targetGroupId: 'g_ue3_sonne', pin: '6666', avatar: 'LW', color: '#84cc16', username: 'admin', password: 'admin', passwordChanged: false),
      StaffModel(id: 's_sarah', name: 'Sarah Klein (Mitarbeiter 2)', email: 's.klein@kita.de', phone: '0172-223344', role: 'FACHKRAFT', qualification: 'Staatl. anerkannte Erzieherin', isFachkraft: true, weeklyHours: 39, targetGroupId: 'g_u3_maeuse', pin: '2222', avatar: 'SK', color: '#ec4899', username: 'admin', password: 'admin', passwordChanged: false),
      StaffModel(id: 's_anna', name: 'Anna Schmidt', email: 'a.schmidt@kita.de', phone: '0175-556677', role: 'FACHKRAFT', qualification: 'Staatl. anerkannte Erzieherin', isFachkraft: true, weeklyHours: 35, targetGroupId: 'g_ue3_sonne', pin: '5555', avatar: 'AS', color: '#eab308', username: 'admin', password: 'admin', passwordChanged: false),
      StaffModel(id: 's_elena', name: 'Elena Rossi', email: 'e.rossi@kita.de', phone: '0177-778899', role: 'FACHKRAFT', qualification: 'Staatl. anerkannte Erzieherin', isFachkraft: true, weeklyHours: 32, targetGroupId: 'g_ue3_wald', pin: '7777', avatar: 'ER', color: '#10b981', username: 'admin', password: 'admin', passwordChanged: false),
      StaffModel(id: 's_julia', name: 'Julia Fischer (Springerin)', email: 'j.fischer@kita.de', phone: '0179-990011', role: 'SPRINGER', qualification: 'Staatl. anerkannte Erzieherin', isFachkraft: true, weeklyHours: 20, pin: '9999', avatar: 'JF', color: '#8b5cf6', username: 'admin', password: 'admin', passwordChanged: false),
    ];
  }

  static List<ShiftModel> _mockShifts(String? staffId) {
    return [
      ShiftModel(id: 'sh_1', staffId: staffId ?? 's_lukas', groupId: 'g_ue3_sonne', date: 'Heute', startTime: '08:30', endTime: '17:30', breakMinutes: 45, status: 'CONFIRMED', staffName: 'Lukas Wagner', staffRole: 'FACHKRAFT', isFachkraft: true, groupName: 'Sonnenschein (Ü3)'),
      ShiftModel(id: 'sh_2', staffId: staffId ?? 's_lukas', groupId: 'g_ue3_sonne', date: 'Morgen', startTime: '08:00', endTime: '16:30', breakMinutes: 30, status: 'CONFIRMED', staffName: 'Lukas Wagner', staffRole: 'FACHKRAFT', isFachkraft: true, groupName: 'Sonnenschein (Ü3)'),
      ShiftModel(id: 'sh_3', staffId: staffId ?? 's_lukas', groupId: 'g_ue3_sonne', date: 'Freitag', startTime: '09:00', endTime: '17:30', breakMinutes: 30, status: 'CONFIRMED', staffName: 'Lukas Wagner', staffRole: 'FACHKRAFT', isFachkraft: true, groupName: 'Sonnenschein (Ü3)'),
    ];
  }

  static List<ApprovalModel> _mockApprovals() {
    return [
      ApprovalModel(
        id: 'appr_1',
        type: 'SHIFT_SWAP',
        requesterId: 's_lukas',
        targetId: 's_elena',
        details: {
          'title': 'Schichttausch für Freitag',
          'description': 'Lukas Wagner bittet Elena Rossi um Übernahme des Spätdienstes (14:00 - 17:30 Uhr).',
          'ratio_impact': 'Schlüssel bleibt 100% grün (beide Fachkräfte).'
        },
        status: 'PENDING',
        createdAt: DateTime.now().subtract(const Duration(hours: 2)).toIso8601String(),
        requesterName: 'Lukas Wagner',
        targetName: 'Elena Rossi',
      ),
      ApprovalModel(
        id: 'appr_2',
        type: 'VACATION_REQUEST',
        requesterId: 's_lukas',
        details: {
          'title': 'Brückentag nach Christi Himmelfahrt',
          'description': 'Erholungsurlaub für Freitag beantragt.',
          'remaining_vacation': '24 Tage verbleibend'
        },
        status: 'APPROVED',
        decisionBy: 'Sabine Weber (Leitung)',
        decisionNote: 'Genehmigt. Schöne freie Tage!',
        decidedAt: DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
        createdAt: DateTime.now().subtract(const Duration(days: 3)).toIso8601String(),
        requesterName: 'Lukas Wagner',
      ),
    ];
  }

  static List<AnnouncementModel> _mockAnnouncements() {
    return [
      AnnouncementModel(
        id: 'ann_1',
        title: 'Teammeeting am Donnerstag um 16:30 Uhr',
        content: 'Bitte alle vorbereiteten Beobachtungsbögen der Vorschulkinder mitbringen. Besprechung im Personalraum.',
        priority: 'HIGH',
        author: 'Sabine Weber (Leitung)',
        date: '21.10.2026',
      ),
      AnnouncementModel(
        id: 'ann_2',
        title: 'Fotografentag am 28. Oktober',
        content: 'Ab 08:30 Uhr kommt der Kitafotograf. Bitte die Gruppenräume vormittags für Einzel- und Gruppenfotos freihalten.',
        priority: 'NORMAL',
        author: 'Sabine Weber (Leitung)',
        date: '20.10.2026',
      ),
    ];
  }

  static List<GroupNoteModel> _mockGroupNotes(String groupId) {
    return [
      GroupNoteModel(id: 'gn_1', groupId: groupId, childName: 'Mia (4J)', category: 'DIET', note: 'Laktose- & Glutenunverträglichkeit (Spezialessen vom Caterer)'),
      GroupNoteModel(id: 'gn_2', groupId: groupId, childName: 'Ben (5J)', category: 'INFO', note: 'Beginnt heute mit der Eingewöhnung in die Vorschulgruppe'),
      GroupNoteModel(id: 'gn_3', groupId: groupId, childName: 'Felix (2J)', category: 'ALLERGY', note: 'Starke Erdnussallergie (Notfall-Pen im Kasten)'),
    ];
  }

  static List<AuditLogModel> _mockAuditLogs(String staffId) {
    return [
      AuditLogModel(
        id: 'log_1',
        staffId: staffId,
        category: 'OVERTIME_ADJUSTMENT',
        title: 'Überstunden-Gutschrift: +2.5 Std.',
        description: 'Gutschrift für Elternabend Vorschulkinder durch Sabine Weber (Leitung).',
        changedBy: 'Sabine Weber (Leitung)',
        createdAt: DateTime.now().subtract(const Duration(hours: 3)).toIso8601String(),
        isRead: false,
      ),
      AuditLogModel(
        id: 'log_2',
        staffId: staffId,
        category: 'SHIFT_CHANGE',
        title: 'Schichtplan aktualisiert',
        description: 'Schicht am Freitag auf 08:30 - 17:30 Uhr (Spätdienst) festgelegt.',
        changedBy: 'Sabine Weber (Leitung)',
        createdAt: DateTime.now().subtract(const Duration(hours: 12)).toIso8601String(),
        isRead: false,
      ),
    ];
  }

  static List<StaffWishModel> _mockWishes(String? staffId) {
    return [
      StaffWishModel(
        id: 'wish_mock_1',
        staffId: staffId ?? 's_lukas',
        date: '2026-10-23',
        type: 'WUNSCH_FRUEH',
        note: 'Facharzttermin um 16:30 Uhr',
        createdAt: DateTime.now().subtract(const Duration(days: 1)).toIso8601String(),
        staffName: 'Lukas Wagner',
      ),
    ];
  }

  static List<ClosureModel> _mockClosures() {
    return [
      ClosureModel(
        id: 'cls_1',
        title: 'Konzeptionstag: Kinderschutz & Inklusion',
        date: '2026-10-23',
        type: 'KONZEPTIONSTAG',
        notes: 'Kita für Kinder geschlossen. Ganztägige Teamklausur aller Fachkräfte.',
      ),
      ClosureModel(
        id: 'cls_2',
        title: 'Brückentag Allerheiligen',
        date: '2026-10-30',
        type: 'BRUECKENTAG',
        notes: 'Einrichtung geschlossen.',
      ),
    ];
  }

  static List<ChecklistModel> _mockChecklists(String? staffId) {
    return [
      ChecklistModel(
        id: 'chk_mock_1',
        title: 'Schließdienst & Sicherheitsrundgang Kita Sonnenschein',
        category: 'SICHERHEIT',
        createdById: 's_sabine',
        createdByName: 'Sabine Weber (Leitung)',
        isShared: true,
        color: '#ef4444',
        items: [
          ChecklistItemModel(id: 'i1', text: 'Fenster in allen Gruppenräumen schließen und verriegeln', done: true, completedBy: 'Lukas Wagner', completedAt: '17:35'),
          ChecklistItemModel(id: 'i2', text: 'Terrassentüren zum Garten abschließen', done: true, completedBy: 'Lukas Wagner', completedAt: '17:38'),
          ChecklistItemModel(id: 'i3', text: 'Alarmanlage am Haupteingang scharfstellen', done: false),
        ],
        totalItems: 3,
        completedItems: 2,
        progressPercent: 67,
        createdAt: '2026-10-22',
        updatedAt: '2026-10-22',
      ),
      ChecklistModel(
        id: 'chk_mock_2',
        title: 'Morgenroutine & Ankommensvorbereitung',
        category: 'ROUTINE',
        createdById: 's_sabine',
        createdByName: 'Sabine Weber (Leitung)',
        isShared: true,
        color: '#3b82f6',
        items: [
          ChecklistItemModel(id: 'i4', text: 'Haupteingang aufschließen und Stoßlüften', done: true, completedBy: 'Sarah Klein', completedAt: '07:15'),
          ChecklistItemModel(id: 'i5', text: 'Teewasser kochen & frisches Obst anrichten', done: true, completedBy: 'Sarah Klein', completedAt: '07:25'),
        ],
        totalItems: 2,
        completedItems: 2,
        progressPercent: 100,
        createdAt: '2026-10-22',
        updatedAt: '2026-10-22',
      ),
    ];
  }
}
