import { ChevronDown } from "lucide-react";
import { useEffect, useState } from "react";
import type { ReactNode } from "react";

export function PersistentEditorSection({
  title,
  description,
  storageKey,
  defaultOpen = false,
  children,
}: {
  title: string;
  description: string;
  storageKey: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved === "open") setOpen(true);
    if (saved === "closed") setOpen(false);
  }, [storageKey]);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    window.localStorage.setItem(storageKey, next ? "open" : "closed");
  };

  return (
    <section className="rounded-3xl border border-black/5 bg-white/65 p-5 shadow-sm sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-bold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
        </div>
        <button
          type="button"
          aria-label={`${open ? "收起" : "展开"}${title}`}
          aria-expanded={open}
          onClick={toggle}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-sm"
        >
          <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
      {open && <div className="mt-5">{children}</div>}
    </section>
  );
}
