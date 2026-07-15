import type { MediaItem, Story } from "@/types/album";

export function getStoryMedia(story: Story): MediaItem[] {
  if (story.media?.length) return story.media;

  const media: MediaItem[] = [
    { type: "video", poster: story.cover, videoUrl: story.videoUrl, alt: story.title },
    ...story.thumbs.map((src) => ({ type: "image" as const, src, alt: story.title })),
  ];

  for (let index = 0; index < story.extraCount; index += 1) {
    media.push({ type: "image", src: story.cover, alt: story.title });
  }

  return media;
}
