# HARI HR System (v1.1)

A modern, full-stack HR management platform designed for efficiency and aesthetics.

## 🏗 System Architecture

This project is structured as a **Monorepo**:

- **`apps/web`**: Frontend (React, Vite, TailwindCSS)
- **`apps/api`**: Backend (Express.js, TypeScript, PostgreSQL/Neon)

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm
- PostgreSQL Database Connection String (Neon DB recommended)

### Installation

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/your-username/hari-hr-system.git
    cd hari-hr-system
    ```

2.  **Install dependencies:**
    ```bash
    npm install
    # This installs dependencies for both root, web, and api workspaces
    ```

3.  **Setup Environment Variables:**

    *   **Frontend**: Copy `apps/web/.env.example` to `apps/web/.env.local` (if needed).
    *   **Backend**: Copy `apps/api/.env.example` to `apps/api/.env`:
        ```env
        PORT=3000
        DATABASE_URL=your_postgres_connection_string
        ```

### Running the Application

You can run both Frontend and Backend concurrently using the root package scripts, or run them individually.

#### Option A: Run concurrently (Recommended pending script update)
Currently, opened separate terminals are recommended.

#### Option B: Separate Terminals

1.  **Start Backend API:**
    ```bash
    npm run dev:api
    ```
    *Server will start at `http://localhost:3000`*

2.  **Start Frontend Web:**
    ```bash
    npm run dev:web
    ```
    *App will start at `http://localhost:5173`*

## 📚 Documentation

- **[System Analysis & Architecture](./.gemini/antigravity/brain/f92f7702-773c-4f61-844c-51c0f57cb00f/system_analysis.md)**
- **[API Documentation (Thai)](./.gemini/antigravity/brain/f92f7702-773c-4f61-844c-51c0f57cb00f/api_docs_th.md)**

## 🧪 Testing

Run End-to-End (E2E) tests using Playwright:

```bash
npm run test:e2e
```

## ✨ Key Features (Implemented)

- **Organization Chart**: Visual hierarchy of employees (Backend-connected).
- **Onboarding**: Digital checklist and new employee invitation flow.
- **Leave Management**: Request leave, approval workflow, and dynamic balance calculation.
- **Full-Stack Integration**: Real-time data persistence with Neon PostgreSQL.

## 🔮 Coming Soon

- **Authentication**: Secure Login with JWT.
- **Role-Based Access Control (RBAC)**: Fine-grained permissions for Admin vs Employee.
- **Performance Reviews**: Evaluation cycles and feedback.
