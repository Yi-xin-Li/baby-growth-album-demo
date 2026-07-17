import { openDB } from "idb";
import { demoAlbum } from "@/data/demo-album";
import type { GrowthAlbum } from "@/types/album";

const databaseName = "baby-growth-album";
const storeName = "drafts";
const draftKey = "active-album";
const localMirrorKey = "baby-growth-album-draft";

const defaultChapterArtwork: Record<string, string> = {
  birth: "/images/decro_birth.png",
  talk: "/images/decro_talk.png",
  walk: "/images/decro_walk.png",
  explore: "/images/decro_explore.png",
  adventure: "/images/decro_adventure.png",
  continue: "/images/decro_continue.png",
};

export function cloneDemoAlbum(): GrowthAlbum {
  return structuredClone(demoAlbum);
}

function normalizeAlbum(album: GrowthAlbum): GrowthAlbum {
  const music = album.backgroundMusic;
  return {
    ...album,
    animationSpeed: album.animationSpeed ?? "slow",
    customIllustrations: album.customIllustrations ?? {},
    customBackground: album.customBackground || undefined,
    backgroundMusic:
      music?.source && music.name
        ? {
            source: music.source,
            name: music.name,
            volume: Math.min(1, Math.max(0, music.volume ?? 0.3)),
            loop: music.loop ?? true,
          }
        : undefined,
    chapters: album.chapters.map((chapter) => ({
      ...chapter,
      icon: chapter.icon || defaultChapterArtwork[chapter.id] || "",
    })),
  };
}

async function getDatabase() {
  return openDB(databaseName, 1, {
    upgrade(database) {
      if (!database.objectStoreNames.contains(storeName)) database.createObjectStore(storeName);
    },
  });
}

export async function loadAlbumDraft(): Promise<GrowthAlbum> {
  if (typeof window === "undefined") return cloneDemoAlbum();
  try {
    const database = await getDatabase();
    const stored = (await database.get(storeName, draftKey)) as GrowthAlbum | undefined;
    if (stored) return normalizeAlbum(stored);
  } catch {
    // Fall back to the small localStorage mirror when IndexedDB is unavailable.
  }
  try {
    const mirrored = window.localStorage.getItem(localMirrorKey);
    if (mirrored) return normalizeAlbum(JSON.parse(mirrored) as GrowthAlbum);
  } catch {
    // Use the demo data when both browser stores are unavailable.
  }
  return cloneDemoAlbum();
}

export async function saveAlbumDraft(album: GrowthAlbum) {
  let savedToDatabase = false;
  let savedToMirror = false;
  try {
    const database = await getDatabase();
    await database.put(storeName, structuredClone(album), draftKey);
    savedToDatabase = true;
  } catch {
    // The mirror below remains a fallback for small drafts.
  }
  try {
    const embeddedPersonalizationSize =
      (album.customBackground?.length ?? 0) + (album.backgroundMusic?.source.length ?? 0);
    if (embeddedPersonalizationSize > 3_000_000) {
      window.localStorage.removeItem(localMirrorKey);
    } else {
      window.localStorage.setItem(localMirrorKey, JSON.stringify(album));
      savedToMirror = true;
    }
  } catch {
    // Never leave an older mirror that could override the latest IndexedDB draft.
    try {
      window.localStorage.removeItem(localMirrorKey);
    } catch {
      // Storage may be disabled entirely.
    }
  }
  if (!savedToDatabase && !savedToMirror) throw new Error("无法保存本地草稿");
  window.dispatchEvent(new CustomEvent("album-draft-updated", { detail: album }));
}

export async function resetAlbumDraft() {
  const album = cloneDemoAlbum();
  await saveAlbumDraft(album);
  return album;
}
