import { createClient } from '@/lib/supabase/server';
import { CreateTenantForm } from '@/components/features/CreateTenantForm';
import { PageShell } from '@/components/layout/PageShell';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // Check if user has any tenants
  const { data: userTenants } = await supabase
    .from('user_tenants')
    .select(`
      tenant_id,
      tenants (
        id,
        name
      )
    `)
    .eq('user_id', user.id);

  // If user has no tenants, show create tenant form
  if (!userTenants || userTenants.length === 0) {
    return <CreateTenantForm />;
  }

  // Single-tenant setup: Get first tenant
  const tenant = userTenants[0];
  const tenantData = Array.isArray(tenant.tenants) ? tenant.tenants[0] : tenant.tenants;

  // User has tenant, show dashboard home
  return (
    <PageShell
      title="Welcome back!"
      description={tenantData?.name || 'Your workspace'}
    >
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <a
          href="/dashboard/projects"
          className="rounded-lg border bg-card p-6 hover:bg-accent transition-colors"
        >
          <h3 className="font-semibold mb-2">Projects</h3>
          <p className="text-sm text-muted-foreground">
            Manage your projects and tasks
          </p>
        </a>

        <div className="rounded-lg border bg-card p-6 opacity-50">
          <h3 className="font-semibold mb-2">Settings</h3>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>

        <div className="rounded-lg border bg-card p-6 opacity-50">
          <h3 className="font-semibold mb-2">Team</h3>
          <p className="text-sm text-muted-foreground">Coming soon</p>
        </div>
      </div>
    </PageShell>
  );
}
