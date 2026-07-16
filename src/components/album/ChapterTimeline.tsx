import { motion, useScroll, useSpring } from "framer-motion";
import { CalendarDays, ChevronLeft, ChevronRight, Images, MoveLeft } from "lucide-react";
import { useRef } from "react";
import type { AlbumTheme } from "@/themes/album-themes";
import type { Chapter, Story } from "@/types/album";
import { SafeImage } from "./SafeImage";
import { ThemeArtwork } from "./ThemeArtwork";

type ChapterTimelineProps = {
  chapter: Chapter;
  chapters: Chapter[];
  theme: AlbumTheme;
  onBack: () => void;
  onSelectChapter: (chapterId: string) => void;
  onOpenStory: (story: Story, storyIndex: number) => void;
};

export function ChapterTimeline({
  chapter,
  chapters,
  theme,
  onBack,
  onSelectChapter,
  onOpenStory,
}: ChapterTimelineProps) {
  const timelineRef = useRef<HTMLDivElement | null>(null);
  const chapterIndex = chapters.findIndex((item) => item.id === chapter.id);
  const previousChapter = chapterIndex > 0 ? chapters[chapterIndex - 1] : null;
  const nextChapter = chapterIndex >= 0 ? (chapters[chapterIndex + 1] ?? null) : null;
  const { scrollYProgress } = useScroll({
    target: timelineRef,
    offset: ["start 80%", "end 55%"],
  });
  const lineProgress = useSpring(scrollYProgress, { stiffness: 90, damping: 24 });

  return (
    <motion.section
      key={chapter.id}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
      className="relative min-h-screen overflow-hidden px-5 pb-16 pt-20"
      style={{ background: "var(--story-bg)" }}
    >
      <ThemeArtwork theme={theme} className="absolute inset-x-0 top-16 h-36 opacity-40" />
      <div className="relative mx-auto max-w-lg">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-xs shadow-sm hover:bg-white"
          >
            <MoveLeft className="size-3.5" /> 返回目录
          </button>
          <div className="ml-auto flex min-w-0 items-center gap-1 rounded-full bg-white/70 p-1 shadow-sm">
            <button
              type="button"
              disabled={!previousChapter}
              onClick={() => previousChapter && onSelectChapter(previousChapter.id)}
              aria-label="上一章节"
              className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white disabled:cursor-not-allowed disabled:opacity-25"
            >
              <ChevronLeft className="size-4" />
            </button>
            <select
              aria-label="选择章节"
              value={chapter.id}
              onChange={(event) => onSelectChapter(event.target.value)}
              className="min-w-0 max-w-28 bg-transparent px-1 text-xs font-bold outline-none"
            >
              {chapters.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.title}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!nextChapter}
              onClick={() => nextChapter && onSelectChapter(nextChapter.id)}
              aria-label="下一章节"
              className="grid size-8 shrink-0 place-items-center rounded-full hover:bg-white disabled:cursor-not-allowed disabled:opacity-25"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
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
            <p className="mt-2 text-[11px] text-neutral-400">
              共 {chapter.stories.length} 篇回忆 · 点击卡片翻阅完整故事
            </p>
          </div>
        </div>
        <div ref={timelineRef} className="relative mt-10 pl-9">
          <div
            className="absolute left-3 top-2 bottom-2 border-l-2 border-dashed"
            style={{ borderColor: "var(--note-line)" }}
          />
          <motion.div
            className="absolute bottom-2 left-[11px] top-2 w-1 origin-top rounded-full"
            style={{ scaleY: lineProgress, background: theme.swatches[1] }}
          />
          {chapter.stories.map((story, index) => {
            const mediaCount = 1 + story.thumbs.length + story.extraCount;
            return (
              <motion.button
                data-testid={`story-${story.id}`}
                key={story.id}
                type="button"
                onClick={() => onOpenStory(story, index)}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: theme.motion.timelineDuration * 0.55,
                  delay: 0.12 + index * 0.1,
                }}
                whileHover={{ y: -3 }}
                className="group relative mb-8 block w-full rounded-3xl border border-white/60 bg-white/55 p-3 text-left shadow-[0_12px_35px_rgba(80,60,40,0.06)] backdrop-blur-sm transition-colors last:mb-0 hover:bg-white/80"
              >
                <div
                  className="absolute -left-[30px] top-3 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{ background: chapter.bg }}
                >
                  <SafeImage
                    src={theme.illustrations.timelineMarker}
                    alt=""
                    className="size-6 rounded-full object-contain"
                  />
                </div>
                <div className="mb-3 flex items-start justify-between gap-3 px-1 pt-1">
                  <div>
                    <p className="text-sm font-bold">{story.title}</p>
                    <p className="mt-1 inline-flex items-center gap-1 text-[11px] text-neutral-400">
                      <CalendarDays className="size-3" /> {story.date}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-white/75 px-2 py-1 text-[9px] text-neutral-500">
                    <Images className="size-3" /> {mediaCount}
                  </span>
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
                      查看回忆 →
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
                  className="mt-3 line-clamp-2 whitespace-pre-line px-1 text-xs leading-relaxed text-neutral-700"
                  style={{ fontFamily: "'Long Cang', cursive" }}
                >
                  {story.note}
                </p>
                <span className="mt-3 block px-1 pb-1 text-[10px] font-bold tracking-wider text-neutral-400 transition-colors group-hover:text-neutral-600">
                  打开这一页成长故事
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </motion.section>
  );
}
