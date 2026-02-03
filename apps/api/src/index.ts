import express, { Request, Response } from "express";
import cors from "cors";
import compression from "compression";
import dotenv from "dotenv";
import { query } from "./db";
import path from "path";
import swaggerUi from "swagger-ui-express";
import { generalLimiter, helmetConfig } from "./middlewares/security";
import { auditLogMiddleware, getAuditLogs } from "./middlewares/auditLog";
import { authenticateToken, requireAdmin } from "./middlewares/auth";
import { swaggerSpec } from "./config/swagger";

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
import notesRoutes from "./routes/notesRoutes";
import { runMigration } from "./scripts/init-db";

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

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
app.use("/api/notes", notesRoutes);

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
// NEW ENDPOINTS (Tasks, Documents, etc.)
// ==========================================

// GET /api/tasks
app.get("/api/tasks", async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM tasks ORDER BY due_date ASC");
    const tasks = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      stage: row.stage,
      assignee: row.assignee,
      dueDate: row.due_date, // Date string
      completed: row.completed,
      priority: row.priority,
      link: row.link,
    }));
    res.json(tasks);
  } catch (err) {
    console.error("Error fetching tasks:", err);
    res.status(500).json({ error: "Failed to fetch tasks" });
  }
});

// GET /api/training-modules
app.get("/api/training-modules", async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM training_modules");
    res.json(result.rows);
  } catch (err) {
    console.error("Error fetching training modules:", err);
    res.status(500).json({ error: "Failed to fetch modules" });
  }
});

// GET /api/job-history
app.get("/api/job-history", async (req: Request, res: Response) => {
  const { employeeId } = req.query;
  try {
    let queryText = "SELECT * FROM job_history";
    const params: (string | number | boolean | null)[] = [];
    if (employeeId) {
      queryText += " WHERE employee_id = $1";
      params.push(employeeId as string);
    }
    queryText += " ORDER BY start_date DESC";

    const result = await query(queryText, params);
    const history = result.rows.map((row) => ({
      id: row.id,
      role: row.role,
      department: row.department,
      startDate: row.start_date,
      endDate: row.end_date || "Present",
      description: row.description,
    }));
    res.json(history);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/performance-reviews
app.get("/api/performance-reviews", async (req: Request, res: Response) => {
  const { employeeId } = req.query;
  try {
    let queryText = "SELECT * FROM performance_reviews";
    const params: (string | number | boolean | null)[] = [];
    if (employeeId) {
      queryText += " WHERE employee_id = $1";
      params.push(employeeId as string);
    }
    queryText += " ORDER BY date DESC";

    const result = await query(queryText, params);
    const reviews = result.rows.map((row) => ({
      id: row.id,
      employeeId: row.employee_id,
      date: row.date,
      rating: row.rating,
      notes: row.notes,
    }));
    res.json(reviews);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/employee-training/:employeeId
app.get(
  "/api/employee-training/:employeeId",
  async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    try {
      const result = await query(
        `SELECT et.id, et.title, et.duration, et.status, et.completion_date, et.score,
                    tm.type, tm.thumbnail, tm.progress as module_progress
             FROM employee_training et
             LEFT JOIN training_modules tm ON et.module_id = tm.id
             WHERE et.employee_id = $1
             ORDER BY et.completion_date DESC NULLS LAST`,
        [employeeId],
      );
      const training = result.rows.map((row) => ({
        id: row.id,
        title: row.title,
        duration: row.duration,
        status: row.status,
        completedDate: row.completion_date,
        score: row.score,
        type: row.type || "Course",
        thumbnail: row.thumbnail,
        progress: row.module_progress || 0,
      }));
      res.json(training);
    } catch (err) {
      console.error("Error fetching employee training:", err);
      res.status(500).json({ error: "Failed to fetch training records" });
    }
  },
);

// POST /api/employee-training (Admin assigns training to employee)
app.post("/api/employee-training", async (req: Request, res: Response) => {
  const { employeeId, moduleId, title, duration } = req.body;
  if (!employeeId)
    return res.status(400).json({ error: "employeeId required" });

  try {
    const result = await query(
      `INSERT INTO employee_training (employee_id, module_id, title, duration, status)
             VALUES ($1, $2, $3, $4, 'Not Started')
             RETURNING *`,
      [
        employeeId,
        moduleId || null,
        title || "Untitled Training",
        duration || "1h",
      ],
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error assigning training:", err);
    res.status(500).json({ error: "Failed to assign training" });
  }
});

// PATCH /api/employee-training/:id (Update training status/progress)
app.patch("/api/employee-training/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, score } = req.body;
  try {
    const completionDate = status === "Completed" ? new Date() : null;
    const result = await query(
      `UPDATE employee_training 
             SET status = COALESCE($1, status), 
                 score = COALESCE($2, score),
                 completion_date = COALESCE($3, completion_date)
             WHERE id = $4 
             RETURNING *`,
      [status, score, completionDate, id],
    );
    if (result.rows.length === 0)
      return res.status(404).json({ error: "Training record not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error("Error updating training:", err);
    res.status(500).json({ error: "Failed to update training" });
  }
});

// GET /api/events
app.get("/api/events", async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM events");
    const events = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      date: row.date_str,
      type: row.type,
      avatar: row.avatar,
      color: row.color,
    }));
    res.json(events);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/announcements
app.get("/api/announcements", async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM announcements");
    const items = result.rows.map((row) => ({
      id: row.id,
      title: row.title,
      description: row.description,
      type: row.type,
      date: row.date_str,
    }));
    res.json(items);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/contacts
app.get("/api/contacts", async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM contacts");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/audit-logs
app.get("/api/audit-logs", async (req: Request, res: Response) => {
  try {
    // Get real-time audit logs from our logging system
    const auditLogs = getAuditLogs(100);

    // Transform to match expected format for frontend
    const logs = auditLogs.map((log, index) => ({
      id: index + 1,
      user: log.userEmail || "System",
      action: log.action,
      target: log.resource,
      time: new Date(log.timestamp).toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      }),
      type: getLogType(log.resource),
    }));

    res.json(logs);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

// Helper function to map resource to log type for UI
function getLogType(resource: string): string {
  if (resource === "Employee") return "user";
  if (resource === "Leave Request") return "leave";
  if (resource === "Document") return "policy";
  return "user";
}

// GET /api/headcount-stats
app.get("/api/headcount-stats", async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM stats_headcount ORDER BY id ASC");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/compliance
app.get("/api/compliance", async (req: Request, res: Response) => {
  try {
    const result = await query("SELECT * FROM compliance_items");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/sentiment
app.get("/api/sentiment", async (req: Request, res: Response) => {
  try {
    // Return array of { name, value }
    const result = await query("SELECT * FROM sentiment_stats");
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed" });
  }
});

// GET /api/leave-balances/:employeeId (Existing code continues...)

// GET /api/org-chart
app.get("/api/org-chart", async (req: Request, res: Response) => {
  try {
    const result = await query(
      'SELECT id, manager_id as "parentId", name, role, email FROM employees',
    );
    const nodes = result.rows.map((row) => ({
      id: row.id,
      parentId: row.parentId || null,
      name: row.name,
      role: row.role,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`,
    }));
    res.json(nodes);
  } catch (err) {
    console.error("Error fetching org chart:", err);
    res.status(500).json({ error: "Failed to fetch org chart" });
  }
});

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

// Only start the server when running locally (not in Vercel serverless)
if (process.env.VERCEL !== '1') {
  app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
  });
}

// Export for Vercel serverless
export default app;
