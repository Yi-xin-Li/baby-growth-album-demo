import { expect, test, type Page } from "@playwright/test";
import { readFile } from "node:fs/promises";
import path from "node:path";

const fixtureImage = path.resolve("public/images/icon_birth.png");

test.beforeEach(async ({ request, page }) => {
  await request.post("http://127.0.0.1:8000/api/testing/reset");
  const login = await request.post("http://127.0.0.1:8000/api/auth/editor", {
    data: { pin: "test-editor-pin" },
  });
  const token = (await login.json()).token as string;
  await page.addInitScript((editorToken) => {
    window.sessionStorage.setItem("baby-album-editor-token", editorToken);
  }, token);
});

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

test("访客可以浏览默认的空成长章节", async ({ page }) => {
  const errors = await collectRuntimeErrors(page);
  await page.goto("/", { waitUntil: "domcontentloaded" });
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

  await page.goto("/chapter/birth", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "诞生记忆" })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("共 0 篇回忆 · 点击卡片翻阅完整故事")).toBeVisible();
  await expect(page.locator('[data-testid^="story-"]')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("编辑草稿刷新后仍然存在", async ({ page }) => {
  const errors = await collectRuntimeErrors(page);
  await page.goto("/editor");
  const nameField = page.getByRole("textbox", { name: "宝宝姓名" });
  await nameField.fill("自动保存测试宝宝");
  await expect(page.getByText("正在自动保存…")).toBeVisible();
  await expect(page.getByText("草稿已保存")).toHaveText("草稿已保存");
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
  await expect(editorNavigation.getByRole("link")).toHaveCount(5);
  await expect(editorNavigation.getByRole("link", { name: "个性化" })).toHaveAttribute(
    "href",
    "/editor/theme",
  );
  await expect(editorNavigation.getByRole("link", { name: "宝宝档案" })).toHaveClass(/bg-black/);
  await editorNavigation.getByRole("link", { name: "成长章节" }).click();
  await expect(page).toHaveURL(/\/#chapters$/);
  await expect(page.getByTestId("chapter-birth")).toBeVisible();
});

test("五项导航使用统一字体", async ({ page }) => {
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

test("宝宝档案使用紧凑单栏并记忆折叠状态", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto("/editor/profile");
  await expect(page.getByText("实时预览")).toHaveCount(0);
  await expect(page.getByRole("link", { name: "打开完整网站" })).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "宝宝姓名" })).toBeVisible();

  const appearanceToggle = page.getByRole("button", { name: "展开动效与个性化" });
  await expect(appearanceToggle).toBeVisible();
  await appearanceToggle.click();
  await expect(page.getByRole("button", { name: "收起动效与个性化" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "收起动效与个性化" })).toBeVisible();
});

test("成长记录的数据管理折叠状态可以记忆", async ({ page }) => {
  await page.goto("/editor/stories");
  await expect(page.getByRole("button", { name: "展开数据管理" })).toBeVisible();
  await page.getByRole("button", { name: "展开数据管理" }).click();
  await expect(page.getByRole("button", { name: "收起数据管理" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("button", { name: "收起数据管理" })).toBeVisible();
});

test("手机编辑需要密码并隐藏危险的数据管理功能", async ({ page, request }) => {
  await request.post("http://127.0.0.1:8000/api/testing/reset");
  await page.addInitScript(() => window.sessionStorage.removeItem("baby-album-editor-token"));
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/editor/stories");

  await expect(page.getByRole("heading", { name: "进入编辑模式" })).toBeVisible();
  await page.getByPlaceholder("请输入编辑密码").fill("test-editor-pin");
  await page.getByRole("button", { name: "进入编辑" }).click();

  await expect(page.getByRole("heading", { name: "成长记录" }).first()).toBeVisible();
  await expect(page.getByText("完整备份、恢复和存储设置请在电脑端操作。")).toBeVisible();
  await expect(page.getByRole("button", { name: "展开数据管理" })).toHaveCount(0);
});

test("展示页和编辑页导航随滚动隐藏并在向上滑动时恢复", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 700 });
  const initialAlbumSave = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().includes("/api/albums/demo-album-001"),
  );
  await page.goto("/");
  await initialAlbumSave;
  const navigation = page.getByRole("navigation", { name: "主要页面导航" });

  await expect(navigation).toHaveAttribute("data-hidden", "false");
  await expect(navigation.getByRole("button")).toHaveCount(2);
  await expect(navigation.getByRole("link")).toHaveCount(3);
  await expect(page.getByTestId("chapter-birth")).toBeVisible();

  await page.evaluate(() => {
    window.scrollTo(0, 700);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(96);
  await expect(navigation).toHaveAttribute("data-hidden", "true");

  await page.evaluate(() => window.scrollTo(0, 150));
  await expect(navigation).toHaveAttribute("data-hidden", "false");

  const editorAlbumLoad = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" && response.url().includes("/api/albums/active"),
  );
  await page.goto("/editor/stories");
  await editorAlbumLoad;
  const editorNavigation = page.getByRole("navigation", { name: "主要页面导航" });
  await page.setViewportSize({ width: 390, height: 400 });
  await expect(page.getByRole("button", { name: "收起成长记录" })).toBeVisible();
  await page.evaluate(() => {
    window.scrollTo(0, 600);
  });
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(96);
  await expect(editorNavigation).toHaveAttribute("data-hidden", "true");
  await page.evaluate(() => window.scrollTo(0, 150));
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
  await page.getByRole("button", { name: "新增故事" }).click();
  await page
    .getByRole("textbox", { name: "封面路径（仅保存相对路径或网络地址）" })
    .fill("/missing-test-image.jpg");
  await expect(page.getByText("正在自动保存…")).toBeVisible();
  await expect(page.getByText("草稿已保存")).toHaveText("草稿已保存");
  await page.goto("/");
  await page.getByTestId("chapter-birth").click();
  await expect(page.getByRole("img", { name: /暂未加载/ }).first()).toBeVisible();
});

test("章节和预览深链接可以直接打开，已删除的内置故事不会显示", async ({ page }) => {
  await page.goto("/chapter/birth");
  await expect(page.getByRole("heading", { name: "诞生记忆" })).toBeVisible();
  await page.goto("/story/s1");
  await expect(page.getByTestId("story-detail")).toHaveCount(0);
  await page.goto("/preview");
  await expect(page.getByRole("heading", { name: "皮君尧" })).toBeVisible();
});

test("照片查看器支持左右滑动切换", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/editor/stories");
  await page.getByRole("button", { name: "新增故事" }).click();
  const photoUpload = page.locator('input[type="file"][multiple][accept*="image/jpeg"]');
  const fixtureBuffer = await readFile(fixtureImage);
  await photoUpload.setInputFiles({
    name: "first.png",
    mimeType: "image/png",
    buffer: fixtureBuffer,
  });
  await expect(page.getByRole("status")).toContainText("已生成 1 张图片", { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "删除照片" })).toHaveCount(1, { timeout: 20_000 });
  await photoUpload.setInputFiles({
    name: "second.png",
    mimeType: "image/png",
    buffer: fixtureBuffer,
  });
  await expect(page.getByRole("button", { name: "删除照片" })).toHaveCount(2, { timeout: 20_000 });
  await expect(page.getByText("草稿已保存")).toHaveText("草稿已保存");
  await page.goto("/");
  await page.getByTestId("chapter-birth").click();
  await page.getByText("新的成长故事").click();
  await page.getByTestId("story-hero-media").click();
  const viewer = page.getByTestId("media-viewer");
  await expect(viewer.getByText("1 / 2")).toBeVisible();

  const swipeArea = page.getByTestId("media-swipe-area");
  const box = await swipeArea.boundingBox();
  expect(box).not.toBeNull();
  await swipeArea.dispatchEvent("pointerdown", {
    pointerId: 1,
    pointerType: "touch",
    clientX: box!.x + box!.width * 0.75,
    clientY: box!.y + box!.height * 0.5,
  });
  await swipeArea.dispatchEvent("pointerup", {
    pointerId: 1,
    pointerType: "touch",
    clientX: box!.x + box!.width * 0.25,
    clientY: box!.y + box!.height * 0.5,
  });
  await expect(viewer.getByText("2 / 2")).toBeVisible();

  await swipeArea.dispatchEvent("pointerdown", {
    pointerId: 2,
    pointerType: "touch",
    clientX: box!.x + box!.width * 0.25,
    clientY: box!.y + box!.height * 0.5,
  });
  await swipeArea.dispatchEvent("pointerup", {
    pointerId: 2,
    pointerType: "touch",
    clientX: box!.x + box!.width * 0.75,
    clientY: box!.y + box!.height * 0.5,
  });
  await expect(viewer.getByText("1 / 2")).toBeVisible();
});

test("上传照片会生成三级资源并可排序删除", async ({ page }) => {
  await page.goto("/editor/stories");
  await page.getByRole("button", { name: "新增故事" }).click();
  const upload = page.locator('input[type="file"][multiple][accept*="image/jpeg"]');
  await upload.setInputFiles(fixtureImage);
  await expect(page.getByRole("status")).toContainText("已生成 1 张图片", { timeout: 20_000 });
  await expect(page.getByRole("button", { name: "删除照片" })).toBeVisible();
  await expect(page.getByRole("button", { name: "前移照片" })).toBeDisabled();
  await expect(page.getByRole("button", { name: "后移照片" })).toBeDisabled();
});

test("插画上传后需要手动保存，并支持恢复默认", async ({ page }) => {
  await page.goto("/editor/theme");
  await page.getByRole("button", { name: "展开首页插画" }).click();
  await page.getByRole("button", { name: "展开成长章节" }).click();
  await expect(page.getByRole("heading", { name: "首页插画" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "成长章节" })).toBeVisible();
  await expect(page.getByText("时间轴节点")).toHaveCount(0);
  await expect(page.getByText("页面背景纹理")).toHaveCount(0);
  await expect(page.getByText("卡片角落装饰")).toHaveCount(0);
  await expect(page.getByText("位置：宝宝姓名下方的主视觉")).toBeVisible();
  await expect(page.getByText("替换插画", { exact: true })).toHaveCount(2);
  await expect(page.getByText("替换章节插画", { exact: true })).toHaveCount(6);
  const firstUpload = page.locator('input[type="file"][accept*="image/svg+xml"]').first();
  await expect(firstUpload).toHaveAttribute("accept", /image\/jpeg/);
  await expect(firstUpload).toHaveAttribute("accept", /image\/avif/);
  await firstUpload.setInputFiles({
    name: "不支持的插画.gif",
    mimeType: "image/gif",
    buffer: Buffer.from("GIF89a"),
  });
  await expect(page.getByRole("status")).toContainText("插画仅支持 JPG、PNG、WebP、SVG 或 AVIF");
  await page.getByRole("button", { name: "关闭提示" }).click();
  await firstUpload.setInputFiles(fixtureImage);
  await expect(page.getByRole("status")).toContainText("插画已进入预览", { timeout: 20_000 });
  const saveButton = page.getByRole("button", { name: "保存设置" });
  await expect(saveButton).toBeEnabled();
  await page.getByRole("link", { name: "返回宝宝档案" }).click();
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

test("手机端上传通知在屏幕中央显示并自动消失", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 800 });
  await page.goto("/editor/theme");
  const backgroundUpload = page.locator(
    'input[type="file"][accept="image/jpeg,image/png,image/webp"]',
  );
  await backgroundUpload.setInputFiles(fixtureImage);
  const notice = page.getByRole("status");
  await expect(notice).toContainText("背景已进入预览", { timeout: 20_000 });
  const noticeBox = await notice.boundingBox();
  expect(noticeBox).not.toBeNull();
  expect(Math.abs(noticeBox!.y + noticeBox!.height / 2 - 400)).toBeLessThan(30);
  await expect(notice).toBeHidden({ timeout: 5_000 });
});

test("章节名称和插画保存后同步到展示页面", async ({ page }) => {
  await page.goto("/editor/theme");
  await page.getByRole("button", { name: "展开成长章节" }).click();
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
  await expect(chapter.locator("img")).toHaveAttribute(
    "src",
    /^http:\/\/127\.0\.0\.1:8000\/api\/assets\//,
  );
});

test("自定义背景保存后应用到展示页，个性化折叠状态可以记忆", async ({ page }) => {
  await page.goto("/editor/theme");
  await expect(page.getByRole("button", { name: "收起页面背景" })).toBeVisible();
  const backgroundUpload = page.locator(
    'input[type="file"][accept="image/jpeg,image/png,image/webp"]',
  );
  await backgroundUpload.setInputFiles(fixtureImage);
  await expect(page.getByRole("status")).toContainText("背景已进入预览", { timeout: 20_000 });
  const opacitySlider = page.getByRole("slider", { name: "背景透明度" });
  await expect(opacitySlider).toHaveValue("0.22");
  await opacitySlider.fill("0.45");
  await page.getByRole("button", { name: "保存设置" }).click();
  await expect(page.getByRole("status")).toContainText("个性化设置已保存");

  await page.getByRole("button", { name: "展开背景音乐" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "收起背景音乐" })).toBeVisible();

  await page.goto("/");
  await expect(page.locator("main")).toHaveCSS(
    "background-image",
    /127\.0\.0\.1:8000\/api\/assets/,
  );
  expect(
    await page.locator("main").evaluate((element) => element.style.getPropertyValue("--paper")),
  ).toContain("55%");
});

test("背景音乐保存后显示播放器并保持默认暂停", async ({ page }) => {
  await page.goto("/editor/theme");
  await page.getByRole("button", { name: "展开背景音乐" }).click();
  await page.locator('input[type="file"][accept="audio/mpeg,.mp3"]').setInputFiles({
    name: "测试音乐.mp3",
    mimeType: "audio/mpeg",
    buffer: Buffer.from([0x49, 0x44, 0x33, 0x04, 0x00]),
  });
  await expect(page.getByRole("status")).toContainText("音乐已进入试听列表");
  await page.getByRole("button", { name: "保存设置" }).click();
  await page.goto("/");
  await expect(page.getByLabel("背景音乐播放器")).toBeVisible();
  await expect(page.getByRole("button", { name: "播放背景音乐" })).toBeVisible();
  await expect(page.getByTestId("music-off-indicator")).toBeVisible();
  expect(await page.locator("audio").evaluate((audio) => (audio as HTMLAudioElement).paused)).toBe(
    true,
  );

  await page.addInitScript(() => {
    HTMLMediaElement.prototype.play = function play() {
      this.dispatchEvent(new Event("play"));
      return Promise.resolve();
    };
    HTMLMediaElement.prototype.pause = function pause() {
      this.dispatchEvent(new Event("pause"));
    };
  });
  await page.reload();
  await page.getByRole("button", { name: "播放背景音乐" }).click();
  await expect(page.getByRole("button", { name: "暂停背景音乐" })).toBeVisible();
  await expect(page.getByLabel("背景音乐播放器")).toHaveAttribute("data-playing", "true");
  await expect(page.getByTestId("music-off-indicator")).toHaveCount(0);

  await page.getByRole("button", { name: "暂停背景音乐" }).click();
  await expect(page.getByRole("button", { name: "播放背景音乐" })).toBeVisible();
  await expect(page.getByTestId("music-off-indicator")).toBeVisible();

  const musicButton = page.getByRole("button", { name: "播放背景音乐" });
  const buttonBox = await musicButton.boundingBox();
  expect(buttonBox).not.toBeNull();
  await page.mouse.move(buttonBox!.x + buttonBox!.width / 2, buttonBox!.y + buttonBox!.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(400);
  await expect(page.getByLabel("背景音乐播放器")).toHaveAttribute("data-dragging", "true");
  await page.mouse.move(24, 220, { steps: 4 });
  await page.mouse.up();
  await expect(page.getByLabel("背景音乐播放器")).toHaveAttribute("data-dragging", "false");
  await expect(musicButton).toHaveAttribute("aria-pressed", "false");
  expect(
    await page.evaluate(() =>
      JSON.parse(localStorage.getItem("baby-album-music-control-position") ?? "null"),
    ),
  ).toMatchObject({ x: 8 });

  await page.reload();
  await expect(page.getByLabel("背景音乐播放器")).toHaveCSS("left", "8px");
});
