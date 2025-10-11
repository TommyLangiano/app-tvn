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
      title="Benvenuto!"
      description={tenantData?.name || 'Il tuo workspace'}
    >
      <div className="text-center py-12">
        <p className="text-muted-foreground">Dashboard in arrivo...</p>
      </div>
    </PageShell>
  );
}
