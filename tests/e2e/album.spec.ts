import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const fixtureImage = path.resolve("public/images/icon_birth.png");

async function collectRuntimeErrors(page: Page) {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error" && !message.text().includes("Failed to load resource")) {
      errors.push(message.text());
    }
  });
  return errors;
}

test("访客可以完成章节、故事和高清查看流程", async ({ page }) => {
  const errors = await collectRuntimeErrors(page);
  await page.goto("/");
  await expect(page.locator("main")).toHaveAttribute("data-album-theme", "scrapbook");
  await expect(page.getByText("选择主题")).toHaveCount(0);

  await page.getByTestId("chapter-birth").click();
  await expect(page.getByRole("heading", { name: "诞生记忆" })).toBeVisible();
  await page.getByTestId("story-s1").click();
  await expect(page.getByTestId("story-detail")).toBeVisible();
  await page.getByTestId("story-hero-media").click();
  await expect(page.getByTestId("media-viewer")).toBeVisible();
  await page.getByRole("button", { name: "关闭 ×" }).click();
  await expect(page.getByTestId("media-viewer")).toBeHidden();
  await page.getByRole("button", { name: "返回本章" }).click();
  await expect(page.getByTestId("story-detail")).toBeHidden();
  await page.getByRole("button", { name: "返回目录" }).click();
  await expect(page.getByTestId("chapter-birth")).toBeVisible();
  expect(errors).toEqual([]);
});

test("编辑草稿刷新后仍然存在", async ({ page }) => {
  const errors = await collectRuntimeErrors(page);
  await page.goto("/editor");
  const nameField = page.getByRole("textbox", { name: "宝宝姓名" });
  await nameField.fill("自动保存测试宝宝");
  await expect(page.getByText("正在自动保存…")).toBeVisible();
  await expect(page.getByText("草稿已保存")).toBeVisible();
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem("baby-growth-album-draft") ?? ""))
    .toContain("自动保存测试宝宝");
  await page.reload();
  await expect(nameField).toHaveValue("自动保存测试宝宝");
  expect(errors).toEqual([]);
});

for (const width of [320, 375, 390, 430, 768, 1280]) {
  test(`${width}px 页面没有横向溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const homeOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(homeOverflow).toBeLessThanOrEqual(1);
    await page.goto("/editor");
    const editorOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(editorOverflow).toBeLessThanOrEqual(1);
  });
}

test("图片缺失时显示占位并保持页面可用", async ({ page }) => {
  await page.goto("/editor");
  await page
    .getByRole("textbox", { name: "封面路径（仅保存相对路径或网络地址）" })
    .fill("/missing-test-image.jpg");
  await expect(page.getByText("正在自动保存…")).toBeVisible();
  await expect(page.getByText("草稿已保存")).toBeVisible();
  await page.goto("/");
  await page.getByTestId("chapter-birth").click();
  await expect(page.getByRole("img", { name: /暂未加载/ }).first()).toBeVisible();
});

test("章节、故事和预览深链接可以直接打开", async ({ page }) => {
  await page.goto("/chapter/birth");
  await expect(page.getByRole("heading", { name: "诞生记忆" })).toBeVisible();
  await page.goto("/story/s1");
  await expect(page.getByTestId("story-detail")).toBeVisible();
  await page.goto("/preview");
  await expect(page.getByRole("heading", { name: "皮君尧" })).toBeVisible();
});

test("上传照片会生成三级资源并可排序删除", async ({ page }) => {
  await page.goto("/editor");
  const upload = page.locator('input[type="file"][multiple][accept*="image/jpeg"]');
  await upload.setInputFiles(fixtureImage);
  await expect(page.getByRole("status")).toContainText("已生成 1 张图片", { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "删除照片" })).toBeVisible();
  await expect(page.getByRole("button", { name: "前移照片" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "后移照片" })).toBeDisabled();
});

test("插画上传后需要手动保存，并支持恢复默认", async ({ page }) => {
  await page.goto("/editor/theme");
  const firstUpload = page.locator('input[type="file"][accept*="image/svg+xml"]').first();
  await firstUpload.setInputFiles(fixtureImage);
  await expect(page.getByRole("status")).toContainText("插画已进入预览", { timeout: 20_000 });
  const saveButton = page.getByRole("button", { name: "保存插画" });
  await expect(saveButton).toBeEnabled();
  await page.getByRole("link", { name: "返回编辑台" }).click();
  await expect(page.getByRole("heading", { name: "插画还没有保存" })).toBeVisible();
  await page.getByRole("button", { name: "继续编辑" }).click();
  await saveButton.click();
  await expect(page.getByRole("status")).toContainText("自定义插画已保存");
  await expect(saveButton).toBeDisabled();
  const resetButton = page.getByRole("button", { name: "恢复封面主插画默认插画" });
  await expect(resetButton).toBeEnabled();
  await resetButton.click();
  await expect(resetButton).toBeDisabled();
});
