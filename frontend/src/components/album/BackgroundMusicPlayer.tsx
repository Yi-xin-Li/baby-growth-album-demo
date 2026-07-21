import { Music2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import type { GrowthAlbum } from "@/types/album";
import { resolveBackendAsset } from "@/lib/backend-api";

type BackgroundMusic = NonNullable<GrowthAlbum["backgroundMusic"]>;
type FloatingPosition = { x: number; y: number };

const CONTROL_SIZE = 44;
const EDGE_GAP = 8;
const TOP_GAP = 64;
const LONG_PRESS_MS = 200;
const POSITION_STORAGE_KEY = "baby-album-music-control-position";

function clampPosition(position: FloatingPosition): FloatingPosition {
  return {
    x: Math.min(Math.max(position.x, EDGE_GAP), window.innerWidth - CONTROL_SIZE - EDGE_GAP),
    y: Math.min(Math.max(position.y, TOP_GAP), window.innerHeight - CONTROL_SIZE - EDGE_GAP),
  };
}

function defaultPosition(): FloatingPosition {
  return clampPosition({ x: window.innerWidth - CONTROL_SIZE - 12, y: 68 });
}

export function BackgroundMusicPlayer({ music }: { music?: BackgroundMusic }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const suppressClickRef = useRef(false);
  const pressRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    offsetX: number;
    offsetY: number;
    target: HTMLButtonElement;
  } | null>(null);
  const [playing, setPlaying] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [position, setPosition] = useState<FloatingPosition | null>(null);

  useEffect(() => {
    setPlaying(false);
    audioRef.current?.pause();
  }, [music?.source, music?.volume]);

  useEffect(() => {
    const pauseWhenHidden = () => {
      if (!document.hidden) return;
      audioRef.current?.pause();
      setPlaying(false);
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () => document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  useEffect(() => {
    try {
      const saved = JSON.parse(
        localStorage.getItem(POSITION_STORAGE_KEY) ?? "null",
      ) as FloatingPosition | null;
      setPosition(
        saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)
          ? clampPosition(saved)
          : defaultPosition(),
      );
    } catch {
      setPosition(defaultPosition());
    }

    const keepInsideViewport = () => {
      setPosition((current) => clampPosition(current ?? defaultPosition()));
    };
    window.addEventListener("resize", keepInsideViewport);
    return () => window.removeEventListener("resize", keepInsideViewport);
  }, []);

  if (!music) return null;

  const togglePlayback = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) audio.pause();
    else {
      try {
        await audio.play();
      } catch {
        setPlaying(false);
      }
    }
  };

  const clearLongPress = () => {
    if (longPressTimerRef.current !== null) window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (!event.isPrimary || event.button !== 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    pressRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      target: event.currentTarget,
    };
    longPressTimerRef.current = window.setTimeout(() => {
      const press = pressRef.current;
      if (!press) return;
      draggingRef.current = true;
      suppressClickRef.current = true;
      setDragging(true);
      setPosition(clampPosition({ x: rect.left, y: rect.top }));
      press.target.setPointerCapture(press.pointerId);
      navigator.vibrate?.(15);
    }, LONG_PRESS_MS);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLButtonElement>) => {
    const press = pressRef.current;
    if (!press || press.pointerId !== event.pointerId) return;
    if (!draggingRef.current) {
      if (Math.hypot(event.clientX - press.startX, event.clientY - press.startY) > 8) {
        clearLongPress();
      }
      return;
    }
    event.preventDefault();
    setPosition(
      clampPosition({ x: event.clientX - press.offsetX, y: event.clientY - press.offsetY }),
    );
  };

  const finishPointerInteraction = (event: ReactPointerEvent<HTMLButtonElement>) => {
    clearLongPress();
    if (draggingRef.current) {
      setPosition((current) => {
        const bounded = clampPosition(current ?? defaultPosition());
        const snapped = {
          x:
            bounded.x + CONTROL_SIZE / 2 < window.innerWidth / 2
              ? EDGE_GAP
              : window.innerWidth - CONTROL_SIZE - EDGE_GAP,
          y: bounded.y,
        };
        localStorage.setItem(POSITION_STORAGE_KEY, JSON.stringify(snapped));
        return snapped;
      });
      draggingRef.current = false;
      setDragging(false);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    pressRef.current = null;
  };

  const handleClick = () => {
    if (suppressClickRef.current) return;
    void togglePlayback();
  };

  return (
    <aside
      aria-label="背景音乐播放器"
      data-playing={playing}
      data-dragging={dragging}
      className="fixed z-50"
      style={
        position
          ? { left: `${position.x}px`, top: `${position.y}px` }
          : { right: "0.75rem", top: "calc(env(safe-area-inset-top, 0px) + 4.25rem)" }
      }
    >
      <audio
        ref={audioRef}
        src={resolveBackendAsset(music.source)}
        loop={music.loop}
        volume={music.volume}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishPointerInteraction}
        onPointerCancel={finishPointerInteraction}
        onContextMenu={(event) => event.preventDefault()}
        className={`group grid size-11 touch-none select-none place-items-center rounded-full transition duration-200 hover:scale-105 motion-reduce:transition-none ${dragging ? "cursor-grabbing scale-110 opacity-80" : "cursor-grab active:scale-90"}`}
        aria-label={playing ? "暂停背景音乐" : "播放背景音乐"}
        aria-pressed={playing}
        title={`${playing ? "暂停" : "播放"}：${music.name}；长按可拖动`}
      >
        <span className="relative grid size-[30px] place-items-center rounded-full border border-[#c99b78] bg-[#fff7e8] text-[#9d6a4a] shadow-[0_3px_9px_rgba(126,87,58,0.18)]">
          {playing && (
            <span
              aria-hidden="true"
              className="absolute -inset-1 rounded-full border border-[#c99b78]/55 animate-pulse motion-reduce:animate-none"
            />
          )}
          <Music2
            aria-hidden="true"
            className={`size-4 ${playing ? "animate-[spin_4s_linear_infinite] motion-reduce:animate-none" : ""}`}
          />
          {!playing && (
            <span
              data-testid="music-off-indicator"
              aria-hidden="true"
              className="absolute left-1/2 top-1/2 h-0.5 w-[34px] -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-full bg-[#b8785b] shadow-[0_0_0_1px_rgba(255,247,232,0.7)]"
            />
          )}
        </span>
      </button>
    </aside>
  );
}
