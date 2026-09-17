import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { app } from './firebase';

/**
 * Storage and Media handling for Tenant Public Interface (Banners & Ads)
 */

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates uploaded image file size and type
 */
export function validateImageFile(file: File, maxSizeBytes: number = 5 * 1024 * 1024): ImageValidationResult {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: 'صيغة الملف غير مدعومة. يرجى رفع صورة بصيغة JPG أو PNG أو WEBP.',
    };
  }

  if (file.size > maxSizeBytes) {
    const sizeInMB = (maxSizeBytes / (1024 * 1024)).toFixed(0);
    return {
      valid: false,
      error: `حجم الصورة يتجاوز الحد المسموح به (${sizeInMB} ميغابايت).`,
    };
  }

  return { valid: true };
}

/**
 * Converts and compresses File to an optimized Base64 Data URL
 * Ensures fast loading, zero network hang, and compact storage in Firestore documents (<100KB)
 */
export async function compressImage(
  file: File,
  maxWidth: number = 1400,
  maxHeight: number = 700,
  quality: number = 0.82
): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(event.target?.result as string);
          return;
        }

        // Draw with high quality smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as webp or jpeg
        try {
          const webpDataUrl = canvas.toDataURL('image/webp', quality);
          if (webpDataUrl && webpDataUrl.startsWith('data:image/webp')) {
            resolve(webpDataUrl);
            return;
          }
        } catch {
          // Fallback to jpeg
        }
        const jpegDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve(jpegDataUrl);
      };
      img.onerror = () => reject(new Error('فشل معالجة وقراءة ملف الصورة'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('فشل قراءة الملف من الجهاز'));
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads media file to Firebase Storage under tenant directory with fast resilient fallback to compressed DataURL
 */
export async function uploadTenantMedia(
  file: File,
  tenantId: string,
  folder: 'banners' | 'ads' = 'banners'
): Promise<string> {
  const validation = validateImageFile(file);
  if (!validation.valid) {
    throw new Error(validation.error || 'الملف غير صالح');
  }

  // 1. Instantly prepare optimized compressed version
  const maxWidth = folder === 'banners' ? 1400 : 800;
  const maxHeight = folder === 'banners' ? 650 : 800;
  const compressedDataUrl = await compressImage(file, maxWidth, maxHeight, 0.82);

  // 2. Try Firebase Storage with a strict 2.5-second timeout race
  try {
    const storagePromise = (async () => {
      const storage = getStorage(app);
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `tenants/${tenantId || 'general'}/${folder}/${Date.now()}_${sanitizedName}`;
      const storageRef = ref(storage, storagePath);

      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type,
        customMetadata: {
          tenantId: tenantId || 'general',
          uploadedAt: new Date().toISOString(),
        },
      });

      return await getDownloadURL(snapshot.ref);
    })();

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Storage Timeout')), 2500)
    );

    const downloadUrl = await Promise.race([storagePromise, timeoutPromise]);
    return downloadUrl;
  } catch (error) {
    console.warn('Firebase Storage upload notice (timeout/cors), switching to instant compressed DataURL:', error);
    // Instant fallback to compressed data URL so the user is never stuck
    return compressedDataUrl;
  }
}

/**
 * Parses any YouTube URL and extracts the 11-character video ID
 */
export function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  const cleanUrl = url.trim();

  // Handle standard youtu.be shortlinks
  const shortMatch = cleanUrl.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
  if (shortMatch && shortMatch[1]) return shortMatch[1];

  // Handle youtube.com/watch?v=
  const watchMatch = cleanUrl.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
  if (watchMatch && watchMatch[1]) return watchMatch[1];

  // Handle youtube.com/embed/
  const embedMatch = cleanUrl.match(/embed\/([a-zA-Z0-9_-]{11})/);
  if (embedMatch && embedMatch[1]) return embedMatch[1];

  // Handle youtube.com/shorts/
  const shortsMatch = cleanUrl.match(/shorts\/([a-zA-Z0-9_-]{11})/);
  if (shortsMatch && shortsMatch[1]) return shortsMatch[1];

  // Direct 11-char ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(cleanUrl)) {
    return cleanUrl;
  }

  return null;
}

/**
 * Retrieves high quality YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string): string {
  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

/**
 * Generates privacy-enhanced YouTube embed player URL
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`;
}
