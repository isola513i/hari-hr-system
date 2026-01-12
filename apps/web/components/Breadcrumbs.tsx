import React from 'react';
import { useLocation, Link, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
// Mocks removed

const routeNameMap: Record<string, string> = {
  'wellbeing': 'Well-being',
  'employees': 'Employees',
  'org-chart': 'Org Chart',
  'compliance': 'Compliance',
  'analytics': 'Analytics',
  'documents': 'Documents',
  'onboarding': 'Onboarding',
  'settings': 'Settings',
  'help': 'Help & Support',
};

export const Breadcrumbs: React.FC = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const getBreadcrumbName = (value: string, index: number, pathParts: string[]) => {
    // If it's an ID (simple check: if previous part was 'employees' and this looks like an ID)
    // If it's an ID (simple check: if previous part was 'employees' and this looks like an ID)
    if (index > 0 && pathParts[index - 1] === 'employees') {
      // MOCK REMOVED: In real app, fetch name or use Context. For now, specific text.
      return "Employee Details";
    }

    return routeNameMap[value] || value.charAt(0).toUpperCase() + value.slice(1).replace(/-/g, ' ');
  };

  return (
    <nav className="flex items-center text-sm text-text-muted-light dark:text-text-muted-dark mb-6 animate-fade-in" aria-label="Breadcrumb">
      <Link
        to="/"
        className={`flex items-center hover:text-primary transition-colors ${pathnames.length === 0 ? 'font-medium text-text-light dark:text-text-dark pointer-events-none' : ''}`}
      >
        <Home size={16} className="mr-1.5" />
        <span className="">Home</span>
      </Link>

      {pathnames.map((value, index) => {
        const to = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const name = getBreadcrumbName(value, index, pathnames);

        return (
          <React.Fragment key={to}>
            <ChevronRight size={16} className="mx-2 text-text-muted-light/50 dark:text-text-muted-dark/50" />
            {isLast ? (
              <span className="font-medium text-text-light dark:text-text-dark" aria-current="page">
                {name}
              </span>
            ) : (
              <Link to={to} className="hover:text-primary transition-colors">
                {name}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};
