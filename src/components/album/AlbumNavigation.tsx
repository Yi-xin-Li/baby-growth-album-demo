import { useEffect, useRef, useState } from "react";

type AlbumNavigationProps = {
  active: "home" | "chapters" | "profile" | "stories";
  onHome?: () => void;
  onOpenDirectory?: () => void;
  autoHide?: boolean;
  onNavigate?: (target: string) => boolean;
};

const baseClass =
  "grid min-h-9 min-w-0 place-items-center whitespace-nowrap rounded-full px-1.5 py-1.5 text-[10px] font-medium [font-family:inherit] transition sm:min-w-24 sm:px-3 sm:text-[11px]";

export function AlbumNavigation({
  active,
  onHome,
  onOpenDirectory,
  autoHide = false,
  onNavigate,
}: AlbumNavigationProps) {
  const [hidden, setHidden] = useState(false);
  const lastScrollYRef = useRef(0);
  const touchYRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoHide) return;
    let intentFrameId = 0;

    const updateVisibility = () => {
      const currentScrollY = window.scrollY;
      const scrollDistance = currentScrollY - lastScrollYRef.current;

      if (currentScrollY <= 24) {
        setHidden(false);
      } else if (scrollDistance > 0 && currentScrollY > 96) setHidden(true);
      else if (scrollDistance < 0) setHidden(false);

      lastScrollYRef.current = currentScrollY;
    };

    const applyScrollIntent = (direction: number) => {
      if (intentFrameId) window.cancelAnimationFrame(intentFrameId);
      intentFrameId = window.requestAnimationFrame(() => {
        intentFrameId = 0;
        if (window.scrollY <= 24 || direction < 0) setHidden(false);
        else if (direction > 0 && window.scrollY > 96) setHidden(true);
        lastScrollYRef.current = window.scrollY;
      });
    };

    const handleWheel = (event: WheelEvent) => applyScrollIntent(Math.sign(event.deltaY));
    const handleTouchStart = (event: TouchEvent) => {
      touchYRef.current = event.touches[0]?.clientY ?? null;
    };
    const handleTouchMove = (event: TouchEvent) => {
      const currentY = event.touches[0]?.clientY;
      if (currentY === undefined || touchYRef.current === null) return;
      applyScrollIntent(Math.sign(touchYRef.current - currentY));
      touchYRef.current = currentY;
    };

    lastScrollYRef.current = window.scrollY;
    window.addEventListener("scroll", updateVisibility, { passive: true });
    document.addEventListener("scroll", updateVisibility, { passive: true, capture: true });
    window.addEventListener("wheel", handleWheel, { passive: true });
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    return () => {
      if (intentFrameId) window.cancelAnimationFrame(intentFrameId);
      window.removeEventListener("scroll", updateVisibility);
      document.removeEventListener("scroll", updateVisibility, true);
      window.removeEventListener("wheel", handleWheel);
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [autoHide]);

  const itemClass = (id: AlbumNavigationProps["active"]) =>
    `${baseClass} ${active === id ? "bg-black text-white shadow-md" : "bg-white/75 text-neutral-600 shadow-sm hover:bg-white"}`;

  const linkProps = (target: string) => ({
    href: target,
    onClick: (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (onNavigate?.(target) === false) event.preventDefault();
    },
  });

  return (
    <nav
      aria-label="主要页面导航"
      data-hidden={hidden}
      data-auto-hide={autoHide}
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
          <a {...linkProps("/")} className={itemClass("home")}>
            首页
          </a>
        )}
        {onOpenDirectory ? (
          <button type="button" onClick={onOpenDirectory} className={itemClass("chapters")}>
            成长章节
          </button>
        ) : (
          <a {...linkProps("/#chapters")} className={itemClass("chapters")}>
            成长章节
          </a>
        )}
        <a {...linkProps("/editor/profile")} className={itemClass("profile")}>
          宝宝档案
        </a>
        <a {...linkProps("/editor/stories")} className={itemClass("stories")}>
          成长记录
        </a>
      </div>
    </nav>
  );
}
