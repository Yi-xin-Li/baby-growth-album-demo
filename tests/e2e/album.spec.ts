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
  const chapterArtwork = page.getByTestId("chapter-birth").locator(":scope > div").first();
  await expect(chapterArtwork.locator("img")).toHaveCount(1);
  await expect(chapterArtwork.locator("img")).toHaveAttribute("src", "/images/decro_birth.png");
  await expect(chapterArtwork).toHaveCSS("border-top-width", "2px");
  await expect(chapterArtwork).toHaveCSS("border-right-width", "2px");
  await expect(chapterArtwork).toHaveCSS("border-bottom-width", "2px");
  await expect(chapterArtwork).toHaveCSS("border-left-width", "2px");
  await expect(chapterArtwork).toHaveCSS("background-color", /.+/);
  await expect(chapterArtwork).not.toHaveCSS("box-shadow", "none");
  await expect(page.locator('img[src="/images/decro_baby.png"]')).toBeVisible();

  await page.getByTestId("chapter-birth").scrollIntoViewIfNeeded();
  const directoryScrollPosition = await page.evaluate(() => window.scrollY);
  await page.getByTestId("chapter-birth").click();
  await expect(page.getByRole("heading", { name: "诞生记忆" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByTestId("story-s1").locator(":scope > div.absolute")).toHaveCount(0);
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
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(100);
  expect(
    Math.abs((await page.evaluate(() => window.scrollY)) - directoryScrollPosition),
  ).toBeLessThan(300);
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

test("主界面提供两个独立编辑入口，旧地址自动兼容", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: "编辑相册" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "宝宝档案" })).toHaveAttribute(
    "href",
    "/editor/profile",
  );
  await expect(page.getByRole("link", { name: "成长记录" })).toHaveAttribute(
    "href",
    "/editor/stories",
  );

  await page.goto("/editor");
  await expect(page).toHaveURL(/\/editor\/profile$/);
  await page.goto("/editor/stories");
  await expect(page).toHaveURL(/\/editor\/stories$/);
  await expect(page).toHaveTitle("成长记录｜宝宝成长相册");
  await expect(page.getByRole("heading", { name: "成长记录" }).first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "宝宝姓名" })).toHaveCount(0);

  await page.goto("/editor/profile");
  await expect(page).toHaveTitle("宝宝档案｜宝宝成长相册");
  await expect(page.getByRole("heading", { name: "宝宝档案" }).first()).toBeVisible();
  await expect(page.getByRole("textbox", { name: "宝宝姓名" })).toBeVisible();
  await expect(page.getByRole("button", { name: "新增故事" })).toHaveCount(0);
  const editorNavigation = page.getByRole("navigation", { name: "主要页面导航" });
  await expect(editorNavigation.getByRole("link")).toHaveCount(4);
  await expect(editorNavigation.getByRole("link", { name: "宝宝档案" })).toHaveClass(/bg-black/);
  await editorNavigation.getByRole("link", { name: "成长章节" }).click();
  await expect(page).toHaveURL(/\/#chapters$/);
  await expect(page.getByTestId("chapter-birth")).toBeVisible();
});

test("四项导航使用统一字体", async ({ page }) => {
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "主要页面导航" });
  const fonts = await navigation
    .getByRole("button", { name: "首页" })
    .evaluate(
      (home, profile) => [
        window.getComputedStyle(home).fontFamily,
        window.getComputedStyle(profile as Element).fontFamily,
      ],
      await navigation.getByRole("link", { name: "宝宝档案" }).elementHandle(),
    );
  expect(fonts[0]).toBe(fonts[1]);
});

test("章节内可以连续切换上一章、下一章和指定章节", async ({ page }) => {
  await page.goto("/chapter/birth");
  await expect(page.getByRole("heading", { name: "诞生记忆" })).toBeVisible();
  await expect(page.getByRole("button", { name: "上一章节" })).toBeDisabled();

  await page.getByRole("button", { name: "下一章节" }).click();
  await expect(page.getByRole("heading", { name: "蹒跚学语" })).toBeVisible();
  await expect(page.getByRole("button", { name: "上一章节" })).toBeEnabled();

  await page.getByRole("combobox", { name: "选择章节" }).selectOption("continue");
  await expect(page.getByRole("heading", { name: "继续长大" })).toBeVisible();
  await expect(page.getByRole("button", { name: "下一章节" })).toBeDisabled();
});

test("宝宝档案桌面双栏、手机单栏，折叠状态可以记忆", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/editor/profile");
  const profileSection = page.getByRole("heading", { name: "宝宝档案" }).last().locator("../..");
  const preview = page.getByText("实时预览").locator("../..");
  const desktopProfileBox = await profileSection.boundingBox();
  const desktopPreviewBox = await preview.boundingBox();
  expect(desktopProfileBox).not.toBeNull();
  expect(desktopPreviewBox).not.toBeNull();
  expect(desktopPreviewBox!.x).toBeGreaterThan(desktopProfileBox!.x);
  expect(Math.abs(desktopPreviewBox!.y - desktopProfileBox!.y)).toBeLessThan(40);

  const appearanceToggle = page.getByRole("button", { name: "展开动效与个性化" });
  await expect(appearanceToggle).toBeVisible();
  await appearanceToggle.click();
  await expect(page.getByRole("button", { name: "收起动效与个性化" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "收起动效与个性化" })).toBeVisible();

  await page.setViewportSize({ width: 390, height: 900 });
  const mobileProfileBox = await profileSection.boundingBox();
  const mobilePreviewBox = await preview.boundingBox();
  expect(mobilePreviewBox!.y).toBeGreaterThan(mobileProfileBox!.y);
});

test("成长记录的数据管理折叠状态可以记忆", async ({ page }) => {
  await page.goto("/editor/stories");
  await expect(page.getByRole("button", { name: "展开数据管理" })).toBeVisible();
  await page.getByRole("button", { name: "展开数据管理" }).click();
  await expect(page.getByRole("button", { name: "收起数据管理" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "收起数据管理" })).toBeVisible();
});

test("手机端展示页导航随滚动隐藏并在向上滑动时恢复", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/");
  const navigation = page.getByRole("navigation", { name: "主要页面导航" });

  await expect(navigation).toHaveAttribute("data-hidden", "false");
  await expect(navigation.getByRole("button")).toHaveCount(2);
  await expect(navigation.getByRole("link")).toHaveCount(2);

  await page.evaluate(() => window.scrollTo(0, 700));
  await expect(navigation).toHaveAttribute("data-hidden", "true");

  await page.evaluate(() => window.scrollTo(0, 300));
  await expect(navigation).toHaveAttribute("data-hidden", "false");

  await page.goto("/editor/profile");
  const editorNavigation = page.getByRole("navigation", { name: "主要页面导航" });
  await page.evaluate(() => window.scrollTo(0, 600));
  await expect(editorNavigation).toHaveAttribute("data-hidden", "false");
});

for (const width of [320, 375, 390, 430, 768, 1280]) {
  test(`${width}px 页面没有横向溢出`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/");
    const homeOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(homeOverflow).toBeLessThanOrEqual(1);
    for (const editorPath of ["/editor/profile", "/editor/stories", "/editor/theme"]) {
      await page.goto(editorPath);
      const editorOverflow = await page.evaluate(
        () => document.documentElement.scrollWidth - window.innerWidth,
      );
      expect(editorOverflow).toBeLessThanOrEqual(1);
    }
  });
}

test("图片缺失时显示占位并保持页面可用", async ({ page }) => {
  await page.goto("/editor/stories");
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

test("照片查看器支持左右滑动切换", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/story/s1");
  await page.getByTestId("story-hero-media").click();
  const viewer = page.getByTestId("media-viewer");
  await expect(viewer.getByText(/^1 \/ \d+$/)).toBeVisible();

  const box = await viewer.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height * 0.5, { steps: 5 });
  await page.mouse.up();
  await expect(viewer.getByText(/^2 \/ \d+$/)).toBeVisible();

  await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height * 0.5);
  await page.mouse.down();
  await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height * 0.5, { steps: 5 });
  await page.mouse.up();
  await expect(viewer.getByText(/^1 \/ \d+$/)).toBeVisible();
});

test("上传照片会生成三级资源并可排序删除", async ({ page }) => {
  await page.goto("/editor/stories");
  const upload = page.locator('input[type="file"][multiple][accept*="image/jpeg"]');
  await upload.setInputFiles(fixtureImage);
  await expect(page.getByRole("status")).toContainText("已生成 1 张图片", { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "删除照片" })).toBeVisible();
  await expect(page.getByRole("button", { name: "前移照片" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "后移照片" })).toBeDisabled();
});

test("插画上传后需要手动保存，并支持恢复默认", async ({ page }) => {
  await page.goto("/editor/theme");
  await expect(page.getByRole("heading", { name: "首页" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "成长章节" })).toBeVisible();
  await expect(page.getByText("时间轴节点")).toHaveCount(0);
  await expect(page.getByText("页面背景纹理")).toHaveCount(0);
  await expect(page.getByText("卡片角落装饰")).toHaveCount(0);
  await expect(page.getByText("位置：宝宝姓名下方的主视觉")).toBeVisible();
  await expect(page.getByText("替换插画", { exact: true })).toHaveCount(2);
  await expect(page.getByText("替换章节插画", { exact: true })).toHaveCount(6);
  const firstUpload = page.locator('input[type="file"][accept*="image/svg+xml"]').first();
  await firstUpload.setInputFiles(fixtureImage);
  await expect(page.getByRole("status")).toContainText("插画已进入预览", { timeout: 20_000 });
  const saveButton = page.getByRole("button", { name: "保存设置" });
  await expect(saveButton).toBeEnabled();
  await page.getByRole("link", { name: "返回编辑台" }).click();
  await expect(page.getByRole("heading", { name: "个性化设置还没有保存" })).toBeVisible();
  await page.getByRole("button", { name: "继续编辑" }).click();
  await saveButton.click();
  await expect(page.getByRole("status")).toContainText("个性化设置已保存");
  await expect(saveButton).toBeDisabled();
  const resetButton = page.getByRole("button", { name: "恢复封面主插画默认插画" });
  await expect(resetButton).toBeEnabled();
  await resetButton.click();
  await expect(resetButton).toBeDisabled();
});

test("章节名称和插画保存后同步到展示页面", async ({ page }) => {
  await page.goto("/editor/theme");
  const titleField = page.getByRole("textbox", { name: "诞生记忆章节名称" });
  await titleField.fill("出生时光");
  const chapterUpload = page
    .getByText("替换章节插画", { exact: true })
    .first()
    .locator("input[type=file]");
  await chapterUpload.setInputFiles(fixtureImage);
  await expect(page.getByRole("status")).toContainText("章节插画已进入预览", {
    timeout: 20_000,
  });
  await page.getByRole("button", { name: "保存设置" }).click();
  await expect(page.getByRole("status")).toContainText("个性化设置已保存");

  await page.reload();
  await expect(titleField).toHaveValue("出生时光");
  await page.goto("/");
  const chapter = page.getByTestId("chapter-birth");
  await expect(chapter).toContainText("出生时光");
  await expect(chapter.locator("img")).toHaveAttribute("src", /^data:image\/webp;base64,/);
});
