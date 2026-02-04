"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const compression_1 = __importDefault(require("compression"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./db");
const path_1 = __importDefault(require("path"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const security_1 = require("./middlewares/security");
const auditLog_1 = require("./middlewares/auditLog");
const auth_1 = require("./middlewares/auth");
const swagger_1 = require("./config/swagger");
// Import Clean Architecture routes
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const employeeRoutes_1 = __importDefault(require("./routes/employeeRoutes"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const leaveRequestRoutes_1 = __importDefault(require("./routes/leaveRequestRoutes"));
const systemConfigRoutes_1 = __importDefault(require("./routes/systemConfigRoutes"));
const attendanceRoutes_1 = __importDefault(require("./routes/attendanceRoutes"));
const payrollRoutes_1 = __importDefault(require("./routes/payrollRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const dashboardRoutes_1 = __importDefault(require("./routes/dashboardRoutes"));
const orgChartRoutes_1 = __importDefault(require("./routes/orgChartRoutes"));
const notesRoutes_1 = __importDefault(require("./routes/notesRoutes"));
const init_db_1 = require("./scripts/init-db");
dotenv_1.default.config();
const app = (0, express_1.default)();
const port = process.env.PORT || 3001;
// Security: Helmet - Security headers
app.use(security_1.helmetConfig);
// Performance: Gzip/Brotli compression for responses
app.use((0, compression_1.default)({
    level: 6,
    threshold: 1024, // Only compress responses > 1KB
    filter: (req, res) => {
        if (req.headers['x-no-compression']) {
            return false;
        }
        return compression_1.default.filter(req, res);
    }
}));
// Security: CORS configuration - support multiple origins
const allowedOrigins = [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.FRONTEND_URL,
].filter(Boolean);
const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, etc.)
        if (!origin) {
            callback(null, true);
            return;
        }
        // Check if origin is allowed
        if (allowedOrigins.some(allowed => origin.startsWith(allowed.replace(/\/$/, '')))) {
            callback(null, true);
        }
        else {
            console.warn(`CORS blocked origin: ${origin}`);
            callback(null, true); // Allow anyway for now, log for debugging
        }
    },
    credentials: true,
    optionsSuccessStatus: 200,
};
app.use((0, cors_1.default)(corsOptions));
// Security: Rate limiting for all requests
app.use(security_1.generalLimiter);
// Body parser
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
// Audit logging middleware
app.use(auditLog_1.auditLogMiddleware);
// Serve uploaded files statically
app.use("/uploads", express_1.default.static(path_1.default.join(__dirname, "../uploads")));
app.get("/ping", (_req, res) => res.send("pong"));
// API Documentation
app.use("/api-docs", swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swagger_1.swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: "HARI HR API Documentation",
}));
// Serve OpenAPI spec as JSON
app.get("/api-docs.json", (_req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(swagger_1.swaggerSpec);
});
// ==========================================
// CLEAN ARCHITECTURE ROUTES
// ==========================================
// Auth routes (login is public, change-password is protected)
app.use("/api/auth", authRoutes_1.default);
// Protected routes (all require authentication)
app.use("/api/employees", employeeRoutes_1.default);
app.use("/api/documents", documentRoutes_1.default);
app.use("/api/leave-requests", leaveRequestRoutes_1.default);
app.use("/api/configs", systemConfigRoutes_1.default);
app.use("/api/attendance", attendanceRoutes_1.default);
app.use("/api/payroll", payrollRoutes_1.default);
app.use("/api/notifications", notificationRoutes_1.default);
app.use("/api/dashboard", dashboardRoutes_1.default);
app.use("/api/org-chart", orgChartRoutes_1.default);
app.use("/api/notes", notesRoutes_1.default);
// Backward compatibility for leave balances endpoint
// Old: GET /api/leave-balances/:employeeId
// New: GET /api/leave-requests/balances/:employeeId
app.get("/api/leave-balances/:employeeId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    req.url = `/balances/${req.params.employeeId}`;
    (0, leaveRequestRoutes_1.default)(req, res, () => { });
}));
// ==========================================
// NEW ENDPOINTS (Tasks, Documents, etc.)
// ==========================================
// GET /api/tasks
app.get("/api/tasks", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, db_1.query)("SELECT * FROM tasks ORDER BY due_date ASC");
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
    }
    catch (err) {
        console.error("Error fetching tasks:", err);
        res.status(500).json({ error: "Failed to fetch tasks" });
    }
}));
// GET /api/training-modules
app.get("/api/training-modules", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, db_1.query)("SELECT * FROM training_modules");
        res.json(result.rows);
    }
    catch (err) {
        console.error("Error fetching training modules:", err);
        res.status(500).json({ error: "Failed to fetch modules" });
    }
}));
// GET /api/job-history
app.get("/api/job-history", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { employeeId } = req.query;
    try {
        let queryText = "SELECT * FROM job_history";
        const params = [];
        if (employeeId) {
            queryText += " WHERE employee_id = $1";
            params.push(employeeId);
        }
        queryText += " ORDER BY start_date DESC";
        const result = yield (0, db_1.query)(queryText, params);
        const history = result.rows.map((row) => ({
            id: row.id,
            role: row.role,
            department: row.department,
            startDate: row.start_date,
            endDate: row.end_date || "Present",
            description: row.description,
        }));
        res.json(history);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed" });
    }
}));
// GET /api/performance-reviews
app.get("/api/performance-reviews", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { employeeId } = req.query;
    try {
        let queryText = "SELECT * FROM performance_reviews";
        const params = [];
        if (employeeId) {
            queryText += " WHERE employee_id = $1";
            params.push(employeeId);
        }
        queryText += " ORDER BY date DESC";
        const result = yield (0, db_1.query)(queryText, params);
        const reviews = result.rows.map((row) => ({
            id: row.id,
            employeeId: row.employee_id,
            date: row.date,
            rating: row.rating,
            notes: row.notes,
        }));
        res.json(reviews);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed" });
    }
}));
// GET /api/employee-training/:employeeId
app.get("/api/employee-training/:employeeId", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { employeeId } = req.params;
    try {
        const result = yield (0, db_1.query)(`SELECT et.id, et.title, et.duration, et.status, et.completion_date, et.score,
                    tm.type, tm.thumbnail, tm.progress as module_progress
             FROM employee_training et
             LEFT JOIN training_modules tm ON et.module_id = tm.id
             WHERE et.employee_id = $1
             ORDER BY et.completion_date DESC NULLS LAST`, [employeeId]);
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
    }
    catch (err) {
        console.error("Error fetching employee training:", err);
        res.status(500).json({ error: "Failed to fetch training records" });
    }
}));
// POST /api/employee-training (Admin assigns training to employee)
app.post("/api/employee-training", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { employeeId, moduleId, title, duration } = req.body;
    if (!employeeId)
        return res.status(400).json({ error: "employeeId required" });
    try {
        const result = yield (0, db_1.query)(`INSERT INTO employee_training (employee_id, module_id, title, duration, status)
             VALUES ($1, $2, $3, $4, 'Not Started')
             RETURNING *`, [
            employeeId,
            moduleId || null,
            title || "Untitled Training",
            duration || "1h",
        ]);
        res.status(201).json(result.rows[0]);
    }
    catch (err) {
        console.error("Error assigning training:", err);
        res.status(500).json({ error: "Failed to assign training" });
    }
}));
// PATCH /api/employee-training/:id (Update training status/progress)
app.patch("/api/employee-training/:id", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    const { status, score } = req.body;
    try {
        const completionDate = status === "Completed" ? new Date() : null;
        const result = yield (0, db_1.query)(`UPDATE employee_training 
             SET status = COALESCE($1, status), 
                 score = COALESCE($2, score),
                 completion_date = COALESCE($3, completion_date)
             WHERE id = $4 
             RETURNING *`, [status, score, completionDate, id]);
        if (result.rows.length === 0)
            return res.status(404).json({ error: "Training record not found" });
        res.json(result.rows[0]);
    }
    catch (err) {
        console.error("Error updating training:", err);
        res.status(500).json({ error: "Failed to update training" });
    }
}));
// GET /api/events
app.get("/api/events", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, db_1.query)("SELECT * FROM events");
        const events = result.rows.map((row) => ({
            id: row.id,
            title: row.title,
            date: row.date_str,
            type: row.type,
            avatar: row.avatar,
            color: row.color,
        }));
        res.json(events);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed" });
    }
}));
// GET /api/announcements
app.get("/api/announcements", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, db_1.query)(`
      SELECT a.*, e.name AS author_name
      FROM announcements a
      LEFT JOIN users u ON a.created_by = u.id
      LEFT JOIN employees e ON e.user_id = u.id
      ORDER BY a.created_at DESC NULLS LAST, a.id DESC
    `);
        const items = result.rows.map((row) => ({
            id: row.id,
            title: row.title,
            description: row.description,
            type: row.type,
            date: row.date_str,
            author: row.author_name || null,
            createdAt: row.created_at || null,
        }));
        res.json(items);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed" });
    }
}));
// POST /api/announcements - Create new announcement
app.post("/api/announcements", auth_1.authenticateToken, security_1.apiLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const { title, description, type, date } = req.body;
    // Validation
    if (!title || !description) {
        return res.status(400).json({ error: "Title and description are required" });
    }
    if (type && !['announcement', 'policy', 'event'].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Must be 'announcement', 'policy', or 'event'" });
    }
    try {
        const userId = ((_a = req.user) === null || _a === void 0 ? void 0 : _a.userId) || null;
        const result = yield (0, db_1.query)(`INSERT INTO announcements (title, description, type, date_str, created_by)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`, [title, description, type || 'announcement', date || null, userId]);
        // Fetch author name
        let authorName = null;
        if (userId) {
            const authorResult = yield (0, db_1.query)(`SELECT e.name FROM employees e JOIN users u ON e.user_id = u.id WHERE u.id = $1`, [userId]);
            authorName = ((_b = authorResult.rows[0]) === null || _b === void 0 ? void 0 : _b.name) || null;
        }
        const newAnnouncement = result.rows[0];
        res.status(201).json({
            id: newAnnouncement.id,
            title: newAnnouncement.title,
            description: newAnnouncement.description,
            type: newAnnouncement.type,
            date: newAnnouncement.date_str,
            author: authorName,
            createdAt: newAnnouncement.created_at,
        });
    }
    catch (err) {
        console.error("Error creating announcement:", err);
        res.status(500).json({ error: "Failed to create announcement" });
    }
}));
// PATCH /api/announcements/:id - Update announcement
app.patch("/api/announcements/:id", auth_1.authenticateToken, auth_1.requireAdmin, security_1.apiLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const { id } = req.params;
    const { title, description, type, date } = req.body;
    // Validate type if provided
    if (type && !['announcement', 'policy', 'event'].includes(type)) {
        return res.status(400).json({ error: "Invalid type. Must be 'announcement', 'policy', or 'event'" });
    }
    try {
        // Build dynamic update query
        const updates = [];
        const values = [];
        let paramCount = 1;
        if (title !== undefined) {
            updates.push(`title = $${paramCount++}`);
            values.push(title);
        }
        if (description !== undefined) {
            updates.push(`description = $${paramCount++}`);
            values.push(description);
        }
        if (type !== undefined) {
            updates.push(`type = $${paramCount++}`);
            values.push(type);
        }
        if (date !== undefined) {
            updates.push(`date_str = $${paramCount++}`);
            values.push(date);
        }
        if (updates.length === 0) {
            return res.status(400).json({ error: "No fields to update" });
        }
        values.push(id);
        const result = yield (0, db_1.query)(`UPDATE announcements SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING *`, values);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Announcement not found" });
        }
        const updatedAnnouncement = result.rows[0];
        // Fetch author name if created_by exists
        let authorName = null;
        if (updatedAnnouncement.created_by) {
            const authorResult = yield (0, db_1.query)(`SELECT e.name FROM employees e JOIN users u ON e.user_id = u.id WHERE u.id = $1`, [updatedAnnouncement.created_by]);
            authorName = ((_a = authorResult.rows[0]) === null || _a === void 0 ? void 0 : _a.name) || null;
        }
        res.json({
            id: updatedAnnouncement.id,
            title: updatedAnnouncement.title,
            description: updatedAnnouncement.description,
            type: updatedAnnouncement.type,
            date: updatedAnnouncement.date_str,
            author: authorName,
            createdAt: updatedAnnouncement.created_at,
        });
    }
    catch (err) {
        console.error("Error updating announcement:", err);
        res.status(500).json({ error: "Failed to update announcement" });
    }
}));
// DELETE /api/announcements/:id - Delete announcement
app.delete("/api/announcements/:id", auth_1.authenticateToken, auth_1.requireAdmin, security_1.apiLimiter, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { id } = req.params;
    try {
        const result = yield (0, db_1.query)("DELETE FROM announcements WHERE id = $1 RETURNING id", [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: "Announcement not found" });
        }
        res.json({ message: "Announcement deleted successfully", id: result.rows[0].id });
    }
    catch (err) {
        console.error("Error deleting announcement:", err);
        res.status(500).json({ error: "Failed to delete announcement" });
    }
}));
// GET /api/contacts
app.get("/api/contacts", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, db_1.query)("SELECT * FROM contacts");
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed" });
    }
}));
// GET /api/audit-logs
app.get("/api/audit-logs", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Get real-time audit logs from our logging system
        const auditLogs = (0, auditLog_1.getAuditLogs)(100);
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
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed to fetch audit logs" });
    }
}));
// Helper function to map resource to log type for UI
function getLogType(resource) {
    if (resource === "Employee")
        return "user";
    if (resource === "Leave Request")
        return "leave";
    if (resource === "Document")
        return "policy";
    return "user";
}
// GET /api/headcount-stats
app.get("/api/headcount-stats", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, db_1.query)("SELECT * FROM stats_headcount ORDER BY id ASC");
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed" });
    }
}));
// GET /api/compliance
app.get("/api/compliance", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield (0, db_1.query)("SELECT * FROM compliance_items");
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed" });
    }
}));
// GET /api/sentiment
app.get("/api/sentiment", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Return array of { name, value }
        const result = yield (0, db_1.query)("SELECT * FROM sentiment_stats");
        res.json(result.rows);
    }
    catch (err) {
        console.error(err);
        res.status(500).json({ error: "Failed" });
    }
}));
// GET /api/leave-balances/:employeeId (Existing code continues...)
// POST /api/system/setup (Initial setup - only works when database is empty)
// This allows setting up the database without authentication for first-time deployment
app.post("/api/system/setup", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // Check if any users exist
        const usersResult = yield (0, db_1.query)("SELECT COUNT(*) as count FROM users");
        const userCount = parseInt(usersResult.rows[0].count, 10);
        if (userCount > 0) {
            return res.status(403).json({
                error: "Setup already completed",
                message: "Database already has users. Use /api/system/seed with admin authentication to reseed."
            });
        }
        // Database is empty, safe to seed
        yield (0, init_db_1.runMigration)();
        res.json({
            message: "Database setup completed successfully",
            hint: "You can now login with admin@company.com / Admin123!@#"
        });
    }
    catch (err) {
        const error = err;
        console.error("Setup error:", error);
        // If tables don't exist, try running migration anyway
        if (error.code === '42P01') { // Table doesn't exist error
            try {
                yield (0, init_db_1.runMigration)();
                res.json({
                    message: "Database setup completed successfully",
                    hint: "You can now login with admin@company.com / Admin123!@#"
                });
            }
            catch (migrationErr) {
                console.error("Migration error:", migrationErr);
                res.status(500).json({ error: "Failed to setup database" });
            }
        }
        else {
            res.status(500).json({ error: "Failed to setup database" });
        }
    }
}));
// POST /api/system/seed (Manually trigger database seed - ADMIN ONLY)
// Security: This endpoint requires authentication and HR_ADMIN role
app.post("/api/system/seed", auth_1.authenticateToken, auth_1.requireAdmin, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, init_db_1.runMigration)();
        res.json({ message: "Database seeded successfully" });
    }
    catch (err) {
        console.error("Seeding error:", err);
        res.status(500).json({ error: "Failed to seed database" });
    }
}));
// Lightweight migrations (safe to run multiple times)
const runLightMigrations = () => __awaiter(void 0, void 0, void 0, function* () {
    try {
        yield (0, db_1.query)(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(id) ON DELETE SET NULL`);
        yield (0, db_1.query)(`ALTER TABLE announcements ADD COLUMN IF NOT EXISTS created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`);
    }
    catch (err) {
        // Table may not exist yet — ignore
    }
});
// Only start the server when running locally (not in Vercel serverless)
if (process.env.VERCEL !== '1') {
    runLightMigrations().then(() => {
        app.listen(port, () => {
            console.log(`Server running at http://localhost:${port}`);
        });
    });
}
// Export for Vercel serverless
exports.default = app;
