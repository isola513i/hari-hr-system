# Team Hierarchy Implementation

## ✅ Changes Made

Removed mock data from the Team section in Employee Detail page and implemented real API integration for team hierarchy (manager and direct reports).

---

## 🔧 Backend Changes

### 1. **Employee Model** - Added `managerId` field
**File**: [apps/api/src/models/Employee.ts](apps/api/src/models/Employee.ts#L19)

```typescript
export interface Employee {
    // ... existing fields
    managerId?: string;  // ✅ Added
}
```

---

### 2. **EmployeeService** - Added team hierarchy methods
**File**: [apps/api/src/services/EmployeeService.ts](apps/api/src/services/EmployeeService.ts)

#### Added `managerId` to row mapping (Line 223):
```typescript
private mapRowToEmployee(row: any): Employee {
    return {
        // ... existing fields
        managerId: row.manager_id,  // ✅ Added
    };
}
```

#### Added `getManager` method (Lines 226-237):
```typescript
/**
 * Get employee's manager
 */
async getManager(employeeId: string): Promise<Employee | null> {
    const result = await query(
        `SELECT m.* FROM employees e
         JOIN employees m ON e.manager_id = m.id
         WHERE e.id = $1`,
        [employeeId]
    );
    if (result.rows.length === 0) {
        return null;
    }
    return this.mapRowToEmployee(result.rows[0]);
}
```

#### Added `getDirectReports` method (Lines 239-247):
```typescript
/**
 * Get employee's direct reports
 */
async getDirectReports(employeeId: string): Promise<Employee[]> {
    const result = await query(
        `SELECT * FROM employees WHERE manager_id = $1 ORDER BY name ASC`,
        [employeeId]
    );
    return result.rows.map(this.mapRowToEmployee);
}
```

---

### 3. **EmployeeController** - Added API endpoints
**File**: [apps/api/src/controllers/EmployeeController.ts](apps/api/src/controllers/EmployeeController.ts)

#### `getEmployeeManager` endpoint (Lines 139-152):
```typescript
async getEmployeeManager(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const manager = await EmployeeService.getManager(id);

        if (!manager) {
            res.status(404).json({ error: 'Manager not found' });
            return;
        }

        res.json(manager);
    } catch (error: any) {
        console.error('Get manager error:', error);
        res.status(500).json({ error: 'Failed to fetch manager' });
    }
}
```

#### `getEmployeeDirectReports` endpoint (Lines 154-164):
```typescript
async getEmployeeDirectReports(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const directReports = await EmployeeService.getDirectReports(id);
        res.json(directReports);
    } catch (error: any) {
        console.error('Get direct reports error:', error);
        res.status(500).json({ error: 'Failed to fetch direct reports' });
    }
}
```

---

### 4. **Employee Routes** - Registered new endpoints
**File**: [apps/api/src/routes/employeeRoutes.ts](apps/api/src/routes/employeeRoutes.ts)

```typescript
// GET /api/employees/:id/manager - Get employee's manager
router.get('/:id/manager', cacheMiddleware(), EmployeeController.getEmployeeManager.bind(EmployeeController));

// GET /api/employees/:id/direct-reports - Get employee's direct reports
router.get('/:id/direct-reports', cacheMiddleware(), EmployeeController.getEmployeeDirectReports.bind(EmployeeController));
```

**Note**: These routes are placed **before** the `/:id` route to avoid path conflicts.

---

## 🎨 Frontend Changes

### 1. **Types** - Added `managerId` to Employee interface
**File**: [apps/web/types.ts](apps/web/types.ts#L34)

```typescript
export interface Employee {
    // ... existing fields
    managerId?: string;  // ✅ Added
}
```

---

### 2. **EmployeeDetail Component** - Integrated real team data
**File**: [apps/web/pages/EmployeeDetail.tsx](apps/web/pages/EmployeeDetail.tsx)

#### Added state for manager and direct reports (Lines 96-97):
```typescript
// Team Hierarchy State
const [manager, setManager] = useState<Employee | null>(null);
const [directReports, setDirectReports] = useState<Employee[]>([]);
```

#### Fetch team data in useEffect (Lines 103-110):
```typescript
const [employeeData, history, reviews, training, docs, managerData, directReportsData] = await Promise.all([
    api.get<Employee>(`/employees/${id}`),
    api.get<any[]>(`/job-history?employeeId=${id}`),
    api.get<PerformanceReview[]>(`/performance-reviews?employeeId=${id}`),
    api.get<any[]>(`/employee-training/${id}`),
    api.get<DocumentItem[]>('/documents'),
    api.get<Employee>(`/employees/${id}/manager`).catch(() => null),  // ✅ Fetch manager
    api.get<Employee[]>(`/employees/${id}/direct-reports`).catch(() => [])  // ✅ Fetch direct reports
]);
```

#### Set team data (Lines 126-127):
```typescript
// Team Hierarchy Data
setManager(managerData);
setDirectReports(directReportsData || []);
```

#### Updated Team UI to use real data (Lines 524-573):
```typescript
{/* Team Hierarchy */}
{(manager || directReports.length > 0) && (
    <div className="bg-card-light dark:bg-card-dark rounded-xl border border-border-light dark:border-border-dark p-6 shadow-sm">
        <h2 className="text-lg font-bold text-text-light dark:text-text-dark mb-4">Team</h2>
        <div className="space-y-4">
            {/* Reports To */}
            {manager && (
                <div>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2 uppercase font-semibold">Reports To</p>
                    <div
                        className="flex items-center gap-3 p-2 rounded-lg hover:bg-background-light dark:hover:bg-background-dark/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/employees/${manager.id}`)}
                    >
                        <img
                            src={manager.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(manager.name)}&background=random`}
                            alt={manager.name}
                            className="w-10 h-10 rounded-full object-cover"
                        />
                        <div>
                            <p className="font-medium text-text-light dark:text-text-dark text-sm">{manager.name}</p>
                            <p className="text-xs text-text-muted-light dark:text-text-muted-dark">{manager.role}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Direct Reports */}
            {directReports.length > 0 && (
                <div>
                    <p className="text-xs text-text-muted-light dark:text-text-muted-dark mb-2 uppercase font-semibold">Direct Reports</p>
                    <div className="flex -space-x-2 overflow-hidden py-1">
                        {directReports.slice(0, 3).map((report) => (
                            <img
                                key={report.id}
                                className="inline-block h-8 w-8 rounded-full ring-2 ring-card-light dark:ring-card-dark cursor-pointer hover:z-10 transition-transform hover:scale-110"
                                src={report.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(report.name)}&background=random`}
                                alt={report.name}
                                title={report.name}
                                onClick={() => navigate(`/employees/${report.id}`)}
                            />
                        ))}
                        {directReports.length > 3 && (
                            <div className="h-8 w-8 rounded-full ring-2 ring-card-light dark:ring-card-dark bg-background-light dark:bg-background-dark flex items-center justify-center text-xs text-text-muted-light font-medium">
                                +{directReports.length - 3}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    </div>
)}
```

---

## 🎯 Features Implemented

### ✅ Reports To (Manager)
- Displays employee's manager if `manager_id` exists in database
- Shows manager's avatar, name, and role
- Clickable to navigate to manager's profile page
- Gracefully handles employees with no manager (e.g., CEO)

### ✅ Direct Reports
- Displays employees who report to this employee (`manager_id = employee.id`)
- Shows up to 3 avatars with "+X" badge if more exist
- Each avatar is clickable to navigate to that employee's profile
- Avatars have hover effects (scale up, z-index increase)
- Sorted by name alphabetically

### ✅ Conditional Rendering
- Team section only shows if employee has a manager OR direct reports
- If employee has neither (e.g., individual contributor with no manager set), the entire Team section is hidden
- Clean, minimal UI with no unnecessary empty states

### ✅ Navigation
- Clicking on manager navigates to manager's profile
- Clicking on any direct report avatar navigates to their profile
- Seamless navigation within the org chart

---

## 🗄️ Database Schema

The `employees` table already has the required `manager_id` column:

```sql
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    -- ... other fields ...
    manager_id UUID,  -- ✅ Already exists
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_manager_id ON employees(manager_id);  -- ✅ Indexed for performance
```

---

## 🧪 Testing Instructions

### Test 1: Employee with Manager
1. Update an employee to have a manager:
   ```sql
   UPDATE employees
   SET manager_id = (SELECT id FROM employees WHERE email = 'admin@aiya.ai' LIMIT 1)
   WHERE email = 'nattapat@aiya.ai';
   ```
2. Go to http://localhost:5173/#/employees/eb28f426-f067-4ddf-b826-279e1f717788
3. **Expected**: Team section shows with "Reports To" displaying the admin
4. Click on manager's avatar
5. **Expected**: Navigates to manager's profile page

### Test 2: Manager with Direct Reports
1. Make an employee a manager:
   ```sql
   UPDATE employees
   SET manager_id = (SELECT id FROM employees WHERE email = 'nattapat@aiya.ai' LIMIT 1)
   WHERE email IN ('user1@aiya.ai', 'user2@aiya.ai', 'user3@aiya.ai');
   ```
2. Go to Nattapat's profile
3. **Expected**: Team section shows "Direct Reports" with avatars
4. Click on any direct report avatar
5. **Expected**: Navigates to that employee's profile

### Test 3: Employee with No Manager and No Reports
1. Go to an employee with no manager_id set and no one reporting to them
2. **Expected**: Team section does NOT appear (conditional rendering)

### Test 4: Manager with More than 3 Direct Reports
1. Assign 5+ employees to report to one manager
2. Go to manager's profile
3. **Expected**: Shows 3 avatars + "+2" badge (or +X based on count)

---

## 📊 API Endpoints

### `GET /api/employees/:id/manager`
Returns the employee's manager (if exists)

**Response 200**:
```json
{
  "id": "uuid",
  "name": "Sarah Jones",
  "email": "sarah@aiya.ai",
  "role": "VP of Engineering",
  "avatar": "...",
  ...
}
```

**Response 404**: Manager not found

---

### `GET /api/employees/:id/direct-reports`
Returns array of employees who report to this employee

**Response 200**:
```json
[
  {
    "id": "uuid-1",
    "name": "John Doe",
    "email": "john@aiya.ai",
    "role": "Software Engineer",
    ...
  },
  {
    "id": "uuid-2",
    "name": "Jane Smith",
    "email": "jane@aiya.ai",
    "role": "Product Manager",
    ...
  }
]
```

**Response 200** (empty): `[]` if no direct reports

---

## 🐛 Issues Fixed

| Issue | Status |
|-------|--------|
| Team section showing mock data (Sarah Jones, picsum photos) | ✅ FIXED |
| No database integration for org chart | ✅ FIXED |
| Team section always visible even when no data | ✅ FIXED |
| Avatars not clickable for navigation | ✅ FIXED |

---

## 🚀 What's Working Now

- ✅ Real manager data from database
- ✅ Real direct reports from database
- ✅ Conditional rendering (only show if data exists)
- ✅ Clickable navigation to manager/reports profiles
- ✅ Proper avatar display with fallback
- ✅ "+X" badge for more than 3 direct reports
- ✅ Database queries optimized with indexes
- ✅ API responses cached for 30 seconds
- ✅ Graceful error handling (empty arrays if no data)

---

**All changes deployed! Team hierarchy now works with real data from the database.** 🎉

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
