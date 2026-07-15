import { createImageVariants } from "@/lib/image-processing";

const illustrationTypes = ["image/png", "image/webp", "image/svg+xml"];

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("插画读取失败"));
    reader.readAsDataURL(file);
  });
}

export async function processIllustration(file: File) {
  if (!illustrationTypes.includes(file.type)) throw new Error("插画仅支持 PNG、WebP 或 SVG");
  if (file.size > 4 * 1024 * 1024) throw new Error("插画文件不能超过 4MB");
  if (file.type === "image/svg+xml") return fileToDataUrl(file);
  const variants = await createImageVariants(file);
  return variants.preview ?? variants.original ?? "";
}
