'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider, useSidebar } from '@/contexts/SidebarContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
  const { isOpen } = useSidebar();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Sidebar />

      {/* Main content area */}
      <main
        className={`mt-16 min-h-[calc(100vh-4rem)] bg-background p-6 transition-all duration-300 ${
          isOpen ? 'ml-60' : 'ml-0'
        }`}
      >
        {children}
      </main>
    </div>
  );
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <AppLayoutContent>{children}</AppLayoutContent>
    </SidebarProvider>
  );
}
