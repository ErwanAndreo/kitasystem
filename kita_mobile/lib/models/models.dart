class StaffModel {
  final String id;
  final String name;
  final String email;
  final String phone;
  final String role;
  final String qualification;
  final bool isFachkraft;
  final double weeklyHours;
  final String? targetGroupId;
  final String pin;
  final String avatar;
  final String color;
  final String? clockStatus;
  final String? currentAbsence;

  StaffModel({
    required this.id,
    required this.name,
    required this.email,
    required this.phone,
    required this.role,
    required this.qualification,
    required this.isFachkraft,
    required this.weeklyHours,
    this.targetGroupId,
    required this.pin,
    required this.avatar,
    required this.color,
    this.clockStatus,
    this.currentAbsence,
  });

  factory StaffModel.fromJson(Map<String, dynamic> json) {
    return StaffModel(
      id: json['id'] ?? '',
      name: json['name'] ?? '',
      email: json['email'] ?? '',
      phone: json['phone'] ?? '',
      role: json['role'] ?? '',
      qualification: json['qualification'] ?? '',
      isFachkraft: (json['is_fachkraft'] ?? 1) == 1,
      weeklyHours: (json['weekly_hours'] as num?)?.toDouble() ?? 39.0,
      targetGroupId: json['target_group_id'],
      pin: json['pin'] ?? '1234',
      avatar: json['avatar'] ?? '??',
      color: json['color'] ?? '#16a34a',
      clockStatus: json['clock_status'],
      currentAbsence: json['current_absence'],
    );
  }
}

class ShiftModel {
  final String id;
  final String staffId;
  final String groupId;
  final String date;
  final String startTime;
  final String endTime;
  final int breakMinutes;
  final String status;
  final String staffName;
  final String staffRole;
  final bool isFachkraft;
  final String groupName;

  ShiftModel({
    required this.id,
    required this.staffId,
    required this.groupId,
    required this.date,
    required this.startTime,
    required this.endTime,
    required this.breakMinutes,
    required this.status,
    required this.staffName,
    required this.staffRole,
    required this.isFachkraft,
    required this.groupName,
  });

  factory ShiftModel.fromJson(Map<String, dynamic> json) {
    return ShiftModel(
      id: json['id'] ?? '',
      staffId: json['staff_id'] ?? '',
      groupId: json['group_id'] ?? '',
      date: json['date'] ?? '',
      startTime: json['start_time'] ?? '',
      endTime: json['end_time'] ?? '',
      breakMinutes: json['break_minutes'] ?? 30,
      status: json['status'] ?? 'CONFIRMED',
      staffName: json['staff_name'] ?? '',
      staffRole: json['staff_role'] ?? '',
      isFachkraft: (json['is_fachkraft'] ?? 1) == 1,
      groupName: json['group_name'] ?? '',
    );
  }
}

class ApprovalModel {
  final String id;
  final String type;
  final String requesterId;
  final String? targetId;
  final String? shiftId;
  final Map<String, dynamic> details;
  final String status;
  final String? decisionNote;
  final String? decisionBy;
  final String? decidedAt;
  final String createdAt;
  final String requesterName;
  final String? targetName;

  ApprovalModel({
    required this.id,
    required this.type,
    required this.requesterId,
    this.targetId,
    this.shiftId,
    required this.details,
    required this.status,
    this.decisionNote,
    this.decisionBy,
    this.decidedAt,
    required this.createdAt,
    required this.requesterName,
    this.targetName,
  });

  factory ApprovalModel.fromJson(Map<String, dynamic> json) {
    return ApprovalModel(
      id: json['id'] ?? '',
      type: json['type'] ?? '',
      requesterId: json['requester_id'] ?? '',
      targetId: json['target_id'],
      shiftId: json['shift_id'],
      details: json['details'] is Map<String, dynamic>
          ? json['details']
          : {},
      status: json['status'] ?? 'PENDING',
      decisionNote: json['decision_note'],
      decisionBy: json['decision_by'],
      decidedAt: json['decided_at'],
      createdAt: json['created_at'] ?? '',
      requesterName: json['requester_name'] ?? '',
      targetName: json['target_name'],
    );
  }
}

class AnnouncementModel {
  final String id;
  final String title;
  final String content;
  final String priority;
  final String author;
  final String date;

  AnnouncementModel({
    required this.id,
    required this.title,
    required this.content,
    required this.priority,
    required this.author,
    required this.date,
  });

  factory AnnouncementModel.fromJson(Map<String, dynamic> json) {
    return AnnouncementModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      content: json['content'] ?? '',
      priority: json['priority'] ?? 'NORMAL',
      author: json['author'] ?? '',
      date: json['date'] ?? '',
    );
  }
}

class GroupNoteModel {
  final String id;
  final String groupId;
  final String childName;
  final String category;
  final String note;

  GroupNoteModel({
    required this.id,
    required this.groupId,
    required this.childName,
    required this.category,
    required this.note,
  });

  factory GroupNoteModel.fromJson(Map<String, dynamic> json) {
    return GroupNoteModel(
      id: json['id'] ?? '',
      groupId: json['group_id'] ?? '',
      childName: json['child_name'] ?? '',
      category: json['category'] ?? '',
      note: json['note'] ?? '',
    );
  }
}

class StaffStatsModel {
  final String staffId;
  final String name;
  final double weeklyHours;
  final double targetMonthHours;
  final double actualHours;
  final double overtimeHours;
  final int remainingVacationDays;
  final int totalVacationDays;

  StaffStatsModel({
    required this.staffId,
    required this.name,
    required this.weeklyHours,
    required this.targetMonthHours,
    required this.actualHours,
    required this.overtimeHours,
    required this.remainingVacationDays,
    required this.totalVacationDays,
  });

  factory StaffStatsModel.fromJson(Map<String, dynamic> json) {
    return StaffStatsModel(
      staffId: json['staff_id'] ?? '',
      name: json['name'] ?? '',
      weeklyHours: (json['weekly_hours'] as num?)?.toDouble() ?? 39.0,
      targetMonthHours: (json['target_month_hours'] as num?)?.toDouble() ?? 168.0,
      actualHours: (json['actual_hours'] as num?)?.toDouble() ?? 0.0,
      overtimeHours: (json['overtime_hours'] as num?)?.toDouble() ?? 0.0,
      remainingVacationDays: json['remaining_vacation_days'] ?? 24,
      totalVacationDays: json['total_vacation_days'] ?? 30,
    );
  }
}


class AuditLogModel {
  final String id;
  final String staffId;
  final String category;
  final String title;
  final String description;
  final String changedBy;
  final String createdAt;
  final bool isRead;

  AuditLogModel({
    required this.id,
    required this.staffId,
    required this.category,
    required this.title,
    required this.description,
    required this.changedBy,
    required this.createdAt,
    required this.isRead,
  });

  factory AuditLogModel.fromJson(Map<String, dynamic> json) {
    return AuditLogModel(
      id: json['id'] ?? '',
      staffId: json['staff_id'] ?? '',
      category: json['category'] ?? '',
      title: json['title'] ?? '',
      description: json['description'] ?? '',
      changedBy: json['changed_by'] ?? '',
      createdAt: json['created_at'] ?? '',
      isRead: (json['is_read'] ?? 0) == 1,
    );
  }
}

class StaffWishModel {
  final String id;
  final String staffId;
  final String date;
  final String type; // WUNSCH_FRUEH, WUNSCH_SPAET, WUNSCH_FREI
  final String? note;
  final String createdAt;
  final String? staffName;

  StaffWishModel({
    required this.id,
    required this.staffId,
    required this.date,
    required this.type,
    this.note,
    required this.createdAt,
    this.staffName,
  });

  factory StaffWishModel.fromJson(Map<String, dynamic> json) {
    return StaffWishModel(
      id: json['id'] ?? '',
      staffId: json['staff_id'] ?? '',
      date: json['date'] ?? '',
      type: json['type'] ?? '',
      note: json['note'],
      createdAt: json['created_at'] ?? '',
      staffName: json['staff_name'],
    );
  }
}

class ClosureModel {
  final String id;
  final String title;
  final String date;
  final String type;
  final String? notes;

  ClosureModel({
    required this.id,
    required this.title,
    required this.date,
    required this.type,
    this.notes,
  });

  factory ClosureModel.fromJson(Map<String, dynamic> json) {
    return ClosureModel(
      id: json['id'] ?? '',
      title: json['title'] ?? '',
      date: json['date'] ?? '',
      type: json['type'] ?? 'SCHLIESSTAG',
      notes: json['notes'],
    );
  }
}
