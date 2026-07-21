import { LockKeyhole, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useState, type FormEvent, type ReactNode } from "react";
import { apiBaseUrl, heartbeatEditor, loginEditor } from "@/lib/backend-api";
import { getEditorToken } from "@/lib/editor-session";

type GateState = "checking" | "locked" | "active";

export function EditorAccessGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>("checking");
  const [pin, setPin] = useState("");
  const [message, setMessage] = useState("");
  const [canTakeover, setCanTakeover] = useState(false);
  const [busy, setBusy] = useState(false);

  const verifyExistingSession = useCallback(async () => {
    if (!getEditorToken()) {
      setState("locked");
      return;
    }
    try {
      await heartbeatEditor();
      setState("active");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "编辑会话已失效");
      setState("locked");
    }
  }, []);

  useEffect(() => {
    void verifyExistingSession();
    const sessionLost = (event: Event) => {
      setMessage((event as CustomEvent<string>).detail || "编辑会话已结束");
      setState("locked");
    };
    window.addEventListener("editor-session-lost", sessionLost);
    return () => window.removeEventListener("editor-session-lost", sessionLost);
  }, [verifyExistingSession]);

  useEffect(() => {
    if (state !== "active") return;
    const timer = window.setInterval(() => void heartbeatEditor().catch(() => undefined), 30_000);
    return () => window.clearInterval(timer);
  }, [state]);

  const submit = async (event?: FormEvent, takeover = false) => {
    event?.preventDefault();
    if (!pin.trim()) {
      setMessage("请输入编辑密码");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await loginEditor(pin, takeover);
      setPin("");
      setCanTakeover(false);
      setState("active");
    } catch (error) {
      const status = (error as Error & { status?: number }).status;
      setCanTakeover(status === 409);
      setMessage(error instanceof Error ? error.message : "无法进入编辑模式");
    } finally {
      setBusy(false);
    }
  };

  if (state === "checking") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f1eb] text-[#2e2a25]">
        <div className="text-center">
          <RefreshCw className="mx-auto size-7 animate-spin" />
          <p className="mt-3 text-sm font-bold">正在验证编辑权限</p>
        </div>
      </main>
    );
  }

  if (state === "locked") {
    return (
      <main className="grid min-h-screen place-items-center bg-[#f4f1eb] px-5 text-[#2e2a25]">
        <form
          onSubmit={(event) => void submit(event)}
          className="w-full max-w-sm rounded-[2rem] bg-white/85 p-6 text-center shadow-xl"
        >
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-black text-white">
            <LockKeyhole className="size-5" />
          </span>
          <h1 className="mt-4 text-xl font-bold">进入编辑模式</h1>
          <p className="mt-2 text-xs leading-6 text-neutral-500">
            查看相册不需要密码，修改资料和上传照片需要编辑密码。
          </p>
          <input
            type="password"
            value={pin}
            onChange={(event) => setPin(event.target.value)}
            autoComplete="current-password"
            placeholder="请输入编辑密码"
            className="mt-5 min-h-12 w-full rounded-2xl border border-black/10 bg-[#f4f1eb] px-4 text-center text-sm outline-none focus:border-black/30"
          />
          {message && <p className="mt-3 text-xs text-red-600">{message}</p>}
          <button
            type="submit"
            disabled={busy}
            className="mt-4 min-h-12 w-full rounded-2xl bg-black text-sm font-bold text-white disabled:opacity-50"
          >
            {busy ? "正在验证…" : "进入编辑"}
          </button>
          {canTakeover && (
            <button
              type="button"
              disabled={busy}
              onClick={() => void submit(undefined, true)}
              className="mt-2 min-h-11 w-full rounded-2xl bg-amber-100 text-xs font-bold text-amber-900"
            >
              强制接管编辑
            </button>
          )}
          <a href="/" className="mt-4 inline-block text-xs text-neutral-500 underline">
            返回相册查看
          </a>
          <p className="mt-5 break-all text-[9px] text-neutral-300">后端：{apiBaseUrl}</p>
        </form>
      </main>
    );
  }

  return children;
}
