# 心纪元 · Minecraft 原创剧情 RPG

心纪元 Minecraft 网站。将已确认的浮岛场景、体素云、滚动镜头、手记和玩家入口落到正式 Next.js 应用；设计探索稿留在 `design-exploration/`，正式站无需读取该目录。

## 运行

使用 Node 24 LTS 与 pnpm 11.25.0。锁文件以 `pnpm-lock.yaml` 为准。

```sh
pnpm install --frozen-lockfile
pnpm dev
```

开发地址为 `http://localhost:3000`。检查与生产运行：

```sh
pnpm check
HOSTNAME=127.0.0.1 PORT=3001 pnpm start
```

`pnpm build` 生成 standalone 服务，并复制公开运行资产、`.next/static` 到运行目录，排除本地来源元数据。可将 `.next/standalone` 整体交付至匹配的运行平台，使用 `node server.js` 启动；原生依赖需在对应目标平台构建。生产发布沿用受管青岛服务 `qingdao.mcxin-homepage`，入口为 `https://www.mcxin.top`；裸域名保留跳转。

## 页面

| 路由                                  | 内容                                                   |
| ------------------------------------- | ------------------------------------------------------ |
| `/`                                   | 真实教堂 3D 模型、缓慢旋转、体素云、滚动穿云、日夜切换 |
| `/journal`                            | 旅途手记：离乡、相遇与骑士的誓言                       |
| `/journal/courtyard`、`/journal/hall` | 可直达、可分享的文章，独立 SEO 元数据                  |
| `/gallery`                            | 世界巡游：8 处三维风景、24 条路线与日夜光照            |
| `/map`                                | MC 卫星地图入口；服务尚未搭建，明确显示未开放状态      |
| `/world?place=courtyard`              | 兼容旧链接，转至对应世界巡游场景                       |
| `/account`                            | 玩家中心：43 款三维皮肤预览、收藏地点与身份说明        |

`/signin`、`/signup`、`/reset-password`、`/233` 旧模板入口转至 `/account`。不再展示无效的模板账号表单。

新版账号验证、会话、地图底图和 MC 数据尚未接入。页面不收集密码、不伪造登录成功、不展示虚构玩家统计。已有服务 URL 集中在 `lib/site.ts`，其可用性和认证能力仍需独立验收。

世界巡游与卫星地图分别承担展示与定位职责。巡游现有东侧火山岛、西奥格勒教堂庭院与彩窗大厅、克莱尔一带、西奥格勒北侧城堡、阿萨一带、奥摩皇城周边和北方海湾八处场景，每处有三条默认自动播放的独立路线，支持拖动缩放、键盘操作、暂停/继续和日夜切换。场景来自离线世界存档；火山岛采用地表模型，其余选区保留实际方块建筑、窗洞与室内结构。天空云层、侧向日光、接触阴影与薄雾共用一套光影；室内另设彩窗补光。模型按当前场景加载，单个约 5.65–19.05 MB；庭院和大厅共用教堂资产。减少动态效果时停止自动巡游与环境动画，并取消过渡；WebGL 不可用时显示同场景静帧。卫星地图尚未搭建。首页使用单独编辑的立面与庭院浮岛模型，保留批准的字标、出发按钮与镜头路径。

首页模型为约 6.29 MB 的独立展示资产，清理了矩形截面与邻房碎片，以两侧岩肩、种植台地、树群和宽石阶展开轮廓；建筑主体保持原方块状态。聚义厅的 1,328 个原始水方块完整保留，并显示连续下落的水纹。首页与巡游的后处理目标启用最多 4× MSAA，叠加 SMAA；首页按原方块纹理区分石材、木材、树叶、玻璃与金属的材质响应。所有巡游与首页已补真实灯具发光贴图，按实际方块位置添加附近受光，彩色玻璃不再误发光。资产更新后的发光修复复现见 `design-exploration/2026-10-16-emission-repair/README.md`。

公开文案以《心纪元总设定 1204》与第一章叙事为依据，围绕逃难、五城旅途和骑士誓言展开。设定中的规划不作为已上线功能宣传；来源对应和剧情边界见 `docs/content-sources.md`。

全站支持浅色/深色主题，首页以 MC 方块太阳与月亮的升落同步过渡天空、云层和建筑光照。默认跟随系统，手动选择保存在本浏览器。玩家中心使用用户提供的 43 款去重皮肤，支持拖动旋转、标准/纤细手臂、搜索与 PNG 下载；皮肤选择和收藏仅存于本浏览器，未同步游戏。

## 维护

- 架构与后端边界：[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)
- 构图、共用控件与运动约定：[DESIGN.md](DESIGN.md)
- 公共内容：`features/journal/content.ts`
- Three.js 生命周期：`features/world/scene/runtime.ts`
- 镜头路径：`features/world/scene/motion.ts`
- 统一色彩、组件和响应式规则：`app/site.css`

新页面默认 Server Components，只有需要浏览器交互的部分使用客户端组件。Three.js 按需加载，离开组件后释放资源；关闭 JavaScript、减少动态效果或 WebGL 失败时，保留静态页面与导航。

测试命令包括 `pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build`。测试同时保留历史工具函数回归；旧 `components/home` 不在新页面依赖图内。ESLint 暂使用 Next 官方插件当前共同支持的 9.39.5，避免强行升级至插件尚未支持的 10；后续与插件兼容范围一起升级。

## 原模板来源

本仓库最初基于 Cruip Simple Light（Tailwind/React/Next.js）模板。保留原项目来源与许可说明：Copyright 2024 Cruip，原 README 声明使用 GPL，见 <https://www.gnu.org/licenses/gpl-3.0.html>。品牌及用户提供的建筑素材不因模板许可自动改变权属。
