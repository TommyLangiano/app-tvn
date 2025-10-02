'use client';

import { Bell, User, CreditCard, Moon, Sun, LogOut, Menu } from 'lucide-react';
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
  const { toggle, isOpen } = useSidebar();

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
    <header className={`fixed right-0 top-0 z-30 h-20 bg-surface border-b border-border transition-all duration-300 ${
      isOpen ? 'left-60' : 'left-0'
    }`}>
      <div className="flex h-full items-center justify-between px-4 lg:px-6">
        <div className="flex items-center gap-4 flex-1">
          {/* Hamburger and logo - always visible */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggle}
            className="h-10 w-10"
          >
            <Menu className="h-6 w-6" />
          </Button>

          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">TVN</span>
          </div>

          {/* Page title will be handled by individual pages */}
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
          >
            <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Notifications */}
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
            <span className="sr-only">Notifications</span>
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
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
    </header>
  );
}
