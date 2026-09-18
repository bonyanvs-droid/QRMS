import { executeQuery, executeQuerySingle } from '../db/query';
import { getDbPool } from '../config/db';
import { snakeToCamelCase, camelToSnakeCase } from '../../src/db/schema';

export interface TableConfig {
  tableName: string;
  primaryKey: string;
  isTenantScoped: boolean;
  allowedColumns: string[];
  jsonbColumns: string[];
  defaultSort?: string;
  searchColumns?: string[];
  hasSoftDelete?: boolean;
}

export const ENTITY_TABLE_CONFIGS: Record<string, TableConfig> = {
  organizations: {
    tableName: 'organizations',
    primaryKey: 'id',
    isTenantScoped: false,
    allowedColumns: [
      'id', 'name', 'code', 'license_number', 'logo_url', 'tenant_ids',
      'is_active', 'role_permissions_overrides', 'description', 'city',
      'region', 'contact_phone', 'contact_email', 'created_at', 'updated_at'
    ],
    jsonbColumns: ['tenant_ids', 'role_permissions_overrides'],
    defaultSort: 'name ASC',
    searchColumns: ['name', 'code', 'city', 'description'],
  },

  tenants: {
    tableName: 'tenants',
    primaryKey: 'id',
    isTenantScoped: false,
    allowedColumns: [
      'id', 'slug', 'name', 'organization_id', 'description', 'city',
      'district', 'region', 'address', 'supervisor_name', 'contact_phone',
      'email', 'whatsapp_number', 'logo_url', 'stage_logo_url',
      'target_surah_default', 'reference_outcome', 'supported_stages',
      'is_active', 'role_permissions_overrides', 'notes', 'custom_domain',
      'tenant_type', 'show_on_public_directory', 'subscription',
      'modules_config', 'attendance_config', 'prayer_config',
      'admissions_config', 'reports_config', 'whatsapp_config',
      'created_at', 'updated_at'
    ],
    jsonbColumns: [
      'supported_stages', 'role_permissions_overrides', 'subscription',
      'modules_config', 'attendance_config', 'prayer_config',
      'admissions_config', 'reports_config', 'whatsapp_config'
    ],
    defaultSort: 'name ASC',
    searchColumns: ['name', 'slug', 'city', 'supervisor_name'],
  },

  stages: {
    tableName: 'stages',
    primaryKey: 'id',
    isTenantScoped: false,
    allowedColumns: [
      'id', 'code', 'name', 'subtitle', 'age_range', 'target_grades',
      'curriculum_focus', 'default_target_surah', 'accent_color', 'icon_name',
      'display_order', 'is_active', 'role_permissions_overrides', 'traits',
      'outcome_summary', 'target_quran_amount', 'logo_url', 'is_logo_active',
      'created_at', 'updated_at'
    ],
    jsonbColumns: ['target_grades', 'role_permissions_overrides', 'traits'],
    defaultSort: 'display_order ASC',
    searchColumns: ['name', 'code', 'subtitle'],
  },

  quran_stage_configs: {
    tableName: 'quran_stage_configs',
    primaryKey: 'id',
    isTenantScoped: false,
    allowedColumns: [
      'id', 'name', 'code', 'description', 'target_grades',
      'daily_pace_description', 'memorization', 'revision',
      'consolidation_days', 'schedule', 'default_term_weeks',
      'is_active', 'created_at', 'updated_at'
    ],
    jsonbColumns: ['target_grades', 'memorization', 'revision', 'schedule'],
    defaultSort: 'name ASC',
    searchColumns: ['name', 'code', 'description'],
  },

  academic_years: {
    tableName: 'academic_years',
    primaryKey: 'id',
    isTenantScoped: false,
    allowedColumns: [
      'id', 'name', 'semester', 'current_term', 'academic_year',
      'start_date', 'end_date', 'holidays', 'operational_start_week',
      'operational_end_week', 'total_weeks', 'current_week',
      'manual_week_override', 'days_per_week', 'spelling_passing_threshold',
      'grade_targets', 'created_at', 'updated_at'
    ],
    jsonbColumns: ['holidays', 'grade_targets'],
    defaultSort: 'start_date DESC',
    searchColumns: ['name', 'semester', 'academic_year'],
  },

  spelling_lessons: {
    tableName: 'spelling_lessons',
    primaryKey: 'id',
    isTenantScoped: false,
    allowedColumns: [
      'id', 'lesson_number', 'title', 'skill', 'description',
      'expected_week', 'target_grade', 'passing_threshold', 'passing_score',
      'display_order', 'is_active', 'core_skills', 'sub_lessons',
      'created_at', 'updated_at'
    ],
    jsonbColumns: ['core_skills', 'sub_lessons'],
    defaultSort: 'display_order ASC, lesson_number ASC',
    searchColumns: ['title', 'skill', 'description'],
  },

  users: {
    tableName: 'users',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'organization_id', 'name', 'full_name',
      'phone', 'email', 'national_id', 'login_identifier', 'password_hash',
      'role', 'staff_role', 'halaqah_id', 'stage_id', 'student_id',
      'teacher_id', 'student_ids', 'supervision_mode', 'is_active',
      'must_change_password', 'permission_mode', 'role_permissions_overrides',
      'custom_permissions', 'temporary_custom_permissions', 'supervisor_scope',
      'assigned_stage_ids', 'assigned_halaqah_ids', 'is_all_halaqahs',
      'delegations', 'is_archived', 'teacher_archived', 'supervisor_archived',
      'archive_type', 'archived_at', 'archived_by', 'archive_reason',
      'created_at', 'updated_at'
    ],
    jsonbColumns: [
      'student_ids', 'role_permissions_overrides', 'custom_permissions',
      'temporary_custom_permissions', 'supervisor_scope', 'assigned_stage_ids',
      'assigned_halaqah_ids', 'delegations'
    ],
    defaultSort: 'name ASC',
    searchColumns: ['name', 'full_name', 'phone', 'national_id', 'login_identifier', 'email'],
    hasSoftDelete: true,
  },

  halaqahs: {
    tableName: 'halaqahs',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'stage_id', 'name', 'teacher_id', 'teacher_name',
      'teacher_phone', 'location', 'days_per_week', 'grade', 'target_surah',
      'assistant_teachers', 'online_config', 'weekly_schedule',
      'default_time_type', 'default_start_time', 'default_end_time',
      'default_start_prayer_offset', 'default_end_prayer_offset',
      'active_track_ids', 'role_permissions_overrides', 'is_active',
      'is_archived', 'archived_at', 'archived_by', 'archive_reason',
      'created_at', 'updated_at'
    ],
    jsonbColumns: [
      'assistant_teachers', 'online_config', 'weekly_schedule',
      'active_track_ids', 'role_permissions_overrides'
    ],
    defaultSort: 'name ASC',
    searchColumns: ['name', 'teacher_name', 'location'],
    hasSoftDelete: true,
  },

  students: {
    tableName: 'students',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'stage_id', 'halaqah_id', 'teacher_id',
      'full_name', 'national_id', 'grade', 'halaqah_name', 'teacher_name',
      'teacher_phone', 'parent_name', 'parent_phone', 'phone', 'mother_phone',
      'guardian_relationship', 'other_contact_phone', 'minimum_target_surah',
      'personal_target_surah', 'status', 'current_spelling_lesson_id',
      'current_spelling_score', 'current_surah', 'current_ayah',
      'avatar_url', 'notes', 'username', 'active_quran_plan_id',
      'quran_plan', 'term_histories', 'attendance_streak', 'registration_type',
      'registration_type_label', 'previously_registered', 'is_active',
      'is_archived', 'archived_at', 'archive_reason', 'created_at', 'updated_at'
    ],
    jsonbColumns: ['quran_plan', 'term_histories', 'attendance_streak'],
    defaultSort: 'full_name ASC',
    searchColumns: ['full_name', 'national_id', 'parent_phone', 'phone', 'username'],
    hasSoftDelete: true,
  },

  quran_plans: {
    tableName: 'quran_plans',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'student_id', 'stage_id', 'plan_name',
      'status', 'scope', 'direction', 'unit_type', 'daily_amount',
      'plan_data', 'created_at', 'updated_at'
    ],
    jsonbColumns: ['plan_data'],
    defaultSort: 'created_at DESC',
    searchColumns: ['plan_name', 'student_id'],
  },

  daily_session_records: {
    tableName: 'daily_session_records',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'student_id', 'teacher_id', 'halaqah_id',
      'date', 'day_of_week', 'week_number', 'attendance', 'teacher_remarks',
      'spelling_drill_minutes', 'spelling_progress', 'spelling',
      'memorization', 'revision', 'custom_tracks', 'created_at', 'updated_at'
    ],
    jsonbColumns: ['spelling', 'memorization', 'revision', 'custom_tracks'],
    defaultSort: 'date DESC, created_at DESC',
    searchColumns: ['teacher_remarks', 'date'],
  },

  educational_plan_weeks: {
    tableName: 'educational_plan_weeks',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'stage_id', 'target_stage_ids', 'week_number',
      'start_date', 'end_date', 'day_dates', 'week_type', 'special_event_title',
      'domain', 'domain_label', 'value_title', 'motto', 'educational_goal',
      'goal_topic', 'goal_presenter', 'goal_location', 'activity',
      'activity_presenter', 'activity_location', 'responsible_person',
      'quranic_program', 'overall_project_budget', 'budget', 'notes',
      'values_list', 'execution_status', 'status', 'created_at', 'updated_at'
    ],
    jsonbColumns: ['target_stage_ids', 'day_dates', 'values_list', 'execution_status'],
    defaultSort: 'week_number ASC',
    searchColumns: ['value_title', 'motto', 'educational_goal', 'activity', 'special_event_title'],
  },

  seasonal_programs: {
    tableName: 'seasonal_programs',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'title', 'name', 'code', 'type', 'season',
      'start_date', 'end_date', 'target_stage_ids', 'target_audience',
      'location', 'max_capacity', 'supervisor_id', 'supervisor_name',
      'status', 'budget', 'description', 'goals', 'enrolled_student_ids',
      'created_at', 'updated_at'
    ],
    jsonbColumns: ['target_stage_ids', 'goals', 'enrolled_student_ids'],
    defaultSort: 'start_date DESC',
    searchColumns: ['title', 'name', 'code', 'description'],
  },

  seasonal_activities: {
    tableName: 'seasonal_activities',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'program_id', 'tenant_id', 'title', 'description',
      'activity_type', 'category', 'day_of_week', 'date', 'time_slot',
      'responsible_name', 'supervisor_name', 'supervisor_id', 'location',
      'points', 'status', 'notes', 'created_at', 'updated_at'
    ],
    jsonbColumns: [],
    defaultSort: 'date ASC, created_at ASC',
    searchColumns: ['title', 'description', 'responsible_name', 'location'],
  },

  seasonal_participations: {
    tableName: 'seasonal_participations',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'program_id', 'activity_id', 'tenant_id', 'student_id',
      'student_name', 'original_halaqah_id', 'original_halaqah_name',
      'attendance_status', 'participation_level', 'seasonal_points_earned',
      'points_earned', 'achievement_note', 'recorded_by', 'notes', 'recorded_at'
    ],
    jsonbColumns: [],
    defaultSort: 'recorded_at DESC',
    searchColumns: ['student_name', 'original_halaqah_name', 'achievement_note'],
  },

  student_financial_records: {
    tableName: 'student_financial_records',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'student_id', 'student_name', 'academic_year',
      'base_tuition', 'discount_amount', 'discount_reason', 'scholarship_amount',
      'is_exempt', 'exemption_reason', 'paid_amount', 'remaining_amount',
      'status', 'payments', 'created_at', 'updated_at'
    ],
    jsonbColumns: ['payments'],
    defaultSort: 'created_at DESC',
    searchColumns: ['student_name', 'academic_year'],
  },

  finance_revenues: {
    tableName: 'finance_revenues',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'source_name', 'amount', 'date',
      'donor_or_source', 'payment_method', 'notes', 'created_by', 'created_at'
    ],
    jsonbColumns: [],
    defaultSort: 'date DESC, created_at DESC',
    searchColumns: ['source_name', 'donor_or_source', 'notes'],
  },

  finance_expenses: {
    tableName: 'finance_expenses',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'category', 'description', 'amount',
      'tax_amount', 'total_amount', 'date', 'beneficiary', 'payment_method',
      'program_name', 'invoice_number', 'attachment_url', 'notes',
      'created_by', 'created_at'
    ],
    jsonbColumns: [],
    defaultSort: 'date DESC, created_at DESC',
    searchColumns: ['description', 'category', 'beneficiary', 'invoice_number'],
  },

  finance_custodies: {
    tableName: 'finance_custodies',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'holder_id', 'holder_name', 'purpose',
      'original_amount', 'status', 'disbursed_at', 'settled_at', 'closed_at',
      'reviewed_by', 'notes', 'created_by', 'created_at'
    ],
    jsonbColumns: [],
    defaultSort: 'created_at DESC',
    searchColumns: ['holder_name', 'purpose', 'notes'],
  },

  finance_custody_expenses: {
    tableName: 'finance_custody_expenses',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'custody_id', 'tenant_id', 'vendor', 'description',
      'amount', 'tax_amount', 'total_amount', 'category', 'date',
      'payment_method', 'invoice_number', 'attachment_url', 'notes',
      'created_by', 'created_at'
    ],
    jsonbColumns: [],
    defaultSort: 'date DESC, created_at DESC',
    searchColumns: ['vendor', 'description', 'invoice_number'],
  },

  finance_budget_requests: {
    tableName: 'finance_budget_requests',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'requester_id', 'requester_name', 'program_name',
      'estimated_amount', 'justification', 'status', 'reviewed_by',
      'reviewed_at', 'review_notes', 'created_at'
    ],
    jsonbColumns: [],
    defaultSort: 'created_at DESC',
    searchColumns: ['requester_name', 'program_name', 'justification'],
  },

  finance_settings: {
    tableName: 'finance_settings',
    primaryKey: 'tenant_id',
    isTenantScoped: true,
    allowedColumns: [
      'tenant_id', 'revenue_sources', 'expense_categories',
      'payment_methods', 'tuition_configs', 'default_tuition_amount',
      'bank_accounts', 'financial_policies', 'updated_at'
    ],
    jsonbColumns: [
      'revenue_sources', 'expense_categories', 'payment_methods',
      'tuition_configs', 'bank_accounts', 'financial_policies'
    ],
    defaultSort: 'updated_at DESC',
  },

  registration_requests: {
    tableName: 'registration_requests',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'student_name', 'national_id', 'parent_name',
      'parent_phone', 'mother_phone', 'guardian_relationship',
      'other_contact_phone', 'birth_date', 'grade', 'registration_type',
      'registration_type_label', 'tuition_fee_amount', 'fee_pledge_accepted',
      'previously_registered', 'desired_stage_id', 'status', 'notes',
      'interview_notes', 'interview_score', 'financial_decision_notes',
      'assigned_halaqah_id', 'assigned_teacher_id', 'enrolled_student_id',
      'created_at', 'updated_at'
    ],
    jsonbColumns: [],
    defaultSort: 'created_at DESC',
    searchColumns: ['student_name', 'national_id', 'parent_name', 'parent_phone'],
  },

  track_definitions: {
    tableName: 'track_definitions',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'code', 'name', 'short_name', 'description',
      'icon', 'color_scheme', 'is_active', 'role_permissions_overrides',
      'display_order', 'nomination_config', 'created_at', 'updated_at'
    ],
    jsonbColumns: ['role_permissions_overrides', 'nomination_config'],
    defaultSort: 'display_order ASC, name ASC',
    searchColumns: ['name', 'short_name', 'code', 'description'],
  },

  track_nominations: {
    tableName: 'track_nominations',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'track_id', 'track_name', 'student_id',
      'student_name', 'halaqah_id', 'halaqah_name', 'teacher_id',
      'teacher_name', 'target_branch_or_level', 'target_branch_snapshot',
      'status', 'nomination_card_number', 'internal_exam',
      'supervisor_approval', 'association_exam', 'teacher_recommendation',
      'teacher_notes', 'created_at', 'updated_at'
    ],
    jsonbColumns: [
      'target_branch_snapshot', 'internal_exam',
      'supervisor_approval', 'association_exam'
    ],
    defaultSort: 'created_at DESC',
    searchColumns: ['student_name', 'track_name', 'halaqah_name', 'teacher_name'],
  },

  association_nominations: {
    tableName: 'association_nominations',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'student_id', 'student_name', 'halaqah_id',
      'halaqah_name', 'teacher_id', 'teacher_name', 'nomination_type',
      'target_title', 'internal_exam_score', 'teacher_recommendation',
      'teacher_notes', 'supervisor_status', 'supervisor_notes',
      'nomination_card_number', 'approved_at', 'created_at', 'updated_at'
    ],
    jsonbColumns: [],
    defaultSort: 'created_at DESC',
    searchColumns: ['student_name', 'target_title', 'halaqah_name', 'teacher_name'],
  },

  student_badges: {
    tableName: 'student_badges',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'badge_type', 'student_id', 'student_name',
      'awarded_at', 'awarded_by', 'notes', 'is_automatic', 'created_at'
    ],
    jsonbColumns: [],
    defaultSort: 'awarded_at DESC, created_at DESC',
    searchColumns: ['student_name', 'badge_type', 'notes'],
  },

  student_point_rules: {
    tableName: 'student_point_rules',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'title', 'category', 'default_points',
      'is_active', 'role_permissions_overrides', 'description', 'created_at'
    ],
    jsonbColumns: ['role_permissions_overrides'],
    defaultSort: 'category ASC, title ASC',
    searchColumns: ['title', 'category', 'description'],
  },

  student_points: {
    tableName: 'student_points',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'student_id', 'student_name', 'rule_id',
      'category', 'points', 'reason', 'date', 'recorded_by', 'created_at'
    ],
    jsonbColumns: [],
    defaultSort: 'date DESC, created_at DESC',
    searchColumns: ['student_name', 'reason', 'category'],
  },

  remedial_plans: {
    tableName: 'remedial_plans',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'student_id', 'student_name', 'halaqah_id',
      'teacher_id', 'risk_level', 'category', 'title', 'diagnostic_summary',
      'recommended_action', 'parent_guidance', 'status', 'notes',
      'created_at', 'updated_at'
    ],
    jsonbColumns: [],
    defaultSort: 'created_at DESC',
    searchColumns: ['student_name', 'title', 'diagnostic_summary'],
  },

  meetings: {
    tableName: 'meetings',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'title', 'meeting_number', 'category',
      'date', 'start_time', 'end_time', 'location_type', 'location',
      'meeting_url', 'description', 'objectives', 'agenda', 'attendees',
      'discussions', 'decisions', 'recommendations', 'postponed_items',
      'notes', 'status', 'cancellation_reason', 'created_by',
      'created_by_name', 'created_by_role', 'completed_at',
      'created_at', 'updated_at'
    ],
    jsonbColumns: [
      'objectives', 'agenda', 'attendees', 'discussions',
      'decisions', 'recommendations', 'postponed_items'
    ],
    defaultSort: 'date DESC, created_at DESC',
    searchColumns: ['title', 'description', 'location', 'meeting_number'],
  },

  staff_attendance: {
    tableName: 'staff_attendance',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'user_id', 'user_name', 'user_role',
      'date', 'timestamp', 'is_regular_day', 'reason', 'method',
      'location_data', 'created_at'
    ],
    jsonbColumns: ['location_data'],
    defaultSort: 'date DESC, timestamp DESC',
    searchColumns: ['user_name', 'reason'],
  },

  prayer_times: {
    tableName: 'prayer_times',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'year', 'latitude', 'longitude',
      'timezone', 'method', 'last_synced_at', 'source',
      'timings_by_date', 'adjustments', 'updated_at'
    ],
    jsonbColumns: ['timings_by_date', 'adjustments'],
    defaultSort: 'updated_at DESC',
  },

  frontend_configs: {
    tableName: 'frontend_configs',
    primaryKey: 'id',
    isTenantScoped: false,
    allowedColumns: [
      'id', 'type', 'name', 'description', 'logo_url',
      'contact_email', 'contact_phone', 'contact_whatsapp',
      'address', 'show_supervisor', 'show_prayer_times',
      'primary_color', 'banners', 'announcements', 'sections',
      'updated_at'
    ],
    jsonbColumns: ['banners', 'announcements', 'sections'],
    defaultSort: 'updated_at DESC',
    searchColumns: ['name', 'description'],
  },

  audit_logs: {
    tableName: 'audit_logs',
    primaryKey: 'id',
    isTenantScoped: false,
    allowedColumns: [
      'id', 'user_id', 'user_name', 'user_role', 'action',
      'entity_type', 'entity_id', 'entity_name', 'previous_value',
      'new_value', 'notes', 'timestamp'
    ],
    jsonbColumns: ['previous_value', 'new_value'],
    defaultSort: 'timestamp DESC',
    searchColumns: ['user_name', 'action', 'entity_type', 'entity_name'],
  },

  report_logs: {
    tableName: 'report_logs',
    primaryKey: 'id',
    isTenantScoped: false,
    allowedColumns: [
      'id', 'recipient_type', 'recipient_name', 'recipient_phone',
      'student_id', 'teacher_id', 'report_type', 'title', 'content',
      'timestamp', 'status'
    ],
    jsonbColumns: [],
    defaultSort: 'timestamp DESC',
    searchColumns: ['recipient_name', 'recipient_phone', 'title'],
  },

  academic_archives: {
    tableName: 'academic_archives',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'tenant_id', 'tenant_name', 'academic_year', 'term_name',
      'archived_at', 'archived_by', 'total_students', 'total_halaqahs',
      'overall_mastery_rate', 'notes', 'student_snapshots', 'created_at'
    ],
    jsonbColumns: ['student_snapshots'],
    defaultSort: 'archived_at DESC',
    searchColumns: ['academic_year', 'term_name', 'notes'],
  },

  support_sessions: {
    tableName: 'support_sessions',
    primaryKey: 'id',
    isTenantScoped: true,
    allowedColumns: [
      'id', 'system_admin_uid', 'system_admin_name', 'tenant_id',
      'reason', 'expires_at', 'is_active', 'role_permissions_overrides',
      'created_at'
    ],
    jsonbColumns: ['role_permissions_overrides'],
    defaultSort: 'created_at DESC',
    searchColumns: ['system_admin_name', 'reason'],
  },
};

// Aliases mapping endpoints/collections to their canonical table configuration
export const COLLECTION_ALIASES: Record<string, string> = {
  // Direct names
  organizations: 'organizations',
  tenants: 'tenants',
  stages: 'stages',
  educational_stages: 'stages',
  quran_stage_configs: 'quran_stage_configs',
  academic_years: 'academic_years',
  spelling_lessons: 'spelling_lessons',
  users: 'users',
  platform_users: 'users',
  halaqahs: 'halaqahs',
  students: 'students',
  quran_plans: 'quran_plans',
  daily_records: 'daily_session_records',
  daily_session_records: 'daily_session_records',
  educational_plan: 'educational_plan_weeks',
  educational_plans: 'educational_plan_weeks',
  educational_plan_weeks: 'educational_plan_weeks',
  seasonal_programs: 'seasonal_programs',
  seasonal_activities: 'seasonal_activities',
  seasonal_participations: 'seasonal_participations',
  financial_records: 'student_financial_records',
  student_financial_records: 'student_financial_records',
  revenues: 'finance_revenues',
  finance_revenues: 'finance_revenues',
  expenses: 'finance_expenses',
  finance_expenses: 'finance_expenses',
  custodies: 'finance_custodies',
  finance_custodies: 'finance_custodies',
  custody_expenses: 'finance_custody_expenses',
  finance_custody_expenses: 'finance_custody_expenses',
  budget_requests: 'finance_budget_requests',
  finance_budget_requests: 'finance_budget_requests',
  finance_settings: 'finance_settings',
  registration_requests: 'registration_requests',
  track_definitions: 'track_definitions',
  track_nominations: 'track_nominations',
  association_nominations: 'association_nominations',
  badges: 'student_badges',
  student_badges: 'student_badges',
  student_point_rules: 'student_point_rules',
  student_points: 'student_points',
  remedial_plans: 'remedial_plans',
  meetings: 'meetings',
  staff_attendance: 'staff_attendance',
  prayer_times: 'prayer_times',
  frontendConfigs: 'frontend_configs',
  frontend_configs: 'frontend_configs',
  audit_logs: 'audit_logs',
  report_logs: 'report_logs',
  academic_archives: 'academic_archives',
  support_sessions: 'support_sessions',
};

export function resolveTableConfig(collectionName: string): TableConfig | null {
  const canonicalName = COLLECTION_ALIASES[collectionName] || COLLECTION_ALIASES[collectionName.toLowerCase()];
  if (!canonicalName) {
    return null;
  }
  return ENTITY_TABLE_CONFIGS[canonicalName] || null;
}

export interface QueryOptions {
  tenantId?: string;
  queryParams?: Record<string, any>;
  isSuperAdmin?: boolean;
}

/**
 * Universal Find Many records for any supported entity
 */
export async function findMany<T = any>(
  collectionName: string,
  options: QueryOptions = {}
): Promise<T[]> {
  const config = resolveTableConfig(collectionName);
  if (!config) {
    throw new Error(`Unknown or unsupported collection: '${collectionName}'`);
  }

  const { tenantId, queryParams = {} } = options;
  const conditions: string[] = [];
  const params: any[] = [];
  let paramIndex = 1;

  // 1. Tenant Scoping
  if (config.isTenantScoped) {
    const effectiveTenantId = tenantId || queryParams.tenantId;
    if (effectiveTenantId) {
      conditions.push(`${config.tableName}.tenant_id = $${paramIndex}`);
      params.push(effectiveTenantId);
      paramIndex++;
    } else if (!options.isSuperAdmin) {
      // If no tenant is provided for a tenant-scoped table, restrict to empty set
      return [];
    }
  }

  // 2. Safe Dynamic Query Filters (matching allowed columns)
  for (const [rawKey, rawVal] of Object.entries(queryParams)) {
    if (rawVal === undefined || rawVal === null || rawVal === '') continue;
    if (rawKey === 'tenantId' || rawKey === 'limit' || rawKey === 'offset' || rawKey === 'page' || rawKey === 'search') continue;

    // Convert camelCase query param to snake_case column
    const snakeCol = rawKey.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
    if (config.allowedColumns.includes(snakeCol)) {
      if (rawVal === 'true') {
        conditions.push(`${config.tableName}.${snakeCol} = TRUE`);
      } else if (rawVal === 'false') {
        conditions.push(`${config.tableName}.${snakeCol} = FALSE`);
      } else {
        conditions.push(`${config.tableName}.${snakeCol} = $${paramIndex}`);
        params.push(rawVal);
        paramIndex++;
      }
    }
  }

  // 3. Search Filter
  if (queryParams.search && config.searchColumns && config.searchColumns.length > 0) {
    const searchTerm = `%${queryParams.search.trim()}%`;
    const searchClauses = config.searchColumns.map((col) => {
      return `CAST(${config.tableName}.${col} AS TEXT) ILIKE $${paramIndex}`;
    });
    conditions.push(`(${searchClauses.join(' OR ')})`);
    params.push(searchTerm);
    paramIndex++;
  }

  // 4. Soft Delete Filter (Exclude archived unless explicitly requested)
  if (config.hasSoftDelete && queryParams.isArchived === undefined) {
    conditions.push(`(${config.tableName}.is_archived = FALSE OR ${config.tableName}.is_archived IS NULL)`);
  }

  // Build WHERE clause
  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // 5. Special Query for users with LEFT JOIN halaqahs
  let selectClause = `SELECT * FROM ${config.tableName}`;
  if (config.tableName === 'users') {
    selectClause = `
      SELECT 
        u.id, u.tenant_id, u.organization_id, u.name, u.full_name, u.phone, u.email,
        u.national_id, u.login_identifier, u.role, u.staff_role, u.halaqah_id,
        h.name AS halaqah_name,
        u.stage_id, u.student_id, u.teacher_id, u.student_ids, u.supervision_mode,
        u.is_active, u.must_change_password, u.permission_mode, u.role_permissions_overrides,
        u.custom_permissions, u.temporary_custom_permissions, u.supervisor_scope,
        u.assigned_stage_ids, u.assigned_halaqah_ids, u.is_all_halaqahs, u.delegations,
        u.is_archived, u.teacher_archived, u.supervisor_archived, u.archive_type,
        u.archived_at, u.archived_by, u.archive_reason,
        u.created_at, u.updated_at
      FROM users u
      LEFT JOIN halaqahs h ON u.halaqah_id = h.id
    `;
  }

  // 6. Sorting & Pagination
  const orderBy = config.defaultSort ? `ORDER BY ${config.defaultSort}` : '';
  let pagination = '';
  if (queryParams.limit) {
    const limitNum = Math.min(Math.max(1, parseInt(queryParams.limit, 10) || 500), 2000);
    pagination += ` LIMIT ${limitNum}`;
    if (queryParams.offset) {
      const offsetNum = Math.max(0, parseInt(queryParams.offset, 10) || 0);
      pagination += ` OFFSET ${offsetNum}`;
    }
  }

  const fullQuery = `${selectClause} ${whereClause} ${orderBy} ${pagination}`;
  return executeQuery<T>(fullQuery, params);
}

/**
 * Universal Find One record by ID
 */
export async function findById<T = any>(
  collectionName: string,
  id: string,
  tenantId?: string
): Promise<T | null> {
  const config = resolveTableConfig(collectionName);
  if (!config) {
    throw new Error(`Unknown or unsupported collection: '${collectionName}'`);
  }

  const conditions: string[] = [`${config.tableName}.${config.primaryKey} = $1`];
  const params: any[] = [id];

  if (config.isTenantScoped && tenantId) {
    conditions.push(`${config.tableName}.tenant_id = $2`);
    params.push(tenantId);
  }

  let selectClause = `SELECT * FROM ${config.tableName}`;
  if (config.tableName === 'users') {
    selectClause = `
      SELECT 
        u.id, u.tenant_id, u.organization_id, u.name, u.full_name, u.phone, u.email,
        u.national_id, u.login_identifier, u.role, u.staff_role, u.halaqah_id,
        h.name AS halaqah_name,
        u.stage_id, u.student_id, u.teacher_id, u.student_ids, u.supervision_mode,
        u.is_active, u.must_change_password, u.permission_mode, u.role_permissions_overrides,
        u.custom_permissions, u.temporary_custom_permissions, u.supervisor_scope,
        u.assigned_stage_ids, u.assigned_halaqah_ids, u.is_all_halaqahs, u.delegations,
        u.is_archived, u.teacher_archived, u.supervisor_archived, u.archive_type,
        u.archived_at, u.archived_by, u.archive_reason,
        u.created_at, u.updated_at
      FROM users u
      LEFT JOIN halaqahs h ON u.halaqah_id = h.id
    `;
  }

  const query = `${selectClause} WHERE ${conditions.join(' AND ')} LIMIT 1`;
  return executeQuerySingle<T>(query, params);
}

/**
 * Sanitizes and prepares a record for insert/update
 */
function prepareRecord(config: TableConfig, rawData: Record<string, any>, tenantId?: string) {
  // Convert camelCase keys to snake_case
  const snakeData = camelToSnakeCase(rawData);
  const sanitized: Record<string, any> = {};

  // Enforce tenant_id if tenant-scoped
  if (config.isTenantScoped) {
    sanitized.tenant_id = tenantId || snakeData.tenant_id;
  }

  for (const col of config.allowedColumns) {
    if (snakeData[col] !== undefined) {
      let val = snakeData[col];

      // Format JSONB fields
      if (config.jsonbColumns.includes(col)) {
        if (val === null || val === undefined) {
          val = null;
        } else if (typeof val === 'object') {
          val = JSON.stringify(val);
        }
      } else {
        // Non-JSONB fields: strictly prevent objects like "{}" or Firestore Timestamps from breaking PostgreSQL
        if (val !== null && typeof val === 'object' && !(val instanceof Date)) {
          // Check for Firestore-like timestamp objects { seconds, nanoseconds }
          if ('seconds' in val || '_seconds' in val) {
            const sec = (val as any).seconds ?? (val as any)._seconds ?? 0;
            const nano = (val as any).nanoseconds ?? (val as any)._nanoseconds ?? 0;
            val = new Date(sec * 1000 + Math.floor(nano / 1000000)).toISOString();
          } else if (Object.keys(val).length === 0) {
            // Empty object `{}`
            if (col === 'created_at' || col === 'updated_at' || col === 'timestamp') {
              val = new Date().toISOString();
            } else {
              val = null;
            }
          } else {
            val = null;
          }
        } else if (typeof val === 'string') {
          const trimmed = val.trim();
          if (trimmed === '{}' || trimmed === '') {
            val = null;
          }
        }
      }

      sanitized[col] = val;
    }
  }

  // Ensure primary key exists (if id)
  if (config.primaryKey === 'id' && !sanitized.id) {
    // Generate an ID if not provided
    sanitized.id = rawData.id || `rec_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  // Auto-set updated_at timestamp if present in allowed columns
  if (config.allowedColumns.includes('updated_at')) {
    sanitized.updated_at = new Date().toISOString();
  }

  return sanitized;
}

/**
 * Universal Upsert record
 */
export async function upsert<T = any>(
  collectionName: string,
  rawData: Record<string, any>,
  tenantId?: string
): Promise<T> {
  const config = resolveTableConfig(collectionName);
  if (!config) {
    throw new Error(`Unknown or unsupported collection: '${collectionName}'`);
  }

  const sanitized = prepareRecord(config, rawData, tenantId);

  // Users table: derive missing role from staff_role so Teacher-shaped payloads
  // (which carry staffRole but no role) never violate the NOT NULL constraint
  if (config.tableName === 'users' && sanitized.role === undefined && sanitized.staff_role) {
    sanitized.role = sanitized.staff_role;
  }

  const keys = Object.keys(sanitized);

  if (keys.length === 0) {
    throw new Error(`No valid columns provided for table '${config.tableName}'`);
  }

  const columns = keys.join(', ');
  const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
  const values = keys.map((k) => sanitized[k]);

  // Build ON CONFLICT DO UPDATE
  const updateClauses = keys
    .filter((k) => k !== config.primaryKey && (k !== 'tenant_id' || !config.isTenantScoped))
    .map((k) => `${k} = EXCLUDED.${k}`);

  let query: string;
  if (updateClauses.length > 0) {
    query = `
      INSERT INTO ${config.tableName} (${columns})
      VALUES (${placeholders})
      ON CONFLICT (${config.primaryKey})
      DO UPDATE SET ${updateClauses.join(', ')}
      RETURNING *
    `;
  } else {
    query = `
      INSERT INTO ${config.tableName} (${columns})
      VALUES (${placeholders})
      ON CONFLICT (${config.primaryKey})
      DO NOTHING
      RETURNING *
    `;
  }

  const result = await executeQuerySingle<T>(query, values);
  if (!result) {
    // In case DO NOTHING returned no rows, fetch existing
    const existing = await findById<T>(collectionName, sanitized[config.primaryKey], tenantId);
    if (!existing) {
      throw new Error(`Failed to upsert record into '${config.tableName}'`);
    }
    return existing;
  }

  return result;
}

/**
 * Universal Batch / Bulk Upsert
 */
export async function bulkUpsert<T = any>(
  collectionName: string,
  items: Array<Record<string, any>>,
  tenantId?: string
): Promise<{ count: number; items: T[] }> {
  if (!Array.isArray(items) || items.length === 0) {
    return { count: 0, items: [] };
  }

  const config = resolveTableConfig(collectionName);
  if (!config) {
    throw new Error(`Unknown or unsupported collection: '${collectionName}'`);
  }

  const pool = getDbPool();
  if (!pool) {
    throw new Error('Database is not connected. Please set DATABASE_URL.');
  }

  const client = await pool.connect();
  const results: T[] = [];

  try {
    await client.query('BEGIN');

    for (const item of items) {
      const sanitized = prepareRecord(config, item, tenantId);
      const keys = Object.keys(sanitized);
      const columns = keys.join(', ');
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const values = keys.map((k) => sanitized[k]);

      const updateClauses = keys
        .filter((k) => k !== config.primaryKey && (k !== 'tenant_id' || !config.isTenantScoped))
        .map((k) => `${k} = EXCLUDED.${k}`);

      const query = updateClauses.length > 0
        ? `INSERT INTO ${config.tableName} (${columns}) VALUES (${placeholders}) ON CONFLICT (${config.primaryKey}) DO UPDATE SET ${updateClauses.join(', ')} RETURNING *`
        : `INSERT INTO ${config.tableName} (${columns}) VALUES (${placeholders}) ON CONFLICT (${config.primaryKey}) DO NOTHING RETURNING *`;

      const res = await client.query(query, values);
      if (res.rows.length > 0) {
        results.push(snakeToCamelCase<T>(res.rows[0]));
      }
    }

    await client.query('COMMIT');
    return { count: results.length, items: results };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Universal Delete record
 */
export async function deleteRecord(
  collectionName: string,
  id: string,
  tenantId?: string
): Promise<boolean> {
  const config = resolveTableConfig(collectionName);
  if (!config) {
    throw new Error(`Unknown or unsupported collection: '${collectionName}'`);
  }

  const conditions: string[] = [`${config.primaryKey} = $1`];
  const params: any[] = [id];

  if (config.isTenantScoped && tenantId) {
    conditions.push(`tenant_id = $2`);
    params.push(tenantId);
  }

  const query = `DELETE FROM ${config.tableName} WHERE ${conditions.join(' AND ')} RETURNING ${config.primaryKey}`;
  const deleted = await executeQuerySingle(query, params);

  return !!deleted;
}
