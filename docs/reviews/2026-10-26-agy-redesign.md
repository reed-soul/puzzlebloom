# agy 重做首页 · 2026-10-26

工作区：`/Users/reed_soul/code/puzzlebloom-agy`（分支 `agy-redesign`，从 `d4bcaa2` 拉出）
没 commit，没 deploy。改动留在工作区。

---

## 1. 一句话

我把首页从"给家长看的介绍页"改成了"一打开就能点的三扇门"：Bloom Drop 第一，记忆花园第二，数字天平第三，三张卡都在 10 秒循环演示真实玩法；手机 390×844 第一屏能完整看到并点到三张。

---

## 2. 改了什么，为什么

### 2.1 首屏：从六行英文到三张活卡

原来的首屏是：
- 一个 `Chip`（A quiet corner of the internet）
- 一个 h1（Puzzles that explain themselves.）
- 一段 6 行的英文导语
- 两个按钮（Play Sudoku / Make it yours）
- 右侧一张不可点的数独插画

13 岁的评审原话是："我以为这是给小学一二年级看的绘本网站"，"我想点右边那张插画，结果点上去什么都没发生"。

现在：
- h1 改成 **"Seven games. No ads. Play now."**，第二行 `Play now.` 用品牌绿单独成行。第一眼看到的是"有七个游戏 / 没广告 / 现在就能玩"。
- 导语压到 3 行，只说 Bloom Drop 怎么玩：两只一样的掉下去，变成一只更大的。
- 右上角放一只 sprout 贴纸（"two ants → this"），把首屏的奖励先亮出来，手机上隐藏，把空间留给入口。
- 首屏下方直接是 `<section aria-labelledby="launch-title">`，h2 是 **Start here**，三张卡按 `bloom`、`memory-garden`、`balance` 排序。

排序理由不是"最新"，是"多快能看到反应"：
1. **Bloom Drop**：一次点击、一秒下落、两秒合成，最快产生"我做出了一个东西"。
2. **Memory Garden**：翻牌配对不需要任何文字规则。
3. **Number Balance**：一条规则（两边一样重），但理解它要三秒。

### 2.2 三张卡上的 10 秒循环

全部用 `public/art/` 里现有的图 + CSS/SVG/DOM 动画，没有新依赖、没有视频、没有 canvas。

| 卡片           | 循环内容                                                            | 用的素材                                                    |
| -------------- | ------------------------------------------------------------------- | ----------------------------------------------------------- |
| Bloom Drop     | 两只 ant 依次落进罐子，碰在一起变成 sprout，飘 `+6`，停一会儿，重来 | `jar-scene.webp`、`creature-ant.png`、`creature-sprout.png` |
| Memory Garden  | 三张牌，第 1、3 张先后翻成同一只 rabbit，绿边亮起，中间那张始终扣着 | `card-back.webp`、`creature-rabbit.png`、`creature-owl.png` |
| Number Balance | 左盘 `6`，右盘两张 `3` 先后落下，横梁从倾斜转到水平                 | 纯 CSS + 游戏同样的数字牌                                   |

10 秒是我选的：短到误入也能看到完整故事，长到不会像 GIF 一样催你。循环里有停顿（Bloom 合成后有 4 秒静止、记忆配对后有 3 秒亮边），不是全程在动。

Bloom 卡片额外加了一层同图的模糊衬底（`blur(16px)`），因为 jar 是竖图，放在宽卡里两侧会空；模糊的是同一张画，前面清晰的罐子仍然是游戏自己的舞台。

### 2.3 七个入口保留，但不再等权

- 三张 `.pb-start` 大卡：Bloom / Memory / Balance。
- 下面 **The other four**：Sudoku / Nonogram / Tangram / Frog Road，四张 `.pb-mini-card` 小卡，横向排列（桌面 4 列，手机 2 列）。
- 七个入口都是真 `<a href>`，顺序是 `bloom → memory → balance → sudoku → nonogram → tangram → frog-road`。

Sudoku 的处理：原来首屏那张"全场最好看"的 9×9 数独插画，被缩成 62px 的 `SudokuThumb` 放进了 Sudoku 卡片里，整张卡可点。没有把它继续挂在首屏当装饰，也没有删掉这张画。

### 2.4 文案：从"对家长说"改成"对玩的人说"

- h1 / 导语 / Start here / The other four / Change how it looks 全部改成第二人称或直接指令。
- 原来底部那个大色块 **"For the grown-up doing the handing over"** 被降级成页面末尾一个虚线小框 `For the grown-up nearby`，一句话 + 一个 `/parents` 链接。家长仍然有门，但不再是首屏的主角。
- "What it will never do" 保留四条承诺（no ads / no chat / nothing to shoot / works offline），只压紧了 padding。
- 主题区标题从 "Pick a mood" 改成 "Change how it looks"，说明改成"选了立刻变，还能自己做第六个"。

### 2.5 一个真实的 bug，顺手修了

写第一版时记忆卡片的文件名写成了 `creature-bunny.png`，但 memory 目录里是 `creature-rabbit.png`。截图里第一张牌是纯白，`naturalWidth = 0` 才定位到。已改成 rabbit；两张 404 消失。

同一个截图轮次里还发现 `+6` 徽章没有 `position: absolute`，在手机上跑到卡片左上角变成一个黑块；已补定位。

---

## 3. 故意破了哪些规矩

这些不是漏掉，是判断后改的，都同步改了测试。
1. **"每屏只能有一个 loud action"**
   `garden.spec.ts` 原来断言 `.pb-btn--loud` 恰好 1 个、内容是 "Play Sudoku"。那条规则服务的是一个"介绍页"：一个主按钮 + 一个次要按钮。现在首屏是货架，三个入口必须是同一层可点的东西。我删掉了这条断言，改成断言三张 `.pb-start` 都是 `<a>`、href 顺序正确、第一张带 "Start here" / "Play now"。
2. **首屏 h1 的文案**
   从 `Puzzles that explain themselves.` 改成 `Seven games. No ads. Play now.`。`seo.spec.ts` 的首页 heading 同步更新；`site.json` 的 title 没动（SEO 标题仍然描述站点，不必等于 h1）。
3. **`.pb-card--ready` 这个测试钩子**
   首页不再有七张等大的 `.pb-card`。三个大入口是 `.pb-start`，四个小入口是 `.pb-mini-card`，两者共享 `.pb-door`，给"从花园进游戏"的测试用。`nonogram.spec.ts` / `tangram.spec.ts` / `memory-garden.spec.ts` 里的 `.pb-card--ready[href=...]` 已替换为 `.pb-door[href=...]`。
4. **注册表顺序 ≠ 首屏顺序**
   `GAMES` 还是 sudoku 在前（shelf / SEO / sitemap 的顺序不变），首屏顺序由 `FIRST` 常量单独决定。这样加游戏不用动首页的排序逻辑，首页也不会因为注册表顺序变化而把 Bloom 挤到第七位。
5. **数独插画的地位**
   从"首屏最大的装饰"变成"小卡里的可点缩略图"。

---

## 4. 硬约束逐条对照

- **no ads / no accounts / no chat / no tracking / offline after load**：全部保留。首屏 eyebrow 直接写 "No ads · no sign-up · nothing to lose"；页面末尾的家长小框重复一次；`/parents` 没删内容。
- **真实 `<h1>`**：一个，`Seven games. No ads. Play now.`，不是图片、不是伪元素；`seo.spec.ts` 的 JS-off 断言通过。
- **键盘全可操作**：三张卡和四张小卡都是原生 `<a>`，Tab 可达，Enter 进入；焦点环在 `07-keyboard-focus.png` 里可见（3px 品牌绿 outline）。
- **aria / 焦点管理**：装饰性循环整体 `aria-hidden="true"`，图片 `alt=""`；链接的可读名是 kicker + 游戏名 + 一句话 + CTA；没有新增 dialog，焦点管理沿用原有路由行为。
- **对比度**：所有文字仍然走主题 token（`--pb-ink` / `--pb-ink-soft` / `--pb-brand` / `--pb-accent-ink`）；CTA 是 brand/brand-ink、accent/accent-ink 两套原有配对。
- **`prefers-reduced-motion`**：所有循环动画都加了 `animation-fill-mode: both`，减少动效时停在**完成态**（sprout 在罐里、一对牌翻开、天平水平），不是停在"什么都没发生"的空白。见 `06-reduced-motion.png`。
- **`apps/web` 不加新运行时依赖**：没改 `package.json`。
- **首页只 import manifest，不 import 游戏运行时**：只用了 `GAMES` / `GameManifest`，外加原本就有的 `@puzzlebloom/tangram-engine/card`（七个 polygon 字符串，不 import 引擎运行时）。三个循环的素材是 `public/art/` 的静态文件。
- **Bloom 物理数值不动**：没有碰 `JAR.mouth/inside`、`DROP_Y`、溢出规则；`bloom.spec.ts` 全绿。视觉上只改了首页卡片的循环，不进游戏。

---

## 5. 怎么验证

```bash
cd /Users/reed_soul/code/puzzlebloom-agy

pnpm verify
# lint / check:headers / typecheck / 包测试 / build:seo 全绿
# PASS — 10 routes, artifact is complete

PORT=4175 node scripts/serve-dist.mjs   # 4173 被主仓库占用
PB_BASE_URL=http://127.0.0.1:4175 pnpm exec playwright test \
  e2e/garden.spec.ts e2e/seo.spec.ts e2e/bloom.spec.ts
# 69 passed, 1 skipped（skipped 是 HTML-in-Canvas 的 flag-only 用例）

PB_BASE_URL=http://127.0.0.1:4175 pnpm exec playwright test \
  e2e/nonogram.spec.ts e2e/tangram.spec.ts e2e/memory-garden.spec.ts
# 52 passed
```

新增/改写的断言：
- `garden.spec.ts`
  - 三张 `.pb-start`、href 顺序 `bloom → memory-garden → balance`、都是 `A`、第一张含 Start here / Play now；
  - 四张 `.pb-mini-card`、href 顺序 `sudoku → nonogram → tangram → frog-road`；
  - 七个入口合计 7，`[aria-disabled]` 为 0；
  - **手机 390×844：三张 `.pb-start` 的 boundingBox 完整落在 844px 内**（旧页面在这条上会失败）；
  - **点第一张门真的进 `/play/bloom/`，h1 变成 Bloom Drop**。
- `seo.spec.ts`：首页 h1 改成新文案。
- `nonogram/tangram/memory-garden`：入口选择器从 `.pb-card--ready` 改成 `.pb-door`。

截图（`docs/reviews/agy-redesign/`，真实 Chromium，2x）：

| 文件                    | 内容                                                          |
| ----------------------- | ------------------------------------------------------------- |
| `01-desktop.png`        | 1280×900 首屏，三张卡完整                                     |
| `02-mobile.png`         | 390×844 首屏，三张卡完整 + The other four 露头                |
| `03-desktop-full.png`   | 1280 全页：others / promises / moods / grown-up note / footer |
| `04-desktop-loop.png`   | 5.6s 时的完成态：sprout 在罐里、一对牌翻开、天平水平          |
| `05-mobile-loop.png`    | 手机 5.6s 完成态                                              |
| `06-reduced-motion.png` | `prefers-reduced-motion: reduce` 停在完成态                   |
| `07-keyboard-focus.png` | 手机首屏，第一张卡键盘焦点环                                  |

---

## 6. 没做完 / 没做的

- **游戏内 3 秒无声演示：没做。** 任务里写的是"有余力再做"，40 分钟里我选择先把首屏做完、测试跑绿。Bloom / Memory / Balance 各自进游戏后的第一屏仍然是原来的说明文字，没有自动演示。这是下一轮最值得做的一件事。
- **结算页 / 成绩卡 / 跨游戏进度：没做。** 明确在范围外。
- **没有改任何游戏规则 / 难度**，也没有改 Bloom 物理。
- **没有 commit / deploy**，符合要求。
- **没有在真机 iPhone 上手动点过**，只在 Playwright 的 WebKit iPhone 17 Pro 项目和 Chromium 390×844 截图里验证。真实 Safari 的 `backdrop-filter` / `translate` 属性我预期没问题，但没有肉眼确认。
- **没有做音效**。

## 7. 遗留的小遗憾

- `The other four` 里的 Sudoku 缩略图在 62px 下只能靠 3×3 粗线读成数独，数字必然看不清。我认为这比继续把大图挂在首屏当死装饰好，但它确实是一个"要凑近看"的图标。
- Number Balance 在 96px 的手机卡片里像一枚平衡秤图标，不如 Bloom 的罐子有戏。它是三者里最弱的一张卡，但规则本身仍然是三者里最清楚的。
