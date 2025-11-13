import { createClient } from '@/lib/supabase/client';

/**
 * Get a secure authenticated URL for a storage file
 * Downloads the file via authenticated API and creates a temporary blob URL
 * This method is more secure as it requires active authentication and passes through RLS
 * @param path - The file path in storage (e.g., "tenant_id/fatture/attive/commessa_id/file.pdf")
 * @returns A blob URL that can be used to display/download the file, or null if error
 */
export async function getSignedUrl(path: string | null): Promise<string | null> {
  if (!path) return null;

  try {
    const supabase = createClient();

    // Remove any leading slashes or "app-storage/" prefix
    const cleanPath = path.replace(/^\/+/, '').replace(/^app-storage\//, '');

    // Download the file as a blob (requires active authentication + RLS check)
    const { data, error } = await supabase.storage
      .from('app-storage')
      .download(cleanPath);

    if (error) {
      return null;
    }

    if (!data) {
      return null;
    }

    // Create a blob URL from the downloaded data
    // This URL is only valid in this browser session and can't be shared
    const blobUrl = URL.createObjectURL(data);
    return blobUrl;
  } catch {
    return null;
  }
}

/**
 * Get signed URLs for multiple files at once
 * @param paths - Array of file paths
 * @returns Array of signed URLs (null for failed ones)
 */
export async function getSignedUrls(paths: (string | null)[]): Promise<(string | null)[]> {
  const promises = paths.map(path => getSignedUrl(path));
  return Promise.all(promises);
}

/**
 * Clean up a blob URL when you're done with it
 * Important for memory management
 */
export function revokeBlobUrl(url: string | null) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
