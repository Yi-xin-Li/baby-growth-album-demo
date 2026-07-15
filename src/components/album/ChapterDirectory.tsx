import { forwardRef } from "react";
import decroBaby from "@/assets/decro_baby.png.asset.json";
import type { Chapter } from "@/types/album";
import { ChapterCard } from "./ChapterCard";
import { SafeImage } from "./SafeImage";

type ChapterDirectoryProps = { chapters: Chapter[]; onOpen: (chapterId: string) => void };

export const ChapterDirectory = forwardRef<HTMLElement, ChapterDirectoryProps>(
  function ChapterDirectory({ chapters, onOpen }, ref) {
    return (
      <section
        ref={ref}
        className="relative px-5 pt-16 pb-20"
        style={{ background: "var(--chapter-bg)" }}
      >
        <SafeImage
          src={decroBaby.url}
          alt=""
          className="absolute -top-12 right-4 w-24 select-none pointer-events-none object-contain"
        />
        <div className="max-w-md mx-auto text-center">
          <p className="text-[11px] tracking-[0.35em] text-neutral-500">GROWING CHAPTERS</p>
          <h2 className="mt-2 text-xl font-bold tracking-[0.25em]">成长章节</h2>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-7 max-w-md mx-auto mt-10 sm:grid-cols-3">
          {chapters.map((chapter) => (
            <ChapterCard key={chapter.id} chapter={chapter} onOpen={onOpen} />
          ))}
        </div>
      </section>
    );
  },
);
