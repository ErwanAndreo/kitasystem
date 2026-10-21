export type Role = 'LEITUNG' | 'FACHKRAFT' | 'ERGAENZUNGSKRAFT' | 'SPRINGER' | 'AZUBI';

export interface Staff {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  qualification: string;
  is_fachkraft: number;
  weekly_hours: number;
  work_days: number;
  annual_vacation_days: number;
  target_group_id: string | null;
  pin: string;
  avatar: string;
  color: string;
  is_active: number;
  skills?: string[];
  secondary_roles?: string[];
  can_spring?: number;
  clock_status?: 'CLOCKED_IN' | 'IN_BREAK' | 'COMPLETED' | null;
  current_absence?: 'SICK' | 'VACATION' | 'TRAINING' | null;
  unread_notifications_count?: number;
}

export interface Group {
  id: string;
  name: string;
  type: 'U3' | 'UE3' | 'MIXED';
  child_count: number;
  target_ratio: number;
  min_fachkraft_percent: number;
  color: string;
}

export interface Shift {
  id: string;
  staff_id: string;
  group_id: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  status: 'CONFIRMED' | 'CANCELLED';
  staff_name: string;
  staff_role: Role;
  is_fachkraft: number;
  staff_color: string;
  staff_skills?: string[];
  role_override?: string | null;
  group_name: string;
  group_color: string;
}

export interface RatioStatusGroup {
  group_id: string;
  group_name: string;
  group_type: string;
  child_count: number;
  target_ratio: number;
  actual_ratio: number;
  min_fachkraft_percent: number;
  actual_fachkraft_percent: number;
  total_staff: number;
  fachkraefte: number;
  ergaenzungskraefte: number;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  message: string;
  staff: any[];
}

export interface Approval {
  id: string;
  type: 'SHIFT_SWAP' | 'EMERGENCY_REPLACEMENT' | 'VACATION_REQUEST' | 'TIME_CORRECTION';
  requester_id: string;
  target_id?: string | null;
  shift_id?: string | null;
  absence_id?: string | null;
  details: {
    title: string;
    description: string;
    date?: string;
    start_date?: string;
    end_date?: string;
    shift?: string;
    group?: string;
    time?: string;
    ratio_impact?: string;
    arbzg_check?: string;
    remaining_vacation?: string;
    team_availability?: string;
  };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  decision_note?: string | null;
  decision_by?: string | null;
  decided_at?: string | null;
  created_at: string;
  requester_name: string;
  requester_role: Role;
  requester_avatar: string;
  target_name?: string | null;
  target_role?: Role | null;
}

export interface OvertimeAdjustment {
  id: string;
  staff_id: string;
  hours: number;
  reason: string;
  date: string;
  created_by: string;
  created_at: string;
}

export interface StaffAuditLog {
  id: string;
  staff_id: string;
  category: 'SHIFT_CHANGE' | 'OVERTIME_ADJUSTMENT' | 'HOURS_CHANGE' | 'APPROVAL';
  title: string;
  description: string;
  changed_by: string;
  created_at: string;
  is_read: number;
}

export interface TimeOverviewItem {
  staff_id: string;
  name: string;
  role: Role;
  avatar: string;
  color: string;
  weekly_hours: number;
  target_month_hours: number;
  actual_hours: number;
  adjustments_hours: number;
  overtime_hours: number;
  remaining_vacation: number;
}
