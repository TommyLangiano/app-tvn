'use client';

import { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { Home, Calendar, FileText, User } from 'lucide-react';
import { BottomNav } from '@/components/mobile/BottomNav';
import { FABMenu } from '@/components/mobile/FABMenu';
import { MobileHeader } from '@/components/mobile/MobileHeader';
import { MobileDataProvider } from '@/contexts/MobileDataContext';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';

const LoadingScreen = memo(() => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="text-center">
      <div className="animate-spin h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full mx-auto mb-4" />
      <p className="text-sm text-gray-500">Caricamento...</p>
    </div>
  </div>
));

LoadingScreen.displayName = 'LoadingScreen';

export default function MobileLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [fabOpen, setFabOpen] = useState(false);

  useEffect(() => {
    checkUserRole();
  }, []);

  const checkUserRole = async () => {
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        router.push('/sign-in');
        return;
      }

      // Get user role in single query using join
      const { data: userRole } = await supabase
        .from('user_tenants')
        .select(`
          custom_role_id,
          custom_roles!inner (
            system_role_key
          )
        `)
        .eq('user_id', user.id)
        .single();

      if (!userRole?.custom_role_id) {
        toast.error('Accesso non autorizzato');
        router.push('/dashboard');
        return;
      }

      // Type assertion for nested data
      const roleData = userRole.custom_roles as any;

      // Only allow dipendente role
      if (roleData?.system_role_key !== 'dipendente') {
        toast.error('Questa area è riservata ai dipendenti');
        router.push('/dashboard');
        return;
      }

      setLoading(false);
    } catch (error) {
      console.error('Error checking user role:', error);
      router.push('/sign-in');
    }
  };

  // Memoize nav items to prevent recreation
  const navItems = useMemo(() => [
    { icon: Home, label: 'Home', href: '/mobile/home' },
    { icon: Calendar, label: 'Presenze', href: '/mobile/presenze' },
    { icon: User, label: 'Placeholder', href: '#' },
    { icon: FileText, label: 'Richieste', href: '/mobile/richieste' },
    { icon: User, label: 'Profilo', href: '/mobile/profilo' },
  ], []);

  const handleFabClick = useCallback(() => {
    setFabOpen(true);
  }, []);

  const handleFabClose = useCallback(() => {
    setFabOpen(false);
  }, []);

  if (loading) {
    return <LoadingScreen />;
  }

  return (
    <MobileDataProvider>
      <div className="min-h-screen flex flex-col bg-white safe-area-top" style={{
        willChange: 'contents',
        contain: 'layout style paint',
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}>
        <MobileHeader title="AppTVN" showNotifications />

        <main className="flex-1 overflow-y-auto" style={{
          willChange: 'contents',
          backfaceVisibility: 'hidden',
          perspective: 1000,
          paddingBottom: 'calc(75px + env(safe-area-inset-bottom))',
        }}>
          {children}
        </main>

        <BottomNav items={navItems} onFabClick={handleFabClick} />

        <FABMenu isOpen={fabOpen} onClose={handleFabClose} />
      </div>
    </MobileDataProvider>
  );
}
