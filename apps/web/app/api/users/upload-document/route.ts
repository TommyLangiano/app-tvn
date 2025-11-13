import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Check if user is admin
    const { data: tenants } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1);

    const userTenant = tenants && tenants.length > 0 ? tenants[0] : null;

    if (!userTenant || (userTenant.role !== 'admin' && userTenant.role !== 'owner')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // Get form data
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('user_id') as string;

    if (!file || !userId) {
      return NextResponse.json({ error: 'Missing file or user_id' }, { status: 400 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userTenant.tenant_id}/users/${userId}/documents/${fileName}`;

    // Upload to Supabase Storage in app-storage bucket (same as invoices)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('app-storage')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({
        error: 'Failed to upload file',
        details: uploadError.message,
        bucket: 'app-storage',
        path: filePath
      }, { status: 500 });
    }

    // Update user_profiles with document path
    const { error: updateError } = await adminClient
      .from('user_profiles')
      .update({
        document_path: uploadData.path,
      })
      .eq('user_id', userId);

    if (updateError) {
      return NextResponse.json({
        error: 'Failed to update profile',
        details: updateError.message
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      path: uploadData.path,
    });
  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
