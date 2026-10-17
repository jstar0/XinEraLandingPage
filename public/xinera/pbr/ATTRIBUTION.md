# 材质来源与使用说明

本网站部分方块的法线、粗糙度、反射率贴图来自 **[Poudingue 的 Vanilla Normals Renewed](https://github.com/Poudingue/Vanilla-Normals-Renewed)**。

- 原作者：Poudingue · [支持作者](https://www.patreon.com/Poudingue)
- 来源版本：[`70d89ee4d401a27c4518ebab3b13897c2a6b6921`](https://github.com/Poudingue/Vanilla-Normals-Renewed/tree/70d89ee4d401a27c4518ebab3b13897c2a6b6921)
- 原始许可说明：[完整 README](/xinera/pbr/SOURCE-README.md)
- 作者允许使用、修改及再分发，要求不售卖并附项目或 Patreon 链接，且不可与 Realistico 混用。

这里只收录当前场景确实使用且原包存在的同名法线和高光贴图，保留场景原有基础颜色。未匹配的方块保留语义材质，不声称全部覆盖。

我们把 LabPBR 1.3 的 RG 法线转换为 Three.js 切线空间法线，把高光 R 转换为感知粗糙度。G 小于 230 时是电介质反射率，绝不解释为金属度；G 大于等于 230 时是金属类别。金属采用 Three.js 的金属度与原有基础颜色，未实现 LabPBR 命名金属的复数折射率；未实现视差遮挡或原包全套着色器。

当前覆盖 246/349 种实际使用纹理名（法线 243，高光 244）。转换记录和原图 SHA256 见 [manifest](/xinera/pbr/manifest.json)。
