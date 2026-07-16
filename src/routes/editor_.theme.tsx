import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, ImagePlus, RotateCcw, Save } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AlbumNavigation } from "@/components/album/AlbumNavigation";
import { demoAlbum } from "@/data/demo-album";
import { useAlbumDraft } from "@/hooks/use-album-draft";
import { saveAlbumDraft } from "@/lib/album-store";
import { processIllustration } from "@/lib/illustration-processing";
import { fixedAlbumTheme } from "@/themes/album-themes";
import type { IllustrationSlotId } from "@/types/album";

export const Route = createFileRoute("/editor_/theme")({
  head: () => ({ meta: [{ title: "个性化设置｜宝宝成长相册" }] }),
  component: IllustrationEditor,
});

type SlotDetail = {
  id: IllustrationSlotId;
  name: string;
  location: string;
  recommendation: string;
};

const slotGroups: Array<{
  name: string;
  description: string;
  slots: SlotDetail[];
}> = [
  {
    name: "首页",
    description: "控制首页封面和成长章节分界处的插画。",
    slots: [
      {
        id: "coverHero",
        name: "封面主插画",
        location: "宝宝姓名下方的主视觉",
        recommendation: "竖版透明图，建议 1200 × 1500",
      },
      {
        id: "coverDecoration",
        name: "章节分界装饰",
        location: "首页与成长章节的颜色分界处",
        recommendation: "透明图，建议 600 × 600",
      },
    ],
  },
];

const slotDetails = slotGroups.flatMap((group) => group.slots);

type ChapterDraft = {
  id: string;
  title: string;
  icon: string;
};

function getChapterDrafts(chapters: typeof demoAlbum.chapters): ChapterDraft[] {
  return chapters.map(({ id, title, icon }) => ({ id, title, icon }));
}

function IllustrationEditor() {
  const { album, status } = useAlbumDraft();
  const [message, setMessage] = useState("");
  const [draftIllustrations, setDraftIllustrations] = useState(album.customIllustrations ?? {});
  const [draftChapters, setDraftChapters] = useState<ChapterDraft[]>(
    getChapterDrafts(album.chapters),
  );
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const initializedRef = useRef(false);
  const allowNavigationRef = useRef(false);

  useEffect(() => {
    if (status === "loading" || initializedRef.current) return;
    setDraftIllustrations({ ...(album.customIllustrations ?? {}) });
    setDraftChapters(getChapterDrafts(album.chapters));
    initializedRef.current = true;
  }, [album.chapters, album.customIllustrations, status]);

  const isDirty = useMemo(
    () =>
      JSON.stringify(draftIllustrations) !== JSON.stringify(album.customIllustrations ?? {}) ||
      JSON.stringify(draftChapters) !== JSON.stringify(getChapterDrafts(album.chapters)),
    [album.chapters, album.customIllustrations, draftChapters, draftIllustrations],
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

  const saveSettings = async () => {
    const normalizedChapters = draftChapters.map((chapter) => ({
      ...chapter,
      title: chapter.title.trim(),
    }));
    if (normalizedChapters.some((chapter) => !chapter.title)) {
      setMessage("章节名称不能为空");
      return false;
    }
    try {
      const draftById = new Map(normalizedChapters.map((chapter) => [chapter.id, chapter]));
      await saveAlbumDraft({
        ...album,
        customIllustrations: draftIllustrations,
        chapters: album.chapters.map((chapter) => {
          const draft = draftById.get(chapter.id);
          return draft ? { ...chapter, title: draft.title, icon: draft.icon } : chapter;
        }),
      });
      setDraftChapters(normalizedChapters);
      setMessage("个性化设置已保存");
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

  const updateChapter = (chapterId: string, patch: Partial<Omit<ChapterDraft, "id">>) => {
    setDraftChapters((current) =>
      current.map((chapter) => (chapter.id === chapterId ? { ...chapter, ...patch } : chapter)),
    );
  };

  const uploadChapterIcon = async (chapterId: string, file?: File) => {
    if (!file) return;
    const chapter = draftChapters.find((item) => item.id === chapterId);
    try {
      setMessage(`正在处理“${chapter?.title ?? "成长章节"}”插画…`);
      updateChapter(chapterId, { icon: await processIllustration(file) });
      setMessage("章节插画已进入预览，点击“保存设置”后生效");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "章节插画处理失败");
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-4 pb-6 pt-[72px] text-[#2e2a25] sm:px-7">
      <AlbumNavigation active="profile" />
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/editor/profile"
              onClick={(event) => {
                if (!isDirty) return;
                event.preventDefault();
                setLeaveTarget("/editor/profile");
              }}
              aria-label="返回编辑台"
              className="grid size-10 place-items-center rounded-full bg-white shadow-sm"
            >
              <ArrowLeft className="size-4" />
            </a>
            <div>
              <p className="text-[10px] tracking-[.25em] text-neutral-400">PERSONALIZATION</p>
              <h1 className="text-xl font-bold">个性化设置</h1>
            </div>
          </div>
          <button
            type="button"
            disabled={!isDirty}
            onClick={() => void saveSettings()}
            className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black px-4 text-[11px] text-white disabled:cursor-not-allowed disabled:opacity-35"
          >
            <Save className="size-3.5" /> 保存设置
          </button>
        </header>

        <div className="mt-6 rounded-3xl border border-black/5 bg-white/65 p-5">
          <p className="text-sm font-bold">修改插画和成长章节</p>
          <p className="mt-1 text-xs leading-6 text-neutral-500">
            支持 PNG、WebP、SVG，单个文件不超过 4MB；章节名称最多12个字符。确认效果后，
            请点击右上角“保存设置”。
          </p>
          {message && (
            <p role="status" className="mt-3 rounded-xl bg-neutral-100 px-3 py-2 text-xs">
              {message}
            </p>
          )}
        </div>

        <div className="mt-5 space-y-6">
          {slotGroups.map((group) => (
            <section key={group.name}>
              <h2 className="text-base font-bold">{group.name}</h2>
              <p className="mt-1 text-xs text-neutral-500">{group.description}</p>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.slots.map((slot) => {
                  const custom = draftIllustrations[slot.id];
                  const source = custom ?? fixedAlbumTheme.illustrations[slot.id];
                  return (
                    <article
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
                          <h3 className="text-sm font-bold">{slot.name}</h3>
                          <p className="mt-1 text-[10px] leading-4 text-neutral-500">
                            位置：{slot.location}
                          </p>
                          <p className="mt-1 text-[10px] leading-4 text-neutral-400">
                            {slot.recommendation}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 rounded-full px-2 py-1 text-[9px] ${
                            custom
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-neutral-100 text-neutral-500"
                          }`}
                        >
                          {custom ? "已自定义" : "使用默认"}
                        </span>
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
                    </article>
                  );
                })}
              </div>
            </section>
          ))}

          <section>
            <h2 className="text-base font-bold">成长章节</h2>
            <p className="mt-1 text-xs text-neutral-500">
              六个章节可以分别修改名称和插画，保存后会同步到目录、章节详情和编辑页面。
            </p>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {draftChapters.map((chapter) => {
                const defaultChapter = demoAlbum.chapters.find((item) => item.id === chapter.id);
                const isCustom =
                  chapter.title !== defaultChapter?.title || chapter.icon !== defaultChapter?.icon;
                return (
                  <article
                    key={chapter.id}
                    className="overflow-hidden rounded-3xl border border-black/5 bg-white p-4 shadow-sm"
                  >
                    <div
                      className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl"
                      style={{ background: defaultChapter?.bg ?? "#f5f1e9" }}
                    >
                      <img
                        src={chapter.icon}
                        alt={`${chapter.title}章节插画`}
                        className="h-full w-full object-contain p-3"
                      />
                    </div>
                    <div className="mt-4 flex items-center justify-between gap-2">
                      <label className="text-xs font-bold" htmlFor={`chapter-title-${chapter.id}`}>
                        章节名称
                      </label>
                      <span
                        className={`rounded-full px-2 py-1 text-[9px] ${
                          isCustom
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {isCustom ? "已修改" : "使用默认"}
                      </span>
                    </div>
                    <input
                      id={`chapter-title-${chapter.id}`}
                      aria-label={`${defaultChapter?.title ?? chapter.id}章节名称`}
                      value={chapter.title}
                      maxLength={12}
                      onChange={(event) => updateChapter(chapter.id, { title: event.target.value })}
                      className="mt-2 min-h-10 w-full rounded-xl border border-black/10 px-3 text-xs outline-none focus:border-black/30"
                    />
                    <label className="mt-3 inline-flex min-h-10 w-full cursor-pointer items-center justify-center gap-1 rounded-xl bg-black px-3 text-[10px] text-white">
                      <ImagePlus className="size-3" /> 替换章节插画
                      <input
                        type="file"
                        accept="image/png,image/webp,image/svg+xml"
                        className="sr-only"
                        onChange={(event) => {
                          void uploadChapterIcon(chapter.id, event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={chapter.title === defaultChapter?.title}
                        onClick={() =>
                          defaultChapter &&
                          updateChapter(chapter.id, { title: defaultChapter.title })
                        }
                        className="min-h-9 rounded-xl bg-neutral-100 px-2 text-[9px] disabled:opacity-35"
                      >
                        恢复默认名称
                      </button>
                      <button
                        type="button"
                        disabled={chapter.icon === defaultChapter?.icon}
                        onClick={() =>
                          defaultChapter && updateChapter(chapter.id, { icon: defaultChapter.icon })
                        }
                        aria-label={`恢复${defaultChapter?.title ?? chapter.id}默认插画`}
                        className="min-h-9 rounded-xl bg-neutral-100 px-2 text-[9px] disabled:opacity-35"
                      >
                        恢复默认插画
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        </div>
      </div>
      {leaveTarget && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-4 sm:place-items-center">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="unsaved-settings-title"
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
          >
            <h2 id="unsaved-settings-title" className="text-lg font-bold">
              个性化设置还没有保存
            </h2>
            <p className="mt-2 text-xs leading-6 text-neutral-500">
              你可以保存后离开，也可以放弃本次修改。
            </p>
            <div className="mt-5 grid gap-2">
              <button
                type="button"
                onClick={async () => {
                  if (await saveSettings()) {
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
