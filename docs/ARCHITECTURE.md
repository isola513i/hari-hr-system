# HARI System Architecture / สถาปัตยกรรมระบบ HARI

[🇹🇭 ภาษาไทย](#ภาษาไทย) | [🇬🇧 English](#english)

---

## 🇹🇭 ภาษาไทย

### 📋 สารบัญ

1. [ภาพรวมสถาปัตยกรรม](#1-ภาพรวมสถาปัตยกรรม)
2. [Clean Architecture Pattern](#2-clean-architecture-pattern)
3. [Frontend Architecture](#3-frontend-architecture)
4. [Backend Architecture](#4-backend-architecture)
5. [Database Design](#5-database-design)
6. [Security Architecture](#6-security-architecture)
7. [Real-time Communication](#7-real-time-communication)
8. [File Upload Architecture](#8-file-upload-architecture)

---

### 1. ภาพรวมสถาปัตยกรรม

HARI ใช้สถาปัตยกรรมแบบ **Monorepo** ด้วย **npm workspaces** และ **Clean Architecture** เพื่อแยกความรับผิดชอบและทำให้โค้ดมีการจัดการที่ดี

#### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    User Interface                        │
│                  (React + TypeScript)                    │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP/HTTPS
                       │ WebSocket (Socket.io)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    API Gateway                           │
│            (Express.js Middlewares)                      │
│  • Authentication (JWT)                                  │
│  • Rate Limiting                                         │
│  • CORS                                                  │
│  • Security Headers                                      │
│  • Audit Logging                                         │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│                  Backend Services                        │
│              (Clean Architecture)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Controllers  (HTTP Request Handlers)            │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Services     (Business Logic)                   │  │
│  ├──────────────────────────────────────────────────┤  │
│  │  Models       (Data Models & Types)              │  │
│  └──────────────────────────────────────────────────┘  │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────┐
│              Database Layer                              │
│            (PostgreSQL + Neon)                           │
└─────────────────────────────────────────────────────────┘
```

#### 1.2 Monorepo Structure

```
HARI-V1.1/
├── apps/
│   ├── api/                     # Backend Application
│   └── web/                     # Frontend Application
├── docs/                        # Documentation
├── .git/                        # Git Repository
├── .gitignore                   # Git Ignore Rules
├── package.json                 # Root Workspace Config
└── README.md                    # Project Documentation
```

**ข้อดีของ Monorepo:**
- 🔄 Share code ระหว่าง frontend และ backend ได้ง่าย
- 📦 จัดการ dependencies แบบรวมศูนย์
- 🚀 Deploy ทั้งระบบพร้อมกันได้
- 🔍 Easy cross-referencing และ refactoring

---

### 2. Clean Architecture Pattern

HARI Backend ใช้ **Clean Architecture** เพื่อแยก business logic จาก infrastructure

#### 2.1 Architecture Layers

```
┌─────────────────────────────────────────────┐
│           Routes Layer                      │
│  • HTTP Routing                             │
│  • Middleware Registration                  │
│  • Request Mapping                          │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│         Controllers Layer                   │
│  • HTTP Request Handling                    │
│  • Response Formatting                      │
│  • Error Handling                           │
│  • Input Validation                         │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│           Services Layer                    │
│  • Business Logic                           │
│  • Data Processing                          │
│  • Database Operations                      │
│  • Complex Calculations                     │
└────────────────┬────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────┐
│            Models Layer                     │
│  • TypeScript Interfaces                    │
│  • Data Types                               │
│  • DTOs (Data Transfer Objects)             │
└─────────────────────────────────────────────┘
```

#### 2.2 ตัวอย่าง Clean Architecture Implementation

**Routes → Controllers → Services → Models**

```typescript
// 1. Routes (routes/employeeRoutes.ts)
router.get('/', EmployeeController.getAllEmployees);

// 2. Controller (controllers/EmployeeController.ts)
async getAllEmployees(req, res) {
  const employees = await EmployeeService.findAll();
  res.json(employees);
}

// 3. Service (services/EmployeeService.ts)
async findAll(): Promise<Employee[]> {
  const result = await query("SELECT * FROM employees");
  return result.rows;
}

// 4. Model (models/Employee.ts)
interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  // ...
}
```

**ประโยชน์:**
- ✅ แยก concerns ได้ชัดเจน
- ✅ ง่ายต่อการทดสอบ (Unit Testing)
- ✅ Reusable business logic
- ✅ ง่ายต่อการ maintain และ scale

---

### 3. Frontend Architecture

#### 3.1 Frontend Structure

```
apps/web/
├── components/           # Reusable UI Components
│   ├── Toast.tsx         # Toast Notification
│   ├── Dropdown.tsx      # Dropdown Select
│   ├── Modal.tsx         # Modal Dialog
│   └── ...
│
├── pages/                # Route Pages
│   ├── Dashboard.tsx     # Dashboard Page
│   ├── Employees.tsx     # Employee List
│   ├── TimeOff.tsx       # Leave Management
│   ├── Documents.tsx     # Document Management
│   ├── Onboarding.tsx    # Onboarding
│   ├── Training.tsx      # Training Management
│   ├── Wellbeing.tsx     # Well-being & Announcements
│   └── ...
│
├── store/                # Redux Store (if used)
│   ├── slices/
│   └── store.ts
│
├── lib/                  # Utilities & Helpers
│   ├── api.ts            # API Client
│   ├── auth.ts           # Authentication Utils
│   └── utils.ts          # Common Utilities
│
├── types/                # TypeScript Types
│   └── index.ts          # Shared Types
│
├── App.tsx               # Root Component
├── main.tsx              # Entry Point
└── index.css             # Global Styles
```

#### 3.2 Component Hierarchy

```
App
├── Layout
│   ├── Sidebar
│   │   ├── Navigation Links
│   │   └── User Profile
│   │
│   └── Main Content
│       ├── Header
│       │   ├── Breadcrumb
│       │   ├── Search
│       │   └── Notifications
│       │
│       └── Page Content
│           ├── Dashboard
│           ├── Employees
│           ├── Documents
│           └── ...
│
└── Modals & Toasts
```

#### 3.3 State Management

**Context API Pattern:**
```typescript
// AuthContext.tsx
interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType>(undefined);

export const AuthProvider: React.FC = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  // ... implementation
  return (
    <AuthContext.Provider value={{ user, login, logout, isAuthenticated }}>
      {children}
    </AuthContext.Provider>
  );
};
```

**Usage:**
```typescript
const { user, logout } = useAuth();
```

---

### 4. Backend Architecture

#### 4.1 Backend Structure

```
apps/api/
├── src/
│   ├── controllers/          # HTTP Request Handlers
│   │   ├── AuthController.ts
│   │   ├── EmployeeController.ts
│   │   ├── DocumentController.ts
│   │   ├── LeaveRequestController.ts
│   │   ├── OnboardingController.ts
│   │   ├── TrainingController.ts
│   │   ├── AnalyticsController.ts
│   │   └── ...
│   │
│   ├── services/             # Business Logic
│   │   ├── AuthService.ts
│   │   ├── EmployeeService.ts
│   │   ├── DocumentService.ts
│   │   └── ...
│   │
│   ├── models/               # Data Models & Types
│   │   ├── User.ts
│   │   ├── Employee.ts
│   │   ├── Document.ts
│   │   └── ...
│   │
│   ├── routes/               # Express Routes
│   │   ├── authRoutes.ts
│   │   ├── employeeRoutes.ts
│   │   ├── documentRoutes.ts
│   │   └── ...
│   │
│   ├── middlewares/          # Express Middlewares
│   │   ├── auth.ts           # JWT Authentication
│   │   ├── security.ts       # Security (Rate Limiting, Helmet)
│   │   └── auditLog.ts       # Audit Logging
│   │
│   ├── config/               # Configuration
│   │   └── swagger.ts        # API Documentation Config
│   │
│   ├── scripts/              # Database Scripts
│   │   └── init-db.ts        # Database Migration & Seeding
│   │
│   ├── db.ts                 # Database Connection
│   ├── socket.ts             # Socket.io Setup
│   └── index.ts              # Entry Point
│
└── uploads/                  # Uploaded Files Storage
```

#### 4.2 Request Flow

```
1. HTTP Request
   │
   ▼
2. Middleware Pipeline
   ├── generalLimiter (Rate Limiting)
   ├── helmetConfig (Security Headers)
   ├── cors (CORS Handling)
   ├── express.json (Body Parser)
   └── auditLogMiddleware (Logging)
   │
   ▼
3. Route Handler
   │
   ▼
4. Authentication Middleware (if protected)
   │
   ▼
5. Controller
   ├── Extract Request Data
   ├── Validate Input
   └── Call Service
   │
   ▼
6. Service
   ├── Business Logic
   ├── Database Query
   └── Data Processing
   │
   ▼
7. Controller
   ├── Format Response
   └── Send HTTP Response
```

---

### 5. Database Design

#### 5.1 Entity Relationship Diagram

```
┌─────────────┐
│   users     │
└──────┬──────┘
       │ 1
       │
       │ 1
       ▼
┌─────────────┐      1        ┌──────────────┐
│  employees  ├───────────────►│   manager    │
└──────┬──────┘                └──────────────┘
       │ 1
       │
       ├─────────┬──────────┬──────────┬──────────┐
       │ *       │ *        │ *        │ *        │ *
       ▼         ▼          ▼          ▼          ▼
┌──────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────┐
│leave_req │ │  docs  │ │ tasks  │ │payroll │ │training │
└──────────┘ └────────┘ └────────┘ └────────┘ └─────────┘
```

#### 5.2 Core Tables

**users** - User Authentication
```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'EMPLOYEE',
  created_at TIMESTAMP DEFAULT NOW()
);
```

**employees** - Employee Data
```sql
CREATE TABLE employees (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(20),
  department VARCHAR(100),
  position VARCHAR(100),
  manager_id UUID REFERENCES employees(id),
  join_date DATE,
  status VARCHAR(20) DEFAULT 'Active',
  onboarding_status VARCHAR(50) DEFAULT 'Not Started',
  onboarding_percentage INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**leave_requests** - Leave Management
```sql
CREATE TABLE leave_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  employee_id UUID REFERENCES employees(id),
  type VARCHAR(50),
  start_date DATE,
  end_date DATE,
  days_count INT,
  reason TEXT,
  status VARCHAR(20) DEFAULT 'Pending',
  reviewed_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW()
);
```

**documents** - Document Management
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255),
  description TEXT,
  file_path VARCHAR(500),
  file_type VARCHAR(50),
  file_size VARCHAR(20),
  uploaded_by UUID REFERENCES users(id),
  category VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

### 6. Security Architecture

#### 6.1 Security Layers

```
┌─────────────────────────────────────────┐
│     Network Layer                       │
│  • HTTPS Encryption                     │
│  • CORS Configuration                   │
│  • Rate Limiting                        │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│     Application Layer                   │
│  • JWT Authentication                   │
│  • Role-Based Access Control (RBAC)     │
│  • Input Validation                     │
│  • XSS Protection                       │
│  • SQL Injection Prevention             │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│     Data Layer                          │
│  • Password Hashing (bcrypt)            │
│  • Data Encryption                      │
│  • Audit Logging                        │
└─────────────────────────────────────────┘
```

#### 6.2 Authentication Flow

```
1. User Login
   │
   ▼
2. Backend validates credentials
   │
   ▼
3. If valid, generate JWT token
   │
   ▼
4. Send token to frontend
   │
   ▼
5. Frontend stores token in localStorage
   │
   ▼
6. Frontend includes token in Authorization header
   │
   ▼
7. Backend validates token for each request
   │
   ▼
8. If valid, process request
```

**JWT Token Structure:**
```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "role": "HR_ADMIN",
  "iat": 1234567890,
  "exp": 1234578890
}
```

---

### 7. Real-time Communication

#### 7.1 Socket.io Architecture

```
┌─────────────────┐          WebSocket          ┌──────────────────┐
│   Frontend      ├─────────────────────────────►│   Backend        │
│   (Socket.io    │                              │   (Socket.io     │
│    Client)      │◄─────────────────────────────┤    Server)       │
└─────────────────┘                              └──────────────────┘
        │                                                 │
        │                                                 │
        ▼                                                 ▼
   ┌─────────┐                                     ┌──────────┐
   │ Events  │                                     │ Database │
   │ • notif │                                     └──────────┘
   │ • update│
   └─────────┘
```

**Events:**
- `notification` - Real-time notifications
- `data:update` - Data updates
- `user:online` - User presence

---

### 8. File Upload Architecture

#### 8.1 Upload Flow

```
1. User selects file
   │
   ▼
2. Frontend validates file (type, size)
   │
   ▼
3. Upload via multipart/form-data
   │
   ▼
4. Backend Multer middleware processes
   │
   ▼
5. File saved to /uploads directory
   │
   ▼
6. Metadata saved to database
   │
   ▼
7. Return file URL to frontend
```

**File Storage Structure:**
```
apps/api/uploads/
├── documents/
│   ├── policy-2024-01-15.pdf
│   └── handbook.pdf
├── employee-photos/
│   └── john-doe-avatar.jpg
└── temp/
    └── [temporary files]
```

---

## 🇬🇧 English

### 📋 Table of Contents

1. [Architecture Overview](#1-architecture-overview-1)
2. [Clean Architecture Pattern](#2-clean-architecture-pattern-1)
3. [Frontend Architecture](#3-frontend-architecture-1)
4. [Backend Architecture](#4-backend-architecture-1)
5. [Database Design](#5-database-design-1)
6. [Security Architecture](#6-security-architecture-1)
7. [Real-time Communication](#7-real-time-communication-1)
8. [File Upload Architecture](#8-file-upload-architecture-1)

---

### 1. Architecture Overview

HARI uses a **Monorepo** architecture with **npm workspaces** and **Clean Architecture** to separate concerns and maintain clean code.

#### 1.1 High-Level Architecture

[Same diagram as Thai version]

#### 1.2 Monorepo Structure

[Same as Thai version]

**Benefits of Monorepo:**
- 🔄 Easy code sharing between frontend and backend
- 📦 Centralized dependency management
- 🚀 Deploy entire system together
- 🔍 Easy cross-referencing and refactoring

---

### 2. Clean Architecture Pattern

[Same content as Thai version with English descriptions]

---

### 3. Frontend Architecture

[Same content as Thai version with English descriptions]

---

### 4. Backend Architecture

[Same content as Thai version with English descriptions]

---

### 5. Database Design

[Same content as Thai version with English descriptions]

---

### 6. Security Architecture

[Same content as Thai version with English descriptions]

---

### 7. Real-time Communication

[Same content as Thai version with English descriptions]

---

### 8. File Upload Architecture

[Same content as Thai version with English descriptions]

---

**For more information, see:**
- [Setup Guide](./SETUP_GUIDE.md)
- [API Documentation](./API_DOCUMENTATION.md)
- [Contributing Guide](./CONTRIBUTING.md)

## Architecture Decision Records

The reasoning behind key technical choices (auth, migrations, state management, PII
encryption, config storage) is documented as ADRs in [`docs/adr/`](adr/README.md).
