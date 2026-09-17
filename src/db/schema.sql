-- =============================================================================
-- QRMS PostgreSQL Production Schema (v1.0)
-- Optimized for High-Performance Quranic Complex Management
-- Preserves 100% of Firestore IDs, Multi-Tenant Isolation, and Relational Integrity
-- =============================================================================

-- Enable UUID extension if needed for future records
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. ORGANIZATIONS (جمعيات التحفيظ والمقرات الرئيسية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100),
    license_number VARCHAR(100),
    logo_url TEXT,
    tenant_ids JSONB DEFAULT '[]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    role_permissions_overrides JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    city VARCHAR(100),
    region VARCHAR(100),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 2. TENANTS (المجمعات القرآنية والمراكز التعليمية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS tenants (
    id VARCHAR(255) PRIMARY KEY,
    slug VARCHAR(100) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE SET NULL,
    description TEXT,
    city VARCHAR(100) NOT NULL,
    district VARCHAR(100) NOT NULL,
    region VARCHAR(100),
    address TEXT,
    supervisor_name VARCHAR(255) NOT NULL,
    contact_phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    whatsapp_number VARCHAR(50),
    logo_url TEXT,
    stage_logo_url TEXT,
    target_surah_default VARCHAR(100) DEFAULT 'الغاشية',
    reference_outcome TEXT,
    supported_stages JSONB DEFAULT '["baraem", "ashbal"]'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    role_permissions_overrides JSONB DEFAULT '{}'::jsonb,
    notes TEXT,
    custom_domain VARCHAR(255),
    tenant_type VARCHAR(50) DEFAULT 'production',
    show_on_public_directory BOOLEAN DEFAULT TRUE,
    subscription JSONB DEFAULT '{}'::jsonb,
    modules_config JSONB DEFAULT '{}'::jsonb,
    attendance_config JSONB DEFAULT '{}'::jsonb,
    prayer_config JSONB DEFAULT '{}'::jsonb,
    admissions_config JSONB DEFAULT '{}'::jsonb,
    reports_config JSONB DEFAULT '{}'::jsonb,
    whatsapp_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_tenants_slug ON tenants(slug);
CREATE INDEX IF NOT EXISTS idx_tenants_org ON tenants(organization_id);
CREATE INDEX IF NOT EXISTS idx_tenants_active ON tenants(is_active);

-- -----------------------------------------------------------------------------
-- 3. EDUCATIONAL STAGES & QURAN CONFIGS (المراحل التعليمية وخطط القرآن)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stages (
    id VARCHAR(255) PRIMARY KEY,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255),
    age_range VARCHAR(100),
    target_grades JSONB DEFAULT '[]'::jsonb,
    curriculum_focus TEXT,
    default_target_surah VARCHAR(100) DEFAULT 'الغاشية',
    accent_color VARCHAR(50) DEFAULT 'emerald',
    icon_name VARCHAR(100) DEFAULT 'Sparkles',
    display_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    role_permissions_overrides JSONB DEFAULT '{}'::jsonb,
    traits JSONB DEFAULT '[]'::jsonb,
    outcome_summary TEXT,
    target_quran_amount VARCHAR(255),
    logo_url TEXT,
    is_logo_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quran_stage_configs (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(100) NOT NULL,
    description TEXT,
    target_grades JSONB DEFAULT '[]'::jsonb,
    daily_pace_description TEXT,
    memorization JSONB NOT NULL DEFAULT '{}'::jsonb,
    revision JSONB NOT NULL DEFAULT '{}'::jsonb,
    consolidation_days INT DEFAULT 3,
    schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
    default_term_weeks INT DEFAULT 12,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 4. ACADEMIC YEAR CONFIG (إعدادات العام الدراسي والأسابيع)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_years (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    semester VARCHAR(100) NOT NULL,
    current_term VARCHAR(100),
    academic_year VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    holidays JSONB DEFAULT '[]'::jsonb,
    operational_start_week INT DEFAULT 3,
    operational_end_week INT DEFAULT 14,
    total_weeks INT DEFAULT 12,
    current_week INT DEFAULT 5,
    manual_week_override BOOLEAN DEFAULT FALSE,
    days_per_week INT DEFAULT 4,
    spelling_passing_threshold NUMERIC(5,2) DEFAULT 85.00,
    grade_targets JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -----------------------------------------------------------------------------
-- 5. USERS (المستخدمون: مدراء، مشرفون، معلمون، أولياء أمور، طلاب)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE SET NULL,
    organization_id VARCHAR(255) REFERENCES organizations(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    email VARCHAR(255),
    national_id VARCHAR(50),
    login_identifier VARCHAR(100),
    password_hash VARCHAR(255),
    role VARCHAR(50) NOT NULL,
    staff_role VARCHAR(50),
    halaqah_id VARCHAR(255),
    stage_id VARCHAR(255) REFERENCES stages(id) ON DELETE SET NULL,
    student_id VARCHAR(255),
    teacher_id VARCHAR(255),
    student_ids JSONB DEFAULT '[]'::jsonb, -- للأولياء المرتبطين بعدة أبناء
    supervision_mode VARCHAR(50) DEFAULT 'full_access',
    is_active BOOLEAN DEFAULT TRUE,
    must_change_password BOOLEAN DEFAULT FALSE,
    permission_mode VARCHAR(50) DEFAULT 'role_defaults',
    role_permissions_overrides JSONB DEFAULT '{}'::jsonb,
    custom_permissions JSONB DEFAULT '[]'::jsonb,
    temporary_custom_permissions JSONB DEFAULT '[]'::jsonb,
    supervisor_scope JSONB DEFAULT '{}'::jsonb,
    assigned_stage_ids JSONB DEFAULT '[]'::jsonb,
    assigned_halaqah_ids JSONB DEFAULT '[]'::jsonb,
    is_all_halaqahs BOOLEAN DEFAULT FALSE,
    delegations JSONB DEFAULT '{}'::jsonb,
    is_archived BOOLEAN DEFAULT FALSE,
    teacher_archived BOOLEAN DEFAULT FALSE,
    supervisor_archived BOOLEAN DEFAULT FALSE,
    archive_type VARCHAR(50),
    archived_at TIMESTAMPTZ,
    archived_by VARCHAR(255),
    archive_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_tenant ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);
CREATE INDEX IF NOT EXISTS idx_users_national_id ON users(national_id);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active);

-- -----------------------------------------------------------------------------
-- 6. HALAQAHS (الحلقات القرآنية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS halaqahs (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    stage_id VARCHAR(255) REFERENCES stages(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    teacher_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    teacher_name VARCHAR(255) NOT NULL,
    teacher_phone VARCHAR(50),
    location VARCHAR(255) DEFAULT 'المسجد',
    days_per_week INT DEFAULT 4,
    grade VARCHAR(100),
    target_surah VARCHAR(100) DEFAULT 'الغاشية',
    assistant_teachers JSONB DEFAULT '[]'::jsonb,
    online_config JSONB DEFAULT '{}'::jsonb,
    weekly_schedule JSONB DEFAULT '[]'::jsonb,
    default_time_type VARCHAR(50) DEFAULT 'fixed',
    default_start_time VARCHAR(20),
    default_end_time VARCHAR(20),
    default_start_prayer_offset JSONB,
    default_end_prayer_offset JSONB,
    active_track_ids JSONB DEFAULT '["track_quran", "track_spelling", "track_virtues"]'::jsonb,
    role_permissions_overrides JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archived_by VARCHAR(255),
    archive_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_halaqahs_tenant ON halaqahs(tenant_id);
CREATE INDEX IF NOT EXISTS idx_halaqahs_teacher ON halaqahs(teacher_id);
CREATE INDEX IF NOT EXISTS idx_halaqahs_stage ON halaqahs(stage_id);

-- -----------------------------------------------------------------------------
-- 7. SPELLING LESSONS (بنك دروس الهجاء القرآني المطور)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS spelling_lessons (
    id VARCHAR(255) PRIMARY KEY,
    lesson_number INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    skill VARCHAR(255),
    description TEXT,
    expected_week INT,
    target_grade VARCHAR(100),
    passing_threshold NUMERIC(5,2) DEFAULT 85.00,
    passing_score NUMERIC(5,2) DEFAULT 85.00,
    display_order INT DEFAULT 1,
    is_active BOOLEAN DEFAULT TRUE,
    core_skills JSONB DEFAULT '[]'::jsonb,
    sub_lessons JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_spelling_lessons_number ON spelling_lessons(lesson_number);

-- -----------------------------------------------------------------------------
-- 8. STUDENTS (ملفات الطلاب وسجلاتهم الحالية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS students (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    stage_id VARCHAR(255) REFERENCES stages(id) ON DELETE SET NULL,
    halaqah_id VARCHAR(255) REFERENCES halaqahs(id) ON DELETE SET NULL,
    teacher_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    full_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(50),
    grade VARCHAR(100) NOT NULL,
    halaqah_name VARCHAR(255),
    teacher_name VARCHAR(255),
    teacher_phone VARCHAR(50),
    parent_name VARCHAR(255),
    parent_phone VARCHAR(50) NOT NULL,
    phone VARCHAR(50),
    mother_phone VARCHAR(50),
    guardian_relationship VARCHAR(100),
    other_contact_phone VARCHAR(50),
    minimum_target_surah VARCHAR(100) DEFAULT 'الغاشية',
    personal_target_surah VARCHAR(100),
    status VARCHAR(50) DEFAULT 'on_track',
    current_spelling_lesson_id VARCHAR(255) REFERENCES spelling_lessons(id) ON DELETE SET NULL,
    current_spelling_score NUMERIC(5,2) DEFAULT 0,
    current_surah VARCHAR(100) DEFAULT 'الناس',
    current_ayah INT DEFAULT 1,
    avatar_url TEXT,
    notes TEXT,
    username VARCHAR(100),
    active_quran_plan_id VARCHAR(255),
    quran_plan JSONB DEFAULT '{}'::jsonb,
    term_histories JSONB DEFAULT '[]'::jsonb,
    attendance_streak INT DEFAULT 0,
    registration_type VARCHAR(100),
    registration_type_label VARCHAR(255),
    previously_registered VARCHAR(20),
    is_active BOOLEAN DEFAULT TRUE,
    is_archived BOOLEAN DEFAULT FALSE,
    archived_at TIMESTAMPTZ,
    archive_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_students_tenant ON students(tenant_id);
CREATE INDEX IF NOT EXISTS idx_students_halaqah ON students(halaqah_id);
CREATE INDEX IF NOT EXISTS idx_students_stage ON students(stage_id);
CREATE INDEX IF NOT EXISTS idx_students_parent_phone ON students(parent_phone);
CREATE INDEX IF NOT EXISTS idx_students_national_id ON students(national_id);
CREATE INDEX IF NOT EXISTS idx_students_status ON students(status);

-- -----------------------------------------------------------------------------
-- 8b. QURAN PLANS (خطط الحفظ والمراجعة القرآنية المستقلة)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quran_plans (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    stage_id VARCHAR(255) REFERENCES stages(id) ON DELETE SET NULL,
    plan_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    scope VARCHAR(50) DEFAULT 'semester',
    direction VARCHAR(50) DEFAULT 'backward',
    unit_type VARCHAR(50) DEFAULT 'ayah',
    daily_amount NUMERIC(6,2),
    plan_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_quran_plans_tenant ON quran_plans(tenant_id);
CREATE INDEX IF NOT EXISTS idx_quran_plans_student ON quran_plans(student_id);

-- -----------------------------------------------------------------------------
-- 9. DAILY SESSION RECORDS (سجلات الحفظ والهجاء والحضور اليومية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_session_records (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    teacher_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    halaqah_id VARCHAR(255) REFERENCES halaqahs(id) ON DELETE SET NULL,
    date DATE NOT NULL,
    day_of_week VARCHAR(50),
    week_number INT NOT NULL,
    attendance VARCHAR(50) NOT NULL DEFAULT 'present',
    teacher_remarks TEXT,
    spelling_drill_minutes INT DEFAULT 10,
    spelling_progress JSONB,
    spelling JSONB,
    memorization JSONB,
    revision JSONB,
    custom_tracks JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_daily_records_tenant_date ON daily_session_records(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_daily_records_student ON daily_session_records(student_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_halaqah ON daily_session_records(halaqah_id);
CREATE INDEX IF NOT EXISTS idx_daily_records_week ON daily_session_records(tenant_id, week_number);

-- -----------------------------------------------------------------------------
-- 10. EDUCATIONAL PLAN WEEKS (الخطة التربوية والقيمية الأسبوعية)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS educational_plan_weeks (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    stage_id VARCHAR(255) REFERENCES stages(id) ON DELETE SET NULL,
    target_stage_ids JSONB DEFAULT '[]'::jsonb,
    week_number INT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    day_dates JSONB DEFAULT '{}'::jsonb,
    week_type VARCHAR(100) DEFAULT 'normal',
    special_event_title VARCHAR(255),
    domain VARCHAR(100),
    domain_label VARCHAR(100),
    value_title VARCHAR(255),
    motto VARCHAR(255) NOT NULL,
    educational_goal TEXT NOT NULL,
    goal_topic VARCHAR(255),
    goal_presenter VARCHAR(255),
    goal_location VARCHAR(255),
    activity VARCHAR(255) NOT NULL,
    activity_presenter VARCHAR(255),
    activity_location VARCHAR(255),
    responsible_person VARCHAR(255) NOT NULL,
    quranic_program VARCHAR(255),
    overall_project_budget NUMERIC(10,2) DEFAULT 0,
    budget NUMERIC(10,2) DEFAULT 0,
    notes TEXT,
    values_list JSONB DEFAULT '[]'::jsonb,
    execution_status VARCHAR(50) DEFAULT 'planned',
    status VARCHAR(50) DEFAULT 'scheduled',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_edu_plan_tenant_week ON educational_plan_weeks(tenant_id, week_number);

-- -----------------------------------------------------------------------------
-- 11. SEASONAL PROGRAMS & ACTIVITIES (البرامج والأنشطة الموسمية المستقلة)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS seasonal_programs (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    code VARCHAR(100),
    type VARCHAR(100) NOT NULL,
    season VARCHAR(100),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    target_stage_ids JSONB DEFAULT '[]'::jsonb,
    target_audience VARCHAR(255),
    location VARCHAR(255),
    max_capacity INT,
    supervisor_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    supervisor_name VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    budget NUMERIC(10,2) DEFAULT 0,
    description TEXT,
    goals JSONB DEFAULT '[]'::jsonb,
    enrolled_student_ids JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seasonal_activities (
    id VARCHAR(255) PRIMARY KEY,
    program_id VARCHAR(255) REFERENCES seasonal_programs(id) ON DELETE CASCADE,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    activity_type VARCHAR(100),
    category VARCHAR(100),
    day_of_week VARCHAR(50),
    date DATE,
    time_slot VARCHAR(100),
    responsible_name VARCHAR(255),
    supervisor_name VARCHAR(255),
    supervisor_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    location VARCHAR(255),
    points INT DEFAULT 0,
    status VARCHAR(50) DEFAULT 'planned',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS seasonal_participations (
    id VARCHAR(255) PRIMARY KEY,
    program_id VARCHAR(255) REFERENCES seasonal_programs(id) ON DELETE CASCADE,
    activity_id VARCHAR(255) REFERENCES seasonal_activities(id) ON DELETE SET NULL,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255),
    original_halaqah_id VARCHAR(255),
    original_halaqah_name VARCHAR(255),
    attendance_status VARCHAR(50) NOT NULL,
    participation_level VARCHAR(50),
    seasonal_points_earned INT DEFAULT 0,
    points_earned INT DEFAULT 0,
    achievement_note TEXT,
    recorded_by VARCHAR(255),
    notes TEXT,
    recorded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_seasonal_participations_program ON seasonal_participations(program_id);
CREATE INDEX IF NOT EXISTS idx_seasonal_participations_student ON seasonal_participations(student_id);

-- -----------------------------------------------------------------------------
-- 12. FINANCIAL MANAGEMENT & TUITION (الشؤون المالية والرسوم وسندات القبض)
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_financial_records (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(100) NOT NULL,
    base_tuition NUMERIC(10,2) NOT NULL DEFAULT 0,
    discount_amount NUMERIC(10,2) DEFAULT 0,
    discount_reason VARCHAR(255),
    scholarship_amount NUMERIC(10,2) DEFAULT 0,
    is_exempt BOOLEAN DEFAULT FALSE,
    exemption_reason VARCHAR(255),
    paid_amount NUMERIC(10,2) DEFAULT 0,
    remaining_amount NUMERIC(10,2) DEFAULT 0,
    status VARCHAR(50) NOT NULL DEFAULT 'unpaid',
    payments JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_financial_records_tenant ON student_financial_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_student ON student_financial_records(student_id);

CREATE TABLE IF NOT EXISTS finance_revenues (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    source_name VARCHAR(255) NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    date DATE NOT NULL,
    donor_or_source VARCHAR(255),
    payment_method VARCHAR(100) NOT NULL,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_expenses (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    category VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    date DATE NOT NULL,
    beneficiary VARCHAR(255) NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    program_name VARCHAR(255),
    invoice_number VARCHAR(100),
    attachment_url TEXT,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_custodies (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    holder_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    holder_name VARCHAR(255) NOT NULL,
    purpose TEXT NOT NULL,
    original_amount NUMERIC(10,2) NOT NULL,
    status VARCHAR(50) DEFAULT 'draft',
    disbursed_at TIMESTAMPTZ,
    settled_at TIMESTAMPTZ,
    closed_at TIMESTAMPTZ,
    reviewed_by VARCHAR(255),
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_custody_expenses (
    id VARCHAR(255) PRIMARY KEY,
    custody_id VARCHAR(255) REFERENCES finance_custodies(id) ON DELETE CASCADE,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    vendor VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(10,2) NOT NULL,
    category VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    payment_method VARCHAR(100) NOT NULL,
    invoice_number VARCHAR(100),
    attachment_url TEXT,
    notes TEXT,
    created_by VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_budget_requests (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    requester_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    requester_name VARCHAR(255) NOT NULL,
    program_name VARCHAR(255) NOT NULL,
    estimated_amount NUMERIC(10,2) NOT NULL,
    justification TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'pending',
    reviewed_by VARCHAR(255),
    reviewed_at TIMESTAMPTZ,
    review_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS finance_settings (
    tenant_id VARCHAR(255) PRIMARY KEY REFERENCES tenants(id) ON DELETE CASCADE,
    revenue_sources JSONB DEFAULT '["رسوم الطلاب", "تبرعات", "دعم", "أوقاف", "أخرى"]'::jsonb,
    expense_categories JSONB DEFAULT '["تشغيلي", "رواتب ومكافآت", "برامج وأنشطة", "قرطاسية", "جوائز وهدايا", "أخرى"]'::jsonb,
    payment_methods JSONB DEFAULT '["نقدي", "تحويل بنكي", "شبكة", "أخرى"]'::jsonb,
    tuition_configs JSONB DEFAULT '[]'::jsonb,
    default_tuition_amount NUMERIC(10,2) DEFAULT 0,
    bank_accounts JSONB DEFAULT '[]'::jsonb,
    financial_policies JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 13. ADMISSIONS & REGISTRATION REQUESTS (بوابة القبول والتسجيل)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS registration_requests (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    national_id VARCHAR(50),
    parent_name VARCHAR(255) NOT NULL,
    parent_phone VARCHAR(50) NOT NULL,
    mother_phone VARCHAR(50),
    guardian_relationship VARCHAR(100),
    other_contact_phone VARCHAR(50),
    birth_date DATE,
    grade VARCHAR(100) NOT NULL,
    registration_type VARCHAR(100),
    registration_type_label VARCHAR(255),
    tuition_fee_amount NUMERIC(10,2),
    fee_pledge_accepted BOOLEAN DEFAULT FALSE,
    previously_registered VARCHAR(20),
    desired_stage_id VARCHAR(255) REFERENCES stages(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    interview_notes TEXT,
    interview_score NUMERIC(5,2),
    financial_decision_notes TEXT,
    assigned_halaqah_id VARCHAR(255) REFERENCES halaqahs(id) ON DELETE SET NULL,
    assigned_teacher_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    enrolled_student_id VARCHAR(255) REFERENCES students(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_reg_requests_tenant ON registration_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_reg_requests_status ON registration_requests(status);

-- -------------------------------------------------------------
-- 14. MULTI-TRACKS & NOMINATIONS (المسارات التخصصية واختبارات الجمعية)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS track_definitions (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    short_name VARCHAR(100) NOT NULL,
    description TEXT,
    icon VARCHAR(100) DEFAULT 'BookOpen',
    color_scheme VARCHAR(50) DEFAULT 'emerald',
    is_active BOOLEAN DEFAULT TRUE,
    role_permissions_overrides JSONB DEFAULT '{}'::jsonb,
    display_order INT DEFAULT 1,
    nomination_config JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS track_nominations (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    track_id VARCHAR(255) REFERENCES track_definitions(id) ON DELETE CASCADE,
    track_name VARCHAR(255),
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    halaqah_id VARCHAR(255) REFERENCES halaqahs(id) ON DELETE SET NULL,
    halaqah_name VARCHAR(255),
    teacher_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    teacher_name VARCHAR(255),
    target_branch_or_level VARCHAR(255) NOT NULL,
    target_branch_snapshot VARCHAR(255),
    status VARCHAR(50) DEFAULT 'submitted',
    nomination_card_number VARCHAR(100),
    internal_exam JSONB,
    supervisor_approval JSONB,
    association_exam JSONB,
    teacher_recommendation VARCHAR(50),
    teacher_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS association_nominations (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    halaqah_id VARCHAR(255) REFERENCES halaqahs(id) ON DELETE SET NULL,
    halaqah_name VARCHAR(255),
    teacher_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    teacher_name VARCHAR(255),
    nomination_type VARCHAR(100) NOT NULL,
    target_title VARCHAR(255) NOT NULL,
    internal_exam_score NUMERIC(5,2) DEFAULT 0,
    teacher_recommendation VARCHAR(50),
    teacher_notes TEXT,
    supervisor_status VARCHAR(50) DEFAULT 'pending',
    supervisor_notes TEXT,
    nomination_card_number VARCHAR(100),
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_track_nominations_tenant ON track_nominations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assoc_nominations_tenant ON association_nominations(tenant_id);

-- -------------------------------------------------------------
-- 15. INCENTIVES, BADGES, AND POINTS (منظومة الأوسمة والنقاط والتحفيز)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS student_badges (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    badge_type VARCHAR(100) NOT NULL,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    awarded_at DATE NOT NULL,
    awarded_by VARCHAR(255) NOT NULL,
    notes TEXT,
    is_automatic BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_point_rules (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    default_points INT NOT NULL DEFAULT 10,
    is_active BOOLEAN DEFAULT TRUE,
    role_permissions_overrides JSONB DEFAULT '{}'::jsonb,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS student_points (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255),
    rule_id VARCHAR(255) REFERENCES student_point_rules(id) ON DELETE SET NULL,
    category VARCHAR(100) NOT NULL,
    points INT NOT NULL,
    reason TEXT NOT NULL,
    date DATE NOT NULL,
    recorded_by VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS remedial_plans (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    student_id VARCHAR(255) REFERENCES students(id) ON DELETE CASCADE,
    student_name VARCHAR(255) NOT NULL,
    halaqah_id VARCHAR(255) REFERENCES halaqahs(id) ON DELETE SET NULL,
    teacher_id VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    risk_level VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    diagnostic_summary TEXT NOT NULL,
    recommended_action TEXT NOT NULL,
    parent_guidance TEXT,
    status VARCHAR(50) DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 16. MEETINGS & OFFICIAL MINUTES (منظومة الاجتماعات والمحاضر والقرارات)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS meetings (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    meeting_number VARCHAR(100),
    category VARCHAR(100) DEFAULT 'general',
    date DATE NOT NULL,
    start_time VARCHAR(20) NOT NULL,
    end_time VARCHAR(20),
    location_type VARCHAR(50) DEFAULT 'in_person',
    location VARCHAR(255),
    meeting_url TEXT,
    description TEXT,
    objectives JSONB DEFAULT '[]'::jsonb,
    agenda JSONB DEFAULT '[]'::jsonb,
    attendees JSONB DEFAULT '[]'::jsonb,
    discussions TEXT,
    decisions JSONB DEFAULT '[]'::jsonb,
    recommendations JSONB DEFAULT '[]'::jsonb,
    postponed_items JSONB DEFAULT '[]'::jsonb,
    notes TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    cancellation_reason TEXT,
    created_by VARCHAR(255) REFERENCES users(id) ON DELETE SET NULL,
    created_by_name VARCHAR(255) NOT NULL,
    created_by_role VARCHAR(50) NOT NULL,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_meetings_tenant ON meetings(tenant_id);
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(date);

-- -------------------------------------------------------------
-- 17. STAFF ATTENDANCE (حضور وانصراف الكادر الجغرافي والإداري)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS staff_attendance (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    user_id VARCHAR(255) REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    date DATE NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    is_regular_day BOOLEAN DEFAULT TRUE,
    reason VARCHAR(255),
    method VARCHAR(50) DEFAULT 'geo',
    location_data JSONB,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_att_tenant_date ON staff_attendance(tenant_id, date);
CREATE INDEX IF NOT EXISTS idx_staff_att_user ON staff_attendance(user_id);

-- -------------------------------------------------------------
-- 18. PRAYER TIMES CACHE (مواقيت الصلاة السنوية المزامنة)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS prayer_times (
    id VARCHAR(255) PRIMARY KEY, -- e.g. "ghazzawi_2026"
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    year INT NOT NULL,
    latitude NUMERIC(10,6) NOT NULL,
    longitude NUMERIC(10,6) NOT NULL,
    timezone VARCHAR(100) DEFAULT 'Asia/Riyadh',
    method INT DEFAULT 4,
    last_synced_at TIMESTAMPTZ,
    source VARCHAR(100) DEFAULT 'aladhan',
    timings_by_date JSONB NOT NULL DEFAULT '{}'::jsonb,
    adjustments JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 19. FRONTEND CONFIGS & PUBLIC CONTENT (تخصيص الواجهات والبانرات والإعلانات)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS frontend_configs (
    id VARCHAR(255) PRIMARY KEY, -- 'platform' or tenant_id
    type VARCHAR(50) NOT NULL DEFAULT 'tenant',
    name VARCHAR(255) NOT NULL,
    description TEXT,
    logo_url TEXT,
    contact_email VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_whatsapp VARCHAR(50),
    address TEXT,
    show_supervisor BOOLEAN DEFAULT TRUE,
    show_prayer_times BOOLEAN DEFAULT TRUE,
    primary_color VARCHAR(50),
    banners JSONB DEFAULT '[]'::jsonb,
    announcements JSONB DEFAULT '[]'::jsonb,
    sections JSONB DEFAULT '[]'::jsonb,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 20. AUDIT LOGS & REPORT LOGS (سجل الرقابة الأمني وسجلات التقارير المرسلة)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(255) PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    user_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    entity_name VARCHAR(255),
    previous_value JSONB,
    new_value JSONB,
    notes TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);

CREATE TABLE IF NOT EXISTS report_logs (
    id VARCHAR(255) PRIMARY KEY,
    recipient_type VARCHAR(50) NOT NULL,
    recipient_name VARCHAR(255) NOT NULL,
    recipient_phone VARCHAR(50),
    student_id VARCHAR(255),
    teacher_id VARCHAR(255),
    report_type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'sent'
);

-- -------------------------------------------------------------
-- 21. ACADEMIC ARCHIVES (أرشيف الفصول الدراسية المغلقة)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS academic_archives (
    id VARCHAR(255) PRIMARY KEY,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    tenant_name VARCHAR(255) NOT NULL,
    academic_year VARCHAR(100) NOT NULL,
    term_name VARCHAR(255) NOT NULL,
    archived_at TIMESTAMPTZ NOT NULL,
    archived_by VARCHAR(255) NOT NULL,
    total_students INT DEFAULT 0,
    total_halaqahs INT DEFAULT 0,
    overall_mastery_rate NUMERIC(5,2) DEFAULT 0,
    notes TEXT,
    student_snapshots JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 22. EMERGENCY SUPPORT SESSIONS (جلسات الدعم الفني الطارئ للنظام)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS support_sessions (
    id VARCHAR(255) PRIMARY KEY,
    system_admin_uid VARCHAR(255) NOT NULL,
    system_admin_name VARCHAR(255) NOT NULL,
    tenant_id VARCHAR(255) REFERENCES tenants(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    role_permissions_overrides JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- -------------------------------------------------------------
-- 23. MIGRATION RUNS & LOGS (سجلات ترحيل البيانات والتدقيق التكاملي)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS migration_runs (
    id VARCHAR(255) PRIMARY KEY, -- e.g. QRMS-MIG-YYYYMMDD-XXXXXXXX
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    source VARCHAR(100) NOT NULL DEFAULT 'firestore_backup_snapshot',
    target VARCHAR(100) NOT NULL DEFAULT 'postgresql_vps',
    source_doc_count INT DEFAULT 0,
    attempted_inserts INT DEFAULT 0,
    successful_inserts INT DEFAULT 0,
    skipped_records INT DEFAULT 0,
    merged_records INT DEFAULT 0,
    failed_records INT DEFAULT 0,
    warnings_count INT DEFAULT 0,
    errors_count INT DEFAULT 0,
    verification_status VARCHAR(50) DEFAULT 'PENDING',
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
    details JSONB DEFAULT '{}'::jsonb,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_migration_runs_status ON migration_runs(status);
CREATE INDEX IF NOT EXISTS idx_migration_runs_started ON migration_runs(started_at DESC);

CREATE TABLE IF NOT EXISTS migration_logs (
    id VARCHAR(255) PRIMARY KEY,
    migration_run_id VARCHAR(255) REFERENCES migration_runs(id) ON DELETE CASCADE,
    collection VARCHAR(100) NOT NULL,
    document_id VARCHAR(255) NOT NULL,
    operation VARCHAR(50) NOT NULL, -- INSERT, MERGE, SKIP, SEED_ATTACH, DEFER_FK, ERROR
    status VARCHAR(50) NOT NULL, -- SUCCESS, SKIPPED, MERGED, FAILED, WARNING
    error TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_migration_logs_run_id ON migration_logs(migration_run_id);
CREATE INDEX IF NOT EXISTS idx_migration_logs_col ON migration_logs(collection);
CREATE INDEX IF NOT EXISTS idx_migration_logs_status ON migration_logs(status);

-- =============================================================================
-- End of QRMS PostgreSQL Schema
-- =============================================================================
