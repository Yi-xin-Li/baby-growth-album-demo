# Demo 技术与调试计划

## 1. 当前技术基础

- TanStack Start / React / TypeScript
- Tailwind CSS 4
- Framer Motion
- Vite 构建
- 现有单页路由：`frontend/src/routes/index.tsx`
- 现有素材：`frontend/src/assets` 与 `frontend/public/images`

Demo 不更换技术栈，不新增数据库和后端服务。

## 2. 当前主要问题

- 页面、数据、类型和交互集中在一个路由文件中。
- 示例数据写死在 UI 文件里，不方便替换客户内容。
- 图片同时来自本地资源和外部 URL，缺少统一规则。
- 章节列表、故事详情和媒体浏览器耦合较高。
- 缺少针对 Demo 的统一验收清单。

## 3. 目标目录

```text
frontend/src/
  components/growth-album/
    AlbumCover.tsx
    ChapterDirectory.tsx
    ChapterView.tsx
    StoryCard.tsx
    StoryDetail.tsx
    MediaViewer.tsx
  data/
    demo-album.ts
  types/
    album.ts
  routes/
    index.tsx
  styles.css
frontend/public/images/
docs/
```

可以根据实现情况合并过小组件，但数据、类型和页面交互必须分离。

## 4. 数据模型

```text
Album
├─ profile：宝宝名称、日期、欢迎语、主题
└─ chapters[]
   ├─ 章节信息
   └─ stories[]
      ├─ 标题、日期、正文、封面
      └─ media[]：image | video
```

关键原则：页面只消费数据，不包含具体宝宝故事。

## 5. 组件职责

- `index.tsx`：组合页面并保存当前章节、故事和媒体状态。
- `AlbumCover`：展示封面并触发进入目录。
- `ChapterDirectory`：展示所有章节入口。
- `ChapterView`：展示一个章节及其故事列表。
- `StoryCard`：展示故事摘要。
- `StoryDetail`：展示完整故事并打开媒体。
- `MediaViewer`：只负责图片/视频查看和切换。
- `demo-album.ts`：保存全部虚构演示内容。
- `album.ts`：保存数据类型，不保存页面逻辑。

## 6. 实施顺序

1. 提取并统一 TypeScript 数据类型。
2. 将现有示例内容迁移到 `demo-album.ts`。
3. 拆分封面、章节目录和章节视图。
4. 拆分故事详情和媒体浏览器。
5. 整理主题变量和响应式样式。
6. 补充图片失败、无视频和空故事状态。
7. 构建并进行浏览器验收。

每一步保持页面可运行，不同时进行大范围视觉重写和数据重构。

## 7. 调试方法

### 每次修改后

```powershell
npm run lint
npm run build
```

若项目实际使用 Bun，可使用对应的 `bun run` 命令，整个阶段保持一种包管理方式。

### 浏览器检查

- 从首页完整走一遍核心流程。
- 分别检查 320、375、390、430 和 768px。
- 检查控制台错误和失败的网络资源。
- 测试返回、关闭、左右切换和视频占位。
- 刷新页面后确认首页状态稳定。

### 问题记录格式

```text
现象：
复现步骤：
预期结果：
实际结果：
相关页面/组件：
修复结果：
```

## 8. Git 与变更控制

- 不使用强制推送重写已发布的提交历史。
- 每完成一个可运行阶段再建立提交节点。
- 不混入与当前步骤无关的重构。
- 修改范围前先更新文档，再修改代码。
- 每次交付说明修改文件、验证结果和已知限制。

## 9. 暂不处理

- 登录、上传、数据库和云存储
- 多用户与权限隔离
- 支付和订单
- AI 接口
- 自定义域名和正式生产部署
- 大量原始照片与视频的性能优化

## 10. 技术验收

- 数据、类型、组件完成职责分离。
- 新增故事只需修改演示数据。
- `lint` 和 `build` 通过，或明确记录已有问题。
- 浏览器核心流程可用。
- 手机端没有阻断体验的问题。
- 无需后端即可运行 Demo。
