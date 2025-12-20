'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export default function MobileTestPage() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      setData({ error: 'Not authenticated' });
      return;
    }

    const { data: userTenant } = await supabase
      .from('user_tenants')
      .select('custom_role_id, tenant_id')
      .eq('user_id', user.id)
      .single();

    const { data: role } = await supabase
      .from('custom_roles')
      .select('system_role_key, name')
      .eq('id', userTenant?.custom_role_id || '')
      .single();

    setData({
      user: user.email,
      role: role?.system_role_key,
      roleName: role?.name,
      canAccessMobile: role?.system_role_key === 'dipendente',
    });
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Mobile Access Debug</h1>
      <pre className="bg-gray-100 p-4 rounded">
        {JSON.stringify(data, null, 2)}
      </pre>
      <div className="mt-4">
        <a href="/mobile/home" className="text-blue-600 underline">
          Try accessing /mobile/home
        </a>
      </div>
    </div>
  );
}
