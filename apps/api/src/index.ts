import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { query } from './db';

dotenv.config();

const app = express();
const port = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// ==========================================
// EMPLOYEES & ORG CHART
// ==========================================

// GET /api/employees
app.get('/api/employees', async (req: Request, res: Response) => {
    try {
        const result = await query('SELECT * FROM employees ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error('Error fetching employees:', err);
        res.status(500).json({ error: 'Failed to fetch employees' });
    }
});

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
app.post('/api/employees', async (req: Request, res: Response) => {
    // Expect body: { name, email, role, department, managerId, joinDate }
    const { name, email, role, department, managerId, joinDate } = req.body;

    // Basic validation
    if (!name || !email) {
        return res.status(400).json({ error: 'Name and Email are required.' });
    }

    try {
        const result = await query(
            `INSERT INTO employees (name, email, role, department, manager_id, join_date) 
             VALUES ($1, $2, $3, $4, $5, $6) 
             RETURNING *`,
            [name, email, role, department, managerId || null, joinDate || new Date()]
        );
        res.status(201).json(result.rows[0]);
    } catch (err: any) {
        console.error('Error adding employee:', err);
        // Check for specific DB errors if possible (e.g. duplicate email)
        if (err.code === '23505') { // unique_violation
            return res.status(409).json({ error: 'Email already exists.' });
        }
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
             SET status = $1, updated_at = CURRENT_TIMESTAMP 
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
