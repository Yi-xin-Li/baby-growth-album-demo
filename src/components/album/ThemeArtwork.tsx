import { motion } from "framer-motion";
import type { AlbumTheme } from "@/themes/album-themes";

type ThemeArtworkProps = {
  theme: AlbumTheme;
  className?: string;
};

const themeMarks = {
  scrapbook: ["✿", "✎", "♡", "✦"],
  forest: ["❧", "♧", "⌁", "❀"],
  space: ["✦", "◌", "☾", "⋆"],
} as const;

export function ThemeArtwork({ theme, className = "" }: ThemeArtworkProps) {
  return (
    <div className={`pointer-events-none select-none ${className}`} aria-hidden="true">
      {themeMarks[theme.id].map((mark, index) => (
        <motion.span
          key={`${mark}-${index}`}
          className="absolute grid place-items-center rounded-full border border-current/15 bg-white/35 font-serif shadow-sm backdrop-blur-[1px]"
          style={{
            color: theme.swatches[1],
            width: 34 + index * 4,
            height: 34 + index * 4,
            left: `${8 + index * 26}%`,
            top: index % 2 === 0 ? "8%" : "58%",
            rotate: `${index % 2 === 0 ? -10 : 12}deg`,
          }}
          animate={
            theme.motion.decoration === "twinkle"
              ? { opacity: [0.45, 1, 0.45], scale: [0.9, 1.08, 0.9] }
              : theme.motion.decoration === "sway"
                ? { rotate: [-8, 8, -8], y: [0, -4, 0] }
                : { y: [0, -7, 0], rotate: [-4, 4, -4] }
          }
          transition={{
            duration: (3 + index * 0.45) * theme.motion.timelineDuration,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {mark}
        </motion.span>
      ))}
    </div>
  );
}
