# 宝宝成长相册 Demo 1.5 Pro

一个以手机端体验为主的宝宝成长纪念网站。前端负责相册展示和编辑，FastAPI 后端负责保存宝宝资料、照片、插画、背景和音乐。

> 当前版本在本机运行。使用网站时，前端和后端必须同时保持启动。

## 手动启动项目

需要打开两个 PowerShell 窗口：第一个运行后端，第二个运行前端。建议始终先启动后端。

### 第一次使用：安装依赖

先把仓库下载到电脑，然后进入项目根目录：

```powershell
git clone https://github.com/Yi-xin-Li/baby-growth-album-demo.git
cd baby-growth-album-demo
npm.cmd install
```

如果项目已经在电脑中，可以在资源管理器打开项目文件夹，在地址栏输入 `powershell` 并回车。然后创建后端虚拟环境并安装 Python 依赖：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
cd ..
```

复制后端配置并设置固定编辑密码：

```powershell
Copy-Item backend\.env.example backend\.env
notepad backend\.env
```

把 `BABY_ALBUM_EDITOR_PIN` 后面的示例文字替换为仅家庭成员知道的密码。`backend/.env` 不会提交到 GitHub。依赖和密码设置成功后，平时启动项目不需要重复执行以上步骤。

### 第一步：手动启动后端

打开第一个 PowerShell 窗口，逐行输入：

```powershell
cd backend
.\.venv\Scripts\python.exe run.py
```

后端地址：

```text
http://127.0.0.1:8000
```

可以在浏览器打开 `http://127.0.0.1:8000/docs` 检查后端是否正常。启动后不要关闭这个 PowerShell 窗口。

### 第二步：手动启动前端

另外打开一个 PowerShell 窗口，逐行输入：

```powershell
npm.cmd run dev
```

终端会显示网页地址，通常为：

```text
http://localhost:5173
```

复制终端实际显示的网址到浏览器中打开。两个 PowerShell 窗口必须同时保持运行。

### 手机通过家庭 Wi-Fi 访问

1. 确保手机和电脑连接同一个可信的家庭 Wi-Fi。
2. 在 PowerShell 输入 `ipconfig`，找到电脑当前网络的“IPv4 地址”，例如 `192.168.1.8`。
3. 保持前端和后端两个窗口运行，在手机浏览器打开：

```text
http://192.168.1.8:5173
```

前端终端通常也会显示 `Network` 地址，可以直接使用。第一次启动时如果 Windows 防火墙询问权限，只允许“专用网络”，不要允许公共网络。

手机查看相册不需要密码；进入宝宝档案、成长记录或个性化页面时需要 `backend/.env` 中的编辑密码。手机可以修改日常内容和上传照片，但完整备份、恢复和存储设置只在电脑端显示。同一时间只能有一台设备编辑，另一台设备可以选择“强制接管编辑”。

### 停止项目

在前端和后端的 PowerShell 窗口中分别按：

```text
Ctrl + C
```

## 常见启动问题

### 找不到 `package.json`

这是因为终端不在项目根目录。请在资源管理器打开项目文件夹，在地址栏输入 `powershell` 并回车，再输入：

```powershell
npm.cmd run dev
```

### 页面提示“后端未启动”

确认第一个 PowerShell 窗口仍在运行，并尝试打开 `http://127.0.0.1:8000/docs`。只启动前端时，数据保存、照片上传和完整备份不能正常工作。

### 手机能打开网页但看不到自定义照片

- 手机地址必须使用电脑的 IPv4 地址，不能使用手机上的 `localhost` 或 `127.0.0.1`。
- 确认电脑和手机处于同一 Wi-Fi，并关闭访客网络的设备隔离。
- 确认 Windows 网络类型为“专用网络”，且防火墙允许 Python 和 Node.js 在专用网络通信。
- 手机访问地址和前端终端显示的 `Network` 地址应一致。

### 找不到后端 Python

如果提示找不到 `.venv\Scripts\python.exe`，重新执行：

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
```

### PowerShell 不允许执行 `npm`

请使用 `npm.cmd`，不要只输入 `npm`。

## 主要页面

| 页面   | 地址                | 用途              |
| ---- | ----------------- | --------------- |
| 首页   | `/`               | 查看宝宝封面和成长相册     |
| 成长章节 | `/#chapters`      | 选择六个成长章节        |
| 宝宝档案 | `/editor/profile` | 修改宝宝基础资料和动效设置   |
| 成长记录 | `/editor/stories` | 管理故事、照片、视频封面和数据 |
| 个性化  | `/editor/theme`   | 修改背景、音乐、插画和章节名称 |

顶部常驻五个导航按钮：`首页`、`成长章节`、`宝宝档案`、`成长记录`、`个性化`。

## 主要功能

- 六个成长章节与章节时间轴
- 故事新增、修改、删除和排序
- 照片上传、压缩、排序、滑动浏览和高清查看
- 宝宝资料与成长记录自动保存
- 自定义网页背景、背景透明度、背景音乐和插画
- 自定义章节名称和六张章节插画
- 带记忆功能的折叠面板
- 可拖动的音乐悬浮按钮
- `.baby-album.zip` 完整备份与恢复
- 旧浏览器缓存一键迁移到后端
- 家庭局域网手机查看、密码编辑和单设备编辑保护
- 展示页每10秒同步其他设备保存的新内容

## 数据保存与备份

主要数据保存在：

```text
backend/data/app.db       SQLite 数据库
backend/data/media/       照片、背景、插画和音乐
```

`backend/data/` 已被 Git 忽略，正常提交代码时不会上传私人照片。不要手动删除该目录。

在“成长记录 → 数据管理”中可以导出 `.baby-album.zip` 完整备份。导入时可直接选择 `.zip` 文件，系统会检查压缩包内部是否为有效的完整备份。更换电脑前，建议先导出完整备份。

## 图片素材

网站运行时使用的内置图片位于：

```text
frontend/public/images/
```

代码中使用网站相对路径，例如：

```text
/images/cover_baby.svg
```

不要使用电脑绝对路径，否则项目复制到其他电脑后会找不到图片。

## 常用开发命令

以下命令在项目根目录执行：

```powershell
# 启动前端
npm.cmd run dev

# 检查生产构建
npm.cmd run build

# 检查前端代码
npm.cmd run lint

# 运行浏览器自动化测试
npm.cmd run test:e2e

# 运行后端测试
.\backend\.venv\Scripts\python.exe -m pytest backend\tests -q
```

## 项目结构

```text
baby-growth-album-demo/
├─ frontend/                 React 前端
│  ├─ public/images/         网站内置图片
│  ├─ src/                   页面、组件和前端逻辑
│  └─ tests/e2e/             浏览器自动化测试
├─ backend/                  FastAPI 后端
│  ├─ app/                   API、数据库和媒体处理逻辑
│  ├─ data/                  私人相册数据，不提交 GitHub
│  ├─ tests/                 后端测试
│  ├─ requirements.txt       Python 依赖
│  └─ run.py                 后端启动入口
├─ scripts/                  测试辅助脚本
├─ docs/                     项目规划和技术文档
├─ package.json              根目录 npm 命令入口
└─ README.md                 当前使用说明
```

## Git 与 GitHub

远程仓库：[Yi-xin-Li/baby-growth-album-demo](https://github.com/Yi-xin-Li/baby-growth-album-demo)

```powershell
git status
git add .
git commit -m "说明本次修改"
git push
```

不要使用 `git push --force`，避免误删远程仓库的提交历史。

## 当前版本

- 前端：React 19、TypeScript、Tailwind CSS 4、TanStack Start、Vite
- 后端：FastAPI、SQLite、本机媒体目录
- 当前定位：本机可展示、可编辑的手机端宝宝成长相册
- 局域网模式：同一家庭 Wi-Fi 下可查看和编辑，数据仍保存在电脑
- 暂未包含：账号系统、云端存储、公开分享链接和付费系统
