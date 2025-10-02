// Type definitions for database
export type TenantRole = 'owner' | 'admin' | 'member' | 'viewer';

export type SubscriptionStatus = 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete';

export type PlanId = 'base' | 'pro' | 'premium';

export interface Tenant {
  id: string;
  name: string;
  created_at: string;
  created_by: string;
}

export interface UserTenant {
  user_id: string;
  tenant_id: string;
  role: TenantRole;
  created_at: string;
}

export interface Plan {
  id: PlanId;
  name: string;
  trial_days: number;
}

export interface Subscription {
  id: string;
  tenant_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  plan_id: PlanId;
  status: SubscriptionStatus;
  trial_start: string;
  trial_end: string;
  current_period_end: string | null;
  updated_at: string;
}

export interface Project {
  id: string;
  tenant_id: string;
  name: string;
  created_by: string;
  created_at: string;
}
