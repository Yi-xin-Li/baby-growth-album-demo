import { useCallback, useEffect, useRef, useState } from "react";
import {
  cloneDemoAlbum,
  loadAlbumDraftSnapshot,
  loadLatestBackendAlbum,
  resetAlbumDraft,
  saveAlbumDraft,
} from "@/lib/album-store";
import type { GrowthAlbum } from "@/types/album";

export type SaveStatus = "loading" | "saved" | "saving" | "error";

export function useAlbumDraft({ liveRefresh = false }: { liveRefresh?: boolean } = {}) {
  const [album, setAlbumState] = useState<GrowthAlbum>(cloneDemoAlbum);
  const [status, setStatus] = useState<SaveStatus>("loading");
  const readyRef = useRef(false);
  const dirtyBeforeReadyRef = useRef(false);
  const latestAlbumRef = useRef(album);
  const revisionRef = useRef<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingAlbumRef = useRef<GrowthAlbum | null>(null);
  const flushPromiseRef = useRef<Promise<void> | null>(null);

  const flushPendingSave = useCallback((): Promise<void> => {
    if (flushPromiseRef.current) return flushPromiseRef.current;
    const run = async () => {
      while (pendingAlbumRef.current) {
        const nextAlbum = pendingAlbumRef.current;
        pendingAlbumRef.current = null;
        try {
          revisionRef.current = await saveAlbumDraft(nextAlbum);
        } catch {
          setStatus("error");
          throw new Error("相册保存失败");
        }
      }
      if (!saveTimerRef.current && !pendingAlbumRef.current) {
        setStatus((current) => (current === "error" ? current : "saved"));
      }
    };
    flushPromiseRef.current = run().finally(() => {
      flushPromiseRef.current = null;
    });
    return flushPromiseRef.current;
  }, []);

  useEffect(() => {
    loadAlbumDraftSnapshot()
      .then(({ album: draft, revision }) => {
        revisionRef.current = revision;
        readyRef.current = true;
        if (dirtyBeforeReadyRef.current) {
          saveAlbumDraft(latestAlbumRef.current)
            .then((savedRevision) => {
              revisionRef.current = savedRevision;
              setStatus("saved");
            })
            .catch(() => setStatus("error"));
        } else {
          latestAlbumRef.current = draft;
          setAlbumState(draft);
          setStatus("saved");
        }
      })
      .catch(() => {
        readyRef.current = true;
        setStatus("error");
      });

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!liveRefresh) return;
    const refresh = async () => {
      if (!readyRef.current || saveTimerRef.current) return;
      try {
        const snapshot = await loadLatestBackendAlbum();
        if (!snapshot.revision || snapshot.revision === revisionRef.current) return;
        revisionRef.current = snapshot.revision;
        latestAlbumRef.current = snapshot.album;
        setAlbumState(snapshot.album);
        setStatus("saved");
      } catch {
        // Keep the last visible album when the local backend is temporarily unavailable.
      }
    };
    const timer = window.setInterval(() => void refresh(), 10_000);
    return () => window.clearInterval(timer);
  }, [liveRefresh]);

  const setAlbum = useCallback(
    (updater: (current: GrowthAlbum) => GrowthAlbum) => {
      setAlbumState((current) => {
        const nextAlbum = updater(current);
        latestAlbumRef.current = nextAlbum;
        if (!readyRef.current) {
          dirtyBeforeReadyRef.current = true;
          setStatus("saving");
          return nextAlbum;
        }
        if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
        setStatus("saving");
        saveTimerRef.current = setTimeout(() => {
          saveTimerRef.current = null;
          pendingAlbumRef.current = nextAlbum;
          void flushPendingSave().catch(() => undefined);
        }, 450);
        return nextAlbum;
      });
    },
    [flushPendingSave],
  );

  const reset = useCallback(async () => {
    setStatus("saving");
    const nextAlbum = await resetAlbumDraft();
    revisionRef.current = null;
    latestAlbumRef.current = nextAlbum;
    setAlbumState(nextAlbum);
    setStatus("saved");
  }, []);

  const adoptSavedAlbum = useCallback((nextAlbum: GrowthAlbum, revision: string | null = null) => {
    latestAlbumRef.current = nextAlbum;
    revisionRef.current = revision;
    setAlbumState(nextAlbum);
    setStatus("saved");
  }, []);

  const saveNow = useCallback(
    async (nextAlbum: GrowthAlbum) => {
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }
      latestAlbumRef.current = nextAlbum;
      setAlbumState(nextAlbum);
      setStatus("saving");
      pendingAlbumRef.current = nextAlbum;
      await flushPendingSave();
      return nextAlbum;
    },
    [flushPendingSave],
  );

  return { album, setAlbum, reset, status, adoptSavedAlbum, saveNow };
}
