import { motion } from "framer-motion";
import type { Chapter, Story } from "@/types/album";
import { SafeImage } from "./SafeImage";

type ChapterTimelineProps = {
  chapter: Chapter;
  onBack: () => void;
  onOpenStory: (story: Story, storyIndex: number) => void;
};

export function ChapterTimeline({ chapter, onBack, onOpenStory }: ChapterTimelineProps) {
  return (
    <motion.section
      key={chapter.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="min-h-screen px-5 pt-20 pb-16"
      style={{ background: "var(--story-bg)" }}
    >
      <div className="max-w-md mx-auto">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-1 text-xs px-3 py-1.5 rounded-full bg-white/90 shadow-sm hover:bg-white"
        >
          ← 返回目录
        </button>
        <div className="flex items-center gap-4 mt-7">
          <div
            className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-black/80 shadow-[3px_3px_0_rgba(0,0,0,0.15)] shrink-0"
            style={{ background: chapter.bg }}
          >
            <SafeImage
              src={chapter.icon}
              alt={chapter.title}
              fallbackLabel={chapter.title}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <p className="text-[10px] tracking-[0.3em] text-neutral-400">CHAPTER</p>
            <h2 className="mt-1 text-2xl font-bold tracking-[0.2em]">{chapter.title}</h2>
            <p className="text-xs text-neutral-500 mt-1 tracking-wider">{chapter.age}</p>
          </div>
        </div>
        <div className="relative mt-10 pl-8">
          <div
            className="absolute left-3 top-2 bottom-2 border-l-2 border-dashed"
            style={{ borderColor: "var(--note-line)" }}
          />
          {chapter.stories.map((story, index) => (
            <motion.button
              key={story.id}
              type="button"
              onClick={() => onOpenStory(story, index)}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.15 + index * 0.1 }}
              className="relative block w-full text-left mb-8 last:mb-0 rounded-2xl bg-white/45 p-3 hover:bg-white/70 transition-colors"
            >
              <div
                className="absolute -left-[30px] top-3 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                style={{ background: chapter.bg }}
              >
                {chapter.smallIcon}
              </div>
              <div className="mb-2">
                <p className="text-sm font-bold">{story.title}</p>
                <p className="text-[11px] text-neutral-400">{story.date}</p>
              </div>
              <div className="flex gap-2">
                <div className="relative w-2/3 aspect-[4/3] rounded-xl overflow-hidden shadow-sm">
                  <SafeImage
                    src={story.cover}
                    alt={story.title}
                    fallbackLabel={story.title}
                    loading="lazy"
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2 right-2 bg-white/90 text-[10px] px-2 py-0.5 rounded-full">
                    ▶ 回忆
                  </span>
                </div>
                <div className="flex flex-col gap-1 w-1/3">
                  {story.thumbs.slice(0, 1).map((thumb) => (
                    <SafeImage
                      key={thumb}
                      src={thumb}
                      alt=""
                      loading="lazy"
                      className="w-full aspect-square rounded-md object-cover"
                    />
                  ))}
                  {story.extraCount > 0 && (
                    <div className="w-full aspect-square rounded-md bg-neutral-200/80 flex items-center justify-center text-sm font-bold text-neutral-600">
                      +{story.extraCount}
                    </div>
                  )}
                </div>
              </div>
              <p
                className="mt-3 text-xs leading-relaxed text-neutral-700 whitespace-pre-line line-clamp-2"
                style={{ fontFamily: "'Long Cang', cursive" }}
              >
                {story.note}
              </p>
            </motion.button>
          ))}
        </div>
      </div>
    </motion.section>
  );
}
