# PuzzleBloom Bloom Drop — 风格圣经 v1

> 依据 create-game-assets 技能的美术方向规范：描述系统，不描述情绪词。
> 本文件是资产生成的唯一风格来源；所有提示词的「不变块」从这里逐字复制。

## 技术框架（锁定）

| 项       | 值                                             |
| -------- | ---------------------------------------------- |
| 引擎     | Web（React + HTML-in-Canvas 双路径），圆形物理 |
| 视图     | 正交、正脸朝向、微俯 5°（圆盘生物的默认读法）  |
| 本地尺寸 | 生物精灵 512×512 生成，游戏内显示 26–148px     |
| 透明底   | 必须，四周留 8% 缓冲                           |
| 格式     | PNG → webp（构建管线压）                       |
| 平台     | 最新 iPad/iPhone Safari 与桌面 Chromium        |

## 视觉系统十轴

| 轴   | 决定                                                                                                                                           |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| 形状 | **圆润饱满、有机**。所有生物由「一个主体圆 + 少量附属形」构成；无尖角、无细长肢。危险/稀有信号用「角的圆润度」与「附属物数量」区分，绝不用尖刺 |
| 剪影 | 26px 缩略下必须认出「这是什么动物」：耳朵/犄角/叶子/冠是唯一允许的轮廓特征，且**永不与身体粘连**                                               |
| 明度 | 三个明度带：亮面 65-85（身体上部）、固有色 40-60（主体）、暗部 20-35（下缘环境光遮蔽）。灰度下九只生物仍可区分                                 |
| 色彩 | 延续站内九生物色板（#E4736B 蚂蚁 → #B08D6E 皇冠），语义角色：暖色=亲近、冷色=安静、皇冠=奖赏金棕                                               |
| 边缘 | **干净矢量感软边**，无描边（弃用旧 SVG 硬线），靠色块交界与光晕分离                                                                            |
| 材质 | 哑光软糖/黏土质感：均匀次表面散射感，无金属、无玻璃、无毛发细节                                                                                |
| 光照 | 左上主光 + 天光环境色；每只生物自带柔和下缘接触阴影（烘焙进精灵）                                                                              |
| 细节 | 只有两处：眼睛（大、亮、有高光点）+ 轮廓特征物。身体无花纹、无纹理噪点                                                                         |
| 相机 | 正视，微俯 5°，生物重心居中偏下                                                                                                                |
| 动势 | 静态帧带「待弹起」感：轻微压扁蓄力姿态（为 squash 动画预留形变空间）                                                                           |

## 家族不变块（提示词逐字复用）

```
cute round chibi creature, front-facing 5° tilt view, soft matte clay-like texture,
clean soft edges no outline, warm pastel palette, big glossy eyes with single highlight,
soft top-left lighting with baked ambient occlusion at bottom edge,
simple silhouette readable at small size, single character centered,
soft candy-like subsurface feel, minimal detail, kawaii game asset,
isolated on pure white background, no text no watermark no shadow drop
```

## 逐只变量块（一次只变这一个）

| #   | 生物   | 变量块追加                                                                       |
| --- | ------ | -------------------------------------------------------------------------------- |
| 1   | ant    | tiny round red ant with two small round antennae                                 |
| 2   | bunny  | round orange bunny with two long soft upright ears                               |
| 3   | sprout | round yellow creature with a green sprout leaf on top                            |
| 4   | fox    | round green fox with rounded triangular ears and fluffy tail tip visible at side |
| 5   | frog   | round teal frog with two eye bumps on top                                        |
| 6   | bird   | round blue round bird with tiny round crest feathers                             |
| 7   | ram    | round purple ram with two curled rounded horns                                   |
| 8   | panda  | round pink panda with round ears                                                 |
| 9   | crown  | round golden-brown royal creature wearing small rounded crown, gentle smile      |

## 场景（罐子）不变块

```
cozy glass jar with soft rounded corners, warm cream background garden scene,
soft pastel colors, clean vector-style game background, gentle top light,
no characters, no text, game UI background asset, isolated elements
```

## 禁忌（漂移信号 → 一律拒收）

- 出现尖刺、利爪、獠牙、写实解剖
- 描边（任何颜色的 outline/stroke）
- 复杂花纹、渐变网格、纹理噪点
- 光照方向与左上主光矛盾（右下高光=拒收）
- 九只之间的头身比、眼睛大小、质感密度变化
- 带投影/环境/多只/文字/水印
- 任何在世艺术家个人风格

## 三距离验收（生成后必过）

1. **26px 缩略**：认得出生物种类与轮廓特征
2. **工作尺寸**：边缘干净、无杂色、眼睛高光完整
3. **游戏情境**：放进罐子截图中，与背景明度分层清晰
