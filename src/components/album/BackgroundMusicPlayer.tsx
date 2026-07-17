import { Music2, Pause, Play, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { GrowthAlbum } from "@/types/album";

type BackgroundMusic = NonNullable<GrowthAlbum["backgroundMusic"]>;

export function BackgroundMusicPlayer({ music }: { music?: BackgroundMusic }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(music?.volume ?? 0.3);

  useEffect(() => {
    setPlaying(false);
    setVolume(music?.volume ?? 0.3);
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
      className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] right-3 z-50 flex max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-2xl bg-black/80 p-2 text-white shadow-xl backdrop-blur-md sm:right-5"
    >
      <audio
        ref={audioRef}
        src={music.source}
        loop={music.loop}
        muted={muted}
        volume={volume}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
      <Music2 className="hidden size-4 shrink-0 text-white/70 sm:block" />
      <span className="max-w-24 truncate text-[10px] sm:max-w-36" title={music.name}>
        {music.name}
      </span>
      <button
        type="button"
        onClick={() => void togglePlayback()}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-white text-black"
        aria-label={playing ? "暂停背景音乐" : "播放背景音乐"}
      >
        {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>
      <button
        type="button"
        onClick={() => setMuted((current) => !current)}
        className="grid size-8 shrink-0 place-items-center rounded-full bg-white/10"
        aria-label={muted ? "取消静音" : "静音"}
      >
        {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
      </button>
      <input
        aria-label="背景音乐音量"
        type="range"
        min="0"
        max="1"
        step="0.05"
        value={volume}
        onChange={(event) => setVolume(Number(event.target.value))}
        className="hidden w-20 accent-white sm:block"
      />
    </aside>
  );
}
