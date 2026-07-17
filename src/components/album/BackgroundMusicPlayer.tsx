import { Music2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GrowthAlbum } from "@/types/album";

type BackgroundMusic = NonNullable<GrowthAlbum["backgroundMusic"]>;

export function BackgroundMusicPlayer({ music }: { music?: BackgroundMusic }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

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

  return (
    <aside
      aria-label="背景音乐播放器"
      data-playing={playing}
      className="fixed right-3 z-50 sm:right-5"
      style={{ top: "calc(env(safe-area-inset-top, 0px) + 4.25rem)" }}
    >
      <audio
        ref={audioRef}
        src={music.source}
        loop={music.loop}
        volume={music.volume}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <button
        type="button"
        onClick={() => void togglePlayback()}
        className="group relative grid size-12 place-items-center rounded-full border-2 border-black/75 bg-[color:var(--paper)] text-black shadow-[0_5px_14px_rgba(0,0,0,0.2)] transition-transform duration-200 hover:scale-105 active:scale-90 motion-reduce:transition-none"
        aria-label={playing ? "暂停背景音乐" : "播放背景音乐"}
        aria-pressed={playing}
        title={`${playing ? "暂停" : "播放"}：${music.name}`}
      >
        {playing && (
          <span
            aria-hidden="true"
            className="absolute -inset-1 rounded-full border-2 border-black/30 animate-pulse motion-reduce:animate-none"
          />
        )}
        <Music2
          aria-hidden="true"
          className={`size-6 ${playing ? "animate-[spin_4s_linear_infinite] motion-reduce:animate-none" : ""}`}
        />
        {!playing && (
          <span
            data-testid="music-off-indicator"
            aria-hidden="true"
            className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full border-2 border-[color:var(--paper)] bg-black text-white"
          >
            <X className="size-3" strokeWidth={3} />
          </span>
        )}
      </button>
    </aside>
  );
}
