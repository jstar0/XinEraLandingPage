# 心纪元字标与图标

`build.py` 使用项目已有的 `app/fonts/ChillBitmap_16px.ttf`，通过 fontTools subset 生成仅含“心纪元”的小型 WOFF2。三个字使用字体原生的 16 × 16 点阵字形，保留全部坐标、轮廓与 advance，不描摹旧 PNG。用户认为常规字重太细，展示层在 `brand.css` 中用无模糊的方形偏移加粗：偏移约字号的 1/32，支持时取整到 CSS 像素。源字形不改动，像素直角和字内空隙保留。

同一脚本将 `public/xinera/logo-pixel-96-mono.png` 转换成 `BrandMark` 中的 SVG 路径，以及同路径的 `public/xinera/brand-mark.svg` favicon。组件采用 `currentColor`，随站点主题换色；favicon 跟随浏览器的 `prefers-color-scheme`。原 PNG 保留作来源，不再用于页头和探索菜单。

```sh
uv run --with pillow --with fonttools --with brotli python scripts/brand/build.py
```

脚本验证子集前后的字形坐标、轮廓和字宽完全一致、所有节点仍落在原生点阵网格，以及 WOFF2 的 Unicode 映射只有“心纪元”三字。SVG 图标另做原图 alpha 的逐像素校验。结果记录在 `verification.json`；字体写入 `app/fonts/xinera-wordmark.woff2`。

`BrandWordmark` 是真实可选中的中英文文字，不以图片或 SVG 路径替代文本语义。默认拥有 `hero-title` 类与 373:172 比例，可以放在原 `<h1>` 中。其英文、细分隔线和方块菱形使用 HTML/CSS；只有三个汉字使用专属字体，由 `next/font/local` 按需预载。中文字行使用源字体的 896 / -128（UPM 1024）上下行度量、居中排列；支持 CSS `round()` 的浏览器采用不超过容器宽度的 16 px 整倍数字号，让原生点阵单元保持整数 CSS 像素。其余浏览器使用比例字号回退。全站正文不受影响。

`BrandMark` 没有重复的可访问名称，需放入已有 `aria-label="心纪元首页"` 的品牌链接；如用于其他位置，应由容器提供合适名称。

## 字体来源与授权

- 原字体：寒蝉点阵体 16px / ChillBitmap_16px，ChillType，Designed by Warren2060。
- 官方项目：https://github.com/Warren2060/ChillBitmap。
- 本地源字体的 name ID 13 声明 **SIL Open Font License 1.1** 与 **GPL 2 或以后版本 + GNU Font Embedding Exception** 双许可；本子集按 OFL 1.1 使用和分发。
- 完整作者授权文件保存为 [`LICENSE-ChillBitmap.txt`](LICENSE-ChillBitmap.txt)，取自官方仓库 commit `f9e3b2f988a2c4107f866aa43c3d61a2b27254d5` 的 `License`。该文件列出保留字体名，因此子集内部家族名改为 **XinEra Pixel Wordmark**。
- 源字体版权、作者和来源元数据原样保留。完整 OFL 文本也嵌入 WOFF2 的许可元数据，随字体一同交付；name ID 10 明确记录三字子集和格式转换，未修改原字形。
- 此许可覆盖字体及其子集，不把网页正文、页面设计或其他代码变成字体衍生品。字体不得单独售卖。
