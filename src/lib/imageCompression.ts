import imageCompression from 'browser-image-compression';

/**
 * Compress an image file before upload to reduce bandwidth.
 * Skips files smaller than 500KB.
 * Targets ~500KB output at max 2048px dimension.
 */
export async function compressImage(file: File): Promise<File> {
  // Skip compression for small files
  if (file.size < 500 * 1024) return file;

  // Skip non-image files
  if (!file.type.startsWith('image/')) return file;

  const options = {
    maxSizeMB: 0.5,
    maxWidthOrHeight: 2048,
    useWebWorker: true,
    fileType: 'image/jpeg' as const,
  };

  try {
    const compressed = await imageCompression(file, options);
    console.log(
      `Compressed ${file.name}: ${(file.size / 1024).toFixed(0)}KB → ${(compressed.size / 1024).toFixed(0)}KB`
    );
    return compressed;
  } catch (error) {
    console.warn('Image compression failed, using original:', error);
    return file;
  }
}
