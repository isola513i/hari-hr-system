import * as dotenv from "dotenv";
import * as path from "path";

// Load env vars from the correct location
const envPath = path.resolve(__dirname, "../../.env");
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

import pool from "../db";
import bcrypt from "bcrypt";

const schema = `
-- Clean up existing tables
DROP TABLE IF EXISTS survey_completions CASCADE;
DROP TABLE IF EXISTS survey_responses CASCADE;
DROP TABLE IF EXISTS survey_questions CASCADE;
DROP TABLE IF EXISTS surveys CASCADE;
DROP TABLE IF EXISTS personal_notes CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS upcoming_events CASCADE;
DROP TABLE IF EXISTS audit_logs_persistent CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS compliance_items CASCADE;
DROP TABLE IF EXISTS sentiment_stats CASCADE;
DROP TABLE IF EXISTS stats_headcount CASCADE;
DROP TABLE IF EXISTS salary_history CASCADE;
DROP TABLE IF EXISTS payroll_records CASCADE;
DROP TABLE IF EXISTS attendance_records CASCADE;
DROP TABLE IF EXISTS performance_reviews CASCADE;
DROP TABLE IF EXISTS job_history CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS employee_training CASCADE;
DROP TABLE IF EXISTS training_modules CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS leave_requests CASCADE;
DROP TABLE IF EXISTS contacts CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Users (Auth)
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'EMPLOYEE',
    email_notifications BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Password Reset Tokens
CREATE TABLE password_reset_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_prt_user_id ON password_reset_tokens(user_id);
CREATE INDEX idx_prt_token_hash ON password_reset_tokens(token_hash);

-- Refresh Tokens (for JWT refresh token rotation)
CREATE TABLE refresh_tokens (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_rt_user_id ON refresh_tokens(user_id);
CREATE INDEX idx_rt_token_hash ON refresh_tokens(token_hash);

-- 1. Employees (Profile)
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id), -- Link to Auth User
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL, -- Should match User email typically
    role VARCHAR(100),
    department VARCHAR(100),
    avatar TEXT,
    status VARCHAR(50) DEFAULT 'Active',
    onboarding_status VARCHAR(50) DEFAULT 'Not Started',
    join_date DATE,
    location VARCHAR(100),
    skills TEXT[],
    bio TEXT,
    phone VARCHAR(20), -- Phone number with country code
    slack VARCHAR(100),
    emergency_contact VARCHAR(255),
    onboarding_percentage INT DEFAULT 0,
    salary DECIMAL(12,2),
    daily_rate DECIMAL(12,2),
    manager_id UUID,
    work_type VARCHAR(20) DEFAULT 'office',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Leave Requests
CREATE TABLE leave_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'Pending',
    approver_id UUID REFERENCES employees(id),
    rejection_reason TEXT,
    handover_employee_id UUID REFERENCES employees(id),
    handover_notes TEXT,
    medical_certificate_path TEXT,
    business_days DECIMAL(5,1),
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_period VARCHAR(10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Holidays Calendar
CREATE TABLE holidays (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    date DATE NOT NULL,
    end_date DATE DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    is_recurring BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_holidays_date ON holidays(date);
CREATE INDEX idx_holidays_is_recurring ON holidays(is_recurring);

-- Leave Request Audit History
CREATE TABLE leave_request_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    leave_request_id UUID NOT NULL REFERENCES leave_requests(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    status VARCHAR(20) NOT NULL,
    approver_id UUID,
    rejection_reason TEXT,
    handover_employee_id UUID,
    handover_notes TEXT,
    medical_certificate_path TEXT,
    business_days DECIMAL(5,1),
    is_half_day BOOLEAN DEFAULT FALSE,
    half_day_period VARCHAR(10),
    change_type VARCHAR(20) NOT NULL,
    changed_by UUID NOT NULL,
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_lrh_leave_request_id ON leave_request_history(leave_request_id);

-- 3. Tasks (Onboarding)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    stage VARCHAR(50),
    assignee VARCHAR(100),
    due_date DATE,
    completed BOOLEAN DEFAULT FALSE,
    priority VARCHAR(20),
    link TEXT,
    employee_id UUID REFERENCES employees(id)
);

-- 5. Training Modules (Content)
CREATE TABLE training_modules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    duration VARCHAR(50),
    type VARCHAR(50), -- Video, Quiz, Reading
    status VARCHAR(50), -- Locked, In Progress
    thumbnail TEXT,
    progress INT DEFAULT 0,
    created_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Employee Training Records (Progress)
CREATE TABLE employee_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    module_id UUID REFERENCES training_modules(id),
    title VARCHAR(255),
    duration VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Not Started',
    completion_date DATE,
    score INT,
    due_date DATE,
    assigned_by UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. Documents
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20),
    category VARCHAR(50),
    size VARCHAR(20),
    owner_name VARCHAR(100),
    employee_id UUID REFERENCES employees(id),
    file_path TEXT,
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_accessed TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'Active',
    deleted_at TIMESTAMP WITH TIME ZONE
);

-- 8. Job History
CREATE TABLE job_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    role VARCHAR(100),
    department VARCHAR(100),
    start_date DATE,
    end_date DATE, -- NULL for Present
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_job_history_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- 9. Performance Reviews
CREATE TABLE performance_reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    date DATE,
    reviewer VARCHAR(100),
    rating INT,
    notes TEXT
);

-- 10. Announcements
CREATE TABLE announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50),
    date_str VARCHAR(50), -- "July 25" format from mock, or use real DATE
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 11. Events
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    date_str VARCHAR(50),
    type VARCHAR(50),
    avatar TEXT,
    color VARCHAR(20)
);

-- 12. Contacts (Key Contacts)
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100),
    role VARCHAR(100),
    relation VARCHAR(50),
    email VARCHAR(100),
    avatar TEXT
);

-- 13. Audit Logs (Legacy - for backward compatibility)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_name VARCHAR(100),
    action VARCHAR(255),
    target VARCHAR(100),
    time_str VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50)
);

-- 13b. Audit Logs Persistent (New - comprehensive audit trail)
CREATE TABLE audit_logs_persistent (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID,
    user_email VARCHAR(255),
    action VARCHAR(255) NOT NULL,
    resource VARCHAR(100) NOT NULL,
    method VARCHAR(10) NOT NULL,
    path VARCHAR(500) NOT NULL,
    ip VARCHAR(45),
    user_agent TEXT,
    status_code INT,
    duration INT,
    success BOOLEAN DEFAULT TRUE,
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for audit_logs_persistent
CREATE INDEX idx_audit_logs_user_id ON audit_logs_persistent(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs_persistent(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs_persistent(resource);
CREATE INDEX idx_audit_logs_created_at ON audit_logs_persistent(created_at DESC);

-- 14. Headcount Stats
CREATE TABLE stats_headcount (
    id SERIAL PRIMARY KEY,
    name VARCHAR(20), -- Month name
    value INT
);

-- 15. Compliance Items
CREATE TABLE compliance_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50) NOT NULL DEFAULT 'Custom',
    status VARCHAR(50) NOT NULL DEFAULT 'Draft',
    priority VARCHAR(20) NOT NULL DEFAULT 'Medium',
    risk_level VARCHAR(20) NOT NULL DEFAULT 'Low',
    assigned_to UUID REFERENCES employees(id) ON DELETE SET NULL,
    assigned_department VARCHAR(100),
    due_date DATE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15b. Compliance Status History
CREATE TABLE compliance_status_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_item_id UUID NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
    old_status VARCHAR(50),
    new_status VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 15c. Compliance Evidence
CREATE TABLE compliance_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    compliance_item_id UUID NOT NULL REFERENCES compliance_items(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT,
    uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 16. Sentiment Stats
CREATE TABLE sentiment_stats (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    value INTEGER NOT NULL
);

-- ==========================================
-- PERFORMANCE INDEXES
-- ==========================================

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);

-- Employees indexes
CREATE INDEX idx_employees_email ON employees(email);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_employees_user_id ON employees(user_id);
CREATE INDEX idx_employees_name ON employees(name);

-- Leave requests indexes
CREATE INDEX idx_leave_requests_employee_id ON leave_requests(employee_id);
CREATE INDEX idx_leave_requests_status ON leave_requests(status);
CREATE INDEX idx_leave_requests_start_date ON leave_requests(start_date);
CREATE INDEX idx_leave_requests_created_at ON leave_requests(created_at DESC);

-- Documents indexes
CREATE INDEX idx_documents_employee_id ON documents(employee_id);
CREATE INDEX idx_documents_category ON documents(category);

-- Job history indexes
CREATE INDEX idx_job_history_employee_id ON job_history(employee_id);

-- Performance reviews indexes
CREATE INDEX idx_performance_reviews_employee_id ON performance_reviews(employee_id);
CREATE INDEX idx_performance_reviews_date ON performance_reviews(date DESC);

-- Tasks indexes
CREATE INDEX idx_tasks_employee_id ON tasks(employee_id);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_tasks_completed ON tasks(completed);

-- Employee training indexes
CREATE INDEX idx_employee_training_employee_id ON employee_training(employee_id);
CREATE INDEX idx_employee_training_status ON employee_training(status);
CREATE INDEX idx_employee_training_due_date ON employee_training(due_date);
CREATE INDEX idx_employee_training_module_id ON employee_training(module_id);
CREATE INDEX idx_training_modules_is_active ON training_modules(is_active);
CREATE UNIQUE INDEX idx_employee_training_unique_assignment
  ON employee_training(employee_id, module_id) WHERE module_id IS NOT NULL;

-- Compliance indexes
CREATE INDEX idx_compliance_items_status ON compliance_items(status);
CREATE INDEX idx_compliance_items_category ON compliance_items(category);
CREATE INDEX idx_compliance_items_assigned_to ON compliance_items(assigned_to);
CREATE INDEX idx_compliance_items_due_date ON compliance_items(due_date);
CREATE INDEX idx_compliance_status_history_item ON compliance_status_history(compliance_item_id);
CREATE INDEX idx_compliance_evidence_item ON compliance_evidence(compliance_item_id);

-- ==========================================
-- PAYROLL & ATTENDANCE TABLES
-- ==========================================

-- 17. Attendance Records
CREATE TABLE attendance_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    clock_in TIMESTAMP WITH TIME ZONE,
    clock_out TIMESTAMP WITH TIME ZONE,
    break_duration INT DEFAULT 0, -- in minutes
    total_hours DECIMAL(5,2),
    status VARCHAR(20) DEFAULT 'On-time', -- On-time, Late, Absent, On-leave
    notes TEXT,
    clock_in_lat DECIMAL(10, 8),
    clock_in_lng DECIMAL(11, 8),
    clock_in_accuracy FLOAT,
    check_in_type VARCHAR(20) DEFAULT 'office',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_attendance UNIQUE (employee_id, date)
);

-- 18a. WFH Requests
CREATE TABLE wfh_requests (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    date        DATE NOT NULL,
    reason      TEXT,
    status      VARCHAR(20) DEFAULT 'pending',
    reviewed_by UUID REFERENCES employees(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_wfh_request UNIQUE (employee_id, date)
);
CREATE INDEX idx_wfh_requests_employee ON wfh_requests(employee_id);
CREATE INDEX idx_wfh_requests_date ON wfh_requests(date);
CREATE INDEX idx_wfh_requests_status ON wfh_requests(status);

-- 18. Payroll Records
CREATE TABLE payroll_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    base_salary DECIMAL(12,2) NOT NULL,
    overtime_hours DECIMAL(5,2) DEFAULT 0,
    overtime_pay DECIMAL(12,2) DEFAULT 0,
    bonus DECIMAL(12,2) DEFAULT 0,
    leave_deduction DECIMAL(12,2) DEFAULT 0, -- Deduction from unpaid leave
    deductions DECIMAL(12,2) DEFAULT 0, -- Other deductions
    tax_amount DECIMAL(12,2) DEFAULT 0,
    ssf_employee DECIMAL(12,2) DEFAULT 0,
    ssf_employer DECIMAL(12,2) DEFAULT 0,
    pvf_employee DECIMAL(12,2) DEFAULT 0,
    pvf_employer DECIMAL(12,2) DEFAULT 0,
    net_pay DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Processed, Paid, Cancelled
    payment_date DATE,
    payment_method VARCHAR(50), -- Bank Transfer, Check, Cash
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Partial unique index: prevent duplicate payroll for the same employee+period, excluding Cancelled records
CREATE UNIQUE INDEX unique_payroll_period
    ON payroll_records (employee_id, pay_period_start, pay_period_end)
    WHERE status != 'Cancelled';

-- 19. Salary History
CREATE TABLE salary_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    effective_date DATE NOT NULL,
    base_salary DECIMAL(12,2) NOT NULL,
    previous_salary DECIMAL(12,2),
    change_reason VARCHAR(100), -- Promotion, Annual Increase, Market Adjustment
    approved_by UUID REFERENCES employees(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Attendance indexes
CREATE INDEX idx_attendance_employee_id ON attendance_records(employee_id);
CREATE INDEX idx_attendance_date ON attendance_records(date DESC);
CREATE INDEX idx_attendance_status ON attendance_records(status);

-- Payroll indexes
CREATE INDEX idx_payroll_employee_id ON payroll_records(employee_id);
CREATE INDEX idx_payroll_period ON payroll_records(pay_period_start, pay_period_end);
CREATE INDEX idx_payroll_status ON payroll_records(status);

-- Salary history indexes
CREATE INDEX idx_salary_history_employee_id ON salary_history(employee_id);
CREATE INDEX idx_salary_history_effective_date ON salary_history(effective_date DESC);

-- ==========================================
-- NOTIFICATIONS TABLE
-- ==========================================

-- 20. Notifications
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'info', -- info, success, warning, leave, employee, document, system
    read BOOLEAN DEFAULT FALSE,
    link VARCHAR(255), -- Optional link to related resource
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 22. Push Notification Subscriptions
CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, endpoint)
);

-- 23. Upcoming Events (Calendar)
CREATE TABLE upcoming_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    date DATE NOT NULL,
    type VARCHAR(50) DEFAULT 'Meeting', -- Birthday, Meeting, Social
    avatar TEXT,
    color VARCHAR(20),
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Notifications indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- ==========================================
-- PERSONAL NOTES TABLE
-- ==========================================

-- 21. Personal Notes
CREATE TABLE personal_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    color VARCHAR(20) DEFAULT 'default', -- default, yellow, green, blue, pink
    pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Personal notes indexes
CREATE INDEX idx_personal_notes_user_id ON personal_notes(user_id);
CREATE INDEX idx_personal_notes_pinned ON personal_notes(pinned DESC);
CREATE INDEX idx_personal_notes_updated_at ON personal_notes(updated_at DESC);

-- Upcoming events indexes
CREATE INDEX idx_upcoming_events_date ON upcoming_events(date);
CREATE INDEX idx_upcoming_events_type ON upcoming_events(type);

-- ==========================================
-- SURVEY TABLES
-- ==========================================

-- Surveys
CREATE TABLE surveys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    allow_retake BOOLEAN DEFAULT FALSE,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

-- Survey Questions
CREATE TABLE survey_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    question_text VARCHAR(500) NOT NULL,
    category VARCHAR(50) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0
);

-- Survey Responses (ANONYMOUS — no employee_id)
CREATE TABLE survey_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Survey Completions (tracks who completed, prevents double-submit)
CREATE TABLE survey_completions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_survey_completion UNIQUE (survey_id, employee_id)
);

-- Survey indexes
CREATE INDEX idx_survey_questions_survey ON survey_questions(survey_id);
CREATE INDEX idx_survey_responses_question ON survey_responses(question_id);
CREATE INDEX idx_survey_completions_survey ON survey_completions(survey_id);
CREATE INDEX idx_survey_completions_employee ON survey_completions(employee_id);

-- ==========================================
-- EMPLOYEE LEAVE QUOTA OVERRIDES
-- ==========================================

CREATE TABLE employee_leave_quotas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    total INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_employee_leave_type UNIQUE (employee_id, leave_type)
);
CREATE INDEX idx_elq_employee_id ON employee_leave_quotas(employee_id);
`;

export const runMigration = async () => {
  try {
    console.log("Connecting to database...");
    console.log("Running migration...");

    // Hash passwords for seeds
    const saltRounds = 10;
    const defaultPassword = process.env.DEFAULT_ADMIN_PASSWORD || "Welcome123!";
    const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

    const seededSchema =
      schema +
      `
-- INITIAL ADMIN USER (for first login)
-- Email: admin@aiya.ai
-- Password: Welcome123!

INSERT INTO users (id, email, password_hash, role) VALUES
('11111111-1111-1111-1111-111111111111', 'admin@aiya.ai', '${passwordHash}', 'HR_ADMIN');

INSERT INTO employees (id, user_id, name, email, role, department, status, join_date) VALUES
('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'System Admin', 'admin@aiya.ai', 'HR Admin', 'Human Resources', 'Active', CURRENT_DATE);

-- Seed Key Contacts for Onboarding
INSERT INTO contacts (name, role, relation, email, avatar) VALUES
('System Admin', 'HR Admin', 'HR Contact', 'admin@aiya.ai', 'https://ui-avatars.com/api/?name=System+Admin&background=6366f1&color=fff'),
('Alex Thompson', 'IT Support Lead', 'IT Support', 'alex@aiya.ai', 'https://ui-avatars.com/api/?name=Alex+Thompson&background=06b6d4&color=fff'),
('Maria Garcia', 'Office Manager', 'Facilities', 'maria@aiya.ai', 'https://ui-avatars.com/api/?name=Maria+Garcia&background=f59e0b&color=fff'),
('James Wilson', 'Engineering Manager', 'Buddy/Mentor', 'james@aiya.ai', 'https://ui-avatars.com/api/?name=James+Wilson&background=10b981&color=fff');

-- Sample Job History for System Admin
INSERT INTO job_history (employee_id, role, department, start_date, end_date, description) VALUES
('00000000-0000-0000-0000-000000000001', 'HR Admin', 'Human Resources', '2024-01-01', NULL, 'Leading HR operations, managing employee data and overseeing recruitment processes.'),
('00000000-0000-0000-0000-000000000001', 'HR Specialist', 'Human Resources', '2022-06-01', '2023-12-31', 'Handled employee onboarding, benefits administration, and HR policy implementation.'),
('00000000-0000-0000-0000-000000000001', 'HR Assistant', 'Human Resources', '2021-01-15', '2022-05-31', 'Supported HR team with administrative tasks, scheduling interviews, and maintaining employee records.');

-- ==========================================
-- ISO 45003 Psychosocial Health & Safety Survey (Seed)
-- ==========================================

INSERT INTO surveys (id, title, status, created_by)
VALUES ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'ISO 45003 — Psychosocial Health & Safety Assessment', 'active', '11111111-1111-1111-1111-111111111111');

INSERT INTO survey_questions (survey_id, question_text, category, sort_order) VALUES
  -- Workload  (ISO 45003 §A3 Job Demands, §A6 Workload, §A1 Role Clarity, §A2 Autonomy, §C1 Tools)
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'My workload is manageable within normal working hours', 'Workload', 1),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Deadlines and sprint commitments set for my work are realistic', 'Workload', 2),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I have autonomy in deciding how to approach and complete my tasks', 'Workload', 3),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'My roles and responsibilities are clearly defined', 'Workload', 4),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I have the tools, equipment, and software I need to do my job effectively', 'Workload', 5),

  -- Team  (ISO 45003 §B1 Relationships, §B7 Civility/Trust, §B10 Harassment, §A5 Remote Work)
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I have positive and supportive working relationships with my colleagues', 'Team', 6),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I feel psychologically safe to voice opinions, ask questions, and admit mistakes', 'Team', 7),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Disagreements and conflicts within my team are resolved constructively', 'Team', 8),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I am treated with respect and fairness by my peers', 'Team', 9),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I feel connected to my team and not isolated, even when working remotely', 'Team', 10),

  -- Growth  (ISO 45003 §B5 Career Development, §B4 Recognition, §A4 Change Mgmt, §A8 Job Security)
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I see a clear path for career advancement in this organization', 'Growth', 11),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I have regular opportunities to learn new skills and technologies', 'Growth', 12),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'My contributions and achievements are recognized and valued', 'Growth', 13),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I feel secure and stable in my current role', 'Growth', 14),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Organizational changes are communicated transparently and with adequate notice', 'Growth', 15),

  -- Work-Life Balance  (ISO 45003 §B8 Boundaries, §A7 Work Schedule, §C2 Workspace)
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I can disconnect from work communications outside of working hours', 'Work-Life Balance', 16),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'The organization genuinely respects my personal time and boundaries', 'Work-Life Balance', 17),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I feel able to take leave or time off when I need it without guilt or pressure', 'Work-Life Balance', 18),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'My work schedule allows me to maintain a healthy personal life', 'Work-Life Balance', 19),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'My workspace (office or home) is comfortable, ergonomic, and conducive to focus', 'Work-Life Balance', 20),

  -- Management  (ISO 45003 §B2 Leadership, §B6 Support, §B3 Culture, §B7 Trust)
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'My direct manager provides regular and constructive feedback', 'Management', 21),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'I feel genuinely supported by my manager when I face challenges', 'Management', 22),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Senior leadership communicates a clear vision and strategic direction', 'Management', 23),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'Decisions about people (promotions, assignments, evaluations) are made fairly', 'Management', 24),
  ('aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee', 'There is a culture of transparency, honesty, and trust at all levels', 'Management', 25);
`;

    await pool.query(seededSchema);

    console.log("Migration completed & Seed data inserted successfully.");
  } catch (err) {
    console.error("Error running migration:", err);
    throw err;
  } finally {
    if (require.main === module) {
      await pool.end();
    }
  }
};

if (require.main === module) {
  runMigration().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
