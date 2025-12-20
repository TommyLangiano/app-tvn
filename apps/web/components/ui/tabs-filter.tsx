'use client';

import { ReactNode } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

// ===== TYPES =====

export interface TabItem<T extends string = string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  count?: number;
  badgeClassName?: string;
  activeColor?: string; // e.g., 'border-green-500 text-green-700'
}

export interface TabsFilterProps<T extends string = string> {
  tabs: TabItem<T>[];
  activeTab: T;
  onTabChange: (tab: T) => void;
  rightContent?: ReactNode;
  className?: string;
}

// ===== COMPONENT =====

export function TabsFilter<T extends string = string>({
  tabs,
  activeTab,
  onTabChange,
  rightContent,
  className,
}: TabsFilterProps<T>) {
  return (
    <div className={cn("flex items-center justify-between border-b border-border", className)}>
      <div className="flex gap-1">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.value;

          return (
            <button
              key={tab.value}
              onClick={() => onTabChange(tab.value)}
              className={cn(
                "flex items-center gap-2 px-4 py-3 border-b-2 transition-colors",
                isActive
                  ? tab.activeColor || 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              {Icon && <Icon className="h-4 w-4" />}
              <span>{tab.label}</span>
              {tab.count !== undefined && (
                <Badge
                  variant="secondary"
                  className={cn(
                    "pointer-events-none",
                    tab.badgeClassName
                  )}
                >
                  {tab.count}
                </Badge>
              )}
            </button>
          );
        })}
      </div>

      {rightContent && (
        <div className="flex gap-1">
          {rightContent}
        </div>
      )}
    </div>
  );
}
