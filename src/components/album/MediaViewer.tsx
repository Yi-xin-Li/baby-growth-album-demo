import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { getImageSource } from "@/lib/album-media";
import type { MediaItem } from "@/types/album";
import { SafeImage } from "./SafeImage";

export type ViewerState = { media: MediaItem[]; index: number } | null;

type MediaViewerProps = {
  state: ViewerState;
  onClose: () => void;
  onChange: (index: number) => void;
};

export function MediaViewer({ state, onClose, onChange }: MediaViewerProps) {
  const [playing, setPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const go = useCallback(
    (direction: number) => {
      if (!state) return;
      onChange((state.index + direction + state.media.length) % state.media.length);
      setPlaying(false);
      setVideoFailed(false);
    },
    [onChange, state],
  );

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (!state) return;
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") go(-1);
      if (event.key === "ArrowRight") go(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onClose, state]);

  const item = state?.media[state.index];

  return (
    <AnimatePresence>
      {state && item && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-black/90 p-3"
          onClick={onClose}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/15 px-3 py-2 text-sm text-white"
          >
            关闭 ×
          </button>
          {state.media.length > 1 && (
            <button
              type="button"
              aria-label="上一张"
              onClick={(event) => {
                event.stopPropagation();
                go(-1);
              }}
              className="absolute left-3 z-10 h-11 w-11 rounded-full bg-white/15 text-2xl text-white"
            >
              ‹
            </button>
          )}
          <div className="w-full max-w-3xl" onClick={(event) => event.stopPropagation()}>
            {item.type === "video" && item.videoUrl && playing ? (
              <video
                src={item.videoUrl}
                poster={item.poster}
                controls
                autoPlay
                playsInline
                preload="none"
                onError={() => setVideoFailed(true)}
                className="max-h-[82vh] w-full rounded-xl object-contain"
              />
            ) : (
              <button
                type="button"
                onClick={() => item.type === "video" && item.videoUrl && setPlaying(true)}
                className="relative block w-full cursor-default"
              >
                <SafeImage
                  src={item.type === "video" ? item.poster : getImageSource(item, "original")}
                  alt={item.alt ?? "成长回忆"}
                  className="max-h-[82vh] w-full rounded-xl object-contain"
                />
                {item.type === "video" && (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/85 text-2xl shadow-lg">
                      ▶
                    </span>
                  </span>
                )}
              </button>
            )}
            {videoFailed && (
              <p className="mt-3 rounded-lg bg-red-950/60 px-3 py-2 text-center text-xs text-red-100">
                视频暂时无法播放，请检查文件是否仍在交付包中。
              </p>
            )}
            <p className="mt-3 text-center text-xs text-white/70">
              {state.index + 1} / {state.media.length}
            </p>
          </div>
          {state.media.length > 1 && (
            <button
              type="button"
              aria-label="下一张"
              onClick={(event) => {
                event.stopPropagation();
                go(1);
              }}
              className="absolute right-3 z-10 h-11 w-11 rounded-full bg-white/15 text-2xl text-white"
            >
              ›
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
