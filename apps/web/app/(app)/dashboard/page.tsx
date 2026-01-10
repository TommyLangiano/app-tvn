import { createClient } from '@/lib/supabase/server';
import { CreateTenantForm } from '@/components/features/CreateTenantForm';
import { PageShell } from '@/components/layout/PageShell';
import { OperaioDashboard } from '@/components/features/dashboard/OperaioDashboard';
import { AdminDashboard } from '@/components/features/dashboard/AdminDashboard';

export default async function DashboardPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  // 🚀 OTTIMIZZAZIONE: Fetch parallelo di user_tenants e user_profiles
  const [
    { data: userTenants },
    { data: profile }
  ] = await Promise.all([
    supabase
      .from('user_tenants')
      .select(`
        tenant_id,
        role,
        tenants (
          id,
          name
        )
      `)
      .eq('user_id', user.id),
    supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', user.id)
      .single()
  ]);

  // If user has no tenants, show create tenant form
  if (!userTenants || userTenants.length === 0) {
    return <CreateTenantForm />;
  }

  // Single-tenant setup: Get first tenant
  const tenant = userTenants[0];
  const userRole = tenant.role;

  const userName = profile?.full_name || user.email?.split('@')[0] || 'Utente';

  // If user is operaio, show operaio dashboard
  if (userRole === 'operaio') {
    return (
      <PageShell title="Dashboard" description="La tua dashboard operativa">
        <OperaioDashboard userId={user.id} userName={userName} />
      </PageShell>
    );
  }

  // For admin/owner, show admin dashboard
  return <AdminDashboard />;
}
