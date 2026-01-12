import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Employees } from './pages/Employees';
import { EmployeeDetail } from './pages/EmployeeDetail';
import { OrgChart } from './pages/OrgChart';
import { Analytics } from './pages/Analytics';
import { Documents } from './pages/Documents';
import { Wellbeing } from './pages/Wellbeing';
import { Compliance } from './pages/Compliance';
import { Onboarding } from './pages/Onboarding';
import { Settings } from './pages/Settings';
import { HelpSupport } from './pages/HelpSupport';
import { TimeOff } from './pages/TimeOff';
import { Expenses } from './pages/Expenses';
import { Surveys } from './pages/Surveys';
import { AuthProvider } from './contexts/AuthContext';
import { LeaveProvider } from './contexts/LeaveContext';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <LeaveProvider>
        <HashRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
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
          </Routes>
        </HashRouter>
      </LeaveProvider>
    </AuthProvider>
  );
};

export default App;