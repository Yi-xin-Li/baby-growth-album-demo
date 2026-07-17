import { Music2 } from "lucide-react";
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
        className="group grid size-11 place-items-center rounded-full transition-transform duration-200 hover:scale-105 active:scale-90 motion-reduce:transition-none"
        aria-label={playing ? "暂停背景音乐" : "播放背景音乐"}
        aria-pressed={playing}
        title={`${playing ? "暂停" : "播放"}：${music.name}`}
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
