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
  certifications?: Certification[];
  standard_work_hours?: string;
  availability_window?: string;
  availability_rules?: AvailabilityRule[];
  clock_status?: 'CLOCKED_IN' | 'IN_BREAK' | 'COMPLETED' | null;
  current_absence?: 'SICK' | 'VACATION' | 'TRAINING' | null;
  unread_notifications_count?: number;
  username?: string;
  password?: string;
  password_changed?: number;
  critical_alerts_mode?: 'CRITICAL' | 'SIMPLE';
}

export interface AvailabilityRule {
  type: 'ONLY_DAYS' | 'MAX_DAYS_WEEK' | 'MAX_HOURS_DAY' | 'EARLIEST' | 'LATEST' | 'NOT_BEFORE_VACATION' | 'WEEK_RHYTHM' | 'NOTE';
  days?: number[];
  value?: string | number;
}

export interface Group {
  id: string;
  name: string;
  type: 'U3' | 'UE3' | 'MIXED';
  child_count: number;
  target_ratio: number;
  min_fachkraft_percent: number;
  color: string;
  policy_id?: string;
  required_skills?: string[];
}

export interface PolicyTemplate {
  id: string;
  name: string;
  type: 'U3' | 'UE3' | 'MIXED' | 'CUSTOM';
  target_ratio: number;
  min_fachkraft_percent: number;
  description: string;
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
  warning?: string | null;
  group_name: string;
  group_color: string;
}

export interface RatioStatusGroup {
  group_id: string;
  group_name: string;
  group_type: string;
  child_count: number;
  effective_children: number;
  worst_time: string;
  slots: { minute: number; children: number; staff: number; fachkraefte: number }[];
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

export interface Child {
  id: string;
  group_id: string;
  group_name?: string;
  group_type?: string;
  first_name: string;
  last_name: string;
  birth_date: string;
  gender?: string;
  photo_url?: string;
  care_hours: number;
  contract_start: string;
  contract_end?: string | null;
  active: number;
  allergies?: string[];
  dietary_needs?: string | null;
  emergency_instructions?: string | null;
  measles_vaccinated?: number;
  doctor_name?: string | null;
  doctor_phone?: string | null;
  today_status?: 'present' | 'absent_sick' | 'absent_vacation' | 'absent_unexcused' | 'not_recorded';
  check_in_time?: string | null;
  check_out_time?: string | null;
  absence_reason?: string | null;
  meal_ordered?: number;
  picked_up_by?: string | null;
  has_allergy?: boolean;
  has_emergency_note?: boolean;
}

export interface EmergencyContact {
  id: string;
  child_id: string;
  name: string;
  relationship: string;
  phone_primary: string;
  phone_secondary?: string | null;
  priority: number;
}

export interface PickupAuthorization {
  id: string;
  child_id: string;
  name: string;
  relationship: string;
  phone?: string | null;
  id_card_number?: string | null;
  photo_url?: string | null;
  is_forbidden: number;
  notes?: string | null;
}

export interface RatioSetting {
  id: string;
  group_id?: string | null;
  target_ratio: number;
  warning_threshold_percent: number;
  critical_threshold_percent: number;
  two_person_rule: number;
  core_time_start: string;
  core_time_end: string;
  min_qualification_quote: number;
  bundesland_preset: string;
}

export interface MealSummary {
  date: string;
  deadline: string;
  total_ordered: number;
  total_cancelled: number;
  by_group: Record<string, { group_name: string; ordered: number; cancelled: number }>;
  special_diets: Array<{
    child_name: string;
    group: string;
    dietary_needs?: string;
    allergies: string[];
  }>;
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
    team_conflict_warning?: string | null;
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

export interface ShiftTemplate {
  id: string;
  name: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  color: string;
}

export interface StaffWish {
  id: string;
  staff_id: string;
  date: string;
  type: 'WUNSCH_FRUEH' | 'WUNSCH_SPAET' | 'WUNSCH_FREI' | 'VERFUEGBAR_AB';
  note?: string;
  created_at: string;
  staff_name?: string;
  staff_role?: Role;
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

export interface Certification {
  id: string;
  staff_id: string;
  type: string;
  title: string;
  issue_date?: string | null;
  expires_at: string;
  institution?: string;
  notes?: string;
  days_until_expiry?: number;
  is_expired?: boolean;
  expires_soon?: boolean;
  staff_name?: string;
  staff_role?: Role;
}

export interface DirectorChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface DirectorNote {
  id: string;
  category: 'TEAM' | 'ELTERN' | 'TRAEGER' | 'KONZEPTE' | 'ALLGEMEIN';
  title: string;
  content: string;
  color: string;
  is_pinned: number;
  checklist: DirectorChecklistItem[];
  created_at: string;
  updated_at: string;
}

export interface Excursion {
  id: string;
  date: string;
  group_id: string;
  group_name: string;
  staff_count: number;
}

export interface KitaClosure {
  id: string;
  title: string;
  date: string;
  type: 'KONZEPTIONSTAG' | 'SCHLIESSTAG' | 'BRUECKENTAG' | 'FERIEN';
  notes?: string | null;
}

export interface AutopilotProposal {
  id: string;
  title: string;
  description: string;
  situation: 'SICKNESS' | 'CRITICAL_RATIO' | 'UNCOVERED_SHIFT';
  action_type: 'ADD_SHIFT' | 'REPLACE_STAFF' | 'REALLOCATE_SPRINGER';
  target_group_id: string;
  target_staff_id: string;
  target_group_name?: string;
  target_staff_name?: string;
  date: string;
  start_time: string;
  end_time: string;
  break_minutes: number;
  status: 'PENDING' | 'ACCEPTED' | 'DISMISSED';
  confidence_score: number;
  matched_reason?: string;
  created_at: string;
}

export interface NotificationQueueItem {
  id: string;
  staff_id: string;
  staff_name: string;
  staff_avatar: string;
  staff_color: string;
  change_type: string;
  summary: string;
  details: any[];
  created_at: string;
  scheduled_for: string;
  status: 'PENDING' | 'SENT' | 'CANCELLED';
  minutes_remaining: number;
}

export interface SystemSettings {
  autopilot_enabled: boolean;
  notification_delay_minutes: number;
}

export type ChecklistShareScope = 'ALL' | 'TODAY_GROUP' | 'GROUP' | 'PERSONS' | 'LEITUNG' | 'PRIVATE';

export interface ShareFavorite {
  id: string;
  type: 'GESAMT' | 'TODAY_GROUP' | 'LEITUNG' | 'GROUP' | 'PERSON';
  label: string;
  icon?: string;
  targetId?: string | null;
  targetName?: string | null;
  updatedAt?: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  done: boolean;
  completed_by?: string;
  completed_at?: string;
}

export interface Checklist {
  id: string;
  title: string;
  category: 'ROUTINE' | 'SICHERHEIT' | 'AUSFLUG' | 'HYGIENE' | 'PAEDAGOGIK' | 'SONSTIGES';
  created_by_id: string;
  created_by_name: string;
  is_shared: boolean;
  share_scope: ChecklistShareScope;
  shared_group_id?: string | null;
  shared_group_name?: string | null;
  shared_staff_ids?: string[];
  shared_staff_names?: string[];
  color: string;
  items: ChecklistItem[];
  total_items?: number;
  completed_items?: number;
  progress_percent?: number;
  created_at: string;
  updated_at: string;
}

export interface SubstituteCycleCandidate {
  staff_id: string;
  name: string;
  role: string;
  qualification: string;
  is_fachkraft: boolean;
  score: number;
  legal_check: {
    is_compliant: boolean;
    total_daily_hours: number;
    rest_hours_before: number;
    issues: string[];
    summary: string;
  };
  status: 'WAITING' | 'PENDING' | 'ACCEPTED' | 'DECLINED';
  asked_at: string | null;
  responded_at: string | null;
}

export interface SubstituteCycle {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  group_id: string;
  group_name?: string;
  absent_staff_id?: string;
  absent_staff_name?: string;
  reason?: string;
  candidates: SubstituteCycleCandidate[];
  current_candidate_index: number;
  status: 'IN_PROGRESS' | 'ACCEPTED' | 'ALL_DECLINED' | 'DIRECTOR_RESOLVED';
  accepted_staff_id?: string;
  accepted_staff_name?: string;
  director_decision_staff_id?: string;
  director_decision_staff_name?: string;
  director_note?: string;
  created_at: string;
  updated_at: string;
}

