import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';
import { logAuditEvent, getRequestMetadata } from '@/lib/audit';

export async function GET(request: Request) {
  return withAuth(async (context) => {
    try {
      const supabase = await createClient();

      // Get document_path from query params
      const { searchParams } = new URL(request.url);
      const documentPath = searchParams.get('path');

      if (!documentPath) {
        throw ApiErrors.badRequest('Missing document path');
      }

      // 🔒 SECURITY #44: Path traversal protection (prevent URL encoding bypass)
      const decodedPath = decodeURIComponent(documentPath);
      if (decodedPath.includes('..') || decodedPath.includes('\\') || decodedPath !== decodedPath.normalize()) {
        throw ApiErrors.badRequest('Invalid document path');
      }

      // 🔒 SECURITY: Validate path format (tenant_id/users/user_id/documents/file)
      const pathSegments = documentPath.split('/');
      if (pathSegments.length < 4 || pathSegments[1] !== 'users' || pathSegments[3] !== 'documents') {
        throw ApiErrors.badRequest('Invalid document path format');
      }

      // Verify tenant matches
      const fileTenantId = pathSegments[0];
      if (fileTenantId !== context.tenant.tenant_id) {
        throw ApiErrors.notAuthorized();
      }

      // 🔒 SECURITY #45: IDOR protection - verify user can access this specific user's documents
      const targetUserId = pathSegments[2];
      const isAdmin = context.tenant.role === 'admin';
      const isOwnDocument = targetUserId === context.user.id;

      if (!isAdmin && !isOwnDocument) {
        // Non-admin users can only access their own documents
        throw ApiErrors.notAuthorized();
      }

      // Get signed URL for download
      const { data, error } = await supabase.storage
        .from('app-storage')
        .createSignedUrl(documentPath, 60); // Valid for 60 seconds

      if (error) {
        throw new Error('Failed to get download URL');
      }

      // 🔒 AUDIT: Log document access
      const userId = pathSegments[2]; // Extract user_id from path
      const { ipAddress, userAgent } = getRequestMetadata(request);

      // 🔒 SECURITY #47: Non loggare path completo (contiene user_id) - usa solo filename
      const filename = pathSegments[pathSegments.length - 1];

      await logAuditEvent({
        tenantId: context.tenant.tenant_id,
        userId: context.user.id,
        eventType: 'sensitive_data_accessed',
        resourceType: 'user_document',
        resourceId: userId,
        newValues: { filename }, // Solo filename, non path completo
        ipAddress,
        userAgent,
      });

      // 🔒 SECURITY #48: URL è già safe (generato da Supabase), ma per extra safety
      // non includiamo path raw nella response (solo signedUrl)
      return NextResponse.json({ url: data.signedUrl });
    } catch (error) {
      return handleApiError(error, 'GET /api/users/download-document');
    }
  });
}
