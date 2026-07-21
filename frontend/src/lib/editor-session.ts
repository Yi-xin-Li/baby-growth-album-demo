const editorTokenKey = "baby-album-editor-token";

export function getEditorToken() {
  if (typeof window === "undefined") return "";
  return window.sessionStorage.getItem(editorTokenKey) ?? "";
}

export function setEditorToken(token: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(editorTokenKey, token);
}

export function clearEditorToken(message?: string) {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(editorTokenKey);
  window.dispatchEvent(
    new CustomEvent("editor-session-lost", {
      detail: message || "编辑会话已结束，请重新输入密码",
    }),
  );
}
