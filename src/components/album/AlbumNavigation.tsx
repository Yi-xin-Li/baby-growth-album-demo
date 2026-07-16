import { useEffect, useRef, useState } from "react";

type AlbumNavigationProps = {
  active: "home" | "chapters" | "profile" | "stories";
  onHome?: () => void;
  onOpenDirectory?: () => void;
  autoHide?: boolean;
};

const baseClass =
  "grid min-h-9 min-w-0 place-items-center whitespace-nowrap rounded-full px-1.5 py-1.5 text-[10px] font-medium [font-family:inherit] transition sm:min-w-24 sm:px-3 sm:text-[11px]";

export function AlbumNavigation({
  active,
  onHome,
  onOpenDirectory,
  autoHide = false,
}: AlbumNavigationProps) {
  const [hidden, setHidden] = useState(false);
  const lastScrollYRef = useRef(0);

  useEffect(() => {
    if (!autoHide) return;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const scrollDistance = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= 24) {
        setHidden(false);
      } else if (Math.abs(scrollDistance) >= 8) {
        setHidden(scrollDistance > 0 && currentScrollY > 96);
      }

      lastScrollYRef.current = currentScrollY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [autoHide]);

  const itemClass = (id: AlbumNavigationProps["active"]) =>
    `${baseClass} ${active === id ? "bg-black text-white shadow-md" : "bg-white/75 text-neutral-600 shadow-sm hover:bg-white"}`;

  return (
    <nav
      aria-label="主要页面导航"
      data-hidden={hidden}
      className={`fixed inset-x-0 top-0 z-40 px-2 py-2 backdrop-blur-md transition-transform duration-300 motion-reduce:transition-none ${hidden ? "-translate-y-full" : "translate-y-0"}`}
      style={{
        background:
          "linear-gradient(to bottom, color-mix(in srgb, var(--paper) 94%, transparent) 78%, transparent)",
      }}
    >
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-1 sm:gap-2">
        {onHome ? (
          <button type="button" onClick={onHome} className={itemClass("home")}>
            首页
          </button>
        ) : (
          <a href="/" className={itemClass("home")}>
            首页
          </a>
        )}
        {onOpenDirectory ? (
          <button type="button" onClick={onOpenDirectory} className={itemClass("chapters")}>
            成长章节
          </button>
        ) : (
          <a href="/#chapters" className={itemClass("chapters")}>
            成长章节
          </a>
        )}
        <a href="/editor/profile" className={itemClass("profile")}>
          宝宝档案
        </a>
        <a href="/editor/stories" className={itemClass("stories")}>
          成长记录
        </a>
      </div>
    </nav>
  );
}
