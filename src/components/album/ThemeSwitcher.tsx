import { AnimatePresence, motion } from "framer-motion";
import { Check, Palette, X } from "lucide-react";
import { useState } from "react";
import { albumThemeList } from "@/themes/album-themes";
import type { ThemeId } from "@/types/album";

type ThemeSwitcherProps = {
  value: ThemeId;
  onChange: (theme: ThemeId) => void;
};

export function ThemeSwitcher({ value, onChange }: ThemeSwitcherProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-40 flex min-h-11 items-center gap-2 rounded-full border border-black/10 bg-white/90 px-4 py-2 text-xs shadow-lg backdrop-blur"
      >
        <Palette className="size-4" />
        选择主题
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-60 flex items-end justify-center bg-black/35 p-3 backdrop-blur-sm sm:items-center"
            onClick={() => setOpen(false)}
          >
            <motion.section
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              className="w-full max-w-md rounded-3xl bg-[var(--paper)] p-5 shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.28em] text-neutral-400">THEME STUDIO</p>
                  <h2 className="mt-1 text-xl font-bold">选择成长故事的画风</h2>
                </div>
                <button
                  type="button"
                  aria-label="关闭主题选择"
                  onClick={() => setOpen(false)}
                  className="grid size-10 place-items-center rounded-full bg-white/70"
                >
                  <X className="size-4" />
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {albumThemeList.map((theme) => {
                  const selected = theme.id === value;
                  return (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => {
                        onChange(theme.id);
                        setOpen(false);
                      }}
                      className="flex w-full items-center gap-4 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:bg-white/65"
                      style={{ borderColor: selected ? theme.swatches[1] : "rgba(0,0,0,.08)" }}
                    >
                      <span
                        className="grid size-14 shrink-0 place-items-center rounded-2xl text-2xl"
                        style={{
                          color: theme.swatches[1],
                          background: `linear-gradient(145deg, ${theme.swatches[0]}, ${theme.swatches[2]}55)`,
                        }}
                      >
                        {theme.motif}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 font-bold">
                          {theme.name}
                          {selected && <Check className="size-4" />}
                        </span>
                        <span className="mt-1 block text-[11px] leading-5 text-neutral-500">
                          {theme.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </motion.section>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
