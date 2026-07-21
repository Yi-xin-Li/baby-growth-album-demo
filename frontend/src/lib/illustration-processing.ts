import { createImageVariants } from "@/lib/image-processing";

const illustrationTypes = ["image/jpeg", "image/png", "image/webp", "image/svg+xml", "image/avif"];

const illustrationExtensions: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  svg: "image/svg+xml",
  avif: "image/avif",
};

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("插画读取失败"));
    reader.readAsDataURL(file);
  });
}

async function sanitizeSvg(file: File) {
  const documentNode = new DOMParser().parseFromString(await file.text(), "image/svg+xml");
  const root = documentNode.documentElement;
  if (root.tagName.toLowerCase() !== "svg" || documentNode.querySelector("parsererror")) {
    throw new Error("SVG 文件内容无效");
  }

  documentNode
    .querySelectorAll("script, foreignObject, iframe, object, embed, style, link")
    .forEach((node) => node.remove());
  documentNode.querySelectorAll("*").forEach((node) => {
    Array.from(node.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();
      const isExternalReference =
        (name === "href" || name === "xlink:href" || name === "src") &&
        !value.startsWith("#") &&
        !value.startsWith("data:image/");
      if (
        name.startsWith("on") ||
        isExternalReference ||
        value.startsWith("javascript:") ||
        (name === "style" && value.includes("url("))
      ) {
        node.removeAttribute(attribute.name);
      }
    });
  });

  return fileToDataUrl(
    new Blob([new XMLSerializer().serializeToString(documentNode)], { type: "image/svg+xml" }),
  );
}

async function convertAvifToWebp(file: File) {
  const image = new Image();
  const url = URL.createObjectURL(file);
  try {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("当前浏览器无法解析这张 AVIF 插画"));
      image.src = url;
    });
    const scale = Math.min(1, 1600 / image.naturalWidth, 1600 / image.naturalHeight);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("浏览器无法转换这张 AVIF 插画");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (result) => (result ? resolve(result) : reject(new Error("AVIF 插画转换失败"))),
        "image/webp",
        0.9,
      ),
    );
    return new File([blob], file.name.replace(/\.avif$/i, ".webp"), { type: "image/webp" });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function processIllustration(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const type = file.type || illustrationExtensions[extension] || "";
  if (!illustrationTypes.includes(type)) {
    throw new Error("插画仅支持 JPG、PNG、WebP、SVG 或 AVIF");
  }
  if (file.size > 4 * 1024 * 1024) throw new Error("插画文件不能超过 4MB");
  const normalizedFile =
    file.type === type
      ? file
      : new File([file], file.name, { type, lastModified: file.lastModified });
  if (type === "image/svg+xml") return sanitizeSvg(normalizedFile);
  const rasterFile =
    type === "image/avif" ? await convertAvifToWebp(normalizedFile) : normalizedFile;
  const variants = await createImageVariants(rasterFile);
  return variants.preview ?? variants.original ?? "";
}
