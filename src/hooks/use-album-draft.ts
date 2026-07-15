import { useCallback, useEffect, useRef, useState } from "react";
import { cloneDemoAlbum, loadAlbumDraft, resetAlbumDraft, saveAlbumDraft } from "@/lib/album-store";
import type { GrowthAlbum } from "@/types/album";

export type SaveStatus = "loading" | "saved" | "saving" | "error";

export function useAlbumDraft() {
  const [album, setAlbumState] = useState<GrowthAlbum>(cloneDemoAlbum);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const readyRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadAlbumDraft()
      .then((draft) => {
        setAlbumState(draft);
        readyRef.current = true;
        setStatus("saved");
      })
      .catch(() => {
        readyRef.current = true;
        setStatus("error");
      });

    const receiveDraft = (event: Event) => {
      const nextAlbum = (event as CustomEvent<GrowthAlbum>).detail;
      if (nextAlbum) setAlbumState(structuredClone(nextAlbum));
    };
    window.addEventListener("album-draft-updated", receiveDraft);
    return () => {
      window.removeEventListener("album-draft-updated", receiveDraft);
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  const setAlbum = useCallback((updater: (current: GrowthAlbum) => GrowthAlbum) => {
    setAlbumState((current) => {
      const nextAlbum = updater(current);
      if (!readyRef.current) return nextAlbum;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      setStatus("saving");
      saveTimerRef.current = setTimeout(() => {
        saveAlbumDraft(nextAlbum)
          .then(() => setStatus("saved"))
          .catch(() => setStatus("error"));
      }, 450);
      return nextAlbum;
    });
  }, []);

  const reset = useCallback(async () => {
    setStatus("saving");
    const nextAlbum = await resetAlbumDraft();
    setAlbumState(nextAlbum);
    setStatus("saved");
  }, []);

  return { album, setAlbum, reset, status };
}
