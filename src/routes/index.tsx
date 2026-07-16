import { useEffect, useRef, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AnimatePresence, motion } from "framer-motion";
import { AlbumNavigation } from "@/components/album/AlbumNavigation";
import { ChapterDirectory } from "@/components/album/ChapterDirectory";
import { ChapterTimeline } from "@/components/album/ChapterTimeline";
import { CoverSection } from "@/components/album/CoverSection";
import { MediaViewer, type ViewerState } from "@/components/album/MediaViewer";
import { StoryDetailModal } from "@/components/album/StoryDetailModal";
import { demoAlbum } from "@/data/demo-album";
import { getStoryMedia } from "@/lib/album-media";
import { useAlbumDraft } from "@/hooks/use-album-draft";
import { fixedAlbumTheme } from "@/themes/album-themes";

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

type AlbumPageProps = {
  initialChapterId?: string;
  initialStoryId?: string;
};

export function AlbumPage({ initialChapterId, initialStoryId }: AlbumPageProps = {}) {
  const { album } = useAlbumDraft();
  const chaptersRef = useRef<HTMLElement | null>(null);
  const directoryScrollPositionRef = useRef<number | null>(null);
  const shouldRestoreDirectoryRef = useRef(false);
  const [chapterId, setChapterId] = useState<string | null>(initialChapterId ?? null);
  const [activeStory, setActiveStory] = useState<ActiveStory>(null);
  const [viewer, setViewer] = useState<ViewerState>(null);
  const [navigationView, setNavigationView] = useState<"home" | "chapters">("home");

  const chapter = chapterId ? (album.chapters.find((item) => item.id === chapterId) ?? null) : null;
  const storyChapter = activeStory
    ? (album.chapters.find((item) => item.id === activeStory.chapterId) ?? null)
    : null;
  const story =
    activeStory && storyChapter ? (storyChapter.stories[activeStory.storyIndex] ?? null) : null;
  const storyMedia = story ? getStoryMedia(story) : [];
  const activeTheme = {
    ...fixedAlbumTheme,
    illustrations: { ...fixedAlbumTheme.illustrations, ...album.customIllustrations },
    motion: {
      ...fixedAlbumTheme.motion,
      timelineDuration:
        fixedAlbumTheme.motion.timelineDuration * (album.animationSpeed === "slow" ? 1.3 : 1),
    },
  };
  const storyCount = album.chapters.reduce(
    (total, currentChapter) => total + currentChapter.stories.length,
    0,
  );

  useEffect(() => {
    if (!activeStory && !viewer) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [activeStory, viewer]);

  useEffect(() => {
    if (!initialStoryId) return;
    for (const currentChapter of album.chapters) {
      const storyIndex = currentChapter.stories.findIndex((item) => item.id === initialStoryId);
      if (storyIndex >= 0) {
        setChapterId(currentChapter.id);
        setActiveStory({ chapterId: currentChapter.id, storyIndex });
        break;
      }
    }
  }, [album.chapters, initialStoryId]);

  useEffect(() => {
    if (chapterId || !shouldRestoreDirectoryRef.current) return;
    shouldRestoreDirectoryRef.current = false;
    const frame = requestAnimationFrame(() => {
      const savedPosition = directoryScrollPositionRef.current;
      if (savedPosition !== null) {
        window.scrollTo({ top: savedPosition, behavior: "smooth" });
      } else {
        chaptersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [chapterId]);

  useEffect(() => {
    if (window.location.hash !== "#chapters") return;
    setNavigationView("chapters");
    const frame = requestAnimationFrame(() =>
      chaptersRef.current?.scrollIntoView({ behavior: "auto", block: "start" }),
    );
    return () => cancelAnimationFrame(frame);
  }, []);

  const scrollToDirectory = () => {
    setNavigationView("chapters");
    if (chapterId) setChapterId(null);
    requestAnimationFrame(() =>
      chaptersRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };

  const goHome = () => {
    setNavigationView("home");
    setChapterId(null);
    setActiveStory(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const openChapter = (id: string) => {
    setNavigationView("chapters");
    directoryScrollPositionRef.current = window.scrollY;
    setChapterId(id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const returnToDirectory = () => {
    setNavigationView("chapters");
    shouldRestoreDirectoryRef.current = true;
    setChapterId(null);
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
      data-album-theme="scrapbook"
      data-animation-enabled={album.animationEnabled}
      className="min-h-screen w-full overflow-x-hidden"
      style={{ fontFamily: "'Noto Serif SC', serif", color: "var(--ink)" }}
    >
      <AlbumNavigation
        active={navigationView}
        onHome={goHome}
        onOpenDirectory={scrollToDirectory}
        autoHide
      />

      <AnimatePresence mode="wait">
        {chapter ? (
          <ChapterTimeline
            key={chapter.id}
            chapter={chapter}
            theme={activeTheme}
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
            <CoverSection
              profile={album.profile}
              theme={activeTheme}
              storyCount={storyCount}
              onExplore={scrollToDirectory}
            />
            <ChapterDirectory
              ref={chaptersRef}
              chapters={album.chapters}
              theme={activeTheme}
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
