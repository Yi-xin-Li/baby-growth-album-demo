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
      className="flex flex-col items-center gap-2"
    >
      <div
        className="w-full aspect-square rounded-2xl overflow-hidden border-2 border-black/80 shadow-[3px_3px_0_rgba(0,0,0,0.15)]"
        style={{ background: chapter.bg }}
      >
        <SafeImage
          src={chapter.icon}
          alt={chapter.title}
          fallbackLabel={chapter.title}
          className="w-full h-full object-cover"
        />
      </div>
      <div className="text-center">
        <p className="text-[15px] font-bold tracking-wider">{chapter.title}</p>
        <p className="text-[11px] text-neutral-500 mt-0.5">{chapter.age}</p>
      </div>
    </motion.button>
  );
}
