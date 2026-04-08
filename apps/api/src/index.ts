import express, { Request, Response } from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import http from "http";
import { query } from "./db";
import fs from "fs";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { generalLimiter, helmetConfig, apiLimiter } from "./middlewares/security";
import { auditLogMiddleware } from "./middlewares/auditLog";
import { authenticateToken, requireAdmin } from "./middlewares/auth";
import { errorHandler, notFoundHandler } from "./middlewares/errorHandler";
import { swaggerSpec } from "./config/swagger";
import { initializeSocket } from "./socket";

// Import Clean Architecture routes
import authRoutes from "./routes/authRoutes";
import employeeRoutes from "./routes/employeeRoutes";
import documentRoutes from "./routes/documentRoutes";
import leaveRequestRoutes from "./routes/leaveRequestRoutes";
import systemConfigRoutes from "./routes/systemConfigRoutes";
import attendanceRoutes from "./routes/attendanceRoutes";
import payrollRoutes from "./routes/payrollRoutes";
import notificationRoutes from "./routes/notificationRoutes";
import dashboardRoutes from "./routes/dashboardRoutes";
import orgChartRoutes from "./routes/orgChartRoutes";
import notesRoutes from "./routes/notesRoutes";
import onboardingRoutes from "./routes/onboardingRoutes";
import trainingRoutes from "./routes/trainingRoutes";
import jobHistoryRoutes from "./routes/jobHistoryRoutes";
import performanceRoutes from "./routes/performanceRoutes";
import eventsRoutes from "./routes/eventsRoutes";
import announcementsRoutes from "./routes/announcementsRoutes";
import analyticsRoutes from "./routes/analyticsRoutes";
import adminAttendanceRoutes from "./routes/adminAttendanceRoutes";
import surveyRoutes from "./routes/surveyRoutes";
import complianceRoutes from "./routes/complianceRoutes";
import expenseClaimRoutes from "./routes/expenseClaimRoutes";
import holidayRoutes from "./routes/holidayRoutes";
import { runMigration } from "./scripts/init-db";
import { initAttendanceScheduler } from "./services/AttendanceScheduler";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

// Trust proxy for Render.com and other reverse proxies
// Required for express-rate-limit to work correctly behind proxies
app.set('trust proxy', 1);

// Security: Helmet - Security headers
app.use(helmetConfig);

// Performance: Gzip/Brotli compression for responses
app.use(compression({
  level: 6,
  threshold: 1024, // Only compress responses > 1KB
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Security: CORS configuration - support multiple origins
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://hari-hr-system.vercel.app",
  "https://hari-hr-system-api.vercel.app",
  "https://demo-hari-free-trial.vercel.app",
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

const corsOptions = {
  origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
    // Allow requests with no origin (mobile apps, curl, etc.)
    if (!origin) {
      callback(null, true);
      return;
    }
    // Check if origin is allowed
    if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200,
};
app.use(cors(corsOptions));

// Security: Rate limiting for all requests
app.use(generalLimiter);

// Body parser
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Audit logging middleware
app.use(auditLogMiddleware);

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, "../uploads/avatars");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve uploaded files statically
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

app.get("/ping", (_req, res) => res.send("pong"));

// API Documentation
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: "HARI HR API Documentation",
}));

// Serve OpenAPI spec as JSON
app.get("/api-docs.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.send(swaggerSpec);
});

// ==========================================
// HEALTH CHECK (for cron jobs / keep-alive)
// ==========================================
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ==========================================
// CLEAN ARCHITECTURE ROUTES
// ==========================================

// Auth routes (login is public, change-password is protected)
app.use("/api/auth", authRoutes);

// Protected routes (all require authentication)
app.use("/api/employees", employeeRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/leave-requests", leaveRequestRoutes);
app.use("/api/configs", systemConfigRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payroll", payrollRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/org-chart", orgChartRoutes);
app.use("/api/notes", notesRoutes);
app.use("/api/onboarding", onboardingRoutes);
app.use("/api/training", trainingRoutes);
app.use("/api/job-history", jobHistoryRoutes);
app.use("/api/performance", performanceRoutes);
app.use("/api/events", eventsRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/admin/attendance", adminAttendanceRoutes);
app.use("/api/surveys", surveyRoutes);
app.use("/api/compliance", complianceRoutes);
app.use("/api/expense-claims", expenseClaimRoutes);
app.use("/api/holidays", holidayRoutes);

// Backward compatibility for leave balances endpoint
// Old: GET /api/leave-balances/:employeeId
// New: GET /api/leave-requests/balances/:employeeId
app.get(
  "/api/leave-balances/:employeeId",
  async (req: Request, res: Response) => {
    req.url = `/balances/${req.params.employeeId}`;
    leaveRequestRoutes(req, res, () => {});
  },
);

// ==========================================
// BACKWARD COMPATIBILITY & LEGACY ENDPOINTS
// ==========================================

// Backward compatibility: old training endpoints
// Redirect to new /api/training routes
app.get("/api/training-modules", (req, res) => res.redirect(301, "/api/training/modules"));
app.get("/api/employee-training/:employeeId", (req, res) => res.redirect(301, `/api/training/employee/${req.params.employeeId}`));
app.post("/api/employee-training", (req, res, next) => {
  req.url = "/api/training/assign";
  trainingRoutes(req, res, next);
});
app.patch("/api/employee-training/:id", (req, res, next) => {
  req.url = `/${req.params.id}`;
  trainingRoutes(req, res, next);
});

// Backward compatibility: old events endpoints
// Redirect to new /api/events routes
app.get("/api/upcoming-events", (req, res) => res.redirect(301, "/api/events/upcoming"));
app.post("/api/upcoming-events", (req, res, next) => {
  req.url = "/upcoming";
  eventsRoutes(req, res, next);
});
app.delete("/api/upcoming-events/:id", (req, res, next) => {
  req.url = `/upcoming/${req.params.id}`;
  eventsRoutes(req, res, next);
});

// Backward compatibility: old analytics endpoints
// Redirect to new /api/analytics routes
app.get("/api/headcount-stats", (req, res) => res.redirect(301, "/api/analytics/headcount-stats"));
app.get("/api/audit-logs", (req, res) => res.redirect(301, "/api/analytics/audit-logs"));
app.get("/api/compliance", (req, res) => res.redirect(301, "/api/analytics/compliance"));
app.get("/api/sentiment", (req, res) => res.redirect(301, "/api/analytics/sentiment"));

// ==========================================
// SYSTEM MANAGEMENT ENDPOINTS
// ==========================================

// POST /api/system/setup (Initial setup - only works when database is empty)
// This allows setting up the database without authentication for first-time deployment
app.post(
  "/api/system/setup",
  async (req: Request, res: Response) => {
    try {
      // Check if any users exist
      const usersResult = await query("SELECT COUNT(*) as count FROM users");
      const userCount = parseInt(usersResult.rows[0].count, 10);

      if (userCount > 0) {
        return res.status(403).json({
          error: "Setup already completed",
          message: "Database already has users. Use /api/system/seed with admin authentication to reseed."
        });
      }

      // Database is empty, safe to seed
      await runMigration();
      res.json({
        message: "Database setup completed successfully",
        hint: "You can now login with admin@company.com / Admin123!@#"
      });
    } catch (err) {
      const error = err as { code?: string; message?: string };
      console.error("Setup error:", error);
      // If tables don't exist, try running migration anyway
      if (error.code === '42P01') { // Table doesn't exist error
        try {
          await runMigration();
          res.json({
            message: "Database setup completed successfully",
            hint: "You can now login with admin@company.com / Admin123!@#"
          });
        } catch (migrationErr) {
          console.error("Migration error:", migrationErr);
          res.status(500).json({ error: "Failed to setup database" });
        }
      } else {
        res.status(500).json({ error: "Failed to setup database" });
      }
    }
  }
);

// POST /api/system/seed (Manually trigger database seed - ADMIN ONLY)
// Security: This endpoint requires authentication and HR_ADMIN role
app.post(
  "/api/system/seed",
  authenticateToken,
  requireAdmin,
  async (req: Request, res: Response) => {
    try {
      await runMigration();
      res.json({ message: "Database seeded successfully" });
    } catch (err) {
      console.error("Seeding error:", err);
      res.status(500).json({ error: "Failed to seed database" });
    }
  }
);

// Lightweight migrations (safe to run multiple times)
const runLightMigrations = async () => {
  try {
    // Leave requests: add rejection_reason column
    await query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS rejection_reason TEXT`);

    // Admin attendance: add modified_by column + indexes
    await query(`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS modified_by UUID REFERENCES users(id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_attendance_date_status ON attendance_records(date DESC, status)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_attendance_date_range ON attendance_records(date DESC, employee_id)`);

    // Migrate attendance status VARCHAR → ENUM (only when column is still VARCHAR)
    const colType = await query(`SELECT data_type FROM information_schema.columns WHERE table_name = 'attendance_records' AND column_name = 'status'`);
    if (colType.rows[0]?.data_type === 'character varying') {
      await query(`UPDATE attendance_records SET status = 'On-time' WHERE status IN ('Present', 'Remote')`);
      await query(`UPDATE attendance_records SET status = 'On-time' WHERE status = 'Half-day' AND clock_in IS NOT NULL AND (clock_in AT TIME ZONE 'Asia/Bangkok')::time <= '09:00:00'::time`);
      await query(`UPDATE attendance_records SET status = 'Late' WHERE status = 'Half-day' AND clock_in IS NOT NULL AND (clock_in AT TIME ZONE 'Asia/Bangkok')::time > '09:00:00'::time`);
      await query(`UPDATE attendance_records SET status = 'Absent' WHERE status = 'Half-day'`);
      await query(`DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'attendance_status_enum') THEN CREATE TYPE attendance_status_enum AS ENUM ('On-time', 'Late', 'Absent'); END IF; END $$`);
      await query(`ALTER TABLE attendance_records ALTER COLUMN status DROP DEFAULT`);
      await query(`ALTER TABLE attendance_records ALTER COLUMN status TYPE attendance_status_enum USING status::attendance_status_enum`);
      await query(`ALTER TABLE attendance_records ALTER COLUMN status SET DEFAULT 'On-time'::attendance_status_enum`);
    }

    // Add On-leave to attendance status enum (safe to run multiple times)
    await query(`ALTER TYPE attendance_status_enum ADD VALUE IF NOT EXISTS 'On-leave'`);

    // Fix: Absent records with clock_in were incorrectly migrated — recalculate
    await query(`UPDATE attendance_records SET status = 'On-time' WHERE status = 'Absent' AND clock_in IS NOT NULL AND (clock_in AT TIME ZONE 'Asia/Bangkok')::time <= '09:00:00'::time`);
    await query(`UPDATE attendance_records SET status = 'Late' WHERE status = 'Absent' AND clock_in IS NOT NULL`);

    // One-time fix: Employee clock-in/out on UTC servers stored Bangkok time as UTC (+7h off).
    // Uses tz_fixed column as idempotency guard so it only runs once per record.
    await query(`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS tz_fixed BOOLEAN DEFAULT FALSE`);
    const serverOffsetMin = new Date().getTimezoneOffset(); // 0 for UTC, -420 for Bangkok
    if (serverOffsetMin === 0) {
      // Case 1: Both clock_in & clock_out from old code (clock_out >= clock_in) → fix both
      await query(`
        UPDATE attendance_records
        SET clock_in  = clock_in  - interval '7 hours',
            clock_out = clock_out - interval '7 hours',
            tz_fixed  = TRUE
        WHERE tz_fixed = FALSE AND modified_by IS NULL
          AND clock_in IS NOT NULL AND clock_out IS NOT NULL AND clock_out >= clock_in
      `);
      // Case 2: Only clock_in, no clock_out yet → fix clock_in only
      await query(`
        UPDATE attendance_records
        SET clock_in = clock_in - interval '7 hours',
            tz_fixed = TRUE
        WHERE tz_fixed = FALSE AND modified_by IS NULL
          AND clock_in IS NOT NULL AND clock_out IS NULL
      `);
      // Case 3: clock_in from old code, clock_out from new fixed code (clock_out < clock_in)
      // Only fix clock_in, recalculate total_hours
      await query(`
        UPDATE attendance_records
        SET clock_in    = clock_in - interval '7 hours',
            total_hours = ROUND(EXTRACT(EPOCH FROM (clock_out - (clock_in - interval '7 hours')))::numeric / 3600, 2),
            tz_fixed    = TRUE
        WHERE tz_fixed = FALSE AND modified_by IS NULL
          AND clock_in IS NOT NULL AND clock_out IS NOT NULL AND clock_out < clock_in
      `);
    }
    // Mark remaining records as processed (admin-created or non-UTC server records)
    await query(`UPDATE attendance_records SET tz_fixed = TRUE WHERE tz_fixed = FALSE`);
    // Change default to TRUE so NEW inserts are pre-marked — prevents re-processing on restart
    await query(`ALTER TABLE attendance_records ALTER COLUMN tz_fixed SET DEFAULT TRUE`);

    await query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL`);
    await query(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);

    // Create upcoming_events table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS upcoming_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        date DATE NOT NULL,
        type VARCHAR(50) DEFAULT 'Meeting',
        avatar TEXT,
        color VARCHAR(20),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_upcoming_events_date ON upcoming_events(date)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_upcoming_events_type ON upcoming_events(type)`);

    // Create onboarding_documents table if it doesn't exist
    await query(`
      CREATE TABLE IF NOT EXISTS onboarding_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'Pending',
        file_path TEXT,
        file_type VARCHAR(20),
        file_size VARCHAR(20),
        uploaded_at TIMESTAMP WITH TIME ZONE,
        reviewed_by UUID REFERENCES users(id),
        reviewed_at TIMESTAMP WITH TIME ZONE,
        review_note TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_onboarding_docs_employee ON onboarding_documents(employee_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_onboarding_docs_status ON onboarding_documents(status)`);

    // Ensure contacts table exists and has seed data for key contacts
    await query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        name VARCHAR(100),
        role VARCHAR(100),
        relation VARCHAR(100),
        email VARCHAR(255),
        avatar TEXT
      )
    `);
    const contactCount = await query('SELECT COUNT(*) AS cnt FROM contacts');
    if (parseInt(contactCount.rows[0].cnt, 10) === 0) {
      await query(`
        INSERT INTO contacts (name, role, relation, email, avatar) VALUES
          ('System Admin', 'HR Administrator', 'HR Department', 'admin@aiya.ai', 'https://ui-avatars.com/api/?name=System+Admin&background=6366f1&color=fff'),
          ('Alex Thompson', 'IT Support Lead', 'Technical Support', 'alex.t@company.com', 'https://ui-avatars.com/api/?name=Alex+Thompson&background=10b981&color=fff'),
          ('Maria Garcia', 'Office Manager', 'Facilities', 'maria.g@company.com', 'https://ui-avatars.com/api/?name=Maria+Garcia&background=f59e0b&color=fff'),
          ('James Wilson', 'Engineering Manager', 'Direct Manager', 'james.w@company.com', 'https://ui-avatars.com/api/?name=James+Wilson&background=ef4444&color=fff')
      `);
    }

    // Fix: change onboarding_status default from 'Completed' to 'Not Started'
    await query(`ALTER TABLE employees ALTER COLUMN onboarding_status SET DEFAULT 'Not Started'`);

    // Recalculate onboarding progress for all employees based on actual task data
    await query(`
      UPDATE employees e SET
        onboarding_percentage = COALESCE(sub.pct, 0),
        onboarding_status = CASE
          WHEN sub.pct IS NULL THEN 'Not Started'
          WHEN sub.pct = 100 THEN 'Completed'
          WHEN sub.pct > 0 THEN 'In Progress'
          ELSE 'Not Started'
        END
      FROM (
        SELECT employee_id,
          ROUND(COUNT(*) FILTER (WHERE completed = true) * 100.0 / NULLIF(COUNT(*), 0))::int AS pct
        FROM tasks
        GROUP BY employee_id
      ) sub
      WHERE e.id = sub.employee_id
    `);

    // Employees with no tasks at all → 'Not Started'
    await query(`
      UPDATE employees SET onboarding_status = 'Not Started', onboarding_percentage = 0
      WHERE id NOT IN (SELECT DISTINCT employee_id FROM tasks WHERE employee_id IS NOT NULL)
        AND onboarding_status = 'Completed'
    `);

    // Leave requests: add handover + medical certificate columns
    await query(`
      ALTER TABLE leave_requests
        ADD COLUMN IF NOT EXISTS handover_employee_id UUID REFERENCES employees(id),
        ADD COLUMN IF NOT EXISTS handover_notes TEXT,
        ADD COLUMN IF NOT EXISTS medical_certificate_path VARCHAR(500)
    `);

    // Leave requests: add updated_at column
    await query(`ALTER TABLE leave_requests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP`);

    // Leave request audit history table
    await query(`
      CREATE TABLE IF NOT EXISTS leave_request_history (
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
        change_type VARCHAR(20) NOT NULL,
        changed_by UUID NOT NULL,
        changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_lrh_leave_request_id ON leave_request_history(leave_request_id)`);

    // Password reset tokens table
    await query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        used BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_prt_user_id ON password_reset_tokens(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_prt_token_hash ON password_reset_tokens(token_hash)`);

    // Refresh tokens table (for JWT refresh token rotation)
    await query(`
      CREATE TABLE IF NOT EXISTS refresh_tokens (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        revoked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_rt_user_id ON refresh_tokens(user_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_rt_token_hash ON refresh_tokens(token_hash)`);

    // Cleanup expired/revoked refresh tokens
    await query(`DELETE FROM refresh_tokens WHERE revoked = TRUE OR expires_at < NOW() - INTERVAL '1 day'`);

    // Attendance improvements: auto_checkout, early_departure, overtime_hours columns
    await query(`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS auto_checkout BOOLEAN DEFAULT FALSE`);
    await query(`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS early_departure BOOLEAN DEFAULT FALSE`);
    await query(`ALTER TABLE attendance_records ADD COLUMN IF NOT EXISTS overtime_hours DECIMAL(5,2) DEFAULT 0`);

    // Survey tables
    await query(`
      CREATE TABLE IF NOT EXISTS surveys (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        title VARCHAR(255) NOT NULL,
        status VARCHAR(20) DEFAULT 'active',
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        closed_at TIMESTAMP WITH TIME ZONE
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS survey_questions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        question_text VARCHAR(500) NOT NULL,
        category VARCHAR(50) NOT NULL,
        sort_order INT NOT NULL DEFAULT 0
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS survey_responses (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        question_id UUID NOT NULL REFERENCES survey_questions(id) ON DELETE CASCADE,
        rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
        submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS survey_completions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        survey_id UUID NOT NULL REFERENCES surveys(id) ON DELETE CASCADE,
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        completed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_survey_completion UNIQUE (survey_id, employee_id)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_survey_questions_survey ON survey_questions(survey_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_survey_responses_question ON survey_responses(question_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_survey_completions_survey ON survey_completions(survey_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_survey_completions_employee ON survey_completions(employee_id)`);

    // Seed work schedule configs
    await query(`
      INSERT INTO system_configs (category, key, value, data_type, description) VALUES
        ('attendance', 'late_threshold', '09:00', 'string', 'Late threshold (HH:mm) Bangkok timezone'),
        ('attendance', 'work_end', '18:00', 'string', 'Work end time (HH:mm) Bangkok timezone'),
        ('attendance', 'standard_hours', '8', 'number', 'Standard working hours per day')
      ON CONFLICT (category, key) DO NOTHING
    `);

    // Seed ISO 45003 Psychosocial Health & Safety Survey (only if no surveys exist)
    const surveyCount = await query(`SELECT COUNT(*)::int AS c FROM surveys`);
    if (surveyCount.rows[0].c === 0) {
      const adminUser = await query(`SELECT id FROM users WHERE role = 'HR_ADMIN' LIMIT 1`);
      const createdBy = adminUser.rows[0]?.id ?? null;

      const surveyRes = await query(
        `INSERT INTO surveys (title, status, created_by)
         VALUES ('ISO 45003 — Psychosocial Health & Safety Assessment', 'active', $1)
         RETURNING id`,
        [createdBy]
      );
      const sid = surveyRes.rows[0].id;

      await query(
        `INSERT INTO survey_questions (survey_id, question_text, category, sort_order) VALUES
          -- Workload  (ISO 45003 §A3 Job Demands, §A6 Workload, §A1 Role Clarity, §A2 Autonomy, §C1 Tools)
          ($1, 'My workload is manageable within normal working hours', 'Workload', 1),
          ($1, 'Deadlines and sprint commitments set for my work are realistic', 'Workload', 2),
          ($1, 'I have autonomy in deciding how to approach and complete my tasks', 'Workload', 3),
          ($1, 'My roles and responsibilities are clearly defined', 'Workload', 4),
          ($1, 'I have the tools, equipment, and software I need to do my job effectively', 'Workload', 5),

          -- Team  (ISO 45003 §B1 Relationships, §B7 Civility/Trust, §B10 Harassment, §A5 Remote Work)
          ($1, 'I have positive and supportive working relationships with my colleagues', 'Team', 6),
          ($1, 'I feel psychologically safe to voice opinions, ask questions, and admit mistakes', 'Team', 7),
          ($1, 'Disagreements and conflicts within my team are resolved constructively', 'Team', 8),
          ($1, 'I am treated with respect and fairness by my peers', 'Team', 9),
          ($1, 'I feel connected to my team and not isolated, even when working remotely', 'Team', 10),

          -- Growth  (ISO 45003 §B5 Career Development, §B4 Recognition, §A4 Change Mgmt, §A8 Job Security)
          ($1, 'I see a clear path for career advancement in this organization', 'Growth', 11),
          ($1, 'I have regular opportunities to learn new skills and technologies', 'Growth', 12),
          ($1, 'My contributions and achievements are recognized and valued', 'Growth', 13),
          ($1, 'I feel secure and stable in my current role', 'Growth', 14),
          ($1, 'Organizational changes are communicated transparently and with adequate notice', 'Growth', 15),

          -- Work-Life Balance  (ISO 45003 §B8 Boundaries, §A7 Work Schedule, §C2 Workspace)
          ($1, 'I can disconnect from work communications outside of working hours', 'Work-Life Balance', 16),
          ($1, 'The organization genuinely respects my personal time and boundaries', 'Work-Life Balance', 17),
          ($1, 'I feel able to take leave or time off when I need it without guilt or pressure', 'Work-Life Balance', 18),
          ($1, 'My work schedule allows me to maintain a healthy personal life', 'Work-Life Balance', 19),
          ($1, 'My workspace (office or home) is comfortable, ergonomic, and conducive to focus', 'Work-Life Balance', 20),

          -- Management  (ISO 45003 §B2 Leadership, §B6 Support, §B3 Culture, §B7 Trust)
          ($1, 'My direct manager provides regular and constructive feedback', 'Management', 21),
          ($1, 'I feel genuinely supported by my manager when I face challenges', 'Management', 22),
          ($1, 'Senior leadership communicates a clear vision and strategic direction', 'Management', 23),
          ($1, 'Decisions about people (promotions, assignments, evaluations) are made fairly', 'Management', 24),
          ($1, 'There is a culture of transparency, honesty, and trust at all levels', 'Management', 25)`,
        [sid]
      );
    }
    // Employee leave quota overrides (per-employee)
    await query(`
      CREATE TABLE IF NOT EXISTS employee_leave_quotas (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        leave_type VARCHAR(50) NOT NULL,
        total INTEGER NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT unique_employee_leave_type UNIQUE (employee_id, leave_type)
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_elq_employee_id ON employee_leave_quotas(employee_id)`);

    // Deduplicate onboarding tasks: keep only the earliest set per employee
    await query(`
      DELETE FROM tasks t
      USING (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY employee_id, title ORDER BY created_at ASC) AS rn
        FROM tasks
      ) dup
      WHERE t.id = dup.id AND dup.rn > 1
    `);

    // Deduplicate onboarding documents: keep only the earliest set per employee
    await query(`
      DELETE FROM onboarding_documents d
      USING (
        SELECT id, ROW_NUMBER() OVER (PARTITION BY employee_id, name ORDER BY created_at ASC) AS rn
        FROM onboarding_documents
      ) dup
      WHERE d.id = dup.id AND dup.rn > 1
    `);

    // Normalize document file paths: full disk paths → storage keys
    // documents.file_path: /abs/path/to/uploads/filename.pdf → documents/filename.pdf
    await query(`
      UPDATE documents
      SET file_path = 'documents/' || SUBSTRING(file_path FROM '[^/\\\\]+$')
      WHERE file_path LIKE '/%' AND file_path NOT LIKE 'documents/%'
    `);

    // onboarding_documents.file_path: /abs/path/to/uploads/onboarding/filename.pdf → onboarding/filename.pdf
    await query(`
      UPDATE onboarding_documents
      SET file_path = 'onboarding/' || SUBSTRING(file_path FROM '[^/\\\\]+$')
      WHERE file_path IS NOT NULL AND file_path LIKE '/%' AND file_path NOT LIKE 'onboarding/%'
    `);

    // leave_requests.medical_certificate_path: /uploads/medical-certs/filename.pdf → medical-certs/filename.pdf
    await query(`
      UPDATE leave_requests
      SET medical_certificate_path = REPLACE(medical_certificate_path, '/uploads/', '')
      WHERE medical_certificate_path LIKE '/uploads/%'
    `);

    // Fix avatar URLs: strip absolute host prefix, keep only relative path
    await query(`
      UPDATE employees
      SET avatar = SUBSTRING(avatar FROM '/uploads/')
      WHERE avatar LIKE 'http%/uploads/%'
    `);

    // Fix stale /uploads/ avatar paths where files no longer exist (e.g. after Vercel redeployment)
    // Only run for local disk mode (R2 avatars store full public URLs, not /uploads/ paths)
    if (!process.env.R2_ACCOUNT_ID) {
      const staleCheck = await query(`SELECT id, name, avatar FROM employees WHERE avatar LIKE '/uploads/%'`);
      for (const row of staleCheck.rows) {
        const filePath = path.join(__dirname, '..', row.avatar);
        if (!fs.existsSync(filePath)) {
          const fallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`;
          await query(`UPDATE employees SET avatar = $1 WHERE id = $2`, [fallback, row.id]);
        }
      }
    }

  } catch (err) {
    // Table may not exist yet — ignore
  }

  // Run each critical column migration independently so one failure can't block others
  try {
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_notifications BOOLEAN DEFAULT TRUE`);
  } catch (err) {
    console.error("Migration: failed to add email_notifications column:", err);
  }

  try {
    await query(`ALTER TABLE performance_reviews ADD COLUMN IF NOT EXISTS reviewer_user_id UUID REFERENCES users(id)`);
  } catch (err) {
    console.error("Migration: failed to add reviewer_user_id to performance_reviews:", err);
  }

  try {
    await query(`ALTER TABLE employees ADD COLUMN IF NOT EXISTS banner_color VARCHAR(50)`);
  } catch (err) {
    console.error("Migration: failed to add banner_color to employees:", err);
  }

  // Holidays table + business_days column on leave_requests
  try {
    const { migrateHolidays } = await import("./scripts/migrate-holidays");
    await migrateHolidays();
  } catch (err) {
    console.error("Migration: holidays migration failed:", err);
  }

  // Half-day leave support
  try {
    const { migrateHalfDayLeave } = await import("./scripts/migrate-half-day-leave");
    await migrateHalfDayLeave();
  } catch (err) {
    console.error("Migration: half-day leave migration failed:", err);
  }

  // Expense claims table (was only in standalone migration script, not in init-db)
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS expense_claims (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        category VARCHAR(50) NOT NULL,
        amount DECIMAL(12, 2) NOT NULL,
        currency VARCHAR(3) DEFAULT 'THB',
        expense_date DATE NOT NULL,
        description TEXT,
        receipt_path TEXT,
        status VARCHAR(20) DEFAULT 'Pending',
        rejection_reason TEXT,
        approver_id UUID REFERENCES employees(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);
    await query(`CREATE INDEX IF NOT EXISTS idx_expense_claims_employee_id ON expense_claims(employee_id)`);
    await query(`CREATE INDEX IF NOT EXISTS idx_expense_claims_status ON expense_claims(status)`);
  } catch (err) {
    console.error("Migration: expense_claims table creation failed:", err);
  }
};

// Global error handlers (must be after all routes)
app.use(notFoundHandler);
app.use(errorHandler);

// Create HTTP server for Socket.io
const httpServer = http.createServer(app);

// Initialize Socket.io
initializeSocket(httpServer);

// Only start the server when running locally (not in Vercel serverless)
if (process.env.VERCEL !== '1') {
  runLightMigrations().then(() => {
    httpServer.listen(port, () => {
      console.log(`Server running at http://localhost:${port}`);
      console.log(`Socket.io enabled for real-time updates`);
      initAttendanceScheduler();
    });
  });
}

// Export for Vercel serverless
export default app;
