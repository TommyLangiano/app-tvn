'use client';

import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { SidebarProvider } from '@/contexts/SidebarContext';

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background">
        <Sidebar />
        <Header />

        {/* Main content area */}
        <main className="mt-20 min-h-[calc(100vh-5rem)] bg-background p-6">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
