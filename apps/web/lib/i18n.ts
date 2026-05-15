import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import dayjs from 'dayjs';
import 'dayjs/locale/th';

// English namespaces
import commonEN from '../locales/en/common.json';
import authEN from '../locales/en/auth.json';
import dashboardEN from '../locales/en/dashboard.json';
import attendanceEN from '../locales/en/attendance.json';
import leaveEN from '../locales/en/leave.json';
import employeesEN from '../locales/en/employees.json';
import documentsEN from '../locales/en/documents.json';
import settingsEN from '../locales/en/settings.json';
import onboardingEN from '../locales/en/onboarding.json';
import wellbeingEN from '../locales/en/wellbeing.json';
import complianceEN from '../locales/en/compliance.json';
import analyticsEN from '../locales/en/analytics.json';
import payrollEN from '../locales/en/payroll.json';
import helpEN from '../locales/en/help.json';
import expensesEN from '../locales/en/expenses.json';
import trainingEN from '../locales/en/training.json';
import shiftsEN from '../locales/en/shifts.json';
import assetsEN from '../locales/en/assets.json';
import performanceReviewsEN from '../locales/en/performance-reviews.json';
import auditLogsEN from '../locales/en/audit-logs.json';
import requestsEN from '../locales/en/requests.json';

// Thai namespaces
import commonTH from '../locales/th/common.json';
import authTH from '../locales/th/auth.json';
import dashboardTH from '../locales/th/dashboard.json';
import attendanceTH from '../locales/th/attendance.json';
import leaveTH from '../locales/th/leave.json';
import employeesTH from '../locales/th/employees.json';
import documentsTH from '../locales/th/documents.json';
import settingsTH from '../locales/th/settings.json';
import onboardingTH from '../locales/th/onboarding.json';
import wellbeingTH from '../locales/th/wellbeing.json';
import complianceTH from '../locales/th/compliance.json';
import analyticsTH from '../locales/th/analytics.json';
import payrollTH from '../locales/th/payroll.json';
import helpTH from '../locales/th/help.json';
import expensesTH from '../locales/th/expenses.json';
import trainingTH from '../locales/th/training.json';
import shiftsTH from '../locales/th/shifts.json';
import assetsTH from '../locales/th/assets.json';
import performanceReviewsTH from '../locales/th/performance-reviews.json';
import auditLogsTH from '../locales/th/audit-logs.json';
import requestsTH from '../locales/th/requests.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: commonEN,
        auth: authEN,
        dashboard: dashboardEN,
        attendance: attendanceEN,
        leave: leaveEN,
        employees: employeesEN,
        documents: documentsEN,
        settings: settingsEN,
        onboarding: onboardingEN,
        wellbeing: wellbeingEN,
        compliance: complianceEN,
        analytics: analyticsEN,
        payroll: payrollEN,
        help: helpEN,
        expenses: expensesEN,
        training: trainingEN,
        shifts: shiftsEN,
        assets: assetsEN,
        'performance-reviews': performanceReviewsEN,
        'audit-logs': auditLogsEN,
        requests: requestsEN,
      },
      th: {
        common: commonTH,
        auth: authTH,
        dashboard: dashboardTH,
        attendance: attendanceTH,
        leave: leaveTH,
        employees: employeesTH,
        documents: documentsTH,
        settings: settingsTH,
        onboarding: onboardingTH,
        wellbeing: wellbeingTH,
        compliance: complianceTH,
        analytics: analyticsTH,
        payroll: payrollTH,
        help: helpTH,
        expenses: expensesTH,
        training: trainingTH,
        shifts: shiftsTH,
        assets: assetsTH,
        'performance-reviews': performanceReviewsTH,
        'audit-logs': auditLogsTH,
        requests: requestsTH,
      },
    },
    detection: {
      order: ['localStorage'],
      lookupLocalStorage: 'language',
      caches: ['localStorage'],
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common', 'auth', 'dashboard', 'attendance', 'leave',
      'employees', 'documents', 'settings', 'onboarding',
      'wellbeing', 'compliance', 'analytics', 'payroll', 'help', 'expenses', 'training',
      'shifts', 'assets', 'performance-reviews', 'audit-logs', 'requests',
    ],
    interpolation: {
      escapeValue: false,
    },
  });

// Sync dayjs locale with i18n language
const syncDayjsLocale = (lng: string) => {
  dayjs.locale(lng === 'th' ? 'th' : 'en');
  document.documentElement.lang = lng;
};

syncDayjsLocale(i18n.language);
i18n.on('languageChanged', syncDayjsLocale);

export default i18n;
