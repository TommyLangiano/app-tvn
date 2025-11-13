'use client';

import { Sidebar } from './Sidebar';
import { Navbar } from './Navbar';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';
import { UserProvider } from '@/contexts/UserContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { isOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Main content area with integrated navbar */}
      <main
        className={`min-h-screen transition-all duration-300 ${
          isOpen ? 'ml-80' : 'ml-0'
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
