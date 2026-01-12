
import React from 'react';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';
import { Outlet } from 'react-router-dom';

export const Layout: React.FC = () => {
  return (
    <div className="flex h-screen bg-background-light dark:bg-background-dark overflow-hidden">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
          <Breadcrumbs />
          <Outlet />
        </main>
      </div>
    </div>
  );
};
