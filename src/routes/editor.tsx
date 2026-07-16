import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Download,
  FileUp,
  ImagePlus,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Trash2,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import { AlbumNavigation } from "@/components/album/AlbumNavigation";
import { useAlbumDraft } from "@/hooks/use-album-draft";
import { downloadAlbumJson, parseAlbumJson, validateAlbumForExport } from "@/lib/album-transfer";
import { createImageVariants, maxImagesPerStory } from "@/lib/image-processing";
import { processIllustration } from "@/lib/illustration-processing";
import { getImageSource } from "@/lib/album-media";
import { fixedAlbumTheme } from "@/themes/album-themes";
import type { GrowthAlbum, ImageMedia, Story } from "@/types/album";

export const Route = createFileRoute("/editor")({
  beforeLoad: () => {
    throw redirect({ to: "/editor/profile" });
  },
});

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5";

export type EditorMode = "profile" | "stories";

export function AlbumEditor({ mode }: { mode: EditorMode }) {
  const { album, setAlbum, reset, status } = useAlbumDraft();
  const [chapterId, setChapterId] = useState(album.chapters[0]?.id ?? "");
  const [storyId, setStoryId] = useState(album.chapters[0]?.stories[0]?.id ?? "");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editorMessage, setEditorMessage] = useState("");
  const chapter = album.chapters.find((item) => item.id === chapterId) ?? album.chapters[0];
  const story = chapter?.stories.find((item) => item.id === storyId) ?? chapter?.stories[0];
  const activeTheme = fixedAlbumTheme;
  const statusText = {
    loading: "读取草稿…",
    saving: "正在自动保存…",
    saved: "草稿已保存",
    error: "保存失败",
  }[status];

  const storyCount = useMemo(
    () => album.chapters.reduce((total, item) => total + item.stories.length, 0),
    [album.chapters],
  );

  if (status === "loading") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f1eb] text-[#2e2a25]">
        <div className="text-center">
          <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-black/10 border-t-black" />
          <p className="mt-4 text-sm font-bold">正在读取本地草稿</p>
          <p className="mt-1 text-xs text-neutral-400">读取完成后再开始编辑，避免内容被覆盖。</p>
        </div>
      </main>
    );
  }

  const updateProfile = (key: keyof GrowthAlbum["profile"], value: string) => {
    setAlbum((current) => ({
      ...current,
      profile: { ...current.profile, [key]: value },
    }));
  };

  const updateStory = (patch: Partial<Story>) => {
    if (!chapter || !story) return;
    setAlbum((current) => ({
      ...current,
      chapters: current.chapters.map((item) =>
        item.id === chapter.id
          ? {
              ...item,
              stories: item.stories.map((currentStory) =>
                currentStory.id === story.id ? { ...currentStory, ...patch } : currentStory,
              ),
            }
          : item,
      ),
    }));
  };

  const addStory = () => {
    if (!chapter) return;
    const id = `story-${Date.now()}`;
    const nextStory: Story = {
      id,
      title: "新的成长故事",
      date: new Date().toISOString().slice(0, 10),
      cover: "/images/cover_baby.png",
      note: "写下今天值得记住的小事……",
      thumbs: [],
      extraCount: 0,
    };
    setAlbum((current) => ({
      ...current,
      chapters: current.chapters.map((item) =>
        item.id === chapter.id ? { ...item, stories: [...item.stories, nextStory] } : item,
      ),
    }));
    setStoryId(id);
  };

  const deleteStory = () => {
    if (!chapter || !story || !window.confirm(`确定删除“${story.title}”吗？`)) return;
    const remaining = chapter.stories.filter((item) => item.id !== story.id);
    setAlbum((current) => ({
      ...current,
      chapters: current.chapters.map((item) =>
        item.id === chapter.id ? { ...item, stories: remaining } : item,
      ),
    }));
    setStoryId(remaining[0]?.id ?? "");
  };

  const moveStory = (nextChapterId: string) => {
    if (!chapter || !story || nextChapterId === chapter.id) return;
    setAlbum((current) => ({
      ...current,
      chapters: current.chapters.map((item) => {
        if (item.id === chapter.id) {
          return { ...item, stories: item.stories.filter((entry) => entry.id !== story.id) };
        }
        if (item.id === nextChapterId) return { ...item, stories: [...item.stories, story] };
        return item;
      }),
    }));
    setChapterId(nextChapterId);
    setStoryId(story.id);
  };

  const imageMedia = (story?.media ?? []).filter(
    (item): item is ImageMedia => item.type === "image",
  );

  const uploadImages = async (files: FileList | null) => {
    if (!story || !files?.length) return;
    if (imageMedia.length + files.length > maxImagesPerStory) {
      setEditorMessage(`每篇故事最多 ${maxImagesPerStory} 张照片`);
      return;
    }
    setEditorMessage("");
    try {
      const variants: ImageMedia[] = [];
      for (let index = 0; index < files.length; index += 1) {
        const base = (index / files.length) * 100;
        const item = await createImageVariants(files[index], (progress) =>
          setUploadProgress(Math.round(base + progress / files.length)),
        );
        variants.push(item);
      }
      const existing = story.media ?? [];
      updateStory({
        media: [...existing, ...variants],
        cover: imageMedia.length ? story.cover : getImageSource(variants[0], "thumbnail"),
        thumbs: [...story.thumbs, ...variants.map((item) => getImageSource(item, "thumbnail"))],
        extraCount: 0,
      });
      setEditorMessage(`已生成 ${variants.length} 张图片的缩略图、预览图和高清图`);
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "图片处理失败");
    } finally {
      setUploadProgress(null);
    }
  };

  const reorderImage = (index: number, direction: -1 | 1) => {
    if (!story?.media) return;
    const images = story.media.filter((item): item is ImageMedia => item.type === "image");
    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= images.length) return;
    [images[index], images[nextIndex]] = [images[nextIndex], images[index]];
    const videos = story.media.filter((item) => item.type === "video");
    updateStory({
      media: [...images, ...videos],
      cover: getImageSource(images[0], "thumbnail"),
      thumbs: images.map((item) => getImageSource(item, "thumbnail")),
    });
  };

  const removeImage = (index: number) => {
    if (!story?.media) return;
    const images = story.media.filter((item): item is ImageMedia => item.type === "image");
    images.splice(index, 1);
    const videos = story.media.filter((item) => item.type === "video");
    updateStory({
      media: [...images, ...videos],
      cover: images[0] ? getImageSource(images[0], "thumbnail") : "/images/cover_baby.png",
      thumbs: images.map((item) => getImageSource(item, "thumbnail")),
    });
  };

  const exportJson = () => {
    const errors = validateAlbumForExport(album);
    if (errors.length) return setEditorMessage(errors.join("；"));
    downloadAlbumJson(album);
    setEditorMessage("album.json 已导出");
  };

  const importJson = async (file: File | undefined) => {
    if (!file) return;
    try {
      const imported = parseAlbumJson(await file.text());
      setAlbum(() => imported);
      setChapterId(imported.chapters[0]?.id ?? "");
      setStoryId(imported.chapters[0]?.stories[0]?.id ?? "");
      setEditorMessage("配置导入成功，已自动保存为草稿");
    } catch {
      setEditorMessage("导入失败：请选择有效的 album.json");
    }
  };

  const uploadVideoPoster = async (file?: File) => {
    if (!file) return;
    try {
      setEditorMessage("正在处理视频封面…");
      updateStory({ videoPoster: await processIllustration(file) });
      setEditorMessage("视频封面已更新");
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "视频封面处理失败");
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1eb] pt-[52px] text-[#2e2a25]">
      <AlbumNavigation active={mode} />
      <header className="sticky top-[52px] z-30 flex min-h-14 items-center justify-between border-b border-black/5 bg-[#f4f1eb]/90 px-4 backdrop-blur sm:px-7">
        <div className="flex items-center gap-3">
          <a
            href="/"
            className="grid size-10 place-items-center rounded-full bg-white shadow-sm"
            aria-label="返回展示页"
          >
            <ArrowLeft className="size-4" />
          </a>
          <div>
            <p className="text-[10px] tracking-[0.25em] text-neutral-400">LOCAL ALBUM STUDIO</p>
            <h1 className="font-bold">{mode === "profile" ? "宝宝档案" : "成长记录"}</h1>
          </div>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-neutral-500">
          {status === "saved" ? (
            <Check className="size-3.5 text-emerald-600" />
          ) : (
            <Save className="size-3.5" />
          )}
          <span className="hidden sm:inline">{statusText}</span>
        </div>
      </header>

      {editorMessage && (
        <p
          role="status"
          className="mx-4 mt-4 rounded-2xl bg-black px-4 py-3 text-center text-xs text-white lg:mx-auto lg:max-w-4xl"
        >
          {editorMessage}
        </p>
      )}

      <div
        className={`mx-auto p-4 lg:p-7 ${
          mode === "profile"
            ? "grid max-w-6xl gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(340px,.9fr)]"
            : "max-w-4xl"
        }`}
      >
        <div className={mode === "profile" ? "contents" : "space-y-5"}>
          {mode === "profile" && (
            <>
              <EditorSection
                title="宝宝档案"
                description="修改后约半秒自动保存，无需点击提交。"
                collapsible
                storageKey="baby-album-ui:profile-editor"
                className="order-1 lg:col-start-1 lg:row-start-1"
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <EditorField label="宝宝姓名">
                    <input
                      className={inputClass}
                      value={album.profile.displayName}
                      onChange={(event) => updateProfile("displayName", event.target.value)}
                    />
                  </EditorField>
                  <EditorField label="英文名 / 拼音">
                    <input
                      className={inputClass}
                      value={album.profile.romanizedName}
                      onChange={(event) => updateProfile("romanizedName", event.target.value)}
                    />
                  </EditorField>
                  <EditorField label="出生日期">
                    <input
                      className={inputClass}
                      value={album.profile.birthDate}
                      onChange={(event) => updateProfile("birthDate", event.target.value)}
                    />
                  </EditorField>
                  <EditorField label="欢迎语">
                    <input
                      className={inputClass}
                      value={album.profile.welcome}
                      onChange={(event) => updateProfile("welcome", event.target.value)}
                    />
                  </EditorField>
                </div>
              </EditorSection>

              <EditorSection
                title="动效与个性化"
                description="调整展示动画，或修改页面插画和章节信息。"
                collapsible
                defaultOpen={false}
                storageKey="baby-album-ui:profile-appearance"
                className="order-3 lg:col-span-2 lg:row-start-2"
              >
                <label className="flex min-h-12 items-center justify-between rounded-2xl bg-white/70 px-4 text-xs font-bold">
                  <span>
                    启用温柔动效
                    <span className="mt-1 block font-normal text-neutral-400">
                      关闭后保留静态排版，并继续尊重系统减少动画设置。
                    </span>
                  </span>
                  <input
                    type="checkbox"
                    checked={album.animationEnabled}
                    onChange={(event) =>
                      setAlbum((current) => ({
                        ...current,
                        animationEnabled: event.target.checked,
                      }))
                    }
                    className="size-5 accent-black"
                  />
                </label>
                <label className="mt-3 flex min-h-12 items-center justify-between gap-4 rounded-2xl bg-white/70 px-4 text-xs font-bold">
                  <span>
                    动画速度
                    <span className="mt-1 block font-normal text-neutral-400">
                      舒缓更适合阅读，标准节奏稍快。
                    </span>
                  </span>
                  <select
                    className="rounded-xl border border-black/10 bg-white px-3 py-2 text-xs"
                    value={album.animationSpeed}
                    onChange={(event) =>
                      setAlbum((current) => ({
                        ...current,
                        animationSpeed: event.target.value as GrowthAlbum["animationSpeed"],
                      }))
                    }
                  >
                    <option value="slow">舒缓</option>
                    <option value="normal">标准</option>
                  </select>
                </label>
                <a
                  href="/editor/theme"
                  className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-black px-4 text-xs text-white"
                >
                  <Palette className="size-3.5" /> 个性化设置
                </a>
              </EditorSection>
            </>
          )}

          {mode === "stories" && (
            <>
              <EditorSection
                title="成长记录"
                description={`当前共有 ${storyCount} 篇故事，可在受控结构内新增、修改和删除。`}
                collapsible
                storageKey="baby-album-ui:stories-editor"
              >
                <div className="grid gap-4 sm:grid-cols-[170px_1fr]">
                  <div className="space-y-3">
                    <select
                      className={inputClass}
                      value={chapter?.id ?? ""}
                      onChange={(event) => {
                        const next = album.chapters.find((item) => item.id === event.target.value);
                        setChapterId(event.target.value);
                        setStoryId(next?.stories[0]?.id ?? "");
                      }}
                    >
                      {album.chapters.map((item) => (
                        <option key={item.id} value={item.id}>
                          {item.title}
                        </option>
                      ))}
                    </select>
                    <div className="space-y-1.5">
                      {chapter?.stories.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setStoryId(item.id)}
                          className={`w-full rounded-xl px-3 py-2 text-left text-xs ${story?.id === item.id ? "bg-black text-white" : "bg-white hover:bg-white/70"}`}
                        >
                          <span className="block truncate font-bold">{item.title}</span>
                          <span className="mt-0.5 block opacity-60">{item.date}</span>
                        </button>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={addStory}
                      className="flex min-h-10 w-full items-center justify-center gap-1 rounded-xl border border-dashed border-black/20 text-xs"
                    >
                      <Plus className="size-3.5" /> 新增故事
                    </button>
                  </div>
                  {story ? (
                    <div className="space-y-4 rounded-2xl bg-white/70 p-4">
                      <EditorField label="所属章节">
                        <select
                          className={inputClass}
                          value={chapter.id}
                          onChange={(event) => moveStory(event.target.value)}
                        >
                          {album.chapters.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.title}
                            </option>
                          ))}
                        </select>
                      </EditorField>
                      <EditorField label="故事标题">
                        <input
                          className={inputClass}
                          value={story.title}
                          onChange={(event) => updateStory({ title: event.target.value })}
                        />
                      </EditorField>
                      <EditorField label="故事日期">
                        <input
                          className={inputClass}
                          value={story.date}
                          onChange={(event) => updateStory({ date: event.target.value })}
                        />
                      </EditorField>
                      <EditorField label="封面路径（仅保存相对路径或网络地址）">
                        <input
                          className={inputClass}
                          value={story.cover}
                          onChange={(event) => updateStory({ cover: event.target.value })}
                        />
                      </EditorField>
                      <EditorField label="故事文字">
                        <textarea
                          rows={5}
                          className={inputClass}
                          value={story.note}
                          onChange={(event) => updateStory({ note: event.target.value })}
                        />
                      </EditorField>
                      <div className="grid gap-3 rounded-2xl bg-neutral-50 p-4 sm:grid-cols-2">
                        <EditorField label="视频地址（可选，点击后才加载）">
                          <input
                            className={inputClass}
                            value={story.videoUrl ?? ""}
                            onChange={(event) =>
                              updateStory({ videoUrl: event.target.value || undefined })
                            }
                            placeholder="./media/video/story.mp4"
                          />
                        </EditorField>
                        <div>
                          <p className="text-xs font-bold text-neutral-600">视频封面（可选）</p>
                          <label className="mt-1.5 inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-3 text-xs shadow-sm">
                            <ImagePlus className="size-3.5" /> 上传视频封面
                            <input
                              type="file"
                              accept="image/png,image/webp,image/jpeg"
                              className="sr-only"
                              onChange={(event) => {
                                void uploadVideoPoster(event.target.files?.[0]);
                                event.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                      </div>
                      <div className="rounded-2xl border border-dashed border-black/15 bg-white/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold">照片资源</p>
                            <p className="mt-1 text-[10px] leading-4 text-neutral-400">
                              JPG / PNG / WebP，单张不超过 12MB；自动生成三级 WebP 资源。
                            </p>
                          </div>
                          <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-black px-3 text-xs text-white">
                            <ImagePlus className="size-3.5" /> 上传照片
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              multiple
                              className="sr-only"
                              onChange={(event) => {
                                void uploadImages(event.target.files);
                                event.target.value = "";
                              }}
                            />
                          </label>
                        </div>
                        {uploadProgress !== null && (
                          <div className="mt-4">
                            <div className="mb-1 flex justify-between text-[10px] text-neutral-500">
                              <span>正在压缩并生成资源</span>
                              <span>{uploadProgress}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                              <div
                                className="h-full rounded-full bg-neutral-800 transition-[width]"
                                style={{ width: `${uploadProgress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        {imageMedia.length > 0 && (
                          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {imageMedia.map((item, index) => (
                              <div
                                key={item.id ?? index}
                                className="group relative overflow-hidden rounded-xl bg-neutral-100"
                              >
                                <img
                                  src={getImageSource(item, "thumbnail")}
                                  alt={item.alt ?? "故事照片"}
                                  className="aspect-square w-full object-cover"
                                />
                                <div className="absolute inset-x-1 bottom-1 flex justify-center gap-1 rounded-lg bg-black/55 p-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
                                  <button
                                    type="button"
                                    aria-label="前移照片"
                                    disabled={index === 0}
                                    onClick={() => reorderImage(index, -1)}
                                    className="grid size-7 place-items-center rounded-md bg-white/90 disabled:opacity-30"
                                  >
                                    <ArrowUp className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="后移照片"
                                    disabled={index === imageMedia.length - 1}
                                    onClick={() => reorderImage(index, 1)}
                                    className="grid size-7 place-items-center rounded-md bg-white/90 disabled:opacity-30"
                                  >
                                    <ArrowDown className="size-3" />
                                  </button>
                                  <button
                                    type="button"
                                    aria-label="删除照片"
                                    onClick={() => removeImage(index)}
                                    className="grid size-7 place-items-center rounded-md bg-red-50 text-red-600"
                                  >
                                    <Trash2 className="size-3" />
                                  </button>
                                </div>
                                {index === 0 && (
                                  <span className="absolute left-2 top-2 rounded-full bg-white/90 px-2 py-1 text-[9px] font-bold">
                                    封面
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={deleteStory}
                        className="inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-xs text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="size-3.5" /> 删除这篇故事
                      </button>
                    </div>
                  ) : (
                    <div className="grid min-h-52 place-items-center rounded-2xl border border-dashed border-black/10 text-xs text-neutral-400">
                      这个章节还没有故事
                    </div>
                  )}
                </div>
              </EditorSection>

              <EditorSection
                title="数据管理"
                description="导入、导出或恢复相册数据。"
                collapsible
                defaultOpen={false}
                storageKey="baby-album-ui:stories-data"
              >
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={exportJson}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-black px-4 text-xs text-white"
                  >
                    <Download className="size-3.5" /> 导出 album.json
                  </button>
                  <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-xs shadow-sm">
                    <FileUp className="size-3.5" /> 导入 album.json
                    <input
                      type="file"
                      accept="application/json,.json"
                      className="sr-only"
                      onChange={(event) => {
                        void importJson(event.target.files?.[0]);
                        event.target.value = "";
                      }}
                    />
                  </label>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs text-amber-900">恢复演示数据会覆盖当前本地草稿。</p>
                  <button
                    type="button"
                    onClick={() => window.confirm("确定恢复默认演示数据吗？") && reset()}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs shadow-sm"
                  >
                    <RotateCcw className="size-3.5" /> 恢复演示数据
                  </button>
                </div>
              </EditorSection>
            </>
          )}
        </div>

        {mode === "profile" && (
          <aside className="order-2 lg:col-start-2 lg:row-start-1">
            <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-xl">
              <div className="flex items-center justify-between border-b border-black/5 px-5 py-3">
                <div>
                  <p className="text-[10px] tracking-[.2em] text-neutral-400">LIVE PREVIEW</p>
                  <p className="text-sm font-bold">实时预览</p>
                </div>
                <a
                  href="/preview"
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full bg-black px-3 py-2 text-[10px] text-white"
                >
                  打开完整网站
                </a>
              </div>
              <div
                className="relative min-h-[440px] overflow-hidden p-6 text-center"
                data-album-theme="scrapbook"
                style={{ background: "var(--paper)", color: "var(--ink)" }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-2"
                  style={{
                    background: `linear-gradient(90deg, ${activeTheme.swatches.join(",")})`,
                  }}
                />
                <p className="mt-12 text-[9px] tracking-[.3em] text-neutral-400">
                  {activeTheme.englishName}
                </p>
                <h2 className="mt-4 pl-[.35em] text-3xl font-bold tracking-[.35em]">
                  {album.profile.displayName || "宝宝姓名"}
                </h2>
                <p className="mt-2 text-[10px] tracking-[.25em] text-neutral-500">
                  {album.profile.romanizedName}
                </p>
                <div
                  className="mx-auto mt-10 grid size-40 place-items-center rounded-[40%_60%_48%_52%] text-6xl"
                  style={{ background: `${activeTheme.swatches[1]}35` }}
                >
                  {activeTheme.motif}
                </div>
                <p className="mt-8 text-xs text-neutral-500">{album.profile.birthDate}</p>
                <p className="mx-auto mt-5 max-w-xs text-sm leading-7">{album.profile.welcome}</p>
                <p className="mt-10 text-[10px] tracking-[.25em] text-neutral-400">
                  {storyCount} STORIES · {album.chapters.length} CHAPTERS
                </p>
              </div>
            </div>
          </aside>
        )}
      </div>
    </main>
  );
}

function EditorSection({
  title,
  description,
  children,
  collapsible = false,
  defaultOpen = true,
  storageKey,
  className = "",
}: {
  title: string;
  description: string;
  children: ReactNode;
  collapsible?: boolean;
  defaultOpen?: boolean;
  storageKey?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  useEffect(() => {
    if (!storageKey) return;
    const savedState = window.localStorage.getItem(storageKey);
    if (savedState === "open") setOpen(true);
    if (savedState === "closed") setOpen(false);
  }, [storageKey]);

  const toggle = () => {
    const nextOpen = !open;
    setOpen(nextOpen);
    if (storageKey) window.localStorage.setItem(storageKey, nextOpen ? "open" : "closed");
  };

  return (
    <section
      className={`rounded-3xl border border-black/5 bg-white/65 p-5 shadow-sm sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
        </div>
        {collapsible && (
          <button
            type="button"
            aria-label={`${open ? "收起" : "展开"}${title}`}
            aria-expanded={open}
            onClick={toggle}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-white shadow-sm"
          >
            <ChevronDown className={`size-4 transition-transform ${open ? "rotate-180" : ""}`} />
          </button>
        )}
      </div>
      {(!collapsible || open) && <div className="mt-5">{children}</div>}
    </section>
  );
}

function EditorField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-xs font-bold text-neutral-600">
      {label}
      {children}
    </label>
  );
}
