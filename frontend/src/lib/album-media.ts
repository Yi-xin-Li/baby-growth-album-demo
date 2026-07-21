import type { ImageMedia, MediaItem, MediaStorage, Story } from "@/types/album";
import { resolveBackendAsset } from "@/lib/backend-api";

export const localMediaStorage: MediaStorage = {
  getThumbnail: (item) => item.thumbnail ?? item.preview ?? item.src ?? item.original ?? "",
  getPreview: (item) => item.preview ?? item.src ?? item.original ?? item.thumbnail ?? "",
  getOriginal: (item) => item.original ?? item.src ?? item.preview ?? item.thumbnail ?? "",
};

export function getImageSource(item: ImageMedia, size: "thumbnail" | "preview" | "original") {
  return resolveBackendAsset(
    localMediaStorage[
      size === "thumbnail" ? "getThumbnail" : size === "preview" ? "getPreview" : "getOriginal"
    ](item),
  );
}

export function getImageSrcSet(item: ImageMedia) {
  const thumbnail = resolveBackendAsset(localMediaStorage.getThumbnail(item));
  const preview = resolveBackendAsset(localMediaStorage.getPreview(item));
  if (!thumbnail || !preview || thumbnail.startsWith("data:") || preview.startsWith("data:")) {
    return undefined;
  }
  return `${thumbnail} 480w, ${preview} 1440w`;
}

export function getStoryMedia(story: Story): MediaItem[] {
  if (story.media?.length) {
    if (story.videoUrl && !story.media.some((item) => item.type === "video")) {
      return [
        {
          type: "video",
          poster: story.videoPoster ?? story.cover,
          videoUrl: story.videoUrl,
          alt: story.title,
        },
        ...story.media,
      ];
    }
    return story.media;
  }

  const media: MediaItem[] = story.videoUrl
    ? [
        {
          type: "video",
          poster: story.videoPoster ?? story.cover,
          videoUrl: story.videoUrl,
          alt: story.title,
        },
      ]
    : [{ type: "image", src: story.cover, alt: story.title }];
  media.push(...story.thumbs.map((src) => ({ type: "image" as const, src, alt: story.title })));

  for (let index = 0; index < story.extraCount; index += 1) {
    media.push({ type: "image", src: story.cover, alt: story.title });
  }

  return media;
}
