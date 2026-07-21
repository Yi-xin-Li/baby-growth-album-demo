import type { GrowthAlbum, ImageMedia } from "@/types/album";
import { clearEditorToken, getEditorToken, setEditorToken } from "@/lib/editor-session";

const browserHost = typeof window === "undefined" ? "127.0.0.1" : window.location.hostname;
export const apiBaseUrl = import.meta.env.VITE_API_URL || `http://${browserHost}:8000`;
const assetPrefix = "backend://asset/";

export type StorageStats = { totalBytes: number; originalBytes: number; fileCount: number };
export type BackupSummary = {
  albumId: string;
  displayName: string;
  chapterCount: number;
  storyCount: number;
  photoCount: number;
  assetCount: number;
  backupBytes: number;
};
export type BackendAlbumResult = {
  album: GrowthAlbum;
  storage: StorageStats;
  revision: string | null;
};
export type EditorSessionResult = {
  token: string;
  expiresAt: number;
  leaseExpiresAt: number;
};

function editorHeaders(headers?: HeadersInit) {
  const result = new Headers(headers);
  const token = getEditorToken();
  if (token) result.set("Authorization", `Bearer ${token}`);
  return result;
}

async function apiRequest<T>(path: string, init?: RequestInit, editor = false): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: editor ? editorHeaders(init?.headers) : init?.headers,
  });
  if (!response.ok) {
    let message = `后端请求失败（${response.status}）`;
    try {
      const body = (await response.json()) as { detail?: string };
      if (body.detail) message = body.detail;
    } catch {
      // Keep the status-based message for non-JSON responses.
    }
    const error = new Error(message) as Error & { status?: number };
    error.status = response.status;
    if (editor && (response.status === 401 || response.status === 409)) clearEditorToken(message);
    throw error;
  }
  return response.json() as Promise<T>;
}

export function resolveBackendAsset(source?: string): string {
  if (!source?.startsWith(assetPrefix)) return source ?? "";
  return `${apiBaseUrl}/api/assets/${source.slice(assetPrefix.length)}`;
}

export const loadBackendAlbum = () => apiRequest<BackendAlbumResult>("/api/albums/active");

export const saveBackendAlbum = (album: GrowthAlbum) =>
  apiRequest<BackendAlbumResult>(
    `/api/albums/${album.id}`,
    {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ album }),
    },
    true,
  );

export const resetBackendAlbum = (album: GrowthAlbum) =>
  apiRequest<BackendAlbumResult>(
    `/api/albums/${album.id}/reset`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ album }),
    },
    true,
  );

export async function uploadBackendPhoto(album: GrowthAlbum, file: File): Promise<ImageMedia> {
  const body = new FormData();
  body.append("file", file);
  const retain = album.storagePreferences?.retainOriginalPhotos ?? false;
  const uploaded = await apiRequest<ImageMedia>(
    `/api/albums/${album.id}/photos?retain_original=${retain}`,
    { method: "POST", body },
    true,
  );
  return {
    ...uploaded,
    thumbnail: uploaded.thumbnailId ? `${assetPrefix}${uploaded.thumbnailId}` : undefined,
    preview: uploaded.previewId ? `${assetPrefix}${uploaded.previewId}` : undefined,
    original: uploaded.originalId ? `${assetPrefix}${uploaded.originalId}` : undefined,
  };
}

export async function uploadBackendAsset(
  albumId: string,
  kind: "background" | "illustration" | "music",
  file: File,
) {
  const body = new FormData();
  body.append("file", file);
  return apiRequest<{ assetId: string; source: string; name: string }>(
    `/api/albums/${albumId}/assets/${kind}`,
    { method: "POST", body },
    true,
  );
}

export const getStorageStats = (albumId: string) =>
  apiRequest<StorageStats>(`/api/albums/${albumId}/storage`, undefined, true);

export async function deleteBackendAssetGroup(groupId?: string) {
  if (!groupId) return;
  const response = await fetch(`${apiBaseUrl}/api/assets/groups/${groupId}`, {
    method: "DELETE",
    headers: editorHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 409) clearEditorToken("编辑会话已失效");
    throw new Error("后端素材删除失败");
  }
}

export async function downloadCompleteBackup(albumId: string) {
  const response = await fetch(`${apiBaseUrl}/api/albums/${albumId}/export`, {
    headers: editorHeaders(),
  });
  if (!response.ok) {
    if (response.status === 401 || response.status === 409) clearEditorToken("编辑会话已失效");
    throw new Error("完整备份导出失败");
  }
  const blob = await response.blob();
  const anchor = document.createElement("a");
  anchor.href = URL.createObjectURL(blob);
  anchor.download = "baby-album.baby-album.zip";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(anchor.href);
}

export function inspectCompleteBackup(file: File, onProgress?: (progress: number) => void) {
  return new Promise<{ token: string; summary: BackupSummary }>((resolve, reject) => {
    const body = new FormData();
    body.append("file", file);
    const request = new XMLHttpRequest();
    request.open("POST", `${apiBaseUrl}/api/import/inspect`);
    const token = getEditorToken();
    if (token) request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 90));
    };
    request.onerror = () => reject(new Error("无法连接 FastAPI 后端"));
    request.onload = () => {
      try {
        const result = JSON.parse(request.responseText) as
          | { token: string; summary: BackupSummary }
          | { detail?: string };
        if (request.status < 200 || request.status >= 300) {
          if (request.status === 401 || request.status === 409) {
            clearEditorToken("编辑会话已失效");
          }
          reject(
            new Error("detail" in result && result.detail ? result.detail : "完整备份检查失败"),
          );
          return;
        }
        onProgress?.(100);
        resolve(result as { token: string; summary: BackupSummary });
      } catch {
        reject(new Error("后端返回了无法识别的结果"));
      }
    };
    request.send(body);
  });
}

export const applyCompleteBackup = (token: string) =>
  apiRequest<BackendAlbumResult>(
    "/api/import/apply",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    },
    true,
  );

export async function loginEditor(pin: string, takeover = false) {
  const result = await apiRequest<EditorSessionResult>("/api/auth/editor", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pin, takeover }),
  });
  setEditorToken(result.token);
  return result;
}

export const heartbeatEditor = () =>
  apiRequest<Omit<EditorSessionResult, "token">>("/api/auth/heartbeat", { method: "POST" }, true);

export async function logoutEditor() {
  const token = getEditorToken();
  try {
    if (token) {
      await fetch(`${apiBaseUrl}/api/auth/logout`, {
        method: "POST",
        headers: editorHeaders(),
      });
    }
  } finally {
    clearEditorToken("已退出编辑模式");
  }
}
