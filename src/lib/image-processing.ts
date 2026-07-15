import imageCompression from "browser-image-compression";
import type { ImageMedia } from "@/types/album";

export const acceptedImageTypes = ["image/jpeg", "image/png", "image/webp"];
export const maxImagesPerStory = 20;
export const maxUploadBytes = 12 * 1024 * 1024;

function toDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("图片读取失败"));
    reader.readAsDataURL(file);
  });
}

export function validateImageFile(file: File) {
  if (!acceptedImageTypes.includes(file.type)) throw new Error("仅支持 JPG、PNG 和 WebP 图片");
  if (file.size > maxUploadBytes) throw new Error("单张图片不能超过 12MB");
}

export async function createImageVariants(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<ImageMedia> {
  validateImageFile(file);
  onProgress?.(5);

  const thumbnailBlob = await imageCompression(file, {
    maxSizeMB: 0.18,
    maxWidthOrHeight: 480,
    useWebWorker: true,
    fileType: "image/webp",
  });
  onProgress?.(35);
  const previewBlob = await imageCompression(file, {
    maxSizeMB: 0.8,
    maxWidthOrHeight: 1440,
    useWebWorker: true,
    fileType: "image/webp",
  });
  onProgress?.(68);
  const originalBlob = await imageCompression(file, {
    maxSizeMB: 2.2,
    maxWidthOrHeight: 2560,
    useWebWorker: true,
    fileType: "image/webp",
  });
  onProgress?.(82);

  const [thumbnail, preview, original] = await Promise.all([
    toDataUrl(thumbnailBlob),
    toDataUrl(previewBlob),
    toDataUrl(originalBlob),
  ]);
  onProgress?.(100);

  return {
    id: `media-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type: "image",
    thumbnail,
    preview,
    original,
    alt: file.name.replace(/\.[^.]+$/, ""),
  };
}
