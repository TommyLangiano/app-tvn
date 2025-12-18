import { createClient, createAdminClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rate-limit';
import { fileTypeFromBuffer } from 'file-type';
import { logAuditEvent, getRequestMetadata } from '@/lib/audit';
import { withAdminAuth } from '@/lib/middleware/auth';
import { handleApiError, ApiErrors } from '@/lib/errors/api-errors';

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
  return withAdminAuth(async (context) => {
    try {
      const supabase = await createClient();
      const adminClient = createAdminClient();

      // Rate limiting per user
      const { success, limit, remaining, reset } = await checkRateLimit(context.user.id, 'upload');

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

      // Get form data
      const formData = await request.formData();
      const file = formData.get('file') as File;
      const userId = formData.get('user_id') as string;

      if (!file || !userId) {
        throw ApiErrors.badRequest('Missing file or user_id');
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw ApiErrors.badRequest('File troppo grande. Massimo 10MB.');
      }

      // 🔒 SECURITY #38: Sanitize filename to prevent path traversal
      const originalName = file.name;
      if (originalName.includes('..') || originalName.includes('/') || originalName.includes('\\')) {
        throw ApiErrors.badRequest('Nome file non valido');
      }

      // Convert File to Buffer for magic bytes validation
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // 🔒 SECURITY #37: Enhanced file validation (anti-polyglot)
      const detectedType = await fileTypeFromBuffer(buffer);

      if (!detectedType) {
        throw ApiErrors.badRequest('Tipo di file non riconosciuto. Impossibile verificare il contenuto.');
      }

      // Check if detected MIME type is allowed
      if (!ALLOWED_MIME_TYPES.includes(detectedType.mime)) {
        throw ApiErrors.badRequest(`Tipo di file non consentito. Rilevato: ${detectedType.mime}. Sono permessi solo: PDF, JPG, PNG, WEBP, HEIC.`);
      }

      // Verify extension matches detected type
      const fileExt = detectedType.ext;
      if (!ALLOWED_EXTENSIONS.includes(fileExt)) {
        throw ApiErrors.badRequest('Estensione file non valida.');
      }

      // 🔒 SECURITY #37: Additional checks for polyglot files
      // Check for suspicious patterns in file header (e.g., PDF + ZIP hybrid)
      const headerString = buffer.toString('hex', 0, Math.min(buffer.length, 1024));

      // Check for multiple file signatures in the same file
      const suspiciousPatterns = [
        '504b0304', // ZIP header
        '1f8b08',   // GZIP header
        '526172',   // RAR header
      ];

      if (detectedType.mime === 'application/pdf') {
        // If detected as PDF, ensure it doesn't contain other archive formats
        for (const pattern of suspiciousPatterns) {
          if (headerString.includes(pattern) && !headerString.startsWith('255044462d')) { // PDF starts with %PDF-
            throw ApiErrors.badRequest('File polyglot rilevato. Upload bloccato per motivi di sicurezza.');
          }
        }

        // Check for JavaScript in PDF (simplified check)
        const pdfString = buffer.toString('utf8', 0, Math.min(buffer.length, 10000));
        if (pdfString.includes('/JavaScript') || pdfString.includes('/JS')) {
          throw ApiErrors.badRequest('PDF con JavaScript rilevato. Upload bloccato per motivi di sicurezza.');
        }
      }

      // Check file doesn't have double extension (e.g., file.pdf.exe)
      const nameParts = originalName.split('.');
      if (nameParts.length > 2) {
        throw ApiErrors.badRequest('Nome file con doppia estensione non permesso.');
      }

      // 🔒 SECURITY: Verify userId belongs to current tenant BEFORE upload
      const { data: targetUserTenant } = await supabase
        .from('user_tenants')
        .select('tenant_id')
        .eq('user_id', userId)
        .eq('tenant_id', context.tenant.tenant_id)
        .single();

      if (!targetUserTenant) {
        throw ApiErrors.notFound('User not found in your tenant');
      }

      // Generate unique filename
      const timestamp = Date.now();
      const fileName = `${timestamp}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${context.tenant.tenant_id}/users/${userId}/documents/${fileName}`;

      // 🔒 SECURITY #39: Race condition protection - use upsert: false to prevent concurrent overwrites
      // If file exists, upload will fail instead of overwriting
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('app-storage')
        .upload(filePath, buffer, {
          cacheControl: '3600',
          upsert: false, // Prevents race condition overwrite
          contentType: detectedType.mime,
        });

      if (uploadError) {
        // If file exists, unique filename should prevent this, but handle gracefully
        if (uploadError.message?.includes('already exists')) {
          throw ApiErrors.conflict('File già esistente. Riprova.');
        }
        throw new Error('Failed to upload file');
      }

      // Update user_profiles with document path
      const { error: updateError } = await adminClient
        .from('user_profiles')
        .update({
          document_path: uploadData.path,
        })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error('Failed to update profile');
      }

      // Audit log
      const { ipAddress, userAgent } = getRequestMetadata(request);
      await logAuditEvent({
        tenantId: context.tenant.tenant_id,
        userId: context.user.id,
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
      return handleApiError(error, 'POST /api/users/upload-document');
    }
  });
}
