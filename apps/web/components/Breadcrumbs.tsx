import React from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useEmployeeDetail, useSurveyDetail } from '../hooks/queries';

/**
 * Route name mapping configuration
 * Maps URL segments to translation keys in the 'breadcrumbs' namespace
 */
const ROUTE_NAME_MAP: Record<string, string> = {
  'time-off': 'breadcrumbs.timeOff',
  'request': 'breadcrumbs.requestLeave',
  'leave-requests': 'breadcrumbs.leaveRequests',
  'wellbeing': 'breadcrumbs.wellbeing',
  'employees': 'breadcrumbs.employees',
  'org-chart': 'breadcrumbs.orgChart',
  'compliance': 'breadcrumbs.compliance',
  'analytics': 'breadcrumbs.analytics',
  'documents': 'breadcrumbs.documents',
  'onboarding': 'breadcrumbs.onboarding',
  'settings': 'breadcrumbs.settings',
  'notifications': 'breadcrumbs.notifications',
  'help': 'breadcrumbs.helpSupport',
  'surveys': 'breadcrumbs.surveys',
  'attendance': 'breadcrumbs.attendance',
  'payroll': 'breadcrumbs.payroll',
  'announcements': 'breadcrumbs.announcements',
  'holidays': 'breadcrumbs.holidays',
  'company-holidays': 'breadcrumbs.companyHolidays',
  'expenses': 'breadcrumbs.expenses',
  'training': 'breadcrumbs.training',
  'performance': 'breadcrumbs.performance',
  'audit-logs': 'breadcrumbs.auditLogs',
  'shift-management': 'breadcrumbs.shiftManagement',
  'admin-attendance': 'breadcrumbs.adminAttendance',
  'requests': 'breadcrumbs.requests',
  'performance-reviews': 'breadcrumbs.performanceReviews',
  'assets': 'breadcrumbs.assets',
};

/**
 * Props for the BreadcrumbItem component
 */
interface BreadcrumbItemProps {
  displayName: string;
  path: string;
  isLastItem: boolean;
}

/**
 * Determines if a path segment represents an employee detail page
 * @param previousSegment - The path segment that precedes the current one
 * @returns True if this is an employee detail page
 */
const isEmployeeDetailPage = (
  previousSegment: string | undefined
): boolean => {
  return previousSegment === 'employees';
};

/**
 * Capitalizes the first letter of a string and replaces hyphens with spaces
 * @param text - The text to format
 * @returns Formatted text with capitalized first letter and spaces instead of hyphens
 */
const formatPathSegment = (text: string): string => {
  return text.charAt(0).toUpperCase() + text.slice(1).replace(/-/g, ' ');
};

/**
 * Builds a URL path from path segments up to a specific index
 * @param pathSegments - Array of all path segments
 * @param upToIndex - Index up to which to build the path (inclusive)
 * @returns Complete path URL
 */
const buildPathUrl = (pathSegments: string[], upToIndex: number): string => {
  return `/${pathSegments.slice(0, upToIndex + 1).join('/')}`;
};

/**
 * Renders a single breadcrumb item (either as a link or static text)
 *
 * @param props - Component props
 * @param props.displayName - The text to display for this breadcrumb
 * @param props.path - The URL path this breadcrumb links to
 * @param props.isLastItem - Whether this is the last item in the breadcrumb trail
 */
const BreadcrumbItem: React.FC<BreadcrumbItemProps> = ({
  displayName,
  path,
  isLastItem,
}) => {
  // Last item is rendered as static text (current page)
  if (isLastItem) {
    return (
      <span
        className="font-medium text-text-light dark:text-text-dark"
        aria-current="page"
      >
        {displayName}
      </span>
    );
  }

  // Non-last items are rendered as clickable links
  return (
    <Link to={path} className="hover:text-primary transition-colors">
      {displayName}
    </Link>
  );
};

/**
 * Breadcrumbs navigation component
 *
 * Displays a hierarchical breadcrumb trail based on the current URL path.
 * The breadcrumbs help users understand their current location in the application
 * and provide quick navigation to parent pages.
 *
 * Features:
 * - Automatically generates breadcrumbs from the current URL
 * - Home link is always present
 * - Last breadcrumb is non-clickable (current page)
 * - Supports custom display names via ROUTE_NAME_MAP
 * - Special handling for dynamic routes (e.g., employee details)
 *
 * @example
 * // For URL: /employees/123
 * // Renders: Home > Employees > Employee Details
 *
 * @example
 * // For URL: /settings
 * // Renders: Home > Settings
 */
export const Breadcrumbs: React.FC = () => {
  const { t } = useTranslation('common');
  const location = useLocation();

  // Parse URL pathname into individual segments, filtering out empty strings
  const pathSegments = location.pathname
    .split('/')
    .filter((segment) => segment.length > 0);

  const isOnHomePage = pathSegments.length === 0;

  // Detect employee detail page and fetch name via React Query
  const employeeId = pathSegments[0] === 'employees' && pathSegments[1] ? pathSegments[1] : null;
  const { data: employeeData } = useEmployeeDetail(employeeId ?? undefined);
  const employeeName = employeeId ? (employeeData?.name ?? null) : null;

  // Detect survey detail page and fetch title via React Query
  const surveyId = pathSegments[0] === 'surveys' && pathSegments[1] ? pathSegments[1] : null;
  const { data: surveyData } = useSurveyDetail(surveyId ?? undefined);
  const surveyTitle = surveyId ? (surveyData?.title ?? null) : null;

  const getDisplayName = (pathSegment: string, segmentIndex: number) => {
    const previousSegment = segmentIndex > 0 ? pathSegments[segmentIndex - 1] : undefined;
    if (isEmployeeDetailPage(previousSegment)) {
      return employeeName || t('breadcrumbs.employeeDetails');
    }
    if (previousSegment === 'surveys') {
      return surveyTitle || t('breadcrumbs.survey');
    }
    return ROUTE_NAME_MAP[pathSegment] ? t(ROUTE_NAME_MAP[pathSegment]) : formatPathSegment(pathSegment);
  };

  return (
    <nav
      className="flex items-center text-sm text-text-muted-light dark:text-text-muted-dark mb-6 animate-fade-in"
      aria-label="Breadcrumb"
    >
      {/* Home link - always visible as the first breadcrumb */}
      <Link
        to="/"
        className={`flex items-center hover:text-primary transition-colors ${
          isOnHomePage
            ? 'font-medium text-text-light dark:text-text-dark pointer-events-none'
            : ''
        }`}
      >
        <Home size={16} className="mr-1.5" />
        <span>{t('breadcrumbs.home')}</span>
      </Link>

      {/* Dynamic breadcrumb items based on current URL path */}
      {pathSegments.map((pathSegment, segmentIndex) => {
        const pathUrl = buildPathUrl(pathSegments, segmentIndex);
        const isLastItem = segmentIndex === pathSegments.length - 1;
        const displayName = getDisplayName(pathSegment, segmentIndex);

        return (
          <React.Fragment key={pathUrl}>
            <ChevronRight
              size={16}
              className="mx-2 text-text-muted-light/50 dark:text-text-muted-dark/50"
            />
            <BreadcrumbItem
              displayName={displayName}
              path={pathUrl}
              isLastItem={isLastItem}
            />
          </React.Fragment>
        );
      })}
    </nav>
  );
};
