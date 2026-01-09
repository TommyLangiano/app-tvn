'use client';

import {
  LayoutDashboard,
  FileText,
  Briefcase,
  Users,
  UserCircle,
  Settings,
  Building2,
  LogOut,
  MoreVertical,
  Clock,
  CalendarX,
  Wallet,
  Truck,
  Package,
  Receipt,
  Calendar,
  BarChart3,
  Shield,
  ChevronRight,
  FolderOpen,
  AlertCircle,
  FileSignature,
  GraduationCap,
  MapPin,
  Repeat,
  FileCheck,
  Banknote,
  BadgeEuro,
  FileSpreadsheet,
  CreditCard,
  PanelLeft,
  PanelLeftClose,
  ReceiptText
} from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useSidebar } from '@/contexts/SidebarContext';
import { useUser } from '@/contexts/UserContext';
import { useState, useCallback, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { UserAvatar } from '@/components/common/UserAvatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// Menu structure con categorie - spostato fuori dal componente per evitare ricreazione
const menuStructure = [
  {
    type: 'single',
    href: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard
  },
  {
    type: 'category',
    label: 'Report',
    icon: BarChart3,
    items: [
      { href: '/report/azienda', label: 'Azienda', icon: Building2 },
      { href: '/report/hr', label: 'HR', icon: Users, disabled: true },
      { href: '/report/commesse', label: 'Commesse', icon: Briefcase, disabled: true },
    ]
  },
  {
    type: 'single',
    href: '/commesse',
    label: 'Commesse',
    icon: Briefcase
  },
  {
    type: 'category',
    label: 'Personale',
    icon: Users,
    items: [
      { href: '/dipendenti', label: 'Dipendenti', icon: Users },
      { href: '/contratti', label: 'Contratti', icon: FileSignature, disabled: true },
      { href: '/documenti', label: 'Documenti', icon: FolderOpen, disabled: true },
      { href: '/sicurezza-formazione', label: 'Sicurezza & Formazione', icon: GraduationCap, disabled: true },
    ]
  },
  {
    type: 'category',
    label: 'Presenze',
    icon: Clock,
    items: [
      { href: '/timbrature', label: 'Timbrature', icon: Clock, disabled: true },
      { href: '/registro-presenze', label: 'Registro Presenze', icon: FileText },
      { href: '/assenze-ferie', label: 'Assenze & Ferie', icon: CalendarX, disabled: true },
      { href: '/anomalie', label: 'Anomalie', icon: AlertCircle, disabled: true },
      { href: '/richieste-correzioni', label: 'Richieste & Correzioni', icon: FileCheck, disabled: true },
    ]
  },
  {
    type: 'category',
    label: 'Turni',
    icon: Calendar,
    disabled: true,
    items: [
      { href: '/calendario-turni', label: 'Calendario Turni', icon: Calendar, disabled: true },
      { href: '/scambi-modifiche', label: 'Scambi & Modifiche', icon: Repeat, disabled: true },
    ]
  },
  {
    type: 'single',
    href: '/scadenziario',
    label: 'Scadenziario',
    icon: Calendar,
    disabled: true
  },
  {
    type: 'single',
    href: '/fatture',
    label: 'Fatture',
    icon: Receipt
  },
  {
    type: 'single',
    href: '/note-spesa',
    label: 'Note Spesa',
    icon: ReceiptText
  },
  {
    type: 'category',
    label: 'Paghe e Contributi',
    icon: Wallet,
    items: [
      { href: '/buste-paga', label: 'Ripartizione Buste Paga', icon: Banknote },
      { href: '/f24', label: 'Ripartizione F24', icon: BadgeEuro },
      { href: '/cedolini', label: 'Cedolini', icon: FileSpreadsheet, disabled: true },
    ]
  },
  {
    type: 'single',
    href: '/clienti',
    label: 'Clienti',
    icon: UserCircle
  },
  {
    type: 'single',
    href: '/fornitori',
    label: 'Fornitori',
    icon: Truck
  },
  {
    type: 'single',
    href: '/magazzino',
    label: 'Magazzino',
    icon: Package,
    disabled: true
  },
  {
    type: 'single',
    href: '/mezzi-attrezzature',
    label: 'Mezzi e Attrezzature',
    icon: Truck,
    disabled: true
  },
  {
    type: 'category',
    label: 'Impostazioni',
    icon: Settings,
    disabled: true,
    items: [
      { href: '/impostazioni', label: 'Azienda', icon: Building2, disabled: true },
      { href: '/impostazioni/sedi', label: 'Sedi', icon: MapPin, disabled: true },
      { href: '/impostazioni/regole', label: 'Regole', icon: FileCheck, disabled: true },
      { href: '/impostazioni/ccnl', label: 'CCNL', icon: FileText, disabled: true },
      { href: '/impostazioni/permessi-ruoli', label: 'Permessi & Ruoli', icon: Shield, disabled: true },
    ]
  },
];



export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen } = useSidebar();
  const { user, tenant, loading } = useUser();
  const [userStatus, setUserStatus] = useState<'online' | 'away' | 'offline'>('online');
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hoveredCategory, setHoveredCategory] = useState<string | null>(null);

  // Load collapsed state from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved !== null) {
      setIsCollapsed(saved === 'true');
    }
  }, []);

  // Toggle collapsed state
  const toggleCollapse = useCallback(() => {
    setIsCollapsed(prev => {
      const newValue = !prev;
      localStorage.setItem('sidebar-collapsed', String(newValue));
      // Chiudi tutte le categorie quando si collassa
      if (newValue) {
        setExpandedCategories([]);
      }
      return newValue;
    });
  }, []);

  // All data now comes from UserContext - no more API calls!

  const handleLogout = useCallback(async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/signin');
  }, [router]);

  const getStatusColor = useCallback(() => {
    switch (userStatus) {
      case 'online':
        return 'bg-primary';
      case 'away':
        return 'bg-yellow-500';
      case 'offline':
        return 'bg-red-500';
      default:
        return 'bg-primary';
    }
  }, [userStatus]);

  const toggleCategory = useCallback((label: string) => {
    setExpandedCategories(prev =>
      prev.includes(label)
        ? prev.filter(cat => cat !== label)
        : [...prev, label]
    );
  }, []);

  return (
    <aside className={cn(
      "fixed left-0 top-0 z-50 h-screen bg-white dark:bg-surface border-r border-border transition-all duration-300 overflow-y-auto",
      isOpen ? "translate-x-0" : "-translate-x-full",
      isCollapsed ? "w-20" : "w-80"
    )}>
      <div className="flex flex-col h-full">

        {/* Toggle button */}
        <div className={cn(
          "absolute top-4 z-10 transition-all duration-300",
          isCollapsed ? "left-1/2 -translate-x-1/2" : "right-4"
        )}>
          <button
            onClick={toggleCollapse}
            className="p-2 hover:bg-green-500/10 rounded-lg transition-colors group"
            title={isCollapsed ? "Espandi sidebar" : "Comprimi sidebar"}
          >
            {isCollapsed ? (
              <PanelLeft className="h-5 w-5 text-gray-500 group-hover:text-green-600" />
            ) : (
              <PanelLeftClose className="h-5 w-5 text-gray-500 group-hover:text-green-600" />
            )}
          </button>
        </div>

        {/* Header - Logo e nome azienda orizzontale */}
        <div className={cn(
          "pb-6 transition-all duration-300",
          isCollapsed ? "px-2 pt-20" : "px-6 pt-12"
        )}>
          <div className={cn(
            "flex items-center transition-all duration-300",
            isCollapsed ? "justify-center" : "gap-4"
          )}>
            {/* Logo azienda */}
            <div className={cn(
              "rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0",
              tenant?.logoUrl ? "bg-transparent" : "bg-green-500/10",
              isCollapsed ? "w-14 h-14" : "w-12 h-12"
            )}>
              {tenant?.logoUrl ? (
                <img src={tenant.logoUrl} alt="Logo" className="h-full w-full object-contain" />
              ) : (
                <Building2 className={cn(
                  "text-green-600",
                  isCollapsed ? "h-7 w-7" : "h-6 w-6"
                )} />
              )}
            </div>

            {/* Nome azienda con testo dinamico */}
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="h-5 w-full bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                ) : (
                  <h1 className="font-bold uppercase tracking-wide text-foreground leading-tight" style={{
                    fontSize: 'clamp(0.75rem, 1.5vw + 0.5rem, 1rem)',
                    wordBreak: 'break-word'
                  }}>
                    {tenant?.ragioneSociale || 'LA MIA AZIENDA'}
                  </h1>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Navigation */}
        <TooltipProvider delayDuration={0}>
          <nav className={cn(
            "flex-1 pt-8 pb-2 overflow-y-auto transition-all duration-300",
            isCollapsed ? "px-2" : "px-4"
          )}>
            <div className="space-y-1">
              {menuStructure.map((item, index) => {
                if (item.type === 'single') {
                  const Icon = item.icon;
                  const href = item.href!; // Type assertion: single items always have href
                  const isActive = pathname === href || pathname.startsWith(href + '/');
                  const isDisabled = item.disabled;

                  if (isDisabled) {
                    const iconContent = (
                      <div
                        key={href}
                        className={cn(
                          "group flex items-center rounded-lg opacity-40 cursor-not-allowed transition-all duration-200",
                          isCollapsed ? "justify-center px-3 py-2.5" : "gap-3 px-4 py-2.5"
                        )}
                      >
                        <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
                        {!isCollapsed && <span className="text-sm font-medium text-gray-500">{item.label}</span>}
                      </div>
                    );

                    if (isCollapsed) {
                      return (
                        <Tooltip key={href}>
                          <TooltipTrigger asChild>{iconContent}</TooltipTrigger>
                          <TooltipContent side="right">{item.label} (Non disponibile)</TooltipContent>
                        </Tooltip>
                      );
                    }
                    return iconContent;
                  }

                  const linkContent = (
                    <Link
                      key={href}
                      href={href}
                      className={cn(
                        'group flex items-center rounded-lg text-sm font-medium transition-all duration-200',
                        isCollapsed ? "justify-center px-3 py-2.5" : "gap-3 px-4 py-2.5",
                        isActive
                          ? 'bg-green-500/10 text-green-600'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-green-500/5'
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0",
                        isActive ? "text-green-600" : "text-gray-500 dark:text-gray-400 group-hover:text-green-600"
                      )} />
                      {!isCollapsed && <span>{item.label}</span>}
                    </Link>
                  );

                  if (isCollapsed) {
                    return (
                      <Tooltip key={href}>
                        <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
                        <TooltipContent side="right">{item.label}</TooltipContent>
                      </Tooltip>
                    );
                  }
                  return linkContent;
                }

              if (item.type === 'category') {
                const Icon = item.icon;
                const isExpanded = expandedCategories.includes(item.label);
                const hasActiveChild = item.items?.some(child =>
                  pathname === child.href || pathname.startsWith(child.href + '/')
                );
                const isDisabled = item.disabled;

                // Se collapsed, mostra solo icona con tooltip
                if (isCollapsed) {
                  const buttonContent = (
                    <button
                      key={index}
                      disabled={isDisabled}
                      className={cn(
                        'w-full group flex items-center justify-center rounded-lg transition-all duration-200 px-3 py-2.5',
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed'
                          : hasActiveChild
                          ? 'bg-green-500/10 text-green-600'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-green-500/5'
                      )}
                    >
                      <Icon className={cn(
                        "h-4 w-4 flex-shrink-0",
                        hasActiveChild ? "text-green-600" : "text-gray-500 dark:text-gray-400 group-hover:text-green-600"
                      )} />
                    </button>
                  );

                  return (
                    <Tooltip key={index}>
                      <TooltipTrigger asChild>{buttonContent}</TooltipTrigger>
                      <TooltipContent side="right">
                        <div className="text-sm font-semibold mb-1">{item.label}</div>
                        {item.items && item.items.length > 0 && (
                          <div className="text-xs text-muted-foreground">
                            {item.items.map(sub => sub.label).join(', ')}
                          </div>
                        )}
                      </TooltipContent>
                    </Tooltip>
                  );
                }

                return (
                  <div key={index}>
                    {/* Category Header */}
                    <button
                      onClick={() => !isDisabled && toggleCategory(item.label)}
                      disabled={isDisabled}
                      className={cn(
                        'w-full group flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-all duration-200',
                        isDisabled
                          ? 'opacity-40 cursor-not-allowed'
                          : hasActiveChild
                          ? 'bg-green-500/5 text-green-600'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-green-500/5'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon className={cn(
                          "h-4 w-4 flex-shrink-0",
                          hasActiveChild ? "text-green-600" : "text-gray-500 dark:text-gray-400 group-hover:text-green-600"
                        )} />
                        <span>{item.label}</span>
                      </div>
                      <ChevronRight className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        isExpanded && "rotate-90"
                      )} />
                    </button>

                    {/* Category Items con animazione */}
                    <div className={cn(
                      "overflow-hidden transition-all duration-300 ease-in-out",
                      isExpanded ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
                    )}>
                      <div className="mt-1 ml-6 space-y-1">
                        {item.items && item.items.map((subItem, subIndex) => {
                          const SubIcon = subItem.icon;
                          const isActive = pathname === subItem.href || pathname.startsWith(subItem.href + '/');
                          const isSubDisabled = subItem.disabled;

                          if (isSubDisabled) {
                            return (
                              <div
                                key={subItem.href}
                                className="group flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg opacity-40 cursor-not-allowed"
                                style={{
                                  animationDelay: `${subIndex * 50}ms`,
                                  animation: isExpanded ? 'slideIn 0.3s ease-out forwards' : 'none'
                                }}
                              >
                                <SubIcon className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                                <span className="text-gray-500">{subItem.label}</span>
                              </div>
                            );
                          }

                          return (
                            <Link
                              key={subItem.href}
                              href={subItem.href}
                              className={cn(
                                'group flex items-center gap-3 px-4 py-2 text-sm font-medium rounded-lg transition-all duration-200',
                                isActive
                                  ? 'bg-green-500/10 text-green-600'
                                  : 'text-gray-600 dark:text-gray-400 hover:bg-green-500/5 hover:text-gray-900 dark:hover:text-gray-200'
                              )}
                              style={{
                                animationDelay: `${subIndex * 50}ms`,
                                animation: isExpanded ? 'slideIn 0.3s ease-out forwards' : 'none'
                              }}
                            >
                              <SubIcon className={cn(
                                "h-3.5 w-3.5 flex-shrink-0",
                                isActive ? "text-green-600" : "text-gray-400 dark:text-gray-500 group-hover:text-green-600"
                              )} />
                              <span>{subItem.label}</span>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </nav>
        </TooltipProvider>

        {/* Footer - Profilo utente */}
        <div className={cn(
          "pb-8 pt-4 transition-all duration-300",
          isCollapsed ? "px-2" : "px-4"
        )}>
          {/* Profilo utente */}
          <div className={cn(
            "flex items-center py-3 transition-all duration-300",
            isCollapsed ? "justify-center px-0" : "gap-3 px-3"
          )}>
            <div className="relative flex-shrink-0">
              {user ? (
                <UserAvatar user={{ full_name: user?.fullName || "", email: user?.email || "", avatar_url: undefined }} size="md" />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-gray-200 dark:bg-gray-700 animate-pulse" />
              )}
              <div className={cn(
                "absolute -top-0.5 -right-0.5 h-3 w-3 border-2 border-white dark:border-surface rounded-full",
                getStatusColor()
              )} />
            </div>

            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0">
                  {loading ? (
                    <>
                      <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded mb-1 animate-pulse" />
                      <div className="h-3 w-16 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-foreground truncate leading-tight">
                        {user?.fullName}
                      </p>
                      <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">
                        {user?.role === 'admin' ? 'Amministratore' :
                         user?.role === 'manager' ? 'Manager' :
                         user?.role === 'operaio' ? 'Operaio' :
                         'Utente'}
                      </p>
                    </>
                  )}
                </div>

                {/* Menu dropdown */}
                <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1 hover:bg-primary/5 rounded-lg transition-colors focus:outline-none data-[state=open]:bg-transparent">
                  <MoreVertical className="h-5 w-5 text-gray-500 dark:text-gray-400 hover:text-primary" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-64 p-2" sideOffset={8}>
                <div className="px-3 py-2 mb-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Stato</p>
                </div>

                <DropdownMenuItem
                  onClick={() => setUserStatus('online')}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2.5 mb-1 hover:bg-primary/5 focus:bg-primary/5",
                    userStatus === 'online' && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                      <span className="font-medium">Online</span>
                    </div>
                    {userStatus === 'online' && (
                      <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                    )}
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setUserStatus('away')}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2.5 mb-1 hover:bg-primary/5 focus:bg-primary/5",
                    userStatus === 'away' && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-yellow-500" />
                      <span className="font-medium">Non Disponibile</span>
                    </div>
                    {userStatus === 'away' && (
                      <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
                    )}
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={() => setUserStatus('offline')}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-2.5 mb-2 hover:bg-primary/5 focus:bg-primary/5",
                    userStatus === 'offline' && "bg-primary/5"
                  )}
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="flex items-center gap-3">
                      <div className="h-2.5 w-2.5 rounded-full bg-red-500" />
                      <span className="font-medium">Offline</span>
                    </div>
                    {userStatus === 'offline' && (
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    )}
                  </div>
                </DropdownMenuItem>

                <DropdownMenuSeparator className="my-2" />

                <DropdownMenuItem
                  onClick={() => router.push('/impostazioni/profilo')}
                  className="cursor-pointer rounded-lg px-3 py-2.5 font-medium hover:bg-primary/5 focus:bg-primary/5 mb-1"
                >
                  <div className="flex items-center gap-3">
                    <UserCircle className="h-4 w-4" />
                    <span>Profilo</span>
                  </div>
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-red-600 dark:text-red-400 rounded-lg px-3 py-2.5 font-medium hover:bg-red-50 dark:hover:bg-red-950/20 focus:bg-red-50 dark:focus:bg-red-950/20"
                >
                  <div className="flex items-center gap-3">
                    <LogOut className="h-4 w-4" />
                    <span>Esci</span>
                  </div>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
              </>
            )}
          </div>
        </div>

      </div>
    </aside>
  );
}