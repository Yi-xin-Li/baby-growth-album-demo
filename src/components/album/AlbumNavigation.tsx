type AlbumNavigationProps = {
  active: "home" | "chapters" | "profile" | "stories";
  onHome?: () => void;
  onOpenDirectory?: () => void;
};

const baseClass =
  "grid min-h-9 place-items-center rounded-full px-3 py-1.5 text-[11px] transition sm:min-w-24";

export function AlbumNavigation({ active, onHome, onOpenDirectory }: AlbumNavigationProps) {
  const itemClass = (id: AlbumNavigationProps["active"]) =>
    `${baseClass} ${active === id ? "bg-black text-white shadow-md" : "bg-white/75 text-neutral-600 shadow-sm hover:bg-white"}`;

  return (
    <nav
      aria-label="主要页面导航"
      className="fixed inset-x-0 top-0 z-40 px-3 py-2 backdrop-blur-md"
      style={{
        background:
          "linear-gradient(to bottom, color-mix(in srgb, var(--paper) 94%, transparent) 78%, transparent)",
      }}
    >
      <div className="mx-auto grid max-w-md grid-cols-2 gap-1.5 sm:max-w-xl sm:grid-cols-4 sm:gap-2">
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
          宝宝资料
        </a>
        <a href="/editor/stories" className={itemClass("stories")}>
          成长故事
        </a>
      </div>
    </nav>
  );
}
