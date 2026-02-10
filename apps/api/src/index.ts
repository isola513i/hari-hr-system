import express, { Request, Response } from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import http from "http";
import { query } from "./db";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { generalLimiter, helmetConfig, apiLimiter } from "./middlewares/security";
import { auditLogMiddleware } from "./middlewares/auditLog";
import { authenticateToken, requireAdmin } from "./middlewares/auth";
import { swaggerSpec } from "./config/swagger";
import { initializeSocket } from "./socket";

// Import modular routes
import { employeeRoutes } from "./modules/employees";

// Import Clean Architecture routes
import authRoutes from "./routes/authRoutes";
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
import { runMigration } from "./scripts/init-db";

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
      callback(null, true); // Allow anyway for now, log for debugging
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
  } catch (err) {
    // Table may not exist yet — ignore
  }
};

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
    });
  });
}

// Export for Vercel serverless
export default app;
