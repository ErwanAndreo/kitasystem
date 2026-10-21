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
  target_group_id: string | null;
  pin: string;
  avatar: string;
  color: string;
  clock_status?: 'CLOCKED_IN' | 'IN_BREAK' | 'COMPLETED' | null;
  current_absence?: 'SICK' | 'VACATION' | 'TRAINING' | null;
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

export interface Timelog {
  id: string;
  staff_id: string;
  date: string;
  clock_in: string;
  clock_out: string | null;
  break_minutes: number;
  status: 'CLOCKED_IN' | 'IN_BREAK' | 'COMPLETED';
  note: string | null;
  staff_name: string;
  role: Role;
  color: string;
}
