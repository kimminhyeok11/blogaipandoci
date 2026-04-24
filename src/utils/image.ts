import imageCompression from 'browser-image-compression';

export interface CompressImageOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
  fileType?: string;
}

export const compressImage = async (
  file: File,
  options: CompressImageOptions = {}
): Promise<File> => {
  const defaultOptions = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
    fileType: 'image/webp',
    ...options,
  };

  try {
    const compressedFile = await imageCompression(file, defaultOptions);
    return compressedFile;
  } catch (error) {
    console.error('Image compression failed:', error);
    return file;
  }
};

export const convertToWebP = async (file: File): Promise<File> => {
  if (file.type === 'image/webp') return file;

  return compressImage(file, {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    fileType: 'image/webp',
  });
};

export const generateSlug = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 200);
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};
