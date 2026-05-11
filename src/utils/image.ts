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
  } catch {
    // 이미지 압축 실패 시 원본 반환
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
  const slug = text
    .trim()
    // 특수문자 제거 (한글, 영문, 숫자, 공백, 하이픈은 유지)
    .replace(/[^\uAC00-\uD7AF\u1100-\u11FF\u3130-\u318F\u3040-\u309F\u30A0-\u30FF\w\s-]/g, '')
    // 공백을 하이픈으로 변환
    .replace(/\s+/g, '-')
    // 연속된 하이픈 제거
    .replace(/-+/g, '-')
    // 앞뒤 하이픈 제거
    .replace(/^-+|-+$/g, '')
    .substring(0, 20);
  
  // slug가 비어있거나 너무 짧은 경우 (한글만 있거나 특수문자만 제거된 경우)
  if (slug.length < 2) {
    // 원문에서 영문/숫자 추출 시도
    const fallback = text
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .substring(0, 20);
    
    if (fallback.length >= 2) {
      return fallback;
    }
    
    // 그래도 없으면 "post" + timestamp 반환
    return `post-${Date.now().toString(36).slice(-8)}`;
  }
  
  return slug;
};

export const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export const stripHtml = (html: string): string => {
  return html.replace(/<[^>]*>/g, '');
};
