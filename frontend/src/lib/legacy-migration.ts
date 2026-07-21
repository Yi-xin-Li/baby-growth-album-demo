import { getImageSource } from "@/lib/album-media";
import { uploadBackendAsset, uploadBackendPhoto } from "@/lib/backend-api";
import type { GrowthAlbum, ImageMedia } from "@/types/album";

function isDataUrl(value?: string): value is string {
  return Boolean(value?.startsWith("data:"));
}

function dataUrlToFile(value: string, name: string): File {
  const [header, encoded] = value.split(",", 2);
  const mimeType = header.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const bytes = Uint8Array.from(atob(encoded), (character) => character.charCodeAt(0));
  const extension = mimeType.split("/")[1]?.replace("jpeg", "jpg") || "bin";
  return new File([bytes], `${name}.${extension}`, { type: mimeType });
}

export async function migrateLegacyAlbum(
  source: GrowthAlbum,
  onProgress?: (progress: number) => void,
): Promise<GrowthAlbum> {
  const album = structuredClone(source);
  const jobs =
    album.chapters.reduce(
      (count, chapter) =>
        count + chapter.stories.reduce((total, story) => total + (story.media?.length ?? 0), 0),
      0,
    ) +
    Object.values(album.customIllustrations ?? {}).filter(isDataUrl).length +
    Number(isDataUrl(album.customBackground)) +
    Number(isDataUrl(album.backgroundMusic?.source));
  let completed = 0;
  const advance = () => onProgress?.(jobs ? Math.round((++completed / jobs) * 100) : 100);

  for (const chapter of album.chapters) {
    if (isDataUrl(chapter.icon)) {
      chapter.icon = (
        await uploadBackendAsset(album.id, "illustration", dataUrlToFile(chapter.icon, chapter.id))
      ).source;
    }
    for (const story of chapter.stories) {
      if (!story.media?.length) continue;
      const migrated = [];
      for (const item of story.media) {
        if (item.type !== "image") {
          migrated.push(item);
          continue;
        }
        const bestSource = item.original ?? item.preview ?? item.src ?? item.thumbnail;
        if (!isDataUrl(bestSource)) {
          migrated.push(item);
          advance();
          continue;
        }
        const uploaded = await uploadBackendPhoto(
          album,
          dataUrlToFile(bestSource, item.alt || item.id || "photo"),
        );
        migrated.push(uploaded);
        advance();
      }
      story.media = migrated;
      const images = migrated.filter((item): item is ImageMedia => item.type === "image");
      if (images.length) {
        story.cover = getImageSource(images[0], "thumbnail");
        story.thumbs = images.map((item) => getImageSource(item, "thumbnail"));
      }
    }
  }

  if (isDataUrl(album.customBackground)) {
    album.customBackground = (
      await uploadBackendAsset(
        album.id,
        "background",
        dataUrlToFile(album.customBackground, "background"),
      )
    ).source;
    advance();
  }
  if (isDataUrl(album.backgroundMusic?.source) && album.backgroundMusic) {
    album.backgroundMusic.source = (
      await uploadBackendAsset(
        album.id,
        "music",
        dataUrlToFile(album.backgroundMusic.source, album.backgroundMusic.name || "music"),
      )
    ).source;
    advance();
  }
  for (const [slot, value] of Object.entries(album.customIllustrations ?? {})) {
    if (!isDataUrl(value)) continue;
    album.customIllustrations![slot as keyof typeof album.customIllustrations] = (
      await uploadBackendAsset(album.id, "illustration", dataUrlToFile(value, slot))
    ).source;
    advance();
  }
  onProgress?.(100);
  return album;
}
