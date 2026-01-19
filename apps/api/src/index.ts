import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Extend Express Request
declare global {
    namespace Express {
        interface Request {
            user?: any;
        }
    }
}

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'image/jpeg', 'image/png', 'image/gif'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(null, true); // Allow all for demo, but log warning
            console.warn('File type may not be supported:', file.mimetype);
        }
    }
});

// Serve uploaded files statically
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/ping', (req, res) => res.send('pong'));

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_key'; // In prod, strictly from .env

// Middleware: Authenticate Token
const authenticateToken = (req: Request, res: Response, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) return res.sendStatus(401);

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

// ==========================================
// AUTH ENDPOINTS
// ==========================================

// POST /api/auth/login
// ... (Login Endpoint)
app.post('/api/auth/login', async (req: Request, res: Response) => {
    // ... (existing code)
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    try {
        // 1. Find User
        const userResult = await query('SELECT * FROM users WHERE email = $1', [email]);
        if (userResult.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

        const user = userResult.rows[0];

        // 2. Compare Password
        const validPassword = await bcrypt.compare(password, user.password_hash);
        if (!validPassword) return res.status(401).json({ error: 'Invalid credentials' });

        // 3. Get Employee Info (for frontend convenience)
        const empResult = await query('SELECT id, name, role, department, avatar FROM employees WHERE user_id = $1', [user.id]);
        const employee = empResult.rows[0] || {}; // Might be null if just a user without profile? Unlikely in this design.

        // 4. Generate Token
        // Payload includes userId and employeeId if available
        const payload = {
            userId: user.id,
            email: user.email,
            role: user.role,
            employeeId: employee.id
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });

        res.json({ token, user: { ...payload, name: employee.name, avatar: employee.avatar } });

    } catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Protect all subsequent API routes
app.use('/api', authenticateToken);

// POST /api/auth/change-password
app.post('/api/auth/change-password', async (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.userId;

    if (!currentPassword || !newPassword) {
        return res.status(400).json({ error: 'Current and new password are required' });
    }

    try {
        const userRes = await query('SELECT * FROM users WHERE id = $1', [userId]);
        if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
        const user = userRes.rows[0];

        const valid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Incorrect current password' });

        const saltRounds = 10;
        const newHash = await bcrypt.hash(newPassword, saltRounds);

        await query('UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2', [newHash, userId]);

        res.json({ message: 'Password updated successfully' });
    } catch (err) {
        console.error('Change password error:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

// GET /api/employees
app.get('/api/employees', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM employees ORDER BY created_at DESC');
        const employees = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            department: row.department,
            avatar: row.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`,
            status: row.status,
            onboardingStatus: row.onboarding_status,
            onboardingPercentage: row.onboarding_percentage,
            joinDate: row.join_date,
            location: row.location,
            skills: row.skills,
            bio: row.bio,
            slack: row.slack,
            emergencyContact: row.emergency_contact
        }));
        res.json(employees);
    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

// PATCH /api/employees/:id (Update employee details)
app.patch('/api/employees/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { name, email, role, department, managerId, status, location, bio, skills } = req.body;

    try {
        const result = await query(
            `UPDATE employees 
             SET name = COALESCE($1, name),
                 email = COALESCE($2, email),
                 role = COALESCE($3, role),
                 department = COALESCE($4, department),
                 manager_id = COALESCE($5, manager_id),
                 status = COALESCE($6, status),
                 location = COALESCE($7, location),
                 bio = COALESCE($8, bio),
                 skills = COALESCE($9, skills)
             WHERE id = $10
             RETURNING *`,
            [name, email, role, department, managerId, status, location, bio, skills, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        const row = result.rows[0];
        res.json({
            id: row.id,
            name: row.name,
            email: row.email,
            role: row.role,
            department: row.department,
            managerId: row.manager_id,
            status: row.status,
            location: row.location,
            bio: row.bio,
            skills: row.skills
        });
    } catch (err) {
        console.error('Error updating employee:', err);
        res.status(500).json({ error: 'Failed to update employee' });
    }
});

// DELETE /api/employees/:id (Soft delete or hard delete)
app.delete('/api/employees/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { cascade } = req.query; // If cascade=true, also delete children

    try {
        if (cascade === 'true') {
            // Recursive delete: First nullify children's manager_id or delete them
            await query('UPDATE employees SET manager_id = NULL WHERE manager_id = $1', [id]);
        }

        const result = await query('DELETE FROM employees WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        res.json({ message: 'Employee deleted successfully', id: result.rows[0].id });
    } catch (err) {
        console.error('Error deleting employee:', err);
        res.status(500).json({ error: 'Failed to delete employee. They may have dependent records.' });
    }
});

// ... (Existing Org Chart & POST Employees - Keeping them as is or assuming they are roughly consistent) ...

// ==========================================
// NEW ENDPOINTS (Tasks, Documents, etc.)
// ==========================================

// GET /api/tasks
app.get('/api/tasks', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM tasks ORDER BY due_date ASC');
        const tasks = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            stage: row.stage,
            assignee: row.assignee,
            dueDate: row.due_date, // Date string
            completed: row.completed,
            priority: row.priority,
            link: row.link
        }));
        res.json(tasks);
    } catch (err) {
        console.error('Error fetching tasks:', err);
        res.status(500).json({ error: 'Failed to fetch tasks' });
    }
});

// GET /api/training-modules
app.get('/api/training-modules', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM training_modules');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching training modules:', err);
        res.status(500).json({ error: 'Failed to fetch modules' });
    }
});

// GET /api/documents
app.get('/api/documents', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM documents ORDER BY id DESC');
        const docs = result.rows.map(row => ({
            id: row.id,
            name: row.name,
            type: row.type,
            category: row.category,
            size: row.size,
            owner: row.owner_name,
            employeeId: row.employee_id,
            lastAccessed: row.last_accessed ? new Date(row.last_accessed).toISOString() : 'Never',
            status: row.status
        }));
        res.json(docs);
    } catch (err) {
        console.error('Error fetching documents:', err);
        res.status(500).json({ error: 'Failed' });
    }
});

// POST /api/documents (Real file upload with multer)
app.post('/api/documents', upload.single('file'), async (req: Request, res: Response) => {
    const file = req.file;
    const { category, ownerName, employeeId } = req.body;

    if (!file) {
        return res.status(400).json({ error: 'File is required' });
    }

    // Determine file type from extension
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '').toUpperCase();
    const typeMap: { [key: string]: string } = {
        'PDF': 'PDF', 'DOC': 'DOCX', 'DOCX': 'DOCX', 'XLS': 'XLSX', 'XLSX': 'XLSX',
        'JPG': 'JPG', 'JPEG': 'JPG', 'PNG': 'PNG', 'GIF': 'PNG'
    };
    const fileType = typeMap[ext] || 'PDF';

    // Format file size
    const fileSizeKB = Math.round(file.size / 1024);
    const fileSize = fileSizeKB > 1024 ? `${(fileSizeKB / 1024).toFixed(1)} MB` : `${fileSizeKB} KB`;

    try {
        const result = await query(
            `INSERT INTO documents (name, type, category, size, owner_name, employee_id, file_path, last_accessed, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP, 'Uploaded')
             RETURNING *`,
            [file.originalname, fileType, category || 'HR', fileSize, ownerName, employeeId, file.filename]
        );

        const row = result.rows[0];
        res.status(201).json({
            id: row.id,
            name: row.name,
            type: row.type,
            category: row.category,
            size: row.size,
            owner: row.owner_name,
            filePath: row.file_path,
            lastAccessed: 'Just now',
            status: row.status
        });
    } catch (err) {
        console.error('Error uploading document:', err);
        // Clean up uploaded file on error
        if (file) fs.unlinkSync(file.path);
        res.status(500).json({ error: 'Failed to upload document' });
    }
});

// GET /api/documents/:id/download (Download file)
app.get('/api/documents/:id/download', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        const result = await query('SELECT name, file_path FROM documents WHERE id = $1', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        const doc = result.rows[0];
        if (!doc.file_path) {
            return res.status(404).json({ error: 'File not available for download' });
        }

        const filePath = path.join(__dirname, '../uploads', doc.file_path);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        res.download(filePath, doc.name);
    } catch (err) {
        console.error('Error downloading document:', err);
        res.status(500).json({ error: 'Failed to download document' });
    }
});

// DELETE /api/documents/:id (Also delete file from disk)
app.delete('/api/documents/:id', async (req: Request, res: Response) => {
    const { id } = req.params;

    try {
        // Get file path before deleting record
        const docResult = await query('SELECT file_path FROM documents WHERE id = $1', [id]);

        const result = await query('DELETE FROM documents WHERE id = $1 RETURNING id', [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Document not found' });
        }

        // Delete file from disk if exists
        if (docResult.rows.length > 0 && docResult.rows[0].file_path) {
            const filePath = path.join(__dirname, '../uploads', docResult.rows[0].file_path);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        res.json({ message: 'Document deleted successfully', id: result.rows[0].id });
    } catch (err) {
        console.error('Error deleting document:', err);
        res.status(500).json({ error: 'Failed to delete document' });
    }
});

// GET /api/job-history
app.get('/api/job-history', async (req: Request, res: Response) => {
    const { employeeId } = req.query;
    try {
        let queryText = 'SELECT * FROM job_history';
        const params: any[] = [];
        if (employeeId) {
            queryText += ' WHERE employee_id = $1';
            params.push(employeeId);
        }
        queryText += ' ORDER BY start_date DESC';

        const result = await query(queryText, params);
        const history = result.rows.map(row => ({
            id: row.id,
            role: row.role,
            department: row.department,
            startDate: row.start_date,
            endDate: row.end_date || 'Present',
            description: row.description
        }));
        res.json(history);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/performance-reviews
app.get('/api/performance-reviews', async (req: Request, res: Response) => {
    const { employeeId } = req.query;
    try {
        let queryText = 'SELECT * FROM performance_reviews';
        const params: any[] = [];
        if (employeeId) {
            queryText += ' WHERE employee_id = $1';
            params.push(employeeId);
        }
        queryText += ' ORDER BY date DESC';

        const result = await query(queryText, params);
        const reviews = result.rows.map(row => ({
            id: row.id,
            employeeId: row.employee_id,
            date: row.date,
            rating: row.rating,
            notes: row.notes
        }));
        res.json(reviews);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/employee-training/:employeeId
app.get('/api/employee-training/:employeeId', async (req: Request, res: Response) => {
    const { employeeId } = req.params;
    try {
        const result = await query(
            `SELECT et.id, et.title, et.duration, et.status, et.completion_date, et.score,
                    tm.type, tm.thumbnail, tm.progress as module_progress
             FROM employee_training et
             LEFT JOIN training_modules tm ON et.module_id = tm.id
             WHERE et.employee_id = $1
             ORDER BY et.completion_date DESC NULLS LAST`,
            [employeeId]
        );
        const training = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            duration: row.duration,
            status: row.status,
            completedDate: row.completion_date,
            score: row.score,
            type: row.type || 'Course',
            thumbnail: row.thumbnail,
            progress: row.module_progress || 0
        }));
        res.json(training);
    } catch (err) {
        console.error('Error fetching employee training:', err);
        res.status(500).json({ error: 'Failed to fetch training records' });
    }
});

// POST /api/employee-training (Admin assigns training to employee)
app.post('/api/employee-training', async (req: Request, res: Response) => {
    const { employeeId, moduleId, title, duration } = req.body;
    if (!employeeId) return res.status(400).json({ error: 'employeeId required' });

    try {
        const result = await query(
            `INSERT INTO employee_training (employee_id, module_id, title, duration, status)
             VALUES ($1, $2, $3, $4, 'Not Started')
             RETURNING *`,
            [employeeId, moduleId || null, title || 'Untitled Training', duration || '1h']
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error assigning training:', err);
        res.status(500).json({ error: 'Failed to assign training' });
    }
});

// PATCH /api/employee-training/:id (Update training status/progress)
app.patch('/api/employee-training/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status, score } = req.body;
    try {
        const completionDate = status === 'Completed' ? new Date() : null;
        const result = await query(
            `UPDATE employee_training 
             SET status = COALESCE($1, status), 
                 score = COALESCE($2, score),
                 completion_date = COALESCE($3, completion_date)
             WHERE id = $4 
             RETURNING *`,
            [status, score, completionDate, id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Training record not found' });
        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating training:', err);
        res.status(500).json({ error: 'Failed to update training' });
    }
});

// GET /api/events
app.get('/api/events', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM events');
        const events = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            date: row.date_str,
            type: row.type,
            avatar: row.avatar,
            color: row.color
        }));
        res.json(events);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/announcements
app.get('/api/announcements', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM announcements');
        const items = result.rows.map(row => ({
            id: row.id,
            title: row.title,
            description: row.description,
            type: row.type,
            date: row.date_str
        }));
        res.json(items);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/contacts
app.get('/api/contacts', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM contacts');
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/audit-logs
app.get('/api/audit-logs', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM audit_logs ORDER BY created_at DESC');
        const logs = result.rows.map(row => ({
            id: row.id,
            user: row.user_name,
            action: row.action,
            target: row.target,
            time: row.time_str, // Use stored string or format created_at
            type: row.type
        }));
        res.json(logs);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/headcount-stats
app.get('/api/headcount-stats', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM stats_headcount ORDER BY id ASC');
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/compliance
app.get('/api/compliance', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM compliance_items');
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/sentiment
app.get('/api/sentiment', async (req: Request, res: Response) => {
    try {
        // Return array of { name, value }
        const result = await query('SELECT * FROM sentiment_stats');
        res.json(result.rows);
    } catch (err) { console.error(err); res.status(500).json({ error: 'Failed' }); }
});

// GET /api/leave-balances/:employeeId (Existing code continues...)

// GET /api/org-chart
app.get('/api/org-chart', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT id, manager_id as "parentId", name, role, email FROM employees');
        const nodes = result.rows.map(row => ({
            id: row.id,
            parentId: row.parentId || null,
            name: row.name,
            role: row.role,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(row.name)}&background=random`
        }));
        res.json(nodes);
    } catch (err) {
        console.error('Error fetching org chart:', err);
        res.status(500).json({ error: 'Failed to fetch org chart' });
    }
});

// POST /api/employees (Invite/Add)
// POST /api/employees (Invite/Add)
app.post('/api/employees', async (req: Request, res: Response) => {
    // Expect body: { name, email, role, department, managerId, joinDate }
    const { name, email, role, department, managerId, joinDate } = req.body;

    // Basic validation
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and Email are required.' });
    }

    try {
        // 1. Create User account first (Separation of Concerns)
        // Default password for invited employees: "Welcome123!"
        const saltRounds = 10;
        const passwordHash = await bcrypt.hash('Welcome123!', saltRounds);

        // Check if user already exists
        const userCheck = await query('SELECT id FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
            return res.status(409).json({ error: 'User with this email already exists.' });
        }

        const userRes = await query(
            `INSERT INTO users (email, password_hash, role) VALUES ($1, $2, $3) RETURNING id`,
            [email, passwordHash, 'EMPLOYEE'] // Default role
        );
        const userId = userRes.rows[0].id;

        // 2. Create Employee Profile linked to User
        const result = await query(
            `INSERT INTO employees (user_id, name, email, role, department, manager_id, join_date) 
             VALUES ($1, $2, $3, $4, $5, $6, $7) 
             RETURNING *`,
            [userId, name, email, role, department, managerId || null, joinDate || new Date()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        console.error('Error adding employee:', err);
        res.status(500).json({ error: 'Failed to add employee' });
    }
});

// ==========================================
// LEAVE MANAGEMENT
// ==========================================

// GET /api/leave-requests
app.get('/api/leave-requests', async (req: Request, res: Response) => {
    try {
        // Join with employees to get name and avatar info
        // We'll construct avatar dynamically or store it. For now dynamic.
        const queryText = `
            SELECT lr.*, e.name as "employeeName", e.email as "employeeEmail"
            FROM leave_requests lr
            JOIN employees e ON lr.employee_id = e.id
            ORDER BY lr.created_at DESC
        `;
        const result = await query(queryText);

        // Transform to match frontend types if needed, or update frontend to match DB snake_case
        // Let's transform to camelCase to minimize frontend drift for now
        const requests = result.rows.map(row => ({
            id: row.id,
            employeeId: row.employee_id,
            employeeName: row.employeeName,
            type: row.leave_type, // DB: leave_type, Frontend: type
            dates: `${new Date(row.start_date).toLocaleDateString()} - ${new Date(row.end_date).toLocaleDateString()}`, // Formatted string for list
            startDate: row.start_date,
            endDate: row.end_date,
            days: Math.ceil((new Date(row.end_date).getTime() - new Date(row.start_date).getTime()) / (1000 * 60 * 60 * 24)) + 1,
            status: row.status,
            avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(row.employeeName)}&background=random`
        }));

        res.json(requests);
    } catch (err) {
        console.error('Error fetching leave requests:', err);
        res.status(500).json({ error: 'Failed to fetch leave requests' });
    }
});

// POST /api/leave-requests
app.post('/api/leave-requests', async (req: Request, res: Response) => {
    // Body: { employeeId, type, startDate, endDate, reason }
    const { employeeId, type, startDate, endDate, reason } = req.body;

    if (!employeeId || !type || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }

    try {
        const result = await query(
            `INSERT INTO leave_requests (employee_id, leave_type, start_date, end_date, reason) 
             VALUES ($1, $2, $3, $4, $5) 
             RETURNING *`,
            [employeeId, type, startDate, endDate, reason]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        console.error('Error creating leave request:', err);
        res.status(500).json({ error: 'Failed to create leave request' });
    }
});

// PATCH /api/leave-requests/:id (Approve/Reject)
app.patch('/api/leave-requests/:id', async (req: Request, res: Response) => {
    const { id } = req.params;
    const { status } = req.body; // 'Approved' | 'Rejected'

    if (!['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        const result = await query(
            `UPDATE leave_requests 
             SET status = $1
             WHERE id = $2 
             RETURNING *`,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Request not found' });
        }

        // Logic to update balances could go here (Trigger or explicit update)
        // For now, Balance is dynamic calculated on GET, so just updating status is enough for the calculation to work!

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Error updating leave request:', err);
        res.status(500).json({ error: 'Failed to update request' });
    }
});

// GET /api/leave-balances/:employeeId
app.get('/api/leave-balances/:employeeId', async (req: Request, res: Response) => {
    const { employeeId } = req.params;

    // Define Quotas (could be in DB, for now hardcoded/hybrid)
    const QUOTAS: Record<string, number> = {
        'Vacation': 20,
        'Sick Leave': 10,
        'Personal Day': 5
    };

    try {
        // Calculate Used Days
        // Sum days for Approved requests in current year
        const result = await query(
            `SELECT leave_type, start_date, end_date 
             FROM leave_requests 
             WHERE employee_id = $1 AND status = 'Approved' 
             AND EXTRACT(YEAR FROM start_date) = EXTRACT(YEAR FROM CURRENT_DATE)`,
            [employeeId]
        );

        // Aggregate used days
        const usedMap: Record<string, number> = {
            'Vacation': 0, 'Sick Leave': 0, 'Personal Day': 0
        };

        result.rows.forEach(row => {
            const start = new Date(row.start_date);
            const end = new Date(row.end_date);
            const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

            if (usedMap[row.leave_type] !== undefined) {
                usedMap[row.leave_type] += days;
            } else {
                usedMap[row.leave_type] = days; // Add if dynamic type
            }
        });

        // Format response
        const balances = Object.keys(QUOTAS).map(type => ({
            type,
            total: QUOTAS[type],
            used: usedMap[type] || 0,
            remaining: QUOTAS[type] - (usedMap[type] || 0)
        }));

        // Add Unpaid Leave (Unlimited)
        balances.push({
            type: 'Unpaid Leave',
            total: Infinity,
            used: result.rows.filter(r => r.leave_type === 'Unpaid Leave').length, // Simplification
            remaining: Infinity
        });

        res.json(balances);

    } catch (err) {
        console.error('Error fetching balances:', err);
        res.status(500).json({ error: 'Failed to fetch balances' });
    }
});

app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
