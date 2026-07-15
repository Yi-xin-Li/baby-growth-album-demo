import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Plus, RotateCcw, Save, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { ReactNode } from "react";
import { useAlbumDraft } from "@/hooks/use-album-draft";
import { albumThemeList } from "@/themes/album-themes";
import type { GrowthAlbum, Story } from "@/types/album";

export const Route = createFileRoute("/editor")({
  head: () => ({ meta: [{ title: "本地编辑台｜宝宝成长相册" }] }),
  component: AlbumEditor,
});

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5";

function AlbumEditor() {
  const { album, setAlbum, reset, status } = useAlbumDraft();
  const [chapterId, setChapterId] = useState(album.chapters[0]?.id ?? "");
  const [storyId, setStoryId] = useState(album.chapters[0]?.stories[0]?.id ?? "");
  const chapter = album.chapters.find((item) => item.id === chapterId) ?? album.chapters[0];
  const story = chapter?.stories.find((item) => item.id === storyId) ?? chapter?.stories[0];
  const activeTheme = albumThemeList.find((theme) => theme.id === album.theme)!;
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

  return (
    <main className="min-h-screen bg-[#f4f1eb] text-[#2e2a25]">
      <header className="sticky top-0 z-30 flex min-h-16 items-center justify-between border-b border-black/5 bg-[#f4f1eb]/90 px-4 backdrop-blur sm:px-7">
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
            <h1 className="font-bold">宝宝相册编辑台</h1>
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

      <div className="mx-auto grid max-w-7xl gap-6 p-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(330px,.85fr)] lg:p-7">
        <div className="space-y-5">
          <EditorSection title="宝宝资料" description="修改后约半秒自动保存，无需点击提交。">
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

          <EditorSection title="主题画风" description="三套主题共用数据，切换不会影响故事内容。">
            <div className="grid gap-3 sm:grid-cols-3">
              {albumThemeList.map((theme) => (
                <button
                  key={theme.id}
                  type="button"
                  onClick={() => setAlbum((current) => ({ ...current, theme: theme.id }))}
                  className={`rounded-2xl border p-3 text-left transition ${album.theme === theme.id ? "border-black bg-white shadow-sm" : "border-black/5 bg-white/45 hover:bg-white/75"}`}
                >
                  <span className="text-xl" style={{ color: theme.swatches[1] }}>
                    {theme.motif}
                  </span>
                  <strong className="mt-2 block text-sm">{theme.name}</strong>
                  <span className="mt-1 block text-[10px] leading-4 text-neutral-500">
                    {theme.description}
                  </span>
                </button>
              ))}
            </div>
            <label className="mt-4 flex min-h-12 items-center justify-between rounded-2xl bg-white/70 px-4 text-xs font-bold">
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
                  setAlbum((current) => ({ ...current, animationEnabled: event.target.checked }))
                }
                className="size-5 accent-black"
              />
            </label>
          </EditorSection>

          <EditorSection
            title="成长故事"
            description={`当前共有 ${storyCount} 篇故事，可在受控结构内新增、修改和删除。`}
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

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs text-amber-900">恢复演示数据会覆盖当前本地草稿。</p>
            <button
              type="button"
              onClick={() => window.confirm("确定恢复默认演示数据吗？") && reset()}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs shadow-sm"
            >
              <RotateCcw className="size-3.5" /> 恢复演示数据
            </button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="overflow-hidden rounded-[2rem] border border-black/5 bg-white shadow-xl">
            <div className="flex items-center justify-between border-b border-black/5 px-5 py-3">
              <div>
                <p className="text-[10px] tracking-[.2em] text-neutral-400">LIVE PREVIEW</p>
                <p className="text-sm font-bold">实时预览</p>
              </div>
              <a
                href="/"
                target="_blank"
                rel="noreferrer"
                className="rounded-full bg-black px-3 py-2 text-[10px] text-white"
              >
                打开完整网站
              </a>
            </div>
            <div
              className="relative min-h-[520px] overflow-hidden p-7 text-center"
              data-album-theme={album.theme}
              style={{ background: "var(--paper)", color: "var(--ink)" }}
            >
              <div
                className="absolute inset-x-0 top-0 h-2"
                style={{ background: `linear-gradient(90deg, ${activeTheme.swatches.join(",")})` }}
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
      </div>
    </main>
  );
}

function EditorSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-black/5 bg-white/65 p-5 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-neutral-500">{description}</p>
      <div className="mt-5">{children}</div>
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
