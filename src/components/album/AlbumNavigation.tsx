type AlbumNavigationProps = {
  onHome: () => void;
  onOpenDirectory: () => void;
};

export function AlbumNavigation({ onHome, onOpenDirectory }: AlbumNavigationProps) {
  return (
    <nav
      className="fixed top-0 inset-x-0 z-30 flex items-center justify-end gap-5 px-5 py-3 text-[13px]"
      style={{ background: "linear-gradient(to bottom, var(--paper) 70%, transparent)" }}
    >
      <button type="button" onClick={onHome} className="hover:opacity-70">
        首页
      </button>
      <button type="button" onClick={onOpenDirectory} className="hover:opacity-70">
        时光轴 ▾
      </button>
    </nav>
  );
}
