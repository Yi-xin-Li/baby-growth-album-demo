type AlbumNavigationProps = {
  onHome: () => void;
  onOpenDirectory: () => void;
};

export function AlbumNavigation({ onHome, onOpenDirectory }: AlbumNavigationProps) {
  return (
    <nav
      className="fixed inset-x-0 top-0 z-30 flex items-center justify-end gap-4 px-5 py-3 text-[13px]"
      style={{ background: "linear-gradient(to bottom, var(--paper) 70%, transparent)" }}
    >
      <button type="button" onClick={onHome} className="hover:opacity-70">
        首页
      </button>
      <button type="button" onClick={onOpenDirectory} className="hover:opacity-70">
        时光轴 ▾
      </button>
      <a
        href="/editor"
        className="rounded-full border border-black/5 bg-white/65 px-3 py-1.5 text-[11px] shadow-sm hover:bg-white"
      >
        编辑相册
      </a>
    </nav>
  );
}
