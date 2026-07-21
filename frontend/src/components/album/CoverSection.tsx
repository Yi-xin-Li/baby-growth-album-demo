import { motion } from "framer-motion";
import type { AlbumTheme } from "@/themes/album-themes";
import type { AlbumProfile } from "@/types/album";
import { SafeImage } from "./SafeImage";
import { ThemeArtwork } from "./ThemeArtwork";

type CoverSectionProps = {
  profile: AlbumProfile;
  theme: AlbumTheme;
  storyCount: number;
  onExplore: () => void;
};

export function CoverSection({ profile, theme, storyCount, onExplore }: CoverSectionProps) {
  return (
    <section
      className="relative flex min-h-screen flex-col items-center overflow-hidden px-6 pb-10 pt-24"
      style={{ background: "var(--paper)" }}
    >
      <ThemeArtwork theme={theme} className="absolute inset-x-0 top-16 h-44 opacity-70" />
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center"
      >
        <p className="text-[10px] tracking-[0.38em] text-neutral-400">{theme.englishName}</p>
        <p className="mt-2 text-[11px] tracking-[0.35em] text-neutral-400">BABY GROWTH ALBUM</p>
        <h1 className="mt-4 pl-[0.4em] text-3xl font-bold tracking-[0.4em] sm:text-4xl">
          {profile.displayName}
        </h1>
        <p className="mt-2 text-xs tracking-[0.3em] text-neutral-500">{profile.romanizedName}</p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="relative z-10 mt-8 flex w-full max-w-md items-end justify-center"
      >
        <SafeImage
          src={theme.illustrations.coverHero}
          alt={profile.displayName}
          className="w-2/3 max-w-[260px] object-contain"
        />
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="relative z-10 mt-5 flex items-center gap-3 rounded-full border border-black/5 bg-white/45 px-4 py-2 text-[11px] text-neutral-500 shadow-sm"
      >
        <span>{profile.birthDate} 出生</span>
        <span className="h-3 w-px bg-black/10" />
        <span>{storyCount} 个成长故事</span>
      </motion.div>

      <motion.button
        type="button"
        onClick={onExplore}
        whileHover={{ scale: 1.02 }}
        className="relative z-10 mt-7 rounded-2xl px-8 py-3 text-center hover:bg-white/50"
      >
        <p className="text-xs tracking-[0.3em] text-neutral-400">WELCOME</p>
        <p className="mt-2 text-base leading-7">{profile.welcome}</p>
      </motion.button>

      <motion.button
        type="button"
        onClick={onExplore}
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10 mt-7 grid size-10 place-items-center rounded-full border border-black/5 bg-white/40 text-xl text-neutral-400"
        aria-label="查看成长章节"
      >
        ↓
      </motion.button>
    </section>
  );
}
