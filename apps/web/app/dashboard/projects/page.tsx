import { createClient } from '@/lib/supabase/server';
import { ProjectsList } from '@/components/features/ProjectsList';
import { PageShell } from '@/components/layout/PageShell';
import { redirect } from 'next/navigation';

export default async function ProjectsPage() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  // Get user's tenant
  const { data: userTenant } = await supabase
    .from('user_tenants')
    .select('tenant_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!userTenant) {
    redirect('/dashboard');
  }

  // Get projects for this tenant
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('tenant_id', userTenant.tenant_id)
    .order('created_at', { ascending: false });

  return (
    <PageShell
      title="Projects"
      description="Manage your projects and tasks"
    >
      <ProjectsList initialProjects={projects || []} tenantId={userTenant.tenant_id} />
    </PageShell>
  );
}
