'use client';

import { Bell, User, CreditCard } from 'lucide-react';
import { useSubscriptionStatus } from '@/hooks/useSubscriptionStatus';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function Header() {
  const { plan, isTrialing, trialEnd, loading } = useSubscriptionStatus();

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

  const getPlanVariant = () => {
    if (isTrialing) return 'secondary' as const;

    const variants = {
      base: 'default' as const,
      pro: 'secondary' as const,
      premium: 'default' as const,
    };

    return plan ? variants[plan] : 'default' as const;
  };

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-6">
      <div className="flex-1">
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>
      <div className="flex items-center gap-4">
        {/* Subscription Status */}
        {loading ? (
          <Skeleton className="h-6 w-24" />
        ) : plan ? (
          <div className="flex items-center gap-2">
            <Badge variant={getPlanVariant()}>
              {getPlanLabel()}
            </Badge>
            {isTrialing && (
              <Button
                size="sm"
                variant="default"
                onClick={() => {
                  // TODO: Open Stripe Checkout

                }}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                Activate Now
              </Button>
            )}
          </div>
        ) : null}

        <button className="rounded-lg p-2 hover:bg-accent">
          <Bell className="h-5 w-5" />
        </button>
        <button className="rounded-lg p-2 hover:bg-accent">
          <User className="h-5 w-5" />
        </button>
      </div>
    </header>
  );
}
