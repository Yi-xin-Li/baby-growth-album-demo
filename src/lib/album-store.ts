import { openDB } from "idb";
import { demoAlbum } from "@/data/demo-album";
import type { GrowthAlbum } from "@/types/album";

const databaseName = "baby-growth-album";
const storeName = "drafts";
const draftKey = "active-album";
const localMirrorKey = "baby-growth-album-draft";

const chapterArtwork: Record<string, string> = {
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
  return {
    ...album,
    animationSpeed: album.animationSpeed ?? "slow",
    customIllustrations: album.customIllustrations ?? {},
    chapters: album.chapters.map((chapter) => ({
      ...chapter,
      icon: chapterArtwork[chapter.id] ?? chapter.icon,
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
    const mirrored = window.localStorage.getItem(localMirrorKey);
    if (mirrored) return normalizeAlbum(JSON.parse(mirrored) as GrowthAlbum);
  } catch {
    // IndexedDB remains the source when storage is disabled or the mirror exceeds quota.
  }
  const database = await getDatabase();
  const stored = (await database.get(storeName, draftKey)) as GrowthAlbum | undefined;
  return stored ? normalizeAlbum(stored) : cloneDemoAlbum();
}

export async function saveAlbumDraft(album: GrowthAlbum) {
  try {
    window.localStorage.setItem(localMirrorKey, JSON.stringify(album));
  } catch {
    // Large temporary media may exceed localStorage; IndexedDB still stores the draft.
  }
  const database = await getDatabase();
  await database.put(storeName, structuredClone(album), draftKey);
  window.dispatchEvent(new CustomEvent("album-draft-updated", { detail: album }));
}

export async function resetAlbumDraft() {
  const album = cloneDemoAlbum();
  await saveAlbumDraft(album);
  return album;
}
