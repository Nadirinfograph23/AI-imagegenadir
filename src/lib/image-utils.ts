'use client';

const MAX_FILE_SIZE = 1 * 1024 * 1024; // 1MB
const MAX_DIMENSION = 1024;

export async function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let { width, height } = img;

        // Resize if too large
        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
          const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);

        // Compress to JPEG with quality reduction
        let quality = 0.8;
        let dataUrl = canvas.toDataURL('image/jpeg', quality);

        // Further reduce quality if still too large
        while (dataUrl.length > MAX_FILE_SIZE * 1.37 && quality > 0.1) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL('image/jpeg', quality);
        }

        // Extract base64 data (remove data:image/jpeg;base64, prefix)
        const base64 = dataUrl.split(',')[1];
        resolve(base64);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

export function validateFile(file: File): string | null {
  const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!validTypes.includes(file.type)) {
    return 'Please upload a valid image file (JPEG, PNG, WebP, or GIF)';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'File size must be less than 5MB (will be compressed to 1MB)';
  }
  return null;
}
