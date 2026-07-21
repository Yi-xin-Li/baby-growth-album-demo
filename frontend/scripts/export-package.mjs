import { execFileSync } from "node:child_process";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import JSZip from "jszip";

const projectRoot = process.cwd();
const inputPath = path.resolve(projectRoot, process.argv[2] ?? "album.json");
const outputPath = path.resolve(projectRoot, process.argv[3] ?? "宝宝成长网站.zip");
const publicBuild = path.join(projectRoot, ".output", "public");
const serverBuild = path.join(projectRoot, ".output", "server");
const dataUrlPattern = /^data:([^;]+);base64,(.+)$/;

function extensionFor(mimeType) {
  return mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
}

function extractDataUrl(zip, value, targetWithoutExtension) {
  if (typeof value !== "string") return value;
  const match = value.match(dataUrlPattern);
  if (!match) return value;
  const target = `${targetWithoutExtension}.${extensionFor(match[1])}`;
  zip.file(target, Buffer.from(match[2], "base64"));
  return `./${target}`;
}

async function addDirectory(zip, source, destination = "网站文件") {
  for (const name of await readdir(source)) {
    const sourcePath = path.join(source, name);
    const destinationPath = `${destination}/${name}`;
    const fileStat = await stat(sourcePath);
    if (fileStat.isDirectory()) await addDirectory(zip, sourcePath, destinationPath);
    else zip.file(destinationPath, await readFile(sourcePath));
  }
}

const rawAlbum = JSON.parse(await readFile(inputPath, "utf8"));
if (/[A-Za-z]:\\(?:Users|Documents|Desktop)\\/i.test(JSON.stringify(rawAlbum))) {
  throw new Error("album.json 包含电脑绝对路径，已停止导出。请改用相对路径。");
}

if (process.platform === "win32") {
  execFileSync("cmd.exe", ["/d", "/s", "/c", "npm.cmd run build"], {
    cwd: projectRoot,
    stdio: "inherit",
  });
} else {
  execFileSync("npm", ["run", "build"], { cwd: projectRoot, stdio: "inherit" });
}

const zip = new JSZip();
zip.folder("media/thumbnails");
zip.folder("media/previews");
zip.folder("media/originals");
const album = structuredClone(rawAlbum);
for (const chapter of album.chapters ?? []) {
  for (const story of chapter.stories ?? []) {
    for (const [index, item] of (story.media ?? []).entries()) {
      if (item.type !== "image") continue;
      const baseName = `${chapter.id}-${story.id}-${item.id ?? index}`;
      item.thumbnail = extractDataUrl(zip, item.thumbnail, `media/thumbnails/${baseName}`);
      item.preview = extractDataUrl(zip, item.preview, `media/previews/${baseName}`);
      item.original = extractDataUrl(zip, item.original, `media/originals/${baseName}`);
      if (index === 0) story.cover = item.thumbnail;
    }
  }
}

zip.file("album.json", JSON.stringify(album, null, 2));
zip.file(
  "themes/manifest.json",
  JSON.stringify({ scrapbook: "奶油手账本", forest: "森林成长记", space: "星空冒险记" }, null, 2),
);
zip.file(
  "使用说明.txt",
  "1. 网站文件包含 public 与 server，是完整的 Cloudflare/Nitro 构建产物。\r\n2. album.json 是相册配置。\r\n3. media 中包含缩略图、预览图和高清图。\r\n4. 整个文件夹可复制到其他电脑，禁止单独移动 album.json。\r\n",
);
await addDirectory(zip, publicBuild, "网站文件/public");
await addDirectory(zip, serverBuild, "网站文件/server");
zip.file("网站文件/nitro.json", await readFile(path.join(projectRoot, ".output", "nitro.json")));
await writeFile(
  outputPath,
  await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" }),
);
console.log(`交付包已生成：${outputPath}`);
