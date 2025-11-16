import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { fileTypeFromBuffer } from 'file-type';
import { logAuditEvent, getRequestMetadata } from '@/lib/audit';

// Allowed MIME types (no SVG to prevent XSS)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
];

// Allowed file extensions
const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const adminClient = createAdminClient();

    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Rate limiting per user
    const { success, limit, remaining, reset } = await checkRateLimit(user.id, 'upload');

    if (!success) {
      return NextResponse.json(
        {
          error: 'Troppi upload. Riprova più tardi.',
          retryAfter: Math.ceil((reset - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'X-RateLimit-Limit': limit.toString(),
            'X-RateLimit-Remaining': remaining.toString(),
            'X-RateLimit-Reset': reset.toString(),
          }
        }
      );
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

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({
        error: 'File troppo grande. Massimo 10MB.'
      }, { status: 413 });
    }

    // Convert File to Buffer for magic bytes validation
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // SECURITY: Validate actual file content (magic bytes)
    const detectedType = await fileTypeFromBuffer(buffer);

    if (!detectedType) {
      return NextResponse.json({
        error: 'Tipo di file non riconosciuto. Impossibile verificare il contenuto.'
      }, { status: 415 });
    }

    // Check if detected MIME type is allowed
    if (!ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
      return NextResponse.json({
        error: `Tipo di file non consentito. Rilevato: ${detectedType.mime}. Sono permessi solo: PDF, JPG, PNG, WEBP, HEIC.`
      }, { status: 415 });
    }

    // Verify extension matches detected type
    const fileExt = detectedType.ext;
    if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
      return NextResponse.json({
        error: 'Estensione file non valida.'
      }, { status: 415 });
    }

    // Additional check: declared MIME vs actual MIME
    if (file.type && !ALLOWED_MIME_TYPES.includes(file.type)) {
      return NextResponse.json({
        error: 'MIME type dichiarato non consentito.'
      }, { status: 415 });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${userTenant.tenant_id}/users/${userId}/documents/${fileName}`;

    // Upload to Supabase Storage in app-storage bucket (use buffer instead of file)
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('app-storage')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: detectedType.mime,
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

    // Audit log
    const { ipAddress, userAgent } = getRequestMetadata(request);
    await logAuditEvent({
      tenantId: userTenant.tenant_id,
      userId: user.id,
      eventType: 'file_uploaded',
      resourceType: 'user_document',
      resourceId: userId,
      newValues: {
        file_path: uploadData.path,
        file_size: file.size,
        file_type: detectedType.mime,
        file_ext: fileExt,
      },
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      success: true,
      path: uploadData.path,
      fileType: detectedType.mime,
      fileSize: file.size,
    });
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
