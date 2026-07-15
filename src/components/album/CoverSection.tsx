import { motion } from "framer-motion";
import coverBaby from "@/assets/cover_baby.png.asset.json";
import type { AlbumProfile } from "@/types/album";
import { SafeImage } from "./SafeImage";

type CoverSectionProps = { profile: AlbumProfile; onExplore: () => void };

export function CoverSection({ profile, onExplore }: CoverSectionProps) {
  return (
    <section
      className="min-h-screen flex flex-col items-center px-6 pt-24 pb-10"
      style={{ background: "var(--paper)" }}
    >
      <div className="text-center">
        <p className="text-[11px] tracking-[0.35em] text-neutral-400">BABY GROWTH ALBUM</p>
        <h1 className="mt-4 text-3xl font-bold tracking-[0.4em] pl-[0.4em]">
          {profile.displayName}
        </h1>
        <p className="mt-2 text-xs tracking-[0.3em] text-neutral-500">{profile.romanizedName}</p>
        <p className="mt-1 text-xs text-neutral-400">{profile.birthDate}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="mt-10 flex items-end justify-center gap-2 w-full max-w-md"
      >
        <SafeImage
          src={coverBaby.url}
          alt={profile.displayName}
          className="w-2/3 max-w-[260px] object-contain"
        />
        <p className="pb-10 text-base leading-snug" style={{ fontFamily: "'Caveat', cursive" }}>
          Come,
          <br />
          peek into
          <br />
          my time
          <br />
          album!
        </p>
      </motion.div>

      <motion.button
        type="button"
        onClick={onExplore}
        whileHover={{ scale: 1.02 }}
        className="mt-10 text-center rounded-2xl px-8 py-3 hover:bg-white/50"
      >
        <p className="text-xs tracking-[0.3em] text-neutral-400">WELCOME</p>
        <p className="mt-2 text-base leading-7">{profile.welcome}</p>
      </motion.button>

      <motion.div
        animate={{ y: [0, 8, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="mt-10 text-neutral-400 text-xl"
        aria-hidden="true"
      >
        ↓
      </motion.div>
    </section>
  );
}
