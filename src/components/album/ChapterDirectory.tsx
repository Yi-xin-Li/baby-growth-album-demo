import { forwardRef } from "react";
import type { AlbumTheme } from "@/themes/album-themes";
import type { Chapter } from "@/types/album";
import { ChapterCard } from "./ChapterCard";
import { SafeImage } from "./SafeImage";
import { ThemeArtwork } from "./ThemeArtwork";

type ChapterDirectoryProps = {
  chapters: Chapter[];
  theme: AlbumTheme;
  onOpen: (chapterId: string) => void;
};

export const ChapterDirectory = forwardRef<HTMLElement, ChapterDirectoryProps>(
  function ChapterDirectory({ chapters, theme, onOpen }, ref) {
    const storyCount = chapters.reduce((total, chapter) => total + chapter.stories.length, 0);
    return (
      <section
        ref={ref}
        className="relative px-5 pt-16 pb-20"
        style={{ background: "var(--chapter-bg)" }}
      >
        <SafeImage
          src={theme.illustrations.coverDecoration}
          alt=""
          className="absolute -top-12 right-4 w-24 select-none pointer-events-none object-contain"
        />
        <ThemeArtwork theme={theme} className="absolute inset-x-0 top-3 h-32 opacity-45" />
        <div className="relative mx-auto max-w-md text-center">
          <p className="text-[11px] tracking-[0.35em] text-neutral-500">GROWING CHAPTERS</p>
          <h2 className="mt-2 text-xl font-bold tracking-[0.25em]">成长章节</h2>
          <p className="mx-auto mt-4 max-w-xs text-xs leading-6 text-neutral-500">
            从第一次睁眼，到每一次勇敢探索。这里收好了 {chapters.length} 个章节、{storyCount}
            个小故事。
          </p>
        </div>
        <div className="relative mx-auto mt-10 grid max-w-md grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3">
          {chapters.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} theme={theme} onOpen={onOpen} />
          ))}
        </div>
      </section>
    );
  },
);
