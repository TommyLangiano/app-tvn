import { createClient } from '@/lib/supabase/server';
import { CreateTenantForm } from '@/components/features/CreateTenantForm';
import { PageShell } from '@/components/layout/PageShell';
import { OperaioDashboard } from '@/components/features/dashboard/OperaioDashboard';

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
      role,
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
  const userRole = tenant.role;

  // Get user profile for full name
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('full_name')
    .eq('user_id', user.id)
    .single();

  const userName = profile?.full_name || user.email?.split('@')[0] || 'Utente';

  // If user is operaio, show operaio dashboard
  if (userRole === 'operaio') {
    return (
      <PageShell title="Dashboard" description="La tua dashboard operativa">
        <OperaioDashboard userId={user.id} userName={userName} />
      </PageShell>
    );
  }

  // For admin/owner, show placeholder (or redirect to rapportini)
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Dashboard amministratore in arrivo...</p>
      <p className="text-sm text-muted-foreground mt-2">
        Nel frattempo, visita <a href="/rapportini" className="text-primary underline">Rapportini</a> o{' '}
        <a href="/utenti-ruoli" className="text-primary underline">Gestione Utenti</a>
      </p>
    </div>
  );
}
