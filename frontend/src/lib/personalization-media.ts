const maxBackgroundBytes = 4 * 1024 * 1024;
const maxMusicBytes = 8 * 1024 * 1024;

function readAsDataUrl(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("文件读取失败，请重试"));
    reader.readAsDataURL(file);
  });
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("无法识别这张背景图片"));
    };
    image.src = url;
  });
}

export async function processBackground(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    throw new Error("背景仅支持 JPG、PNG 或 WebP");
  }
  if (file.size > maxBackgroundBytes) throw new Error("背景图片不能超过 4MB");

  const image = await loadImage(file);
  const scale = Math.min(1, 1600 / image.naturalWidth, 12000 / image.naturalHeight);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("浏览器无法处理这张背景图片");
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((resolve, reject) =>
    canvas.toBlob(
      (result) => (result ? resolve(result) : reject(new Error("背景压缩失败，请重试"))),
      "image/webp",
      0.86,
    ),
  );
  return readAsDataUrl(blob);
}

export async function processBackgroundMusic(file: File) {
  const isMp3 = file.type === "audio/mpeg" || file.name.toLowerCase().endsWith(".mp3");
  if (!isMp3) throw new Error("背景音乐仅支持 MP3");
  if (file.size > maxMusicBytes) throw new Error("背景音乐不能超过 8MB");
  return {
    source: await readAsDataUrl(file),
    name: file.name.replace(/\.mp3$/i, ""),
    volume: 0.3,
    loop: true,
  };
}
