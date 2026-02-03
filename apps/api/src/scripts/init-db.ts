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
DROP TABLE IF EXISTS personal_notes CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS audit_logs CASCADE;
DROP TABLE IF EXISTS compliance_items CASCADE;
DROP TABLE IF EXISTS sentiment_stats CASCADE;
DROP TABLE IF EXISTS stats_headcount CASCADE;
DROP TABLE IF EXISTS performance_reviews CASCADE;
DROP TABLE IF EXISTS job_history CASCADE;
DROP TABLE IF EXISTS documents CASCADE;
DROP TABLE IF EXISTS employee_training CASCADE;
DROP TABLE IF EXISTS training_modules CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS leave_balances CASCADE;
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
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

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
    onboarding_status VARCHAR(50) DEFAULT 'Completed',
    join_date DATE,
    location VARCHAR(100),
    skills TEXT[],
    bio TEXT,
    slack VARCHAR(100),
    emergency_contact VARCHAR(255),
    onboarding_percentage INT DEFAULT 0,
    manager_id UUID,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Leave Balances
CREATE TABLE leave_balances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    year INT NOT NULL,
    leave_type VARCHAR(50) NOT NULL,
    quota_days INT DEFAULT 0,
    used_days DECIMAL(5,2) DEFAULT 0,
    CONSTRAINT unique_balance UNIQUE (employee_id, year, leave_type)
);

-- 4. Tasks (Onboarding)
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
    duration VARCHAR(50),
    type VARCHAR(50), -- Video, Quiz, etc.
    status VARCHAR(50), -- Locked, In Progress (Default state for new assignments?)
    thumbnail TEXT,
    progress INT DEFAULT 0
);

-- 6. Employee Training Records (Progress)
CREATE TABLE employee_training (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id),
    module_id UUID REFERENCES training_modules(id), -- Optional link if we want strictly relational
    title VARCHAR(255), -- Denormalized title if module removed
    duration VARCHAR(50),
    status VARCHAR(50) DEFAULT 'Not Started',
    completion_date DATE,
    score INT
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
    description TEXT
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
    date_str VARCHAR(50) -- "July 25" format from mock, or use real DATE
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
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL
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

-- Leave balances indexes
CREATE INDEX idx_leave_balances_employee_id ON leave_balances(employee_id);
CREATE INDEX idx_leave_balances_year ON leave_balances(year);

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
    status VARCHAR(20) DEFAULT 'Present', -- Present, Absent, Late, Half-day, Remote
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_attendance UNIQUE (employee_id, date)
);

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
    deductions DECIMAL(12,2) DEFAULT 0,
    tax_amount DECIMAL(12,2) DEFAULT 0,
    net_pay DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Processed, Paid
    payment_date DATE,
    payment_method VARCHAR(50), -- Bank Transfer, Check, Cash
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

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
`;

export const runMigration = async () => {
  try {
    console.log("Connecting to database...");
    console.log("Running migration...");

    // Hash passwords for seeds
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash("Welcome123!", saltRounds);

    const seededSchema =
      schema +
      `
-- SEED DATA

-- USERS
INSERT INTO users (id, email, password_hash, role) VALUES
('11111111-1111-1111-1111-111111111111', 'liam.j@nexus.hr', '${passwordHash}', 'HR_ADMIN'), -- Liam is Admin for demo
('22222222-2222-2222-2222-222222222222', 'emma.w@nexus.hr', '${passwordHash}', 'EMPLOYEE'),
('33333333-3333-3333-3333-333333333333', 'noah.b@nexus.hr', '${passwordHash}', 'EMPLOYEE'),
('44444444-4444-4444-4444-444444444444', 'sophia.g@nexus.hr', '${passwordHash}', 'EMPLOYEE'),
('55555555-5555-5555-5555-555555555555', 'james.m@nexus.hr', '${passwordHash}', 'EMPLOYEE'),
('66666666-6666-6666-6666-666666666666', 'olivia.r@nexus.hr', '${passwordHash}', 'HR_ADMIN');

-- EMPLOYEES (Linked to Users)
INSERT INTO employees (id, user_id, name, email, role, department, avatar, status, onboarding_status, onboarding_percentage, join_date, location, skills, bio, slack, emergency_contact) VALUES
('00000000-0000-0000-0000-000000000001', '11111111-1111-1111-1111-111111111111', 'Liam Johnson', 'liam.j@nexus.hr', 'Product Manager', 'Product', 'https://picsum.photos/id/1005/200/200', 'Active', 'Completed', 100, '2021-08-15', 'New York, USA', ARRAY['Product Strategy', 'Agile', 'Roadmapping'], 'Experienced PM.', '@liam_pm', 'Sarah Johnson (Wife) - 555-0192'),
('00000000-0000-0000-0000-000000000002', '22222222-2222-2222-2222-222222222222', 'Emma Williams', 'emma.w@nexus.hr', 'UX/UI Designer', 'Design', 'https://picsum.photos/id/1027/200/200', 'Active', 'Completed', 100, '2022-03-10', 'London, UK', ARRAY['Figma', 'Prototyping'], 'Creative designer.', '@emma_designs', 'John Williams (Father) - 555-0144'),
('00000000-0000-0000-0000-000000000003', '33333333-3333-3333-3333-333333333333', 'Noah Brown', 'noah.b@nexus.hr', 'Frontend Developer', 'Engineering', 'https://picsum.photos/id/1012/200/200', 'Active', 'Completed', 100, '2020-11-01', 'Remote', ARRAY['React', 'TypeScript'], NULL, '@noah_dev', NULL),
('00000000-0000-0000-0000-000000000004', '44444444-4444-4444-4444-444444444444', 'Sophia Garcia', 'sophia.g@nexus.hr', 'Marketing Lead', 'Marketing', 'https://picsum.photos/id/1011/200/200', 'On Leave', 'Completed', 100, '2019-05-20', 'Austin, USA', ARRAY['SEO', 'Content'], NULL, '@sophia_mkt', NULL),
('00000000-0000-0000-0000-000000000005', '55555555-5555-5555-5555-555555555555', 'James Miller', 'james.m@nexus.hr', 'Backend Developer', 'Engineering', 'https://picsum.photos/id/1006/200/200', 'Active', 'In Progress', 75, '2023-01-05', 'San Francisco, USA', ARRAY['Node.js', 'Python'], NULL, '@james_backend', NULL),
('00000000-0000-0000-0000-000000000006', '66666666-6666-6666-6666-666666666666', 'Olivia Roe', 'olivia.r@nexus.hr', 'CHRO', 'Human Resources', 'https://picsum.photos/id/338/200/200', 'Active', 'Completed', 100, '2018-02-15', 'New York, USA', ARRAY['Talent Acquisition', 'HRIS'], 'HR Professional.', '@olivia_hr', NULL);

-- Add missing execs from Org Chart
INSERT INTO employees (name, email, role, department, avatar, status) VALUES
('Ava Chen', 'ava.c@nexus.hr', 'CEO', 'Executive', 'https://picsum.photos/id/1025/200/200', 'Active'),
('David Lee', 'david.l@nexus.hr', 'CTO', 'Engineering', 'https://picsum.photos/id/305/200/200', 'Active');

-- Onboarding Tasks
INSERT INTO tasks (title, description, stage, assignee, due_date, priority, completed, employee_id) VALUES
('Prepare Workstation', 'Configure laptop and peripheral devices.', 'Pre-boarding', 'IT Dept', '2024-08-01', 'High', TRUE, '00000000-0000-0000-0000-000000000001'),
('Create Email Account', 'Setup corporate email and Slack access.', 'Pre-boarding', 'IT Dept', '2024-08-01', 'High', TRUE, '00000000-0000-0000-0000-000000000001'),
('Welcome Email', 'Send welcome packet.', 'Pre-boarding', 'HR', '2024-08-02', 'Medium', FALSE, '00000000-0000-0000-0000-000000000001'),
('Assign Mentor', 'Pair with senior.', 'Week 1', 'Manager', '2024-08-05', 'Medium', FALSE, '00000000-0000-0000-0000-000000000001'),
('HR Policy Review', 'Review handbook.', 'Week 1', 'Employee', '2024-08-07', 'High', FALSE, '00000000-0000-0000-0000-000000000001');

-- Training Modules
INSERT INTO training_modules (title, duration, type, status, thumbnail, progress) VALUES
('Company Culture', '15 min', 'Video', 'Completed', 'https://picsum.photos/id/1/300/180', 100),
('Cybersecurity', '30 min', 'Quiz', 'In Progress', 'https://picsum.photos/id/2/300/180', 45),
('Product Overview', '45 min', 'Video', 'Locked', 'https://picsum.photos/id/3/300/180', 0);

-- Documents
INSERT INTO documents (name, type, category, size, owner_name, employee_id, status) VALUES
('Employment Contract', 'PDF', 'Contracts', '2.4 MB', 'Liam Johnson', '00000000-0000-0000-0000-000000000001', 'Viewed'),
('Payslip - July', 'PDF', 'Finance', '150 KB', 'Liam Johnson', '00000000-0000-0000-0000-000000000001', 'Downloaded');

-- Job History
INSERT INTO job_history (employee_id, role, department, start_date, end_date, description) VALUES
('00000000-0000-0000-0000-000000000001', 'Product Manager', 'Product', '2023-01-15', NULL, 'Leading core platform.'),
('00000000-0000-0000-0000-000000000001', 'Associate PM', 'Product', '2021-08-15', '2023-01-14', 'Managed feature requests.');

-- Performance Reviews
INSERT INTO performance_reviews (employee_id, date, reviewer, rating, notes) VALUES
('00000000-0000-0000-0000-000000000001', '2024-06-15', 'Sarah Jones', 5, 'Exceptional performance.'),
('00000000-0000-0000-0000-000000000001', '2023-12-10', 'Sarah Jones', 4, 'Strong leadership.');

-- Announcements
INSERT INTO announcements (title, description, type, date_str) VALUES
('Q3 All-Hands', 'Join us on July 25th.', 'announcement', 'July 25'),
('Remote Work Policy', 'Updated guidelines.', 'policy', NULL);

-- Events
INSERT INTO events (title, date_str, type, color) VALUES
('Liam Johnson Birthday', 'July 18th', 'Birthday', 'accent-red'),
('Q3 All-Hands', 'July 25th', 'Meeting', 'accent-teal');

-- Contacts
INSERT INTO contacts (name, role, relation, email, avatar) VALUES
('Sarah Jones', 'VP of Engineering', 'Manager', 'sarah.j@nexus.hr', 'https://picsum.photos/id/204/200/200'),
('Noah Brown', 'Frontend Lead', 'Mentor', 'noah.b@nexus.hr', 'https://picsum.photos/id/1012/200/200'),
('IT Support', 'Help Desk', 'Support', 'support@nexus.hr', 'https://picsum.photos/id/4/200/200');

-- Leave Requests
INSERT INTO leave_requests (id, employee_id, leave_type, start_date, end_date, reason, status) VALUES
('00000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000004', 'Vacation', '2024-08-01', '2024-08-05', 'Summer break', 'Pending');

-- Leave Balances
INSERT INTO leave_balances (employee_id, year, leave_type, quota_days, used_days) VALUES
('00000000-0000-0000-0000-000000000001', 2024, 'Annual', 20, 5),
('00000000-0000-0000-0000-000000000001', 2024, 'Sick', 10, 2);

-- Audit Logs
INSERT INTO audit_logs (user_name, action, target, time_str, type) VALUES
('Olivia Roe', 'onboarded new employee', 'Leo Martinez', '2 hours ago', 'user'),
('System Admin', 'approved leave request for', 'Emma Williams', 'Yesterday, 4:30 PM', 'leave'),
('Sophia Garcia', 'updated the', '"Work From Home" policy', 'June 5, 2024, 11:15 AM', 'policy');

-- Headcount Stats
INSERT INTO stats_headcount (name, value) VALUES
('Jan', 110), ('Feb', 112), ('Mar', 115), ('Apr', 118), ('May', 122), ('Jun', 124);

-- Compliance
INSERT INTO compliance_items (title, status) VALUES
('GDPR Data Privacy Audit', 'In Progress'),
('Quarterly Safety Training', 'Complete'),
('Equal Employment Opportunity Report', 'Overdue'),
('IT Security Compliance Review', 'In Progress');

-- Sentiment
INSERT INTO sentiment_stats (name, value) VALUES
('Positive', 82),
('Neutral', 12),
('Negative', 6);
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
