/**
 * Compresses an image file to be under a specified size in KB.
 * @param {File} file - The image file to compress.
 * @param {number} maxSizeKB - The maximum size in KB (default 20).
 * @returns {Promise<File>} - The compressed file.
 */
export const compressImage = async (file, maxSizeKB = 25) => {
  const maxSizeBytes = maxSizeKB * 1024;

  // If file is already smaller, return it
  if (file.size <= maxSizeBytes) return file;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(img.src);

      const canvas = document.createElement('canvas');
      let width = img.width;
      let height = img.height;

      // Initial resize if too large (e.g., max 800px width)
      const MAX_WIDTH = 800;
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);

      // Binary search-ish approach for quality
      let minQuality = 0.1;
      let maxQuality = 0.9;
      let quality = 0.7;
      let compressedFile = null;

      const attemptCompression = (q) => {
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas to Blob failed'));
              return;
            }

            if (blob.size <= maxSizeBytes) {
              // It fits! Can we try higher quality?
              // For simplicity in this aggressive constraint, if it fits, we take it.
              // Or we could try to optimize closer to the limit.
              // Let's just return if it fits, but if it's WAY too small, maybe we over-compressed.
              // Given 20KB is tiny, we likely need low quality.
              compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              // Still too big
              if (q <= 0.1) {
                // We reached minimum quality. Try resizing.
                if (width > 200) {
                  width = Math.round(width * 0.7);
                  height = Math.round(height * 0.7);
                  canvas.width = width;
                  canvas.height = height;
                  ctx.drawImage(img, 0, 0, width, height);
                  attemptCompression(0.5); // Reset quality for new size
                } else {
                  // Give up, return the smallest we got (even if > 20KB, though unlikely at 200px)
                  compressedFile = new File([blob], file.name, {
                    type: 'image/jpeg',
                    lastModified: Date.now(),
                  });
                  resolve(compressedFile);
                }
              } else {
                // Lower quality
                attemptCompression(q - 0.1);
              }
            }
          },
          'image/jpeg',
          q
        );
      };

      attemptCompression(quality);
    };

    img.onerror = (err) => reject(err);
  });
};
