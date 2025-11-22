import { createClient } from '@/lib/supabase/client';

/**
 * Compress and resize an image file
 * Converts to WebP format for optimal quality/size ratio
 * @param file - The image file to compress
 * @param maxWidth - Maximum width in pixels (default: 800)
 * @param maxHeight - Maximum height in pixels (default: 800)
 * @param quality - Quality from 0 to 1 (default: 0.85)
 * @returns Compressed image as Blob
 */
export async function compressImage(
  file: File,
  maxWidth: number = 800,
  maxHeight: number = 800,
  quality: number = 0.85
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();

      img.onload = () => {
        // Calculate new dimensions maintaining aspect ratio
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = (height * maxWidth) / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = (width * maxHeight) / height;
            height = maxHeight;
          }
        }

        // Create canvas and draw resized image
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        // Use high-quality image rendering
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Convert to WebP blob
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Failed to compress image'));
            }
          },
          'image/webp',
          quality
        );
      };

      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Upload an avatar image for a dipendente
 * Automatically compresses and converts to WebP format
 * @param file - The image file to upload
 * @param tenantId - The tenant ID
 * @param dipendenteId - The dipendente ID
 * @returns The storage path of the uploaded file
 */
export async function uploadDipendenteAvatar(
  file: File,
  tenantId: string,
  dipendenteId: string
): Promise<string> {
  try {
    // Compress image to WebP format (300x300 for avatars)
    const compressedBlob = await compressImage(file, 300, 300, 0.9);

    // Create file path: {tenant_id}/avatars/dipendenti/{dipendente_id}.webp
    const filePath = `${tenantId}/avatars/dipendenti/${dipendenteId}.webp`;

    const supabase = createClient();

    // Delete old avatar if exists
    await supabase.storage.from('app-storage').remove([filePath]);

    // Upload new avatar
    const { error: uploadError } = await supabase.storage
      .from('app-storage')
      .upload(filePath, compressedBlob, {
        contentType: 'image/webp',
        upsert: true,
      });

    if (uploadError) {
      throw uploadError;
    }

    return filePath;
  } catch (error) {
    console.error('Error uploading avatar:', error);
    throw new Error('Failed to upload avatar');
  }
}

/**
 * Delete a dipendente avatar
 * @param tenantId - The tenant ID
 * @param dipendenteId - The dipendente ID
 */
export async function deleteDipendenteAvatar(
  tenantId: string,
  dipendenteId: string
): Promise<void> {
  try {
    const filePath = `${tenantId}/avatars/dipendenti/${dipendenteId}.webp`;
    const supabase = createClient();

    const { error } = await supabase.storage.from('app-storage').remove([filePath]);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error deleting avatar:', error);
    throw new Error('Failed to delete avatar');
  }
}

/**
 * Get avatar URL for display
 * @param avatarPath - The storage path
 * @returns Public URL or signed URL
 */
export async function getAvatarUrl(avatarPath: string | null): Promise<string | null> {
  if (!avatarPath) return null;

  try {
    const supabase = createClient();

    // Since bucket is public, we can use getPublicUrl
    const { data } = supabase.storage.from('app-storage').getPublicUrl(avatarPath);

    return data.publicUrl;
  } catch {
    return null;
  }
}
