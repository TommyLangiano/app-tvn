'use client';

import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { UserProvider } from '@/contexts/UserContext';
import { useState, useEffect } from 'react';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { isOpen } = useSidebar();
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Sync with localStorage for collapsed state
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('sidebar-collapsed');
      if (saved !== null) {
        setIsCollapsed(saved === 'true');
      }
    };

    // Initial load
    handleStorageChange();

    // Listen for changes
    window.addEventListener('storage', handleStorageChange);

    // Custom event for same-tab changes
    const interval = setInterval(handleStorageChange, 100);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />

      {/* Main content area with integrated navbar */}
      <main
        className={`min-h-screen transition-all duration-300 bg-white ${
          isOpen ? (isCollapsed ? 'ml-20' : 'ml-80') : 'ml-0'
        }`}
      >
        <div className="px-6 pt-4 pb-6 lg:px-8 lg:pt-6 lg:pb-8">
          {/* Navbar integrata nel contenuto */}
          <Navbar />
          {/* Page Content */}
          {children}
        </div>
      </main>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <UserProvider>
        <AppLayoutContent>{children}</AppLayoutContent>
      </UserProvider>
    </SidebarProvider>
  );
}
