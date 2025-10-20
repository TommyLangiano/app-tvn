'use client';

import { Home, FileText, Briefcase, Users, UserCircle, Settings } from 'lucide-react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';

const menuCategories = [
  {
    label: 'Dashboard',
    items: [
      { href: '/dashboard', label: 'Home', icon: Home },
    ]
  },
  {
    label: 'Gestione Operativa',
    items: [
      { href: '/rapportini', label: 'Rapportini', icon: FileText },
      { href: '/commesse', label: 'Commesse', icon: Briefcase },
    ]
  },
  {
    label: 'Amministrazione',
    items: [
      { href: '/anagrafica', label: 'Anagrafica', icon: UserCircle },
      { href: '/gestione-utenti', label: 'Gestione Utenti', icon: Users },
    ]
  },
  {
    label: 'Configurazione',
    items: [
      { href: '/impostazioni', label: 'Impostazioni', icon: Settings },
    ]
  }
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen } = useSidebar();

  return (
    <aside className={cn(
      "fixed left-0 top-16 z-50 h-[calc(100vh-4rem)] w-64 bg-surface border-r border-border/50 transition-transform duration-300 overflow-y-auto",
      isOpen ? "translate-x-0" : "-translate-x-full"
    )}>
      {/* Navigation */}
      <nav className="p-4 space-y-6">
        {menuCategories.map((category, idx) => (
          <div key={idx}>
            {/* Category Label */}
            <h3 className="px-3 mb-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {category.label}
            </h3>

            {/* Category Items */}
            <div className="space-y-1">
              {category.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200 relative',
                      isActive
                        ? 'bg-primary/10 text-primary shadow-sm'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-primary rounded-r-full" />
                    )}
                    <Icon className={cn(
                      "h-4.5 w-4.5 transition-all flex-shrink-0",
                      isActive ? "text-primary" : "text-muted-foreground group-hover:text-accent-foreground"
                    )} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
