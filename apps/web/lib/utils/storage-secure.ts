import { createClient } from '@/lib/supabase/client';

/**
 * Download a private file from storage with authentication
 * This bypasses the public URL system entirely
 * @param path - The file path in storage
 * @returns Blob URL that can be used to display/download the file
 */
export async function getAuthenticatedFileUrl(path: string | null): Promise<string | null> {
  if (!path) return null;

  try {
    const supabase = createClient();

    // Remove any leading slashes or "app-storage/" prefix
    const cleanPath = path.replace(/^\/+/, '').replace(/^app-storage\//, '');

    // Download the file as a blob (requires authentication)
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
    const blobUrl = URL.createObjectURL(data);
    return blobUrl;
  } catch {
    return null;
  }
}

/**
 * Clean up a blob URL created by getAuthenticatedFileUrl
 * Call this when you're done with the URL to free memory
 */
export function revokeBlobUrl(url: string | null) {
  if (url && url.startsWith('blob:')) {
    URL.revokeObjectURL(url);
  }
}
