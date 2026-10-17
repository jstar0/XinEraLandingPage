# 材质语义与原始资产修复

脚本读取本地原版 `minecraft-26.1.2-client.jar` 和已保存的导出快照，世界存档及主体建筑均不改。公开清单只有 `{ tiles: [{ tile, texture, kind }] }`，不包含原存档路径或玩家信息。

## 复现

从项目根目录执行，`CLIENT_JAR` 指向已有原版 client jar：

```sh
uv run --with numpy --with pillow python scripts/materials/build_semantics.py --client "$CLIENT_JAR"
uv run --with numpy --with pillow python scripts/materials/repair_volcano_alpha.py --client "$CLIENT_JAR" --write
uv run --with numpy --with pillow python scripts/materials/build_semantics.py --client "$CLIENT_JAR"
uv run --with numpy --with pillow python scripts/materials/export_cathedral_water.py --client "$CLIENT_JAR" --output /tmp/xinera-cathedral-water-raw.glb
pnpm dlx @gltf-transform/cli@4.5.1 optimize /tmp/xinera-cathedral-water-raw.glb public/xinera/gallery/cathedral-water.glb --compress meshopt --simplify false --join false --palette false --texture-compress false
node scripts/materials/verify_assets.mjs
pnpm dlx @gltf-transform/cli@4.5.1 validate public/xinera/gallery/cathedral-water.glb
pnpm dlx @gltf-transform/cli@4.5.1 validate public/xinera/gallery/volcano.glb
```

`repair_volcano_alpha.py` 默认只演练；再次处理已修复文件时仅核实，不重复附加 PNG。历史导出器只提取纯函数用于恢复 texture 插入顺序或像素生成，不运行其读世界、修改地形、写出模型部分。

## 已验证边界

- 七景共 895 个语义 tile，含 gutter 的 358,000 个 RGBA 像素都与各自原导出 tint/alpha 规则一致。五景使用已保存插入顺序；cathedral 重放 404 个原 block states 的模板；volcano 逐像素匹配其原贴图函数。当前首页的公开材质清单由原流程生成，本脚本不改它。
- 火山只恢复 spruce / acacia / dark_oak 三个叶 tile 的 423 个 alpha 像素（含 gutter）；所有 RGB、非叶像素、几何、UV、发光贴图保持不变。terrain 改为 MASK / 0.45。为保证原几何二进制不变，保留旧 PNG 的 8KB 数据并附加新 PNG，最终净增 9,076 B。原地表树冠壳的结构限制仍保留。
- 教堂旧模板对原版空 fluid model 未生成面，130 个 tile 中完全没有水纹理。此前“水混在 glass 中”的判断已由逐像素和模板复核纠正。新增独立 `cathedral-water.glb`，原 `cathedral.glb` SHA256 不变。
- 新水资产仅来自保存体积中的 1,429 个原 water 方块，保留原水级与坐标。815 对堆叠水方块上下面相接，没有重复的方块高度缝。剔除 3,452 个内部水面与 1,240 个邻接完整实体面的水面；输出 7,764 三角，无几何简化。原始 592,132 B，经 Meshopt 压缩至 123,464 B。
- 两份变化 GLB 的实际 Meshopt 解码通过。glTF validator 均 0 errors / 0 warnings；INFO 是 Meshopt 不受 validator 内部验证、NPOT atlas，以及火山刻意保留旧图集 view。独立解码补足 Meshopt 验证。

## 接入约定

每景请求对应 `*-materials.json`。`cathedral-materials.json` 确实无 water；需额外加载 `cathedral-water.glb` 并保留其 node transform。模型命名 `water`，自身 40×20 图集 tile 0 为 `water_still`、tile 1 为 `water_flow`，配套 `cathedral-water-materials.json`。其坐标与主建筑相同：`[(worldX-208)*0.1, (worldY-64)*0.1, (worldZ+816)*0.1]`。

运行时须对附加水网格使用它自己的图集清单，不能用教堂主图集的 tile 0 / 1。资源验证不替代浏览器中玻璃、叶孔、倒影与高空流水的视觉验收。

逐项大小、SHA256、坐标和像素证据见 `verification.json`、`volcano-alpha-verification.json`、`cathedral-water-verification.json`（原始水导出）以及 `binary-verification.json`（最终压缩资产）。
