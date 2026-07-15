import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAlbumDraft } from "@/hooks/use-album-draft";
import { saveAlbumDraft } from "@/lib/album-store";
import { processIllustration } from "@/lib/illustration-processing";
import { fixedAlbumTheme } from "@/themes/album-themes";
import type { IllustrationSlotId } from "@/types/album";

export const Route = createFileRoute("/editor_/theme")({
  head: () => ({ meta: [{ title: "自定义插画｜宝宝成长相册" }] }),
  component: IllustrationEditor,
});

const slotDetails: Array<{
  id: IllustrationSlotId;
  name: string;
  recommendation: string;
}> = [
  { id: "coverHero", name: "封面主插画", recommendation: "竖版透明图，建议 1200 × 1500" },
  { id: "coverDecoration", name: "封面小装饰", recommendation: "透明图，建议 600 × 600" },
  { id: "pageTexture", name: "页面背景纹理", recommendation: "可平铺纹理，建议 1200 × 1200" },
  { id: "timelineMarker", name: "时间轴节点", recommendation: "小型透明图，建议 256 × 256" },
  { id: "cardDecoration", name: "卡片角落装饰", recommendation: "横版透明图，建议 600 × 300" },
  { id: "noteDecoration", name: "便签装饰", recommendation: "透明图，建议 500 × 500" },
  { id: "noteBackground", name: "便签背景", recommendation: "竖版浅色纹理，建议 900 × 1200" },
  { id: "emptyState", name: "空内容插画", recommendation: "方形透明图，建议 800 × 800" },
];

function IllustrationEditor() {
  const { album, status } = useAlbumDraft();
  const [message, setMessage] = useState("");
  const [draftIllustrations, setDraftIllustrations] = useState(album.customIllustrations ?? {});
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const allowNavigationRef = useRef(false);

  useEffect(() => {
    if (status === "loading" || initializedRef.current) return;
    setDraftIllustrations({ ...(album.customIllustrations ?? {}) });
    initializedRef.current = true;
  }, [album.customIllustrations, status]);

  const isDirty = useMemo(
    () => JSON.stringify(draftIllustrations) !== JSON.stringify(album.customIllustrations ?? {}),
    [album.customIllustrations, draftIllustrations],
  );

  useEffect(() => {
    if (!isDirty) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warnBeforeUnload);
    return () => window.removeEventListener("beforeunload", warnBeforeUnload);
  }, [isDirty]);

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f1eb] text-[#2e2a25]">
        <div className="text-center">
          <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          <p className="mt-4 text-sm font-bold">正在读取插画设置</p>
        </div>
      </main>
    );
  }

  const setIllustration = (slotId: IllustrationSlotId, value?: string) => {
    setDraftIllustrations((current) => {
      const customIllustrations = { ...current };
      if (value) customIllustrations[slotId] = value;
      else delete customIllustrations[slotId];
      return customIllustrations;
    });
  };

  const saveIllustrations = async () => {
    try {
      await saveAlbumDraft({ ...album, customIllustrations: draftIllustrations });
      setMessage("自定义插画已保存");
      return true;
    } catch {
      setMessage("保存失败，请重试");
      return false;
    }
  };

  const upload = async (slotId: IllustrationSlotId, file?: File) => {
    if (!file) return;
    try {
      setMessage(`正在处理“${slotDetails.find((item) => item.id === slotId)?.name}”…`);
      setIllustration(slotId, await processIllustration(file));
      setMessage("插画已进入预览，点击“保存插画”后生效");
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
              onClick={(event) => {
                if (!isDirty) return;
                event.preventDefault();
                setLeaveTarget("/editor");
              }}
              aria-label="返回编辑台"
              className="grid size-10 place-items-center rounded-full bg-white shadow-sm"
            >
              <ArrowLeft className="size-4" />
            </a>
            <div>
              <p className="text-[10px] tracking-[.25em] text-neutral-400">ILLUSTRATION SLOTS</p>
              <h1 className="text-xl font-bold">自定义插画</h1>
            </div>
          </div>
          <button
            type="button"
            disabled={!isDirty}
            onClick={() => void saveIllustrations()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black px-4 text-[11px] text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Save className="size-3.5" /> 保存插画
          </button>
        </header>

        <div className="mt-6 rounded-3xl border border-black/5 bg-white/65 p-5">
          <p className="text-sm font-bold">在预留位置替换插画</p>
          <p className="mt-1 text-xs leading-6 text-neutral-500">
            只替换预先设计好的位置，不改变整体排版。支持 PNG、WebP、SVG，单个文件不超过
            4MB；确认预览效果后，请点击右上角“保存插画”。
          </p>
          {message && (
            <p role="status" className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-xs">
              {message}
            </p>
          )}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {slotDetails.map((slot) => {
            const custom = draftIllustrations[slot.id];
            const source = custom ?? fixedAlbumTheme.illustrations[slot.id];
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
                    <span className="text-xs text-neutral-400">默认留白</span>
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
      {leaveTarget && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-4 sm:place-items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-illustrations-title"
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
          >
            <h2 id="unsaved-illustrations-title" className="text-lg font-bold">
              插画还没有保存
            </h2>
            <p className="mt-2 text-xs leading-6 text-neutral-500">
              你可以保存后离开，也可以放弃本次插画修改。
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (await saveIllustrations()) {
                    allowNavigationRef.current = true;
                    window.location.assign(leaveTarget);
                  }
                }}
                className="min-h-11 rounded-xl bg-black px-4 text-xs text-white"
              >
                保存并离开
              </button>
              <button
                type="button"
                onClick={() => {
                  allowNavigationRef.current = true;
                  window.location.assign(leaveTarget);
                }}
                className="min-h-11 rounded-xl bg-red-50 px-4 text-xs text-red-600"
              >
                放弃修改
              </button>
              <button
                type="button"
                onClick={() => setLeaveTarget(null)}
                className="min-h-11 rounded-xl bg-neutral-100 px-4 text-xs"
              >
                继续编辑
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  );
}
