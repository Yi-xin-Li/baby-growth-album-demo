import { spawn } from "node:child_process";
import { access, readFile, rm } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const frontendRoot = path.join(root, "frontend");
const windows = process.platform === "win32";
const python = path.join(root, "backend", ".venv", "Scripts", windows ? "python.exe" : "python");

try {
  await access(python);
} catch {
  console.error(
    "缺少 backend/.venv，请先在 backend 目录创建虚拟环境并安装 requirements.txt。",
  );
  process.exit(1);
}

const backend = spawn(python, [path.join(root, "backend", "run_e2e.py")], {
  cwd: root,
  stdio: "inherit",
  windowsHide: true,
});
const viteCli = path.join(root, "node_modules", "vite", "bin", "vite.js");
const frontend = spawn(
  process.execPath,
  [viteCli, "dev", "--host", "127.0.0.1", "--port", "8099"],
  {
    cwd: frontendRoot,
    stdio: "inherit",
    windowsHide: true,
  },
);

async function waitForBackend() {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    if (backend.exitCode !== null)
      throw new Error("FastAPI 测试后端启动失败，8000 端口可能已被占用");
    try {
      const response = await fetch("http://127.0.0.1:8000/api/testing/reset", { method: "POST" });
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("等待 FastAPI 测试后端超时");
}

async function waitForFrontend() {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (frontend.exitCode !== null)
      throw new Error("前端测试服务器启动失败，8099 端口可能已被占用");
    try {
      const response = await fetch("http://127.0.0.1:8099");
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error("等待前端测试服务器超时");
}

function stopChild(child) {
  if (!child.pid || child.exitCode !== null) return;
  child.kill("SIGTERM");
}

try {
  await waitForBackend();
  await waitForFrontend();
  const resultFile = path.join(frontendRoot, "test-results", "e2e-result.txt");
  await rm(resultFile, { force: true });
  const playwrightCli = path.join(root, "node_modules", "@playwright", "test", "cli.js");
  const interactive = process.argv.includes("--ui");
  const runner = spawn(process.execPath, [playwrightCli, "test", ...process.argv.slice(2)], {
    cwd: frontendRoot,
    stdio: interactive ? "inherit" : ["inherit", "pipe", "pipe"],
  });
  let reportedExitCode = null;
  let summaryBuffer = "";
  let stopTimer = null;
  let runnerSettled = false;
  let settleRunner;
  const runnerResult = new Promise((resolve) => {
    settleRunner = (code) => {
      if (runnerSettled) return;
      runnerSettled = true;
      resolve(code);
    };
  });
  runner.on("exit", (code) => settleRunner(reportedExitCode ?? code ?? 1));
  const resultPoller = setInterval(async () => {
    try {
      const result = (await readFile(resultFile, "utf8")).trim();
      stopChild(runner);
      settleRunner(result === "passed" ? 0 : 1);
    } catch {
      // Reporter has not completed yet.
    }
  }, 250);
  const forward = (target) => (chunk) => {
    target.write(chunk);
    summaryBuffer = `${summaryBuffer}${chunk}`.slice(-4000);
    const plainSummary = summaryBuffer.replace(/\x1b\[[0-9;?]*[ -/]*[@-~]/g, "");
    if (stopTimer || !/\d+\s+passed\s+\(/.test(plainSummary)) return;
    reportedExitCode = /\d+\s+failed/.test(plainSummary) ? 1 : 0;
    stopTimer = setTimeout(() => {
      stopChild(runner);
      settleRunner(reportedExitCode);
    }, 1000);
  };
  if (!interactive) {
    runner.stdout.on("data", forward(process.stdout));
    runner.stderr.on("data", forward(process.stderr));
  }
  const exitCode = await runnerResult;
  clearInterval(resultPoller);
  if (stopTimer) clearTimeout(stopTimer);
  process.exitCode = exitCode;
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  stopChild(frontend);
  stopChild(backend);
}
