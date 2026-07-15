import { motion } from "framer-motion";
import type { Chapter } from "@/types/album";
import { SafeImage } from "./SafeImage";

type ChapterCardProps = {
  chapter: Chapter;
  onOpen: (chapterId: string) => void;
};

export function ChapterCard({ chapter, onOpen }: ChapterCardProps) {
  return (
    <motion.button
      type="button"
      onClick={() => onOpen(chapter.id)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.97 }}
      className="group flex flex-col items-center gap-2"
    >
      <div
        className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-black/80 shadow-[3px_3px_0_rgba(0,0,0,0.15)] transition-shadow group-hover:shadow-[6px_6px_0_rgba(0,0,0,0.12)]"
        style={{ background: chapter.bg }}
      >
        <SafeImage
          src={chapter.icon}
          alt={chapter.title}
          fallbackLabel={chapter.title}
          className="w-full h-full object-cover"
        />
        <span className="absolute bottom-2 right-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-bold shadow-sm">
          {chapter.stories.length} 篇
        </span>
      </div>
      <div className="text-center">
        <p className="text-[15px] font-bold tracking-wider">{chapter.title}</p>
        <p className="text-[11px] text-neutral-500 mt-0.5">{chapter.age}</p>
        <span className="mt-1 block text-[10px] text-neutral-400 opacity-0 transition-opacity group-hover:opacity-100">
          翻开章节 →
        </span>
      </div>
    </motion.button>
  );
}
