import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, RotateCcw } from "lucide-react";
import { useState } from "react";
import { useAlbumDraft } from "@/hooks/use-album-draft";
import { processIllustration } from "@/lib/illustration-processing";
import { albumThemes } from "@/themes/album-themes";
import type { IllustrationSlotId } from "@/types/album";

export const Route = createFileRoute("/editor_/theme")({
  head: () => ({ meta: [{ title: "主题与插画｜宝宝成长相册" }] }),
  component: ThemeEditor,
});

const slotDetails: Array<{
  id: IllustrationSlotId;
  name: string;
  recommendation: string;
}> = [
  { id: "coverHero", name: "封面主插画", recommendation: "竖版透明图，建议 1200 × 1500" },
  { id: "coverDecoration", name: "封面小装饰", recommendation: "透明图，建议 600 × 600" },
  { id: "pageTexture", name: "页面背景纹理", recommendation: "可平铺纹理，建议 1200 × 1200" },
  { id: "chapterIcon", name: "章节图标", recommendation: "方形透明图，建议 512 × 512" },
  { id: "timelineMarker", name: "时间轴节点", recommendation: "小型透明图，建议 256 × 256" },
  { id: "cardDecoration", name: "卡片角落装饰", recommendation: "横版透明图，建议 600 × 300" },
  { id: "noteDecoration", name: "便签装饰", recommendation: "透明图，建议 500 × 500" },
  { id: "noteBackground", name: "便签背景", recommendation: "竖版浅色纹理，建议 900 × 1200" },
  { id: "emptyState", name: "空内容插画", recommendation: "方形透明图，建议 800 × 800" },
];

function ThemeEditor() {
  const { album, setAlbum, status } = useAlbumDraft();
  const [message, setMessage] = useState("");
  const theme = albumThemes[album.theme];

  const setIllustration = (slotId: IllustrationSlotId, value?: string) => {
    setAlbum((current) => {
      const customIllustrations = { ...current.customIllustrations };
      if (value) customIllustrations[slotId] = value;
      else delete customIllustrations[slotId];
      return { ...current, customIllustrations };
    });
  };

  const upload = async (slotId: IllustrationSlotId, file?: File) => {
    if (!file) return;
    try {
      setMessage(`正在处理“${slotDetails.find((item) => item.id === slotId)?.name}”…`);
      setIllustration(slotId, await processIllustration(file));
      setMessage("插画已替换并自动保存");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "插画处理失败");
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-4 py-6 text-[#2e2a25] sm:px-7">
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/editor"
              aria-label="返回编辑台"
              className="grid size-10 place-items-center rounded-full bg-white shadow-sm"
            >
              <ArrowLeft className="size-4" />
            </a>
            <div>
              <p className="text-[10px] tracking-[.25em] text-neutral-400">ILLUSTRATION SLOTS</p>
              <h1 className="text-xl font-bold">主题与插画设置</h1>
            </div>
          </div>
          <p className="rounded-full bg-white px-3 py-2 text-[10px] text-neutral-500">
            {status === "saving" ? "正在保存…" : `当前：${theme.name}`}
          </p>
        </header>

        <div className="mt-6 rounded-3xl border border-black/5 bg-white/65 p-5">
          <p className="text-sm font-bold">受限制的插画自由</p>
          <p className="mt-1 text-xs leading-6 text-neutral-500">
            只替换预先设计好的位置，不改变整体排版。支持 PNG、WebP、SVG，单个文件不超过
            4MB；配置不会保存电脑绝对路径。
          </p>
          {message && (
            <p role="status" className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-xs">
              {message}
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slotDetails.map((slot) => {
            const custom = album.customIllustrations?.[slot.id];
            const source = custom ?? theme.illustrations[slot.id];
            return (
              <section
                key={slot.id}
                className="overflow-hidden rounded-3xl border border-black/5 bg-white p-4 shadow-sm"
              >
                <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#faf7f0,#eef2e7)]">
                  {source ? (
                    <img
                      src={source}
                      alt={slot.name}
                      className="h-full w-full object-contain p-3"
                    />
                  ) : (
                    <span className="text-xs text-neutral-400">主题默认留白</span>
                  )}
                </div>
                <div className="mt-4 flex items-start justify-between gap-2">
                  <div>
                    <h2 className="text-sm font-bold">{slot.name}</h2>
                    <p className="mt-1 text-[10px] leading-4 text-neutral-400">
                      {slot.recommendation}
                    </p>
                  </div>
                  {custom && (
                    <span className="rounded-full bg-emerald-50 px-2 py-1 text-[9px] text-emerald-700">
                      已自定义
                    </span>
                  )}
                </div>
                <div className="mt-4 flex gap-2">
                  <label className="inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl bg-black px-3 text-[10px] text-white">
                    <ImagePlus className="size-3" /> 替换插画
                    <input
                      type="file"
                      accept="image/png,image/webp,image/svg+xml"
                      className="sr-only"
                      onChange={(event) => {
                        void upload(slot.id, event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={!custom}
                    onClick={() => setIllustration(slot.id)}
                    aria-label={`恢复${slot.name}默认插画`}
                    className="grid size-10 place-items-center rounded-xl bg-neutral-100 disabled:opacity-30"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </main>
  );
}
