import { AnimatePresence, motion } from "framer-motion";
import { getImageSource, getImageSrcSet } from "@/lib/album-media";
import type { Chapter, MediaItem, Story } from "@/types/album";
import { SafeImage } from "./SafeImage";

type StoryDetailModalProps = {
  chapter: Chapter | null;
  story: Story | null;
  media: MediaItem[];
  onClose: () => void;
  onNext: () => void;
  onOpenMedia: (index: number) => void;
};

export function StoryDetailModal({
  chapter,
  story,
  media,
  onClose,
  onNext,
  onOpenMedia,
}: StoryDetailModalProps) {
  const first = media[0];
  const firstSource =
    first?.type === "video" ? first.poster : first ? getImageSource(first, "preview") : undefined;

  return (
    <AnimatePresence>
      {chapter && story && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.article
            data-testid="story-detail"
            key={story.id}
            initial={{ y: "100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "100%", opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full sm:max-w-md h-[92dvh] sm:h-[88vh] rounded-t-3xl sm:rounded-3xl overflow-y-auto shadow-2xl"
            style={{ background: "var(--modal-paper, var(--paper))" }}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex justify-between bg-[linear-gradient(to_bottom,var(--paper)_75%,transparent)] px-4 py-3">
              <button
                type="button"
                onClick={onClose}
                className="text-xs px-3 py-1.5 rounded-full bg-white/90 shadow"
              >
                ← 返回本章
              </button>
              <span className="text-[10px] tracking-[0.2em] text-neutral-400">STORY</span>
            </div>
            <div className="px-6 pt-2 pb-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-bold">{story.title}</h2>
                  <p className="text-xs text-neutral-500 mt-1">{story.date}</p>
                </div>
                <SafeImage
                  src={chapter.icon}
                  alt=""
                  className="w-12 h-12 rounded-lg object-cover"
                />
              </div>

              <button
                data-testid="story-hero-media"
                type="button"
                onClick={() => onOpenMedia(0)}
                className="relative mt-5 block w-full rounded-2xl overflow-hidden shadow-md group"
              >
                <SafeImage
                  src={firstSource ?? story.cover}
                  srcSet={first?.type === "image" ? getImageSrcSet(first) : undefined}
                  sizes="(max-width: 640px) 100vw, 448px"
                  alt={story.title}
                  fallbackLabel={story.title}
                  className="w-full aspect-[4/5] object-cover"
                />
                {first?.type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="w-16 h-16 rounded-full bg-white/85 flex items-center justify-center shadow-lg group-hover:scale-105 transition">
                      ▶
                    </span>
                  </span>
                )}
              </button>

              {media.length > 1 && (
                <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
                  {media.slice(1, 5).map((item, index) => {
                    const source =
                      item.type === "video" ? item.poster : getImageSource(item, "thumbnail");
                    return (
                      <button
                        key={`${source}-${index}`}
                        type="button"
                        onClick={() => onOpenMedia(index + 1)}
                        className="relative w-20 shrink-0 aspect-square rounded-lg overflow-hidden"
                      >
                        <SafeImage src={source} alt="" className="w-full h-full object-cover" />
                        {item.type === "video" && (
                          <span className="absolute inset-0 grid place-items-center bg-black/20 text-white">
                            ▶
                          </span>
                        )}
                      </button>
                    );
                  })}
                  {media.length > 5 && (
                    <button
                      type="button"
                      onClick={() => onOpenMedia(5)}
                      className="w-20 shrink-0 aspect-square rounded-lg bg-neutral-200 grid place-items-center font-bold text-neutral-600"
                    >
                      +{media.length - 5}
                    </button>
                  )}
                </div>
              )}

              <div className="mt-8 rounded-2xl bg-white/55 p-5">
                <p className="text-xs text-neutral-500 border-b border-neutral-200 pb-2">
                  📝 妈妈的小纸条
                </p>
                <p
                  className="mt-4 text-[15px] leading-8 whitespace-pre-line"
                  style={{ fontFamily: "'Long Cang', cursive" }}
                >
                  {story.note}
                </p>
              </div>
              <div className="mt-8 text-right">
                <button
                  type="button"
                  onClick={onNext}
                  className="text-sm text-neutral-600 hover:text-neutral-900"
                >
                  下一段成长 →
                </button>
              </div>
            </div>
          </motion.article>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
