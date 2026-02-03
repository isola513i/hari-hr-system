import React, { Suspense, lazy } from "react";
import { HashRouter, Routes, Route, Navigate } from "react-router-dom";
import { Layout } from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { LeaveProvider } from "./contexts/LeaveContext";
import { OrgProvider } from "./contexts/OrgContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/ToastContainer";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load pages for code splitting
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const Dashboard = lazy(() =>
  import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })),
);
const Employees = lazy(() =>
  import("./pages/Employees").then((m) => ({ default: m.Employees })),
);
const EmployeeDetail = lazy(() =>
  import("./pages/EmployeeDetail").then((m) => ({ default: m.EmployeeDetail })),
);
const OrgChart = lazy(() =>
  import("./pages/OrgChart").then((m) => ({ default: m.OrgChart })),
);
const Analytics = lazy(() =>
  import("./pages/Analytics").then((m) => ({ default: m.Analytics })),
);
const Documents = lazy(() =>
  import("./pages/Documents").then((m) => ({ default: m.Documents })),
);
const Wellbeing = lazy(() =>
  import("./pages/Wellbeing").then((m) => ({ default: m.Wellbeing })),
);
const Compliance = lazy(() =>
  import("./pages/Compliance").then((m) => ({ default: m.Compliance })),
);
const Onboarding = lazy(() =>
  import("./pages/Onboarding").then((m) => ({ default: m.Onboarding })),
);
const Settings = lazy(() =>
  import("./pages/Settings").then((m) => ({ default: m.Settings })),
);
const HelpSupport = lazy(() =>
  import("./pages/HelpSupport").then((m) => ({ default: m.HelpSupport })),
);
const TimeOff = lazy(() =>
  import("./pages/TimeOff").then((m) => ({ default: m.TimeOff })),
);
const Expenses = lazy(() =>
  import("./pages/Expenses").then((m) => ({ default: m.Expenses })),
);
const Surveys = lazy(() =>
  import("./pages/Surveys").then((m) => ({ default: m.Surveys })),
);

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-screen bg-background-light dark:bg-background-dark">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
      <p className="text-text-muted-light dark:text-text-muted-dark">
        Loading...
      </p>
    </div>
  </div>
);

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                <Route element={<ProtectedRoute />}>
                  <Route
                    path="/"
                    element={
                      <LeaveProvider>
                        <OrgProvider>
                          <Layout />
                        </OrgProvider>
                      </LeaveProvider>
                    }
                  >
                    <Route index element={<Dashboard />} />
                    <Route path="time-off" element={<TimeOff />} />
                    <Route path="expenses" element={<Expenses />} />
                    <Route path="surveys" element={<Surveys />} />
                    <Route path="wellbeing" element={<Wellbeing />} />
                    <Route path="employees" element={<Employees />} />
                    <Route path="employees/:id" element={<EmployeeDetail />} />
                    <Route path="org-chart" element={<OrgChart />} />
                    <Route path="onboarding" element={<Onboarding />} />
                    <Route path="compliance" element={<Compliance />} />
                    <Route path="analytics" element={<Analytics />} />
                    <Route path="documents" element={<Documents />} />
                    <Route path="settings" element={<Settings />} />
                    <Route path="help" element={<HelpSupport />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
            <ToastContainer />
          </HashRouter>
        </AuthProvider>
      </ToastProvider>
    </ErrorBoundary>
  );
};

export default App;
