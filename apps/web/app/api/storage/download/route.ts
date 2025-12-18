import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'File path is required' }, { status: 400 });
    }

    // 🔒 SECURITY #50: Path traversal protection (prevent URL encoding bypass)
    const decodedPath = decodeURIComponent(filePath);
    if (decodedPath.includes('..') || decodedPath.includes('\\') || decodedPath !== decodedPath.normalize() || decodedPath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Also check original path
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file path' }, { status: 400 });
    }

    // Validate path format: should be tenant_id/folder/file
    const pathSegments = filePath.split('/');
    if (pathSegments.length < 2) {
      return NextResponse.json({ error: 'Invalid file path format' }, { status: 400 });
    }

    const supabase = await createClient();

    // Verifica autenticazione
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Estrai tenant_id dal path (primo segmento del path)
    const fileTenantId = pathSegments[0];

    // Verifica che l'utente appartenga al tenant del file
    const { data: userTenant, error: tenantError } = await supabase
      .from('user_tenants')
      .select('tenant_id, role')
      .eq('user_id', user.id)
      .eq('tenant_id', fileTenantId)
      .single();

    if (tenantError || !userTenant) {
      return NextResponse.json({ error: 'Forbidden - You do not have access to this file' }, { status: 403 });
    }

    // 🔒 SECURITY #51: IDOR protection - verify user can access this specific resource
    // For paths like tenant_id/users/user_id/... enforce same-user or admin check
    if (pathSegments.length >= 3 && pathSegments[1] === 'users') {
      const targetUserId = pathSegments[2];
      const isAdmin = userTenant.role === 'admin';
      const isOwnResource = targetUserId === user.id;

      if (!isAdmin && !isOwnResource) {
        return NextResponse.json({ error: 'Forbidden - You can only access your own resources' }, { status: 403 });
      }
    }

    // Download del file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('app-storage')
      .download(filePath);

    if (downloadError || !fileData) {
      console.error('Download error:', downloadError);
      return NextResponse.json({ error: 'File not found' }, { status: 404 });
    }

    // Estrai il nome del file dal path
    const fileName = filePath.split('/').pop() || 'download';

    // Determina il content-type basato sull'estensione
    const extension = fileName.split('.').pop()?.toLowerCase();
    const contentTypes: Record<string, string> = {
      'pdf': 'application/pdf',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'webp': 'image/webp',
      'heic': 'image/heic',
      'heif': 'image/heif',
    };
    const contentType = contentTypes[extension || ''] || 'application/octet-stream';

    // Converti il blob in ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();

    // 🔒 SECURITY #53: Log download per audit trail
    console.info(`[Storage Download] User ${user.id} downloaded ${filePath} from tenant ${fileTenantId}`);

    // Ritorna il file con gli header appropriati
    // ⚡ PERFORMANCE: Cache immutabile per file storage
    return new NextResponse(arrayBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${fileName}"`,
        'Cache-Control': 'private, max-age=31536000, immutable', // 1 anno per file immutabili
        'X-Content-Type-Options': 'nosniff', // Security header
      },
    });
  } catch (error) {
    console.error('Error in download route:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
