import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/middleware/auth';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';

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

      // Get signed URL for download
      const { data, error } = await supabase.storage
        .from('app-storage')
        .createSignedUrl(documentPath, 60); // Valid for 60 seconds

      if (error) {
        throw new Error('Failed to get download URL');
      }

      return NextResponse.json({ url: data.signedUrl });
    } catch (error) {
      return handleApiError(error, 'GET /api/users/download-document');
    }
  });
}
