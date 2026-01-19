# HARI HR System v1.1 🚀

<div align="center">

![HARI HR System](https://img.shields.io/badge/HARI-HR%20System-blue?style=for-the-badge)
![Version](https://img.shields.io/badge/version-1.1-green?style=for-the-badge)
![License](https://img.shields.io/badge/license-MIT-orange?style=for-the-badge)

**A Modern, Enterprise-Grade HR Management Platform**

Built with React, TypeScript, Express.js, and PostgreSQL

[Features](#-features) • [Getting Started](#-getting-started) • [Tech Stack](#-tech-stack) • [Documentation](#-documentation)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [System Architecture](#-system-architecture)
- [Getting Started](#-getting-started)
- [Security](#-security)
- [Performance](#-performance)
- [Testing](#-testing)
- [Documentation](#-documentation)
- [License](#-license)

---

## 🌟 Overview

HARI (Human Affairs & Resource Integration) is a comprehensive HR management system designed to streamline employee management, onboarding, leave tracking, document management, and compliance monitoring. Built with modern technologies and enterprise-grade security features.

**Key Highlights:**
- 🎨 Beautiful, responsive UI with dark mode support
- 🔒 Enterprise-grade security (JWT, 2FA-ready, Audit Logging)
- ⚡ Optimized performance with code splitting and caching
- 📱 Fully responsive design (Mobile, Tablet, Desktop)
- 🔄 Real-time data synchronization with PostgreSQL
- 📊 Interactive dashboards and analytics

---

## ✨ Features

### 👥 Employee Management
- **Employee Directory**: Searchable employee database with filtering
- **Employee Profiles**: Comprehensive profiles with job history, performance reviews, and training records
- **Org Chart**: Interactive organizational hierarchy visualization
- **Bulk Operations**: Import/export employee data

### 📝 Leave Management
- **Leave Requests**: Submit and track vacation, sick leave, and personal days
- **Approval Workflow**: Multi-level approval system
- **Balance Tracking**: Real-time leave balance calculation
- **Calendar Integration**: Visual leave calendar
- **Leave History**: Complete audit trail of all requests

### 📄 Document Management
- **Secure Storage**: Upload and manage HR documents (policies, contracts, forms)
- **Access Control**: Role-based document permissions
- **Version Control**: Track document changes
- **Quick Search**: Full-text search across all documents
- **Grid/List Views**: Flexible viewing options
- **File Preview**: In-browser document preview

### 🎯 Onboarding
- **Digital Checklists**: Automated onboarding tasks
- **New Hire Portal**: Self-service onboarding experience
- **Document Collection**: Automated document gathering
- **Task Assignment**: Assign onboarding tasks to HR and managers
- **Progress Tracking**: Real-time onboarding progress monitoring

### 📊 Analytics & Reporting
- **Dashboard**: Real-time HR metrics and KPIs
- **Headcount Analytics**: Department-wise employee distribution
- **Leave Analytics**: Absence trends and patterns
- **Custom Reports**: Generate compliance and audit reports
- **Data Visualization**: Interactive charts using Recharts

### 🏥 Wellbeing & Surveys
- **Wellness Programs**: Mental health and fitness tracking
- **Employee Surveys**: Pulse surveys and feedback collection
- **Sentiment Analysis**: Employee satisfaction monitoring

### ⚙️ Settings & Configuration
- **User Preferences**: Personalize experience
- **Notification Settings**: Configure alerts and reminders
- **Theme Customization**: Light/dark mode toggle
- **Profile Management**: Update personal information

### 📋 Compliance & Audit
- **Compliance Tracking**: Monitor regulatory requirements
- **Audit Logs**: Complete activity logging (see [Security](#-security))
- **Report Generation**: Automated compliance reports

---

## 🔒 Security

### Authentication & Authorization
- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Password Strength Meter**: Real-time password strength validation
  - Requirements: 8+ chars, uppercase, lowercase, numbers, special characters
  - Visual feedback with color-coded strength indicator
- ✅ **Session Management**: Auto-logout after 30 minutes of inactivity
  - Warning modal at 25 minutes with countdown
  - Activity tracking (mouse, keyboard, scroll, touch)
  - "Stay Logged In" option
- 🔜 **Two-Factor Authentication (2FA)**: TOTP-based 2FA (infrastructure ready)
- ✅ **Role-Based Access Control (RBAC)**: HR Admin vs Employee permissions

### Data Security
- ✅ **Rate Limiting**:
  - General: 100 requests/15 min
  - Auth: 5 attempts/15 min
  - API: 30 requests/min
- ✅ **Input Validation & Sanitization**: Express-validator with XSS protection
- ✅ **Security Headers**: Helmet.js for HTTP security headers
- ✅ **CORS Configuration**: Strict origin control
- ✅ **Password Hashing**: bcrypt with salt rounds
- ✅ **File Upload Validation**: Type and size restrictions (50MB limit)

### Audit & Compliance
- ✅ **Comprehensive Audit Logging**:
  - Tracks: Login, logout, password changes, CRUD operations
  - Captures: Timestamp, user, action, resource, IP, user agent
  - Sanitizes sensitive data (passwords redacted)
  - In-memory store with auto-cleanup (1000 entries)
  - Real-time viewing in Compliance page

---

## ⚡ Performance

### Code Splitting & Optimization
- ✅ **Route-based Code Splitting**:
  - Main bundle reduced from **240KB → 66KB** (gzipped) - **72% reduction!**
  - Lazy-loaded routes with React.lazy()
  - Each page loads on-demand (1-46 KB per chunk)
- ✅ **Vendor Chunk Splitting**:
  - React vendor: 48KB (gzipped)
  - Chart vendor: 115KB (gzipped) - loads only when needed
  - UI vendor: 8KB (gzipped)
- ✅ **Build Optimizations**:
  - esbuild minification
  - Tree shaking
  - Content hashing for cache busting

### Asset Optimization
- ✅ **Image Lazy Loading**:
  - LazyImage component with native browser lazy loading
  - Intersection Observer fallback for older browsers
  - Smooth fade-in animations
  - Placeholder support

### Caching Strategy
- ✅ **API Response Caching**:
  - In-memory cache with configurable TTL
  - Presets: SHORT (1min), MEDIUM (5min), LONG (15min), VERY_LONG (1hr)
  - Automatic expired entry cleanup
  - Cache statistics for monitoring

### Results
- ⚡ **Initial Load Time**: Significantly reduced with code splitting
- ⚡ **Time to Interactive (TTI)**: Improved by ~70%
- ⚡ **Bundle Size**: 66KB initial (vs 240KB before)

---

## 📱 Responsive Design

### Mobile-First Approach
- ✅ **Dashboard**: Responsive charts and stat cards
  - Breakpoints: mobile (1 col), tablet (2 cols), desktop (4 cols)
  - Responsive chart heights and padding
- ✅ **Documents**: Mobile card view for list mode
  - Desktop: Traditional table
  - Mobile: Beautiful cards with action buttons
- ✅ **Time Off**: Mobile-friendly leave requests
  - Desktop table + mobile cards
  - Type icons and status badges
- ✅ **Employee Directory**: Card-based mobile layout
- ✅ **Navigation**: Responsive sidebar with drawer for mobile
  - Desktop: Persistent sidebar
  - Mobile: Slide-out drawer with overlay

### Breakpoints
- `sm`: 640px (Small devices)
- `md`: 768px (Tablets)
- `lg`: 1024px (Laptops)
- `xl`: 1280px (Desktops)
- `2xl`: 1536px (Large screens)

---

## 🏗 System Architecture

### Monorepo Structure
```
HARI-V1.1/
├── apps/
│   ├── web/              # Frontend React App
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Route pages
│   │   ├── contexts/     # React Context providers
│   │   ├── hooks/        # Custom React hooks
│   │   ├── lib/          # Utilities & helpers
│   │   └── types/        # TypeScript type definitions
│   │
│   └── api/              # Backend Express API
│       ├── src/
│       │   ├── middlewares/  # Auth, security, audit logging
│       │   ├── db.ts         # Database connection
│       │   └── index.ts      # API routes
│       └── uploads/      # File storage
│
├── node_modules/         # Shared dependencies
└── package.json          # Root workspace config
```

### Tech Stack

#### Frontend
- **Framework**: React 19 with TypeScript
- **Build Tool**: Vite 6.x
- **Styling**: TailwindCSS 3.x
- **State Management**: React Context API
- **Routing**: React Router v6
- **Charts**: Recharts
- **Icons**: Lucide React
- **Testing**: Playwright (E2E)

#### Backend
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript
- **Database**: PostgreSQL (Neon DB)
- **Authentication**: JWT (jsonwebtoken)
- **Security**:
  - Helmet.js (HTTP headers)
  - express-rate-limit (Rate limiting)
  - express-validator (Input validation)
  - bcrypt (Password hashing)
- **File Upload**: Multer

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18 or higher
- **npm**: v8 or higher
- **PostgreSQL**: Database connection (Neon DB recommended)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/isola513i/hari-hr-system.git
   cd hari-hr-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   # Installs dependencies for root, web, and api workspaces
   ```

3. **Setup Environment Variables**

   **Backend** (`apps/api/.env`):
   ```env
   PORT=3001
   DATABASE_URL=postgresql://user:password@host:port/database
   JWT_SECRET=your_super_secret_jwt_key_change_in_production
   FRONTEND_URL=http://localhost:5173
   ```

   **Frontend** (`apps/web/.env.local`) - Optional:
   ```env
   VITE_API_URL=http://localhost:3001
   ```

4. **Database Setup**
   - Create a PostgreSQL database on [Neon](https://neon.tech) or local PostgreSQL
   - Copy the connection string to `DATABASE_URL` in `.env`
   - Tables will be created automatically on first API request (seed data included)

### Running the Application

#### Option 1: Concurrent (Recommended)
```bash
npm run dev
# Runs both frontend and backend concurrently
```

#### Option 2: Separate Terminals

**Terminal 1 - Backend API:**
```bash
npm run dev:api
# Server runs at http://localhost:3001
```

**Terminal 2 - Frontend:**
```bash
npm run dev:web
# App runs at http://localhost:5173
```

### Default Login Credentials

**HR Admin:**
- Email: `admin@hari.com`
- Password: `admin123`

**Employee:**
- Email: `employee@hari.com`
- Password: `employee123`

---

## 🧪 Testing

### End-to-End Testing (Playwright)

```bash
# Run all E2E tests
npm run test:e2e

# Run tests in UI mode (interactive)
npx playwright test --ui

# Run specific test file
npx playwright test tests/login.spec.ts

# Generate test report
npx playwright show-report
```

### Test Coverage
- ✅ Authentication flow (login/logout)
- ✅ Employee management (CRUD operations)
- ✅ Leave request workflow
- ✅ Document upload and management
- ✅ Onboarding process
- ✅ Org chart navigation

---

## 📚 Documentation

### API Documentation
- **Endpoint Reference**: [API Docs (Thai)](./docs/api_docs_th.md)
- **Authentication**: JWT-based authentication
- **Base URL**: `http://localhost:3001/api`

### Key API Endpoints

**Authentication:**
- `POST /api/auth/login` - User login
- `POST /api/auth/change-password` - Change password

**Employees:**
- `GET /api/employees` - List all employees
- `GET /api/employees/:id` - Get employee details
- `POST /api/employees` - Create employee (Admin)
- `PUT /api/employees/:id` - Update employee (Admin)
- `DELETE /api/employees/:id` - Delete employee (Admin)

**Leave Requests:**
- `GET /api/leave-requests` - List all requests
- `POST /api/leave-requests` - Create request
- `PUT /api/leave-requests/:id` - Update status (Admin)
- `DELETE /api/leave-requests/:id` - Delete request

**Documents:**
- `GET /api/documents` - List documents
- `POST /api/documents` - Upload document
- `GET /api/documents/:id/download` - Download document
- `DELETE /api/documents/:id` - Delete document

**Audit Logs:**
- `GET /api/audit-logs` - View audit logs (Admin)

---

## 🔧 Development

### Available Scripts

**Root Level:**
- `npm run dev` - Run both frontend and backend
- `npm run dev:web` - Run frontend only
- `npm run dev:api` - Run backend only
- `npm run build` - Build both apps
- `npm run test:e2e` - Run E2E tests

**Frontend (`apps/web`):**
- `npm run dev` - Start dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

**Backend (`apps/api`):**
- `npm run dev` - Start with nodemon (auto-reload)
- `npm start` - Start production server

### Code Style
- **ESLint**: Configured for TypeScript
- **Prettier**: Code formatting (optional)
- **TypeScript**: Strict mode enabled

---

## 📦 Deployment

### Frontend (Vercel/Netlify)
```bash
cd apps/web
npm run build
# Deploy 'dist' folder
```

### Backend (Railway/Render/Heroku)
```bash
cd apps/api
npm start
# Ensure DATABASE_URL and JWT_SECRET are set
```

### Environment Variables for Production
```env
NODE_ENV=production
DATABASE_URL=your_production_db_url
JWT_SECRET=your_very_secure_secret_key
FRONTEND_URL=https://your-frontend-domain.com
```

---

## 🛣 Roadmap

### Upcoming Features
- [ ] **Advanced Analytics**: Predictive analytics and ML insights
- [ ] **Two-Factor Authentication (2FA)**: Complete TOTP implementation
- [ ] **Email Notifications**: Automated email alerts
- [ ] **Mobile App**: React Native mobile application
- [ ] **Advanced Reporting**: Custom report builder
- [ ] **Payroll Integration**: Salary and payroll management
- [ ] **Performance Reviews**: 360-degree feedback system
- [ ] **Training Management**: Course tracking and certifications

### Future Enhancements
- [ ] **Multi-language Support**: i18n implementation
- [ ] **API Rate Limiting Dashboard**: Visual monitoring
- [ ] **Slack/Teams Integration**: Bot notifications
- [ ] **Advanced Search**: Elasticsearch integration
- [ ] **Calendar Integration**: Google/Outlook sync

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**AiYa Internship Team**
- Project: HARI HR System v1.1
- Repository: [github.com/isola513i/hari-hr-system](https://github.com/isola513i/hari-hr-system)

---

## 🙏 Acknowledgments

- Built with ❤️ using modern web technologies
- Powered by Neon PostgreSQL
- UI Components inspired by shadcn/ui
- Icons by Lucide React
- Co-developed with Claude Sonnet 4.5

---

<div align="center">

**Made with 💙 by AiYa Internship Team**

[⬆ Back to Top](#hari-hr-system-v11-)

</div>
