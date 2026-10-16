# 心纪元网站架构

## 当前实现

使用 Next.js App Router、React、严格 TypeScript 和 Three.js。选择单仓库的模块化应用，不先拆微服务或多应用 monorepo。公开内容默认 Server Components；首页场景、地点切换、菜单和身份选择是独立客户端边界。Three.js 通过动态 import 加载，文章页不引入渲染器。

- `app/`：真实 URL、元数据、错误页、旧入口重定向。首页、手记和文章可预渲染。
- `features/world/`：首页场景；`scene/` 单独管理几何、相机数学、动画运行时。
- `features/gallery/`：对外名称“世界巡游”。八处风景通过动态 import 加载 Three.js 与 Meshopt 模型；教堂庭院和大厅共用完整建筑资产。场景切换销毁旧三维实例。静帧用于无 JavaScript、WebGL 失败和加载中退化。
- `/map`：未来真实 MC 卫星地图的独立入口，服务尚未搭建。仅接收有界整数坐标供后续定位，不显示伪造瓦片、在线玩家或实时状态。`/world?place=...` 兼容跳转到世界巡游。
- `features/journal/`：类型化文章仓库与列表。页面不直接持有文章正文，后续可接 CMS。
- `features/account/`：三栏玩家中心、43 款 Minecraft 皮肤三维预览与地点收藏。`xinera.player.v1` 在 localStorage 保存外观和收藏；不包含本站会话、认证后端或游戏同步，不接收密码。
- `components/site/`：导航、阶梯按钮、页脚与内容入场。
- `lib/site.ts`：品牌和已有外部服务地址。地址存在不代表服务健康。
- `public/xinera/`：正式运行资产，不依赖 `design-exploration`。标题、按钮、Logo 保留批准的素材。

旧 `components/home` 和模板组件暂保留作迁移参考，不进入新页面依赖图。旧模板登录页转至 `/account`，旧 WebGL 演示入口回到首页。旧工具函数回归测试继续运行；以后可单独清理历史代码。

## 运动和生命周期

构图与运动基线是 `design-exploration/2026-10-16-hero-motion`。原相机路径保存在 `motion.ts`，鼠标漂移与滚动路径分离。UI 抵消鼠标漂移，保持点击目标稳定。

React 管理内容、场景选择与语义；Three.js 运行时只拥有本组件内的 canvas、动画样式和焦点移交。每次挂载拥有独立 AbortController；卸载、失败和 context loss 取消 RAF、监听器、请求并释放纹理、几何和材质。页面不可见或场景离开视口时停掉循环。

默认 HTML 使用从正式场景采集的桌面/手机静态海报，保持同一构图；渲染器初始化成功才切换为滚动场景。无 JavaScript、减少动态效果或 WebGL 失败时保留内容和链接。图片、真实文章、站点导航不依赖 WebGL 成功。

跨页使用原生链接及 CSS View Transitions，文章图片使用对应地点的稳定 transition name。支持的浏览器得到图片衔接，其余浏览器正常导航。避免把实验性的路由动画 API 变成阅读功能的前提。

世界巡游的 `tours.ts` 定义三条闭合相机/注视点路线，默认沿岸播放；手动操作或暂停立即中止过渡与巡游，继续时平滑归位。跨路线转移先抬高至山峰之上。`atmosphere.ts` 管理程序天空、动态海面与可释放的 Reflector 反射目标；相机或投影变化时反射逐帧更新，仅静止时限制为 30 Hz，GTAO 法线通道跳过反射更新。AO 使用较低分辨率，最终色彩经 OutputPass 输出。`block-materials.ts` 将原 atlas 拆成独立材质 mipmap，避免远景欠采样和相邻纹理串色；不更改地形。岸边水色来自真实海岸距离，是美术处理而非水深数据。

首页 `hero-model.ts` 加载独立编辑的 `hero/cathedral-island.glb` 与方块材质，轻微摆转与鼠标视差独立于滚动路径；`celestial.ts` 管理程序天空、光晕、方块太阳、月亮和星点，返回同一轨道位置供主光使用。全站主题由 `html[data-theme]` 与 `xinera-theme` 持久偏好控制，首页以两秒光照过渡响应主题变化；巡游内部日夜选择保持独立。首页桌面/手机均具备日夜静帧回退。

发光材质的 `emissiveFactor` 为白色，emission atlas 仅包含真实发光纹理/局部像素，彩玻璃保持黑色 emission。`features/gallery/block-lights.ts` 由实际存档的 `*-lights.json` 建立最多 8 盏附近点光池（首页为 6 盏），带选位滞回与换位淡入淡出；所有灯具自发光不受此数量限制。这是浏览器展示用的局部照明近似，不是 Minecraft 全世界 block-light 传播模拟。首页与巡游都经 Bloom/OutputPass，首页光源随展示模型旋转。97 个实际信标均缺少有效首层矿物底座，当前不创建激活光柱。

首页独立模型保留立面、庭院、聚义厅与全部 1,328 个原始水方块；两侧岩肩、树群、种植台地和石阶属于展示景观编辑，不写回世界存档。`hero-water.ts` 只替换水材质，以世界坐标生成连续下落水纹；`hero-materials.ts` 按实际 atlas 映射调整材质粗糙度、金属度和轻微凹凸。`environment.ts` 提供可释放的天空 PMREM 辐照环境。

首页与巡游显式创建 HalfFloat 后处理目标，启用设备支持范围内最多 4× MSAA，并在线性色彩空间执行 SMAA 后交给 OutputPass。首页 DPR 上限为 1.25，巡游桌面为 1.5、手机为 1.25；首页阴影在模型转动或日夜过渡时更新，兼顾轮廓平滑与运动开销。叶片保留透明裁切，不启用会产生稀疏噪点的 alpha-to-coverage。

公开文案的来源与发布边界集中记录于 `docs/content-sources.md`。总设定与第一章提供剧情方向、地名及誓言，不证明账号、地图、职业或任务系统已经上线。

## 后续服务边界

浏览器不能直接访问 MC 数据库、RCON 或插件管理接口。后续网站后端通过 server-only adapters 接入认证、地图和游戏数据，不在页面组件中持有密钥或直接拼接管理命令。

站点用户、已验证身份、游戏角色分别建模；正版 UUID 与离线认证服务的稳定账号 ID 分别带 provider 命名空间。同名不自动合并，昵称不是验证凭据。先确定真实离线认证来源、Microsoft/Minecraft 验证流程及角色关系，再添加数据库表与迁移。

角色资料与在线状态必须带数据来源、同步时间和 unavailable 状态。未知不显示为零，地图服务链接不等同于地图数据已接入。第一期保留已有外部服务入口；新版身份表单在后端可验收之前不接收用户密码。

用户已确认卫星地图尚未搭建；`map.mcxin.top` 目前只是一项历史地址。后续需要单独确定 MC 地图服务、真实世界/图层 ID、坐标深链、更新方式和嵌入策略，并在真实服务器上验证数据变化与网页同步。世界巡游使用离线存档提取的精选资产，不承担这一职责。火山岛采样、完整海岸校验、压缩与纹理说明见 `design-exploration/2026-10-16-gallery-volcano/README.md`，运行时只读 `public/xinera/gallery`。

## 构建与部署

使用 Node 24 LTS、pnpm 和唯一的 `pnpm-lock.yaml`；新代码使用原生 CSS design tokens，避免为原型迁移引入第二套 UI 框架。构建使用 Next.js standalone 输出。生产入口为 `https://www.mcxin.top`，沿用受管青岛服务与 nginx 的 18081 本地端口。

`pnpm typecheck`、`pnpm lint`、`pnpm test`、`pnpm build` 是本地检查。验收还须真实浏览器覆盖桌面/手机、首页进出、键盘、原生页面返回、减少动态效果、WebGL 失败和文章深链。

standalone 运行时需携带 `.next/static` 与公开运行资产；准备脚本排除 `*-source.json`、`*-height.json` 与皮肤来源清单，保留灯光和材质定义。本地设计稿、验收截图和内部剧本来源文档不提交到发布仓库。

远端使用官网专用 Node 24，避免改变其他服务的系统 Node。`MCXIN_BUILD_CPUS=1` 将 Next 构建 worker 限为一个，适用于小内存服务器。受管发布应在独立 candidate 构建，成功后再切换运行目录；旧版本保留供回退。上线仍须核对远端版本、服务状态和真实浏览器页面，不凭本地构建成功推断线上兼容。
