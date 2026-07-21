import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useCallback, useEffect, useRef, useState } from "react";
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
  const reduceMotion = useReducedMotion();
  const [playing, setPlaying] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [direction, setDirection] = useState(1);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const transitionLockedRef = useRef(false);
  const queuedDirectionRef = useRef(0);
  const goRef = useRef<(direction: number) => void>(() => undefined);

  useEffect(
    () => () => {
      if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current);
    },
    [],
  );

  const go = useCallback(
    (nextDirection: number) => {
      if (!state || state.media.length < 2) return;
      if (transitionLockedRef.current) {
        queuedDirectionRef.current = nextDirection;
        return;
      }
      transitionLockedRef.current = true;
      setDirection(nextDirection);
      onChange((state.index + nextDirection + state.media.length) % state.media.length);
      setPlaying(false);
      setVideoFailed(false);
      transitionTimerRef.current = setTimeout(
        () => {
          transitionLockedRef.current = false;
          const queuedDirection = queuedDirectionRef.current;
          queuedDirectionRef.current = 0;
          if (queuedDirection) goRef.current(queuedDirection);
        },
        reduceMotion ? 130 : 240,
      );
    },
    [onChange, reduceMotion, state],
  );

  useEffect(() => {
    goRef.current = go;
  }, [go]);

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
  const mediaKey = item
    ? `${state?.index}-${item.type === "image" ? getImageSource(item, "original") : (item.videoUrl ?? item.poster)}`
    : "empty";

  const startSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest("video")) return;
    pointerStartRef.current = { x: event.clientX, y: event.clientY };
    try {
      event.currentTarget.setPointerCapture(event.pointerId);
    } catch {
      // Synthetic pointer events and older browsers may not expose pointer capture.
    }
  };

  const finishSwipe = (event: React.PointerEvent<HTMLDivElement>) => {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start || (event.target as HTMLElement).closest("video")) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < 50 || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
    go(deltaX < 0 ? 1 : -1);
  };

  return (
    <AnimatePresence>
      {state && item && (
        <motion.div
          data-testid="media-viewer"
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
              ←
            </button>
          )}
          <div
            data-testid="media-swipe-area"
            className="w-full max-w-3xl touch-pan-y overflow-hidden"
            onClick={(event) => event.stopPropagation()}
            onDragStart={(event) => event.preventDefault()}
            onPointerDown={startSwipe}
            onPointerUp={finishSwipe}
            onPointerCancel={() => {
              pointerStartRef.current = null;
            }}
          >
            <AnimatePresence initial={false} custom={direction} mode="popLayout">
              <motion.div
                key={mediaKey}
                custom={direction}
                initial={
                  reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? 56 : -56 }
                }
                animate={{ opacity: 1, x: 0 }}
                exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: direction > 0 ? -56 : 56 }}
                transition={{ duration: reduceMotion ? 0.12 : 0.22, ease: "easeOut" }}
                className="w-full"
              >
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
              </motion.div>
            </AnimatePresence>
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
              →
            </button>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
