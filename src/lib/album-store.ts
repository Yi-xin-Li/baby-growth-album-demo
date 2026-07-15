import { openDB } from "idb";
import { demoAlbum } from "@/data/demo-album";
import type { GrowthAlbum } from "@/types/album";

const databaseName = "baby-growth-album";
const storeName = "drafts";
const draftKey = "active-album";

export function cloneDemoAlbum(): GrowthAlbum {
  return structuredClone(demoAlbum);
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
  const database = await getDatabase();
  return (await database.get(storeName, draftKey)) ?? cloneDemoAlbum();
}

export async function saveAlbumDraft(album: GrowthAlbum) {
  const database = await getDatabase();
  await database.put(storeName, structuredClone(album), draftKey);
  window.dispatchEvent(new CustomEvent("album-draft-updated", { detail: album }));
}

export async function resetAlbumDraft() {
  const album = cloneDemoAlbum();
  await saveAlbumDraft(album);
  return album;
}
