import React, { Suspense, lazy } from "react";
import { HashRouter, Routes, Route, useLocation } from "react-router-dom";
import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { queryClient } from "./lib/queryClient";
import { Layout } from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./contexts/AuthContext";
import { LeaveProvider } from "./contexts/LeaveContext";
import { NotificationProvider } from "./contexts/NotificationContext";
import { OrgProvider } from "./contexts/OrgContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ToastContainer } from "./components/ToastContainer";
import ErrorBoundary from "./components/ErrorBoundary";

// Lazy load pages for code splitting
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
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
const Training = lazy(() =>
  import("./pages/Training").then((m) => ({ default: m.Training })),
);
const Payroll = lazy(() =>
  import("./pages/Payroll").then((m) => ({ default: m.Payroll })),
);
const Surveys = lazy(() =>
  import("./pages/Surveys").then((m) => ({ default: m.Surveys })),
);
const TakeSurvey = lazy(() =>
  import("./pages/TakeSurvey").then((m) => ({ default: m.TakeSurvey })),
);
const Attendance = lazy(() => import("./pages/Attendance"));
const AdminAttendance = lazy(() => import("./pages/AdminAttendance"));
const Notifications = lazy(() => import("./pages/Notifications"));
const LeaveRequestForm = lazy(() =>
  import("./pages/LeaveRequestForm").then((m) => ({ default: m.LeaveRequestForm })),
);
const AdminLeaveRequests = lazy(() =>
  import("./pages/AdminLeaveRequests").then((m) => ({ default: m.AdminLeaveRequests })),
);
const Announcements = lazy(() =>
  import("./pages/Announcements").then((m) => ({ default: m.Announcements })),
);
const AdminHolidays = lazy(() =>
  import("./pages/AdminHolidays").then((m) => ({ default: m.AdminHolidays })),
);
const Holidays = lazy(() =>
  import("./pages/Holidays").then((m) => ({ default: m.Holidays })),
);
const NotFound = lazy(() =>
  import("./pages/NotFound").then((m) => ({ default: m.NotFound })),
);
const PerformanceReviews = lazy(() =>
  import("./pages/PerformanceReviews").then((m) => ({ default: m.PerformanceReviews })),
);
const TeamCalendar = lazy(() =>
  import("./pages/TeamCalendar").then((m) => ({ default: m.TeamCalendar })),
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

// Per-route error boundary that resets when the URL changes
const PageErrorBoundary: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  return (
    <ErrorBoundary resetKey={location.pathname}>
      {children}
    </ErrorBoundary>
  );
};

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <HashRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />

                <Route element={<ProtectedRoute />}>
                  <Route
                    path="/"
                    element={
                      <NotificationProvider>
                        <LeaveProvider>
                          <OrgProvider>
                            <Layout />
                          </OrgProvider>
                        </LeaveProvider>
                      </NotificationProvider>
                    }
                  >
                    <Route index element={<PageErrorBoundary><Dashboard /></PageErrorBoundary>} />
                    <Route path="attendance" element={<PageErrorBoundary><Attendance /></PageErrorBoundary>} />
                    <Route path="admin-attendance" element={<PageErrorBoundary><AdminAttendance /></PageErrorBoundary>} />
                    <Route path="time-off" element={<PageErrorBoundary><TimeOff /></PageErrorBoundary>} />
                    <Route path="time-off/request" element={<PageErrorBoundary><LeaveRequestForm /></PageErrorBoundary>} />
                    <Route path="time-off/request/:id" element={<PageErrorBoundary><LeaveRequestForm /></PageErrorBoundary>} />
                    <Route path="leave-requests" element={<PageErrorBoundary><AdminLeaveRequests /></PageErrorBoundary>} />
                    <Route path="holidays" element={<PageErrorBoundary><AdminHolidays /></PageErrorBoundary>} />
                    <Route path="company-holidays" element={<PageErrorBoundary><Holidays /></PageErrorBoundary>} />
                    <Route path="expenses" element={<PageErrorBoundary><Expenses /></PageErrorBoundary>} />
                    <Route path="payroll" element={<PageErrorBoundary><Payroll /></PageErrorBoundary>} />
                    <Route path="surveys" element={<PageErrorBoundary><Surveys /></PageErrorBoundary>} />
                    <Route path="surveys/:id" element={<PageErrorBoundary><TakeSurvey /></PageErrorBoundary>} />
                    <Route path="wellbeing" element={<PageErrorBoundary><Wellbeing /></PageErrorBoundary>} />
                    <Route path="announcements" element={<PageErrorBoundary><Announcements /></PageErrorBoundary>} />
                    <Route path="employees" element={<PageErrorBoundary><Employees /></PageErrorBoundary>} />
                    <Route path="employees/:id" element={<PageErrorBoundary><EmployeeDetail /></PageErrorBoundary>} />
                    <Route path="org-chart" element={<PageErrorBoundary><OrgChart /></PageErrorBoundary>} />
                    <Route path="onboarding" element={<PageErrorBoundary><Onboarding /></PageErrorBoundary>} />
                    <Route path="compliance" element={<PageErrorBoundary><Compliance /></PageErrorBoundary>} />
                    <Route path="training" element={<PageErrorBoundary><Training /></PageErrorBoundary>} />
                    <Route path="analytics" element={<PageErrorBoundary><Analytics /></PageErrorBoundary>} />
                    <Route path="documents" element={<PageErrorBoundary><Documents /></PageErrorBoundary>} />
                    <Route path="settings" element={<PageErrorBoundary><Settings /></PageErrorBoundary>} />
                    <Route path="notifications" element={<PageErrorBoundary><Notifications /></PageErrorBoundary>} />
                    <Route path="performance-reviews" element={<PageErrorBoundary><PerformanceReviews /></PageErrorBoundary>} />
                    <Route path="team-calendar" element={<PageErrorBoundary><TeamCalendar /></PageErrorBoundary>} />
                    <Route path="help" element={<PageErrorBoundary><HelpSupport /></PageErrorBoundary>} />
                    <Route path="*" element={<NotFound />} />
                  </Route>
                </Route>
              </Routes>
            </Suspense>
            <ToastContainer />
          </HashRouter>
        </AuthProvider>
      </ToastProvider>
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

export default App;
