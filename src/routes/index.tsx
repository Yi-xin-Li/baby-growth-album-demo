import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlbumNavigation } from "@/components/album/AlbumNavigation";
import { ChapterDirectory } from "@/components/album/ChapterDirectory";
import { ChapterTimeline } from "@/components/album/ChapterTimeline";
import { CoverSection } from "@/components/album/CoverSection";
import { MediaViewer, type ViewerState } from "@/components/album/MediaViewer";
import { StoryDetailModal } from "@/components/album/StoryDetailModal";
import { ThemeSwitcher } from "@/components/album/ThemeSwitcher";
import { demoAlbum } from "@/data/demo-album";
import { getStoryMedia } from "@/lib/album-media";
import { albumThemes } from "@/themes/album-themes";
import type { ThemeId } from "@/types/album";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: `${demoAlbum.profile.displayName}的成长时光机` },
      { name: "description", content: `${demoAlbum.profile.displayName} 0—3 岁的成长记忆相册` },
      { property: "og:title", content: `${demoAlbum.profile.displayName}的成长时光机` },
      { property: "og:description", content: "翻开一页页绘本，看小朋友慢慢长大。" },
    ],
  }),
  component: AlbumPage,
});

type ActiveStory = { chapterId: string; storyIndex: number } | null;
const themeStorageKey = "baby-album-theme";

function readSavedTheme(): ThemeId | null {
  try {
    const savedTheme = window.localStorage?.getItem(themeStorageKey);
    if (savedTheme && savedTheme in albumThemes) return savedTheme as ThemeId;
  } catch {
    // Privacy-focused browsers may disable localStorage; the cookie is the fallback.
  }

  const cookieTheme = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${themeStorageKey}=`))
    ?.split("=")[1];
  return cookieTheme && cookieTheme in albumThemes ? (cookieTheme as ThemeId) : null;
}

function saveTheme(themeId: ThemeId) {
  try {
    window.localStorage?.setItem(themeStorageKey, themeId);
  } catch {
    // Keep the cookie fallback working when localStorage is unavailable.
  }
  document.cookie = `${themeStorageKey}=${themeId}; max-age=31536000; path=/; samesite=lax`;
}

function AlbumPage() {
  const chaptersRef = useRef<HTMLElement | null>(null);
  const [chapterId, setChapterId] = useState<string | null>(null);
  const [activeStory, setActiveStory] = useState<ActiveStory>(null);
  const [viewer, setViewer] = useState<ViewerState>(null);
  const [themeId, setThemeId] = useState<ThemeId>(demoAlbum.theme);

  const chapter = chapterId
    ? (demoAlbum.chapters.find((item) => item.id === chapterId) ?? null)
    : null;
  const storyChapter = activeStory
    ? (demoAlbum.chapters.find((item) => item.id === activeStory.chapterId) ?? null)
    : null;
  const story =
    activeStory && storyChapter ? (storyChapter.stories[activeStory.storyIndex] ?? null) : null;
  const storyMedia = story ? getStoryMedia(story) : [];

  useEffect(() => {
    if (!activeStory && !viewer) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [activeStory, viewer]);

  useEffect(() => {
    const savedTheme = readSavedTheme();
    if (savedTheme) setThemeId(savedTheme);
  }, []);

  const changeTheme = (nextTheme: ThemeId) => {
    setThemeId(nextTheme);
    saveTheme(nextTheme);
  };

  const scrollToDirectory = () => {
    if (chapterId) setChapterId(null);
    requestAnimationFrame(() =>
      chaptersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const goHome = () => {
    setChapterId(null);
    setActiveStory(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openChapter = (id: string) => {
    setChapterId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const returnToDirectory = () => {
    setChapterId(null);
    requestAnimationFrame(() =>
      chaptersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const nextStory = () => {
    if (!activeStory || !storyChapter) return;
    setActiveStory({
      chapterId: activeStory.chapterId,
      storyIndex: (activeStory.storyIndex + 1) % storyChapter.stories.length,
    });
  };

  return (
    <main
      data-album-theme={themeId}
      className="min-h-screen w-full overflow-x-hidden"
      style={{ fontFamily: "'Noto Serif SC', serif", color: "var(--ink)" }}
    >
      <AlbumNavigation onHome={goHome} onOpenDirectory={scrollToDirectory} />
      <ThemeSwitcher value={themeId} onChange={changeTheme} />

      <AnimatePresence mode="wait">
        {chapter ? (
          <ChapterTimeline
            key={chapter.id}
            chapter={chapter}
            onBack={returnToDirectory}
            onOpenStory={(_, storyIndex) => setActiveStory({ chapterId: chapter.id, storyIndex })}
          />
        ) : (
          <motion.div
            key="album-home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <CoverSection profile={demoAlbum.profile} onExplore={scrollToDirectory} />
            <ChapterDirectory
              ref={chaptersRef}
              chapters={demoAlbum.chapters}
              onOpen={openChapter}
            />
          </motion.div>
        )}
      </AnimatePresence>

      <StoryDetailModal
        chapter={storyChapter}
        story={story}
        media={storyMedia}
        onClose={() => setActiveStory(null)}
        onNext={nextStory}
        onOpenMedia={(index) => setViewer({ media: storyMedia, index })}
      />
      <MediaViewer
        state={viewer}
        onClose={() => setViewer(null)}
        onChange={(index) => setViewer((current) => (current ? { ...current, index } : current))}
      />
    </main>
  );
}
