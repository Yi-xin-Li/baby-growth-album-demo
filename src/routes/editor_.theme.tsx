import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowLeft,
  ImagePlus,
  Music2,
  Pause,
  Play,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlbumNavigation } from "@/components/album/AlbumNavigation";
import { PersistentEditorSection } from "@/components/editor/PersistentEditorSection";
import { demoAlbum } from "@/data/demo-album";
import { useAlbumDraft } from "@/hooks/use-album-draft";
import { saveAlbumDraft } from "@/lib/album-store";
import { processIllustration } from "@/lib/illustration-processing";
import { processBackground, processBackgroundMusic } from "@/lib/personalization-media";
import { fixedAlbumTheme } from "@/themes/album-themes";
import type { GrowthAlbum, IllustrationSlotId } from "@/types/album";

export const Route = createFileRoute("/editor_/theme")({
  head: () => ({ meta: [{ title: "个性化设置｜宝宝成长相册" }] }),
  component: PersonalizationEditor,
});

type ChapterDraft = { id: string; title: string; icon: string };
type MusicDraft = NonNullable<GrowthAlbum["backgroundMusic"]>;
type Notice = { text: string; duration: number | null; id: number };

const illustrationAccept =
  "image/jpeg,image/png,image/webp,image/svg+xml,image/avif,.jpg,.jpeg,.png,.webp,.svg,.avif";

const homeSlots: Array<{
  id: IllustrationSlotId;
  name: string;
  location: string;
  recommendation: string;
}> = [
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
];

function getChapterDrafts(chapters: GrowthAlbum["chapters"]): ChapterDraft[] {
  return chapters.map(({ id, title, icon }) => ({ id, title, icon }));
}

function PersonalizationEditor() {
  const { album, status } = useAlbumDraft();
  const [notice, setNotice] = useState<Notice | null>(null);
  const [draftBackground, setDraftBackground] = useState(album.customBackground);
  const [draftBackgroundOpacity, setDraftBackgroundOpacity] = useState(
    album.backgroundOpacity ?? 0.22,
  );
  const [draftMusic, setDraftMusic] = useState<MusicDraft | undefined>(album.backgroundMusic);
  const [draftIllustrations, setDraftIllustrations] = useState(album.customIllustrations ?? {});
  const [draftChapters, setDraftChapters] = useState(() => getChapterDrafts(album.chapters));
  const [leaveTarget, setLeaveTarget] = useState<string | null>(null);
  const [previewPlaying, setPreviewPlaying] = useState(false);
  const initializedRef = useRef(false);
  const allowNavigationRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const showNotice = useCallback((text: string, duration: number | null = 3000) => {
    setNotice({ text, duration, id: Date.now() });
  }, []);

  useEffect(() => {
    if (!notice || notice.duration === null) return;
    const timer = window.setTimeout(() => setNotice(null), notice.duration);
    return () => window.clearTimeout(timer);
  }, [notice]);

  const resetDrafts = useCallback(() => {
    setDraftBackground(album.customBackground);
    setDraftBackgroundOpacity(album.backgroundOpacity ?? 0.22);
    setDraftMusic(album.backgroundMusic ? { ...album.backgroundMusic } : undefined);
    setDraftIllustrations({ ...(album.customIllustrations ?? {}) });
    setDraftChapters(getChapterDrafts(album.chapters));
    setPreviewPlaying(false);
    audioRef.current?.pause();
  }, [album]);

  useEffect(() => {
    if (status === "loading" || initializedRef.current) return;
    resetDrafts();
    initializedRef.current = true;
  }, [resetDrafts, status]);

  useEffect(() => {
    if (!audioRef.current || !draftMusic) return;
    audioRef.current.volume = draftMusic.volume;
    audioRef.current.loop = draftMusic.loop;
  }, [draftMusic]);

  const isDirty = useMemo(
    () =>
      draftBackground !== album.customBackground ||
      draftBackgroundOpacity !== (album.backgroundOpacity ?? 0.22) ||
      JSON.stringify(draftMusic) !== JSON.stringify(album.backgroundMusic) ||
      JSON.stringify(draftIllustrations) !== JSON.stringify(album.customIllustrations ?? {}) ||
      JSON.stringify(draftChapters) !== JSON.stringify(getChapterDrafts(album.chapters)),
    [album, draftBackground, draftBackgroundOpacity, draftChapters, draftIllustrations, draftMusic],
  );

  useEffect(() => {
    if (!isDirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      if (allowNavigationRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [isDirty]);

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f1eb] text-[#2e2a25]">
        <div className="text-center">
          <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          <p className="mt-4 text-sm font-bold">正在读取个性化设置</p>
        </div>
      </main>
    );
  }

  const setIllustration = (slotId: IllustrationSlotId, value?: string) => {
    setDraftIllustrations((current) => {
      const next = { ...current };
      if (value) next[slotId] = value;
      else delete next[slotId];
      return next;
    });
  };

  const updateChapter = (id: string, patch: Partial<Omit<ChapterDraft, "id">>) => {
    setDraftChapters((current) =>
      current.map((chapter) => (chapter.id === id ? { ...chapter, ...patch } : chapter)),
    );
  };

  const saveSettings = async () => {
    const chapters = draftChapters.map((chapter) => ({ ...chapter, title: chapter.title.trim() }));
    if (chapters.some((chapter) => !chapter.title)) {
      showNotice("章节名称不能为空", 6000);
      return false;
    }
    try {
      const chapterById = new Map(chapters.map((chapter) => [chapter.id, chapter]));
      await saveAlbumDraft({
        ...album,
        customBackground: draftBackground,
        backgroundOpacity: draftBackgroundOpacity,
        backgroundMusic: draftMusic,
        customIllustrations: draftIllustrations,
        chapters: album.chapters.map((chapter) => {
          const draft = chapterById.get(chapter.id);
          return draft ? { ...chapter, title: draft.title, icon: draft.icon } : chapter;
        }),
      });
      setDraftChapters(chapters);
      showNotice("个性化设置已保存");
      return true;
    } catch {
      showNotice("保存失败，请重试", 6000);
      return false;
    }
  };

  const uploadBackground = async (file?: File) => {
    if (!file) return;
    try {
      showNotice("正在压缩背景图片…", null);
      setDraftBackground(await processBackground(file));
      showNotice("背景已进入预览，保存后应用到展示页");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "背景处理失败", 6000);
    }
  };

  const uploadMusic = async (file?: File) => {
    if (!file) return;
    try {
      audioRef.current?.pause();
      setPreviewPlaying(false);
      showNotice("正在读取背景音乐…", null);
      setDraftMusic(await processBackgroundMusic(file));
      showNotice("音乐已进入试听列表，保存后应用到展示页");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "音乐处理失败", 6000);
    }
  };

  const uploadIllustration = async (slotId: IllustrationSlotId, file?: File) => {
    if (!file) return;
    try {
      showNotice("正在处理插画…", null);
      setIllustration(slotId, await processIllustration(file));
      showNotice("插画已进入预览，保存后生效");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "插画处理失败", 6000);
    }
  };

  const uploadChapterIcon = async (chapterId: string, file?: File) => {
    if (!file) return;
    try {
      showNotice("正在处理章节插画…", null);
      updateChapter(chapterId, { icon: await processIllustration(file) });
      showNotice("章节插画已进入预览，保存后生效");
    } catch (error) {
      showNotice(error instanceof Error ? error.message : "章节插画处理失败", 6000);
    }
  };

  const requestNavigation = (target: string) => {
    if (!isDirty) return true;
    setLeaveTarget(target);
    return false;
  };

  return (
    <main className="min-h-screen bg-[#f4f1eb] px-4 pb-8 pt-[72px] text-[#2e2a25] sm:px-7">
      <AlbumNavigation active="profile" autoHide onNavigate={requestNavigation} />
      <div className="mx-auto max-w-5xl">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <a
              href="/editor/profile"
              onClick={(event) => {
                if (!requestNavigation("/editor/profile")) event.preventDefault();
              }}
              aria-label="返回宝宝档案"
              className="grid size-10 place-items-center rounded-full bg-white shadow-sm"
            >
              <ArrowLeft className="size-4" />
            </a>
            <div>
              <p className="text-[10px] tracking-[.25em] text-neutral-400">PERSONALIZATION</p>
              <h1 className="text-xl font-bold">个性化设置</h1>
            </div>
          </div>
          <div className="flex gap-2">
            {isDirty && (
              <button
                type="button"
                onClick={() => {
                  resetDrafts();
                  showNotice("已放弃未保存的修改");
                }}
                className="min-h-10 rounded-full bg-white px-4 text-[11px] shadow-sm"
              >
                放弃修改
              </button>
            )}
            <button
              type="button"
              disabled={!isDirty}
              onClick={() => void saveSettings()}
              className="inline-flex min-h-10 items-center gap-2 rounded-full bg-black px-4 text-[11px] text-white disabled:cursor-not-allowed disabled:opacity-35"
            >
              <Save className="size-3.5" /> 保存设置
            </button>
          </div>
        </header>

        {notice && (
          <div
            key={notice.id}
            role="status"
            className="fixed left-1/2 top-1/2 z-[80] flex w-[calc(100%_-_2rem)] max-w-sm -translate-x-1/2 -translate-y-1/2 items-center justify-between gap-3 rounded-2xl bg-black px-4 py-3 text-xs text-white shadow-2xl sm:static sm:mt-5 sm:w-auto sm:max-w-none sm:translate-x-0 sm:translate-y-0 sm:shadow-none"
          >
            <span className="flex-1 text-center">{notice.text}</span>
            <button
              type="button"
              aria-label="关闭提示"
              onClick={() => setNotice(null)}
              className="grid size-7 shrink-0 place-items-center rounded-full bg-white/10"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )}

        <div className="mt-5 space-y-5">
          <PersistentEditorSection
            title="页面背景"
            description="没有自定义背景时继续使用当前纸张底色。支持 JPG、PNG、WebP，最大 4MB。"
            storageKey="baby-album-ui:personalization-background"
            defaultOpen
          >
            <div
              className="grid min-h-64 place-items-center overflow-hidden rounded-2xl border border-black/5 bg-[#faf7ef] p-5"
              style={
                draftBackground
                  ? {
                      backgroundImage: `linear-gradient(rgba(250,247,239,${1 - draftBackgroundOpacity}), rgba(250,247,239,${1 - draftBackgroundOpacity})), url(${draftBackground})`,
                      backgroundPosition: "center top",
                      backgroundRepeat: "repeat-y",
                      backgroundSize: "100% auto",
                    }
                  : undefined
              }
            >
              <span className="rounded-full bg-white/80 px-4 py-2 text-xs shadow-sm">
                {draftBackground ? "自定义背景预览" : "当前纸张背景"}
              </span>
            </div>
            <label className="mt-4 block rounded-2xl bg-white/75 p-4 text-xs font-bold">
              <span className="flex items-center justify-between gap-3">
                <span>背景透明度</span>
                <span>{Math.round(draftBackgroundOpacity * 100)}%</span>
              </span>
              <input
                aria-label="背景透明度"
                type="range"
                min="0"
                max="0.65"
                step="0.01"
                value={draftBackgroundOpacity}
                disabled={!draftBackground}
                onChange={(event) => setDraftBackgroundOpacity(Number(event.target.value))}
                className="mt-3 block w-full accent-black disabled:opacity-35"
              />
              <span className="mt-2 block font-normal leading-5 text-neutral-400">
                数值越高，背景图片越明显；没有上传背景时此设置不会影响纸张底色。
              </span>
            </label>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-black px-4 text-xs text-white">
                <ImagePlus className="size-3.5" /> 上传背景
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  onChange={(event) => {
                    void uploadBackground(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              <button
                type="button"
                disabled={!draftBackground}
                onClick={() => setDraftBackground(undefined)}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-neutral-100 px-4 text-xs disabled:opacity-35"
              >
                <RotateCcw className="size-3.5" /> 恢复纸张背景
              </button>
            </div>
          </PersistentEditorSection>

          <PersistentEditorSection
            title="背景音乐"
            description="仅支持 MP3，最大 8MB。音乐不会自动播放，请确认素材拥有可使用版权。"
            storageKey="baby-album-ui:personalization-music"
          >
            {draftMusic && (
              <audio
                ref={audioRef}
                src={draftMusic.source}
                onPlay={() => setPreviewPlaying(true)}
                onPause={() => setPreviewPlaying(false)}
                onEnded={() => setPreviewPlaying(false)}
              />
            )}
            <div className="rounded-2xl bg-white/75 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold">{draftMusic?.name ?? "尚未添加音乐"}</p>
                  <p className="mt-1 text-[10px] text-neutral-400">默认暂停，由访客主动点击播放</p>
                </div>
                {draftMusic && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!audioRef.current) return;
                      if (previewPlaying) audioRef.current.pause();
                      else void audioRef.current.play();
                    }}
                    className="grid size-10 place-items-center rounded-full bg-black text-white"
                    aria-label={previewPlaying ? "暂停试听" : "开始试听"}
                  >
                    {previewPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
                  </button>
                )}
              </div>
              {draftMusic && (
                <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto] sm:items-center">
                  <label className="text-xs">
                    音量 {Math.round(draftMusic.volume * 100)}%
                    <input
                      type="range"
                      min="0"
                      max="1"
                      step="0.05"
                      value={draftMusic.volume}
                      onChange={(event) =>
                        setDraftMusic({ ...draftMusic, volume: Number(event.target.value) })
                      }
                      className="mt-2 block w-full accent-black"
                    />
                  </label>
                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={draftMusic.loop}
                      onChange={(event) =>
                        setDraftMusic({ ...draftMusic, loop: event.target.checked })
                      }
                      className="size-4 accent-black"
                    />
                    循环播放
                  </label>
                </div>
              )}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-black px-4 text-xs text-white">
                <Music2 className="size-3.5" /> {draftMusic ? "替换音乐" : "上传音乐"}
                <input
                  type="file"
                  accept="audio/mpeg,.mp3"
                  className="sr-only"
                  onChange={(event) => {
                    void uploadMusic(event.target.files?.[0]);
                    event.target.value = "";
                  }}
                />
              </label>
              {draftMusic && (
                <button
                  type="button"
                  onClick={() => {
                    audioRef.current?.pause();
                    setPreviewPlaying(false);
                    setDraftMusic(undefined);
                  }}
                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-50 px-4 text-xs text-red-600"
                >
                  <Trash2 className="size-3.5" /> 删除音乐
                </button>
              )}
            </div>
          </PersistentEditorSection>

          <PersistentEditorSection
            title="首页插画"
            description="替换封面主插画与成长章节分界装饰。支持 JPG、PNG、WebP、SVG、AVIF，最大 4MB。"
            storageKey="baby-album-ui:personalization-home-art"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {homeSlots.map((slot) => {
                const custom = draftIllustrations[slot.id];
                const source = custom ?? fixedAlbumTheme.illustrations[slot.id];
                return (
                  <article key={slot.id} className="rounded-3xl bg-white p-4 shadow-sm">
                    <div className="grid aspect-[4/3] place-items-center overflow-hidden rounded-2xl bg-[linear-gradient(145deg,#faf7f0,#eef2e7)]">
                      <img
                        src={source}
                        alt={slot.name}
                        className="h-full w-full object-contain p-3"
                      />
                    </div>
                    <h3 className="mt-4 text-sm font-bold">{slot.name}</h3>
                    <p className="mt-1 text-[10px] text-neutral-500">位置：{slot.location}</p>
                    <p className="mt-1 text-[10px] text-neutral-400">{slot.recommendation}</p>
                    <div className="mt-4 flex gap-2">
                      <label className="inline-flex min-h-10 flex-1 cursor-pointer items-center justify-center gap-1 rounded-xl bg-black px-3 text-[10px] text-white">
                        <ImagePlus className="size-3" /> 替换插画
                        <input
                          type="file"
                          accept={illustrationAccept}
                          className="sr-only"
                          onChange={(event) => {
                            void uploadIllustration(slot.id, event.target.files?.[0]);
                            event.target.value = "";
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        disabled={!custom}
                        onClick={() => setIllustration(slot.id)}
                        className="grid size-10 place-items-center rounded-xl bg-neutral-100 disabled:opacity-30"
                        aria-label={`恢复${slot.name}默认插画`}
                      >
                        <RotateCcw className="size-3.5" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </PersistentEditorSection>

          <PersistentEditorSection
            title="成长章节"
            description="六个章节可以分别修改名称和插画，保存后同步到目录和章节详情。"
            storageKey="baby-album-ui:personalization-chapters"
          >
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {draftChapters.map((chapter) => {
                const defaultChapter = demoAlbum.chapters.find((item) => item.id === chapter.id);
                return (
                  <article key={chapter.id} className="rounded-3xl bg-white p-4 shadow-sm">
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
                    <label
                      className="mt-4 block text-xs font-bold"
                      htmlFor={`chapter-title-${chapter.id}`}
                    >
                      章节名称
                    </label>
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
                        accept={illustrationAccept}
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
                        className="min-h-9 rounded-xl bg-neutral-100 px-2 text-[9px] disabled:opacity-35"
                      >
                        恢复默认插画
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          </PersistentEditorSection>
        </div>
      </div>

      {leaveTarget && (
        <div className="fixed inset-0 z-50 grid place-items-end bg-black/35 p-4 sm:place-items-center">
          <section
            className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl"
            role="dialog"
            aria-modal="true"
          >
            <h2 className="text-lg font-bold">个性化设置还没有保存</h2>
            <p className="mt-2 text-xs leading-6 text-neutral-500">保存后离开，或放弃本次修改。</p>
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
