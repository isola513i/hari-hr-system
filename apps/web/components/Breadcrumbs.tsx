import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { api } from '../lib/api';

/**
 * Route name mapping configuration
 * Maps URL segments to human-readable display names
 */
const ROUTE_NAME_MAP: Record<string, string> = {
  'wellbeing': 'Well-being',
  'employees': 'Employees',
  'org-chart': 'Org Chart',
  'compliance': 'Compliance',
  'analytics': 'Analytics',
  'documents': 'Documents',
  'onboarding': 'Onboarding',
  'settings': 'Settings',
  'notifications': 'Notifications',
  'help': 'Help & Support',
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
 * Generates a human-readable breadcrumb name from a URL path segment
 * @param pathSegment - The URL segment to convert
 * @param segmentIndex - The position of this segment in the path array
 * @param allPathSegments - All path segments in the current URL
 * @returns A formatted, human-readable name for the breadcrumb
 */
const getBreadcrumbDisplayName = (
  pathSegment: string,
  segmentIndex: number,
  allPathSegments: string[]
): string => {
  const previousSegment = segmentIndex > 0 ? allPathSegments[segmentIndex - 1] : undefined;

  // Handle special case: employee detail pages
  if (isEmployeeDetailPage(previousSegment)) {
    // TODO: In production, fetch actual employee name from API or Context
    return 'Employee Details';
  }

  // Use mapped name if available, otherwise format the segment
  return ROUTE_NAME_MAP[pathSegment] || formatPathSegment(pathSegment);
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
  const location = useLocation();
  const [employeeName, setEmployeeName] = useState<string | null>(null);

  // Parse URL pathname into individual segments, filtering out empty strings
  const pathSegments = location.pathname
    .split('/')
    .filter((segment) => segment.length > 0);

  const isOnHomePage = pathSegments.length === 0;

  // Detect employee detail page and fetch name
  const employeeId = pathSegments[0] === 'employees' && pathSegments[1] ? pathSegments[1] : null;

  useEffect(() => {
    if (!employeeId) {
      setEmployeeName(null);
      return;
    }

    let cancelled = false;
    api.get<{ name: string }>(`/employees/${employeeId}`)
      .then((data) => {
        if (!cancelled) setEmployeeName(data.name);
      })
      .catch(() => {
        if (!cancelled) setEmployeeName(null);
      });

    return () => { cancelled = true; };
  }, [employeeId]);

  const getDisplayName = (pathSegment: string, segmentIndex: number) => {
    const previousSegment = segmentIndex > 0 ? pathSegments[segmentIndex - 1] : undefined;
    if (isEmployeeDetailPage(previousSegment)) {
      return employeeName || 'Employee Details';
    }
    return ROUTE_NAME_MAP[pathSegment] || formatPathSegment(pathSegment);
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
        <span>Home</span>
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
