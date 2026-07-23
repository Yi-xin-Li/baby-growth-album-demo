import { createFileRoute, redirect } from "@tanstack/react-router";
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Check,
  ChevronDown,
  Download,
  FileUp,
  Film,
  ImagePlus,
  Palette,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import { AlbumNavigation } from "@/components/album/AlbumNavigation";
import { SafeImage } from "@/components/album/SafeImage";
import { useAlbumDraft } from "@/hooks/use-album-draft";
import { maxImagesPerStory } from "@/lib/image-processing";
import { getImageSource } from "@/lib/album-media";
import {
  applyCompleteBackup,
  deleteBackendAssetGroup,
  downloadCompleteBackup,
  getStorageStats,
  inspectCompleteBackup,
  saveBackendAlbum,
  uploadBackendAsset,
  uploadBackendPhoto,
  uploadBackendVideo,
  type BackupSummary,
  type StorageStats,
} from "@/lib/backend-api";
import { migrateLegacyAlbum } from "@/lib/legacy-migration";
import { loadLocalAlbumDraft } from "@/lib/album-store";
import type { GrowthAlbum, ImageMedia, Story, VideoMedia } from "@/types/album";

export const Route = createFileRoute("/editor")({
  beforeLoad: () => {
    throw redirect({ to: "/editor/profile" });
  },
});

const inputClass =
  "mt-1.5 min-h-11 w-full rounded-xl border border-black/10 bg-white px-3 py-2 text-sm outline-none transition focus:border-black/30 focus:ring-2 focus:ring-black/5";

const formatBytes = (bytes = 0) => {
  if (bytes < 1024 * 1024) return `${Math.max(0, bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
};

const getStoredImageSource = (item: ImageMedia) =>
  item.thumbnail ?? item.preview ?? item.original ?? item.src ?? "/images/cover_baby.png";

const getStoredCoverSource = (item: ImageMedia) =>
  item.preview ?? item.original ?? item.src ?? item.thumbnail ?? "/images/cover_baby.png";

export type EditorMode = "profile" | "stories";

function updateAlbumStory(
  album: GrowthAlbum,
  chapterId: string,
  storyId: string,
  updater: (story: Story) => Story,
) {
  return {
    ...album,
    chapters: album.chapters.map((chapter) =>
      chapter.id === chapterId
        ? {
            ...chapter,
            stories: chapter.stories.map((story) =>
              story.id === storyId ? updater(story) : story,
            ),
          }
        : chapter,
    ),
  };
}

export function AlbumEditor({ mode }: { mode: EditorMode }) {
  const { album, setAlbum, reset, status, saveNow } = useAlbumDraft();
  const albumRef = useRef(album);
  albumRef.current = album;
  const [chapterId, setChapterId] = useState(album.chapters[0]?.id ?? "");
  const [storyId, setStoryId] = useState(album.chapters[0]?.stories[0]?.id ?? "");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [editorMessage, setEditorMessage] = useState("");
  const [storageStats, setStorageStats] = useState<StorageStats | null>(null);
  const [backupSummary, setBackupSummary] = useState<BackupSummary | null>(null);
  const [importToken, setImportToken] = useState("");
  const [transferBusy, setTransferBusy] = useState(false);
  const [videoBusy, setVideoBusy] = useState(false);
  const [videoUploadProgress, setVideoUploadProgress] = useState<number | null>(null);
  const videoUploadControllerRef = useRef<AbortController | null>(null);
  const operationBusy = transferBusy || videoBusy;
  const chapter = album.chapters.find((item) => item.id === chapterId) ?? album.chapters[0];
  const story = chapter?.stories.find((item) => item.id === storyId) ?? chapter?.stories[0];
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

  useEffect(() => {
    if (status === "loading") return;
    getStorageStats(album.id)
      .then(setStorageStats)
      .catch(() => setStorageStats(null));
  }, [album.id, status]);

  useEffect(() => {
    if (!editorMessage || operationBusy) return;
    const timer = window.setTimeout(() => setEditorMessage(""), 3500);
    return () => window.clearTimeout(timer);
  }, [editorMessage, operationBusy]);

  useEffect(() => {
    if (!operationBusy) return;
    const preventLeaving = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", preventLeaving);
    return () => window.removeEventListener("beforeunload", preventLeaving);
  }, [operationBusy]);

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
    setAlbum((current) =>
      updateAlbumStory(current, chapter.id, story.id, (currentStory) => ({
        ...currentStory,
        ...patch,
      })),
    );
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

  const deleteStory = async () => {
    if (!chapter || !story || !window.confirm(`确定删除“${story.title}”吗？`)) return;
    const removedStory = story;
    const remaining = chapter.stories.filter((item) => item.id !== story.id);
    const nextAlbum = {
      ...albumRef.current,
      chapters: albumRef.current.chapters.map((item) =>
        item.id === chapter.id ? { ...item, stories: remaining } : item,
      ),
    };
    setVideoBusy(true);
    setEditorMessage("正在删除故事及媒体…");
    try {
      await saveNow(nextAlbum);
      setStoryId(remaining[0]?.id ?? "");
      for (const item of removedStory.media ?? []) {
        await deleteBackendAssetGroup(item.id).catch(() => undefined);
        if (item.type === "video") {
          await deleteBackendAssetGroup(item.posterGroupId).catch(() => undefined);
        }
      }
      await deleteBackendAssetGroup(removedStory.coverGroupId).catch(() => undefined);
      setEditorMessage("故事及关联媒体已删除");
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "故事删除失败");
    } finally {
      setVideoBusy(false);
    }
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
  const videoMedia = (story?.media ?? []).find((item): item is VideoMedia => item.type === "video");

  const uploadVideo = async (file?: File) => {
    if (!file || !chapter || !story || videoBusy) return;
    const targetChapterId = chapter.id;
    const targetStoryId = story.id;
    const controller = new AbortController();
    videoUploadControllerRef.current = controller;
    setVideoBusy(true);
    setVideoUploadProgress(0);
    setEditorMessage("正在上传视频…");
    let uploaded: VideoMedia | null = null;
    try {
      uploaded = await uploadBackendVideo(
        album.id,
        file,
        setVideoUploadProgress,
        controller.signal,
      );
      const currentAlbum = albumRef.current;
      const currentStory = currentAlbum.chapters
        .find((item) => item.id === targetChapterId)
        ?.stories.find((item) => item.id === targetStoryId);
      if (!currentStory) throw new Error("目标故事已不存在");
      const previousVideo = currentStory.media?.find(
        (item): item is VideoMedia => item.type === "video",
      );
      const nextAlbum = updateAlbumStory(currentAlbum, targetChapterId, targetStoryId, (entry) => ({
        ...entry,
        media: [
          uploaded as VideoMedia,
          ...(entry.media ?? []).filter((item) => item.type === "image"),
        ],
      }));
      await saveNow(nextAlbum);
      if (previousVideo) {
        await deleteBackendAssetGroup(previousVideo.id).catch(() => undefined);
        await deleteBackendAssetGroup(previousVideo.posterGroupId).catch(() => undefined);
      }
      setEditorMessage(previousVideo ? "视频已替换并保存" : "视频已上传并保存");
    } catch (error) {
      if (uploaded) await deleteBackendAssetGroup(uploaded.id).catch(() => undefined);
      setEditorMessage(
        error instanceof DOMException && error.name === "AbortError"
          ? "视频上传已取消"
          : error instanceof Error
            ? error.message
            : "视频上传失败",
      );
    } finally {
      videoUploadControllerRef.current = null;
      setVideoUploadProgress(null);
      setVideoBusy(false);
    }
  };

  const removeVideo = async () => {
    if (!chapter || !story || !videoMedia || videoBusy) return;
    if (!window.confirm(`确定删除视频“${videoMedia.name}”吗？`)) return;
    setVideoBusy(true);
    setEditorMessage("正在删除视频…");
    try {
      const nextAlbum = updateAlbumStory(albumRef.current, chapter.id, story.id, (entry) => ({
        ...entry,
        media: (entry.media ?? []).filter((item) => item.type !== "video"),
      }));
      await saveNow(nextAlbum);
      await deleteBackendAssetGroup(videoMedia.id);
      await deleteBackendAssetGroup(videoMedia.posterGroupId).catch(() => undefined);
      setEditorMessage("视频已删除");
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "视频删除失败");
    } finally {
      setVideoBusy(false);
    }
  };

  const uploadStoryCover = async (file?: File) => {
    if (!file || !chapter || !story || videoBusy) return;
    const targetChapterId = chapter.id;
    const targetStoryId = story.id;
    setVideoBusy(true);
    setEditorMessage("正在上传故事封面…");
    let uploaded: ImageMedia | null = null;
    try {
      uploaded = await uploadBackendPhoto(albumRef.current, file);
      const currentAlbum = albumRef.current;
      const currentStory = currentAlbum.chapters
        .find((item) => item.id === targetChapterId)
        ?.stories.find((item) => item.id === targetStoryId);
      if (!currentStory) throw new Error("目标故事已不存在");
      const previousCoverGroupId = currentStory.coverGroupId;
      const nextAlbum = updateAlbumStory(currentAlbum, targetChapterId, targetStoryId, (entry) => ({
        ...entry,
        cover: uploaded ? getStoredCoverSource(uploaded) : entry.cover,
        coverGroupId: uploaded?.id,
      }));
      await saveNow(nextAlbum);
      await deleteBackendAssetGroup(previousCoverGroupId).catch(() => undefined);
      setEditorMessage(previousCoverGroupId ? "故事封面已替换并保存" : "故事封面已上传并保存");
    } catch (error) {
      if (uploaded) await deleteBackendAssetGroup(uploaded.id).catch(() => undefined);
      setEditorMessage(error instanceof Error ? error.message : "故事封面上传失败");
    } finally {
      setVideoBusy(false);
    }
  };

  const removeStoryCover = async () => {
    if (!chapter || !story?.coverGroupId || videoBusy) return;
    const coverGroupId = story.coverGroupId;
    const fallbackCover = imageMedia[0]
      ? getStoredImageSource(imageMedia[0])
      : "/images/cover_baby.png";
    setVideoBusy(true);
    setEditorMessage("正在恢复默认封面…");
    try {
      const nextAlbum = updateAlbumStory(albumRef.current, chapter.id, story.id, (entry) => ({
        ...entry,
        cover: fallbackCover,
        coverGroupId: undefined,
      }));
      await saveNow(nextAlbum);
      await deleteBackendAssetGroup(coverGroupId);
      setEditorMessage("已移除自定义故事封面");
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "故事封面移除失败");
    } finally {
      setVideoBusy(false);
    }
  };

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
        const item = await uploadBackendPhoto(album, files[index]);
        setUploadProgress(Math.round(base + 100 / files.length));
        variants.push(item);
      }
      const existing = story.media ?? [];
      updateStory({
        media: [...existing, ...variants],
        cover:
          story.coverGroupId || imageMedia.length ? story.cover : getStoredImageSource(variants[0]),
        thumbs: [...story.thumbs, ...variants.map(getStoredImageSource)],
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
      media: [...videos, ...images],
      cover: story.coverGroupId ? story.cover : getStoredImageSource(images[0]),
      thumbs: images.map(getStoredImageSource),
    });
  };

  const removeImage = (index: number) => {
    if (!story?.media) return;
    const images = story.media.filter((item): item is ImageMedia => item.type === "image");
    const [removed] = images.splice(index, 1);
    void deleteBackendAssetGroup(removed?.id).catch(() => undefined);
    const videos = story.media.filter((item) => item.type === "video");
    updateStory({
      media: [...videos, ...images],
      cover: story.coverGroupId
        ? story.cover
        : images[0]
          ? getStoredImageSource(images[0])
          : "/images/cover_baby.png",
      thumbs: images.map(getStoredImageSource),
    });
  };

  const exportBackup = async () => {
    setTransferBusy(true);
    setEditorMessage("正在保存并生成完整备份…");
    try {
      await saveBackendAlbum(album);
      await downloadCompleteBackup(album.id);
      setEditorMessage("完整备份下载已开始");
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "完整备份导出失败");
    } finally {
      setTransferBusy(false);
    }
  };

  const inspectBackup = async (file: File | undefined) => {
    if (!file) return;
    setTransferBusy(true);
    setEditorMessage("正在检查完整备份…");
    try {
      const result = await inspectCompleteBackup(file, setUploadProgress);
      setImportToken(result.token);
      setBackupSummary(result.summary);
      setEditorMessage("备份检查完成，请确认后恢复");
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "完整备份检查失败");
    } finally {
      setUploadProgress(null);
      setTransferBusy(false);
    }
  };

  const restoreBackup = async () => {
    if (!importToken || !backupSummary) return;
    setTransferBusy(true);
    setEditorMessage("正在恢复完整备份，请勿关闭页面…");
    try {
      const result = await applyCompleteBackup(importToken);
      setAlbum(() => result.album);
      setStorageStats(result.storage);
      setChapterId(result.album.chapters[0]?.id ?? "");
      setStoryId(result.album.chapters[0]?.stories[0]?.id ?? "");
      setBackupSummary(null);
      setImportToken("");
      setEditorMessage("完整备份已恢复");
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "完整备份恢复失败");
    } finally {
      setTransferBusy(false);
    }
  };

  const migrateLegacyData = async () => {
    setTransferBusy(true);
    setEditorMessage("正在将旧缓存素材迁移到后端…");
    try {
      const localAlbum = await loadLocalAlbumDraft();
      const migrated = await migrateLegacyAlbum(localAlbum, setUploadProgress);
      setAlbum(() => migrated);
      setStorageStats(await getStorageStats(album.id));
      setEditorMessage("旧缓存已迁移到后端，浏览器副本仍然保留");
    } catch (error) {
      setEditorMessage(error instanceof Error ? error.message : "旧数据迁移失败");
    } finally {
      setUploadProgress(null);
      setTransferBusy(false);
    }
  };

  const uploadVideoPoster = async (file?: File) => {
    if (!file || !chapter || !story || !videoMedia || videoBusy) return;
    const targetChapterId = chapter.id;
    const targetStoryId = story.id;
    setVideoBusy(true);
    let uploaded: Awaited<ReturnType<typeof uploadBackendAsset>> | null = null;
    try {
      setEditorMessage("正在处理视频封面…");
      uploaded = await uploadBackendAsset(album.id, "illustration", file);
      const currentAlbum = albumRef.current;
      const currentVideo = currentAlbum.chapters
        .find((item) => item.id === targetChapterId)
        ?.stories.find((item) => item.id === targetStoryId)
        ?.media?.find((item): item is VideoMedia => item.type === "video");
      if (!currentVideo) throw new Error("请先上传视频");
      const nextAlbum = updateAlbumStory(currentAlbum, targetChapterId, targetStoryId, (entry) => ({
        ...entry,
        media: (entry.media ?? []).map((item) =>
          item.type === "video"
            ? { ...item, poster: uploaded?.source, posterGroupId: uploaded?.id }
            : item,
        ),
      }));
      await saveNow(nextAlbum);
      await deleteBackendAssetGroup(currentVideo.posterGroupId).catch(() => undefined);
      setEditorMessage("视频封面已更新并保存");
    } catch (error) {
      if (uploaded) await deleteBackendAssetGroup(uploaded.id).catch(() => undefined);
      setEditorMessage(error instanceof Error ? error.message : "视频封面处理失败");
    } finally {
      setVideoBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f4f1eb] pt-[52px] text-[#2e2a25]">
      <AlbumNavigation active={mode} autoHide onNavigate={() => !operationBusy} />
      <header className="flex min-h-14 items-center justify-between border-b border-black/5 bg-[#f4f1eb]/90 px-4 backdrop-blur sm:px-7">
        <div className="flex items-center gap-3">
          <a
            href="/"
            onClick={(event) => {
              if (!operationBusy) return;
              event.preventDefault();
              setEditorMessage("当前操作完成或取消后才能离开编辑页");
            }}
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
          className="fixed left-1/2 top-1/2 z-[80] w-[min(86vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-2xl bg-black/90 px-4 py-3 text-center text-xs text-white shadow-xl"
        >
          {editorMessage}
        </p>
      )}

      <div className={`mx-auto p-4 lg:p-7 ${mode === "profile" ? "max-w-3xl" : "max-w-4xl"}`}>
        <div className="space-y-5">
          {mode === "profile" && (
            <>
              <EditorSection
                title="宝宝档案"
                description="修改后约半秒自动保存，无需点击提交。"
                collapsible
                storageKey="baby-album-ui:profile-editor"
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
                      disabled={videoBusy}
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
                          disabled={videoBusy}
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
                      disabled={videoBusy}
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
                          disabled={videoBusy}
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
                      <div className="rounded-2xl border border-dashed border-black/15 bg-neutral-50 p-4">
                        <div className="flex items-center gap-3">
                          <SafeImage
                            src={story.cover}
                            alt={`${story.title}封面`}
                            className="size-20 shrink-0 rounded-xl object-cover shadow-sm"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-bold">故事封面</p>
                            <p className="mt-1 text-[10px] leading-4 text-neutral-400">
                              JPG / PNG / WebP / AVIF，上传后保存到本机后端。
                            </p>
                            <div className="mt-2 flex flex-wrap gap-2">
                              <label
                                className={`inline-flex min-h-10 items-center gap-2 rounded-xl bg-black px-3 text-xs text-white ${videoBusy ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                              >
                                <ImagePlus className="size-3.5" />
                                {story.coverGroupId ? "替换封面" : "上传封面"}
                                <input
                                  data-testid="story-cover-upload"
                                  type="file"
                                  accept="image/jpeg,image/png,image/webp,image/avif"
                                  disabled={videoBusy}
                                  className="sr-only"
                                  onChange={(event) => {
                                    void uploadStoryCover(event.target.files?.[0]);
                                    event.target.value = "";
                                  }}
                                />
                              </label>
                              {story.coverGroupId && (
                                <button
                                  type="button"
                                  disabled={videoBusy}
                                  onClick={() => void removeStoryCover()}
                                  className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-50 px-3 text-xs text-red-600 disabled:opacity-40"
                                >
                                  <Trash2 className="size-3.5" /> 移除封面
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                      <EditorField label="故事文字">
                        <textarea
                          rows={5}
                          className={inputClass}
                          value={story.note}
                          onChange={(event) => updateStory({ note: event.target.value })}
                        />
                      </EditorField>
                      <div className="rounded-2xl border border-dashed border-black/15 bg-neutral-50 p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="flex items-center gap-2 text-xs font-bold">
                              <Film className="size-3.5" /> 故事视频
                            </p>
                            <p className="mt-1 text-[10px] leading-4 text-neutral-400">
                              MP4 / WebM，最多一个且不超过 200MB；点击播放后才加载。
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <label
                              className={`inline-flex min-h-10 items-center gap-2 rounded-xl bg-black px-3 text-xs text-white ${videoBusy ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                            >
                              <Film className="size-3.5" /> {videoMedia ? "替换视频" : "上传视频"}
                              <input
                                type="file"
                                accept="video/mp4,video/webm,.mp4,.webm"
                                disabled={videoBusy}
                                className="sr-only"
                                onChange={(event) => {
                                  void uploadVideo(event.target.files?.[0]);
                                  event.target.value = "";
                                }}
                              />
                            </label>
                            {videoMedia && (
                              <button
                                type="button"
                                disabled={videoBusy}
                                onClick={() => void removeVideo()}
                                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-red-50 px-3 text-xs text-red-600 disabled:opacity-40"
                              >
                                <Trash2 className="size-3.5" /> 删除视频
                              </button>
                            )}
                          </div>
                        </div>

                        {videoMedia && (
                          <div className="mt-3 rounded-xl bg-white px-3 py-2 text-[11px] text-neutral-500 shadow-sm">
                            <strong className="block truncate text-xs text-neutral-700">
                              {videoMedia.name}
                            </strong>
                            <span>
                              {formatBytes(videoMedia.size)} · {videoMedia.mimeType}
                            </span>
                          </div>
                        )}

                        {videoUploadProgress !== null && (
                          <div className="mt-4">
                            <div className="mb-1 flex items-center justify-between gap-3 text-[10px] text-neutral-500">
                              <span>正在上传视频</span>
                              <span>{videoUploadProgress}%</span>
                            </div>
                            <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                              <div
                                className="h-full rounded-full bg-neutral-800 transition-[width]"
                                style={{ width: `${videoUploadProgress}%` }}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => videoUploadControllerRef.current?.abort()}
                              className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-xl bg-white px-3 text-[10px] text-neutral-600 shadow-sm"
                            >
                              <X className="size-3" /> 取消上传
                            </button>
                          </div>
                        )}

                        {videoMedia && (
                          <div className="mt-4 border-t border-black/5 pt-3">
                            <p className="text-xs font-bold text-neutral-600">视频封面（可选）</p>
                            <p className="mt-1 text-[10px] text-neutral-400">
                              未上传时使用当前故事封面；重新上传会替换旧封面。
                            </p>
                            <label
                              className={`mt-2 inline-flex min-h-10 items-center gap-2 rounded-xl bg-white px-3 text-xs shadow-sm ${videoBusy ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                            >
                              <ImagePlus className="size-3.5" /> 上传视频封面
                              <input
                                type="file"
                                accept="image/png,image/webp,image/jpeg"
                                disabled={videoBusy}
                                className="sr-only"
                                onChange={(event) => {
                                  void uploadVideoPoster(event.target.files?.[0]);
                                  event.target.value = "";
                                }}
                              />
                            </label>
                          </div>
                        )}
                      </div>
                      <div className="rounded-2xl border border-dashed border-black/15 bg-white/70 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-bold">照片资源</p>
                            <p className="mt-1 text-[10px] leading-4 text-neutral-400">
                              JPG / PNG / WebP，单张不超过 12MB；自动生成三级 WebP 资源。
                            </p>
                          </div>
                          <label
                            className={`inline-flex min-h-10 items-center gap-2 rounded-xl bg-black px-3 text-xs text-white ${operationBusy ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
                          >
                            <ImagePlus className="size-3.5" /> 上传照片
                            <input
                              type="file"
                              accept="image/jpeg,image/png,image/webp"
                              multiple
                              disabled={operationBusy}
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
                        disabled={videoBusy}
                        onClick={() => void deleteStory()}
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

              <div className="rounded-2xl bg-white/70 p-4 text-center text-xs text-neutral-500 md:hidden">
                完整备份、恢复和存储设置请在电脑端操作。
              </div>
              <div className="hidden md:block">
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
                      onClick={exportBackup}
                      disabled={transferBusy}
                      className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-black px-4 text-xs text-white disabled:opacity-50"
                    >
                      <Download className="size-3.5" /> 导出完整备份
                    </button>
                    <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-white px-4 text-xs shadow-sm">
                      <FileUp className="size-3.5" /> 导入完整备份
                      <input
                        type="file"
                        accept=".zip,application/zip,application/x-zip-compressed"
                        disabled={transferBusy}
                        className="sr-only"
                        onChange={(event) => {
                          void inspectBackup(event.target.files?.[0]);
                          event.target.value = "";
                        }}
                      />
                    </label>
                    <span className="self-center text-[10px] text-neutral-500">
                      预计约 {formatBytes(storageStats?.totalBytes)}
                    </span>
                  </div>
                  {transferBusy && uploadProgress !== null && (
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/10">
                      <div
                        className="h-full rounded-full bg-black transition-[width]"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  )}
                  <div className="mt-4 grid gap-3 rounded-2xl bg-white/70 p-4 text-xs sm:grid-cols-2">
                    <label className="flex items-center justify-between gap-3">
                      <span>
                        <strong className="block text-sm">保留照片原件</strong>
                        <span className="mt-1 block text-neutral-500">仅影响之后上传的照片</span>
                      </span>
                      <input
                        type="checkbox"
                        checked={album.storagePreferences?.retainOriginalPhotos ?? false}
                        onChange={(event) =>
                          setAlbum((current) => ({
                            ...current,
                            storagePreferences: { retainOriginalPhotos: event.target.checked },
                          }))
                        }
                        className="size-5 accent-black"
                      />
                    </label>
                    <div className="rounded-xl bg-[#f4f1eb] p-3 text-neutral-600">
                      <p>媒体占用：{formatBytes(storageStats?.totalBytes)}</p>
                      <p className="mt-1">照片原件：{formatBytes(storageStats?.originalBytes)}</p>
                      <p className="mt-1">后端文件：{storageStats?.fileCount ?? 0} 个</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => void migrateLegacyData()}
                    disabled={transferBusy}
                    className="mt-3 inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs shadow-sm disabled:opacity-50"
                  >
                    <FileUp className="size-3.5" /> 一键迁移旧缓存
                  </button>
                  {backupSummary && (
                    <div className="mt-4 rounded-2xl border border-black/10 bg-white p-4 text-xs">
                      <p className="font-bold">确认恢复“{backupSummary.displayName}”的完整备份？</p>
                      <p className="mt-2 leading-6 text-neutral-600">
                        {backupSummary.chapterCount} 个章节 · {backupSummary.storyCount} 篇故事 ·{" "}
                        {backupSummary.photoCount} 张照片 · {backupSummary.videoCount} 个视频 ·{" "}
                        {formatBytes(backupSummary.backupBytes)}
                      </p>
                      <div className="mt-3 flex gap-2">
                        <button
                          type="button"
                          onClick={() => void restoreBackup()}
                          disabled={transferBusy}
                          className="min-h-10 rounded-xl bg-black px-4 text-white disabled:opacity-50"
                        >
                          确认覆盖并恢复
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setBackupSummary(null);
                            setImportToken("");
                          }}
                          disabled={transferBusy}
                          className="min-h-10 rounded-xl bg-neutral-100 px-4"
                        >
                          取消
                        </button>
                      </div>
                    </div>
                  )}
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
              </div>
            </>
          )}
        </div>
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
