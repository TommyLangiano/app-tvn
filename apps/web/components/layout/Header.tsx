'use client';

import { Bell, User, CreditCard, Moon, Sun, LogOut, Menu, Search, SlidersHorizontal } from 'lucide-react';
import { useTheme } from '@/components/common/theme-provider';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { useSidebar } from '@/contexts/SidebarContext';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';

export function Header() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { plan, isTrialing, trialEnd, loading } = useSubscriptionStatus();
  const { toggle } = useSidebar();

  const handleLogout = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error('Failed to logout');
        return;
      }

      toast.success('Logged out successfully');
      router.push('/sign-in');
      router.refresh();
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('An unexpected error occurred');
    }
  };

  const getPlanLabel = () => {
    if (!plan) return null;

    if (isTrialing && trialEnd) {
      const daysLeft = Math.ceil((new Date(trialEnd).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
      return `Trial - ${daysLeft} days left`;
    }

    const planLabels = {
      base: 'Base',
      pro: 'Pro',
      premium: 'Premium',
    };

    return planLabels[plan];
  };

  return (
    <header className="fixed left-0 right-0 top-0 z-40 h-16 bg-surface border-b border-border/50 backdrop-blur-sm">
      <div className="flex h-full items-center justify-between">
        {/* Left section - sidebar header part (256px) */}
        <div className="w-64 h-full flex items-center justify-between px-6">
          {/* Logo TVN */}
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
            <span className="text-base font-bold">TVN</span>
          </div>

          {/* Hamburger Menu */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-9 w-9 hover:bg-accent/50 transition-all"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Right section - main header content */}
        <div className="flex-1 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-4 flex-1">
            {/* Global Search Bar */}
            <div className="relative w-full max-w-2xl">
              <div className="flex items-center h-10 rounded-xl border border-border/50 bg-background/50 hover:bg-background transition-colors overflow-hidden focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50">
                {/* Filter Button */}
                <button className="flex items-center justify-center h-full px-4 hover:bg-accent/50 transition-colors group">
                  <SlidersHorizontal className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
                </button>

                {/* Divider */}
                <div className="h-6 w-px bg-border/50" />

                {/* Search Input */}
                <div className="relative flex-1 flex items-center">
                  <Search className="absolute left-4 h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="Cerca progetti, documenti, impostazioni..."
                    className="w-full h-full pl-11 pr-4 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
                  />
                </div>
              </div>
            </div>
          </div>

        <div className="flex items-center gap-3">
          {/* Subscription Status */}
          {loading ? (
            <Skeleton className="h-6 w-32" />
          ) : plan ? (
            <div className="flex items-center gap-2">
              <Badge variant={isTrialing ? 'secondary' : 'default'} className="text-xs">
                {getPlanLabel()}
              </Badge>
              {isTrialing && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => {
                    // TODO: Open Stripe Checkout
                    console.log('Open Stripe Checkout');
                  }}
                >
                  <CreditCard className="mr-2 h-3.5 w-3.5" />
                  Activate
                </Button>
              )}
            </div>
          ) : null}

          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="h-9 w-9 rounded-lg hover:bg-accent/50"
          >
            <Sun className="h-[18px] w-[18px] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[18px] w-[18px] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-accent/50 relative">
            <Bell className="h-[18px] w-[18px]" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-danger rounded-full"></span>
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg hover:bg-accent/50">
                <User className="h-[18px] w-[18px]" />
                <span className="sr-only">User menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}
