type AlbumNavigationProps = {
  onHome: () => void;
  onOpenDirectory: () => void;
};

export function AlbumNavigation({ onHome, onOpenDirectory }: AlbumNavigationProps) {
  return (
    <nav
      className="fixed inset-x-0 top-0 z-30 flex items-center justify-end gap-2 px-3 py-3 text-[12px] sm:gap-4 sm:px-5 sm:text-[13px]"
      style={{ background: "linear-gradient(to bottom, var(--paper) 70%, transparent)" }}
    >
      <button type="button" onClick={onHome} className="hover:opacity-70">
        首页
      </button>
      <button type="button" onClick={onOpenDirectory} className="hover:opacity-70">
        时光轴 ▾
      </button>
      <a
        href="/editor/profile"
        className="rounded-full border border-black/5 bg-white/65 px-2.5 py-1.5 text-[10px] shadow-sm hover:bg-white sm:px-3 sm:text-[11px]"
      >
        宝宝资料
      </a>
      <a
        href="/editor/stories"
        className="rounded-full border border-black/5 bg-white/65 px-2.5 py-1.5 text-[10px] shadow-sm hover:bg-white sm:px-3 sm:text-[11px]"
      >
        成长故事
      </a>
    </nav>
  );
}
