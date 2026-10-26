# PuzzleBloom — 长期项目约定

## 结构

pnpm monorepo：`apps/web`（站点外壳：路由器、页面、主题、样式）、`games/*`（每个游戏一个包）、`packages/*`（引擎与共享件）。

现有 8 个成品游戏：`games/sudoku` + `games/nonogram` + `games/tangram` + `games/memory-garden` + `games/balance` + `games/frog-road` + `games/bloom` + `games/shadows`。`SPROUTING` 已清空——花园暂时没有在长的东西。

**已跑通两套技术栈**：DOM/HTML-in-Canvas 一套（前七个），WebGL/three.js 一套（`shadows`）。同一条接缝，九步一处不少。

## 新增一个游戏的完整接缝（漏一处就出错）

1. `packages/<name>-engine/` — 框架无关引擎，带 vitest
2. `games/<name>/` — React 实现 + `manifest.ts`，exports 要含 `"."` / `"./manifest"` / `"./<name>.css"`
3. `apps/web/package.json` 加 `workspace:*` 依赖，然后 `pnpm install --config.engine-strict=false`
4. `apps/web/src/games/registry.ts` — 从 `SPROUTING` 移入 `GAMES`
5. `apps/web/src/App.tsx` — `lazy()` + `known` 路径 + 路由分支
6. `apps/web/site.json` — 新页面条目（驱动预渲染、sitemap、产物校验三处）
7. `apps/web/src/app/head.ts` — 结构化数据按路由生成，不要第二份手写列表
8. `apps/web/src/pages/Home.tsx` — 按 `status` 分支；卡面图形由 manifest 的 `art` 字段决定，**不要 import 游戏包**
9. 根 `package.json` 的 `test` 脚本**不用动**——已是 `pnpm -r --filter "./packages/*" --filter "./games/*" --if-present test`，自动发现

## 硬约束

- `games/` 之间**只允许 type-only 依赖**。共享行为放 `packages/ui`（例：`useModalFocus`）。共享 30 行代码不如允许跨游戏 import 便宜——后者会把两个游戏的 chunk 绑在一起。
- 颜色一律 `var(--pb-*)` 或 `color-mix()`，跟随主题换肤。`packages/theme-core/src/tokens.css` 是唯一来源。
- CSS 类名 `pb-` 前缀 + 游戏专属二级前缀（`pb-nono-*`）。切路由后旧样式仍留在文档里，全局生效。
- 文案：英式拼写、祈使句、不用感叹号、不用哄小孩的句子。注释只解释**为什么**。
- 可访问性是硬指标：真实 `<h1>`（可 sr-only）、键盘全可操作、`aria-modal` 必须配真正的焦点陷阱——声明了模态却不实现，比不写更糟。
- **站点外壳（`apps/web`）无新运行时依赖**：只 React 19 + `@puzzlebloom/ui`。游戏包**可以**自带渲染器（three.js 等）——隔离靠 workspace 包 + `lazy()` 拆 chunk，不靠禁止。前提是外壳永不 import 游戏运行时，只 import `./manifest`。
- **新增一个运行时依赖就要在 `THIRD_PARTY_NOTICES.md` 添一条**：站点把依赖打进产物一起分发，MIT 的版权行必须随行。three.js 那次差点漏掉——脑子里想的是 chunk 大小和取景，没人想起许可。
- `packages/*-engine` 永远不含渲染器。这是多栈安全的前提：引擎纯，`pnpm test` 不需要 DOM/canvas，与栈无关。
- **canvas 页面必须把内容和标签写进 DOM**：预渲染抓的是 DOM 不是像素。`check-artifact.mjs` 强制两条——`<canvas>` 要有可访问名（`aria-label`/`aria-labelledby`/`aria-hidden="true"`），且 canvas 之外要有 ≥200 字符可读文本。
- **WebGL 那条路要自己搬色**：`getContext('webgl')` 读不到 CSS 变量。`shadows` 的做法是 `useTheme().colors` 传进场景，`setColors()` 把色值推进材质和灯光。HTML-in-Canvas 的游戏（`balance`/`bloom`）不需要这一步，因为它们画的是真 DOM。
- **一个游戏只准有一个文件 import three.js**（`games/shadows/src/ShadowScene.tsx`）。`manualChunks` 里把 `node_modules/three` 单独命名成 `three` chunk，路由 chunk 才读得清；Vite 仍会因 531 kB 警告——那是事实，不要把 `chunkSizeWarningLimit` 调高来消音。
- **正交相机取景别猜 frustum**：把包围盒 8 个角投影到相机自己的 right/up 轴上再按面板宽高比补齐（`shadows` 的 `fit()`）。按舞台尺寸推永远会在某个偏航角切掉一角。相机高度上限要随最高塔重算（`ceiling`），只在值变了才重置。
- **画布怎么拿主题色**：`applyTheme()` 把 11 个自定义属性写在 `<html>` 上。`balance` / `bloom` 用 **HTML-in-Canvas**（`content="drawable"`）把真实 DOM 画进画布，所以天然继承 CSS 变量，根本不需要 JS 取色。WebGL（three.js）那条路不行——必须拿真实色值。`useTheme()` 与 `withViewTransition()` 已在 `@puzzlebloom/ui/theme` 和 `@puzzlebloom/ui/transition`（2026-10-26 从 `apps/web/src/app/` 迁出），游戏包可直接 import。
- **`packages/ui` 只准加子路径导出，不要往 `index.ts` 里塞**。七个游戏都依赖 ui，barrel 一旦变胖，每个游戏 chunk 都会跟着胖。现有子路径：`./theme`、`./transition`、`./button.css`、`./juice.css`、`./segmented.css`。

## 工具链

- Node 22 实际，`engines` 写 >=26。**任何 `pnpm install` 都要 `--config.engine-strict=false`**。
- `pnpm verify` = lint + check:headers + typecheck + test + build:seo。
- e2e 跑生产产物：先 `pnpm build:seo` 再 `pnpm test:e2e`。两个 project：chromium + iPhone/WebKit。
- Chromium 与 WebKit 都在本机装好了。

## 引擎设计倾向

谜题**从一张确定的图/终盘反推线索**，不随机挖洞。这样"有解""唯一解""填完真的是一幅画"三个性质是构造出来的，不需要求解器去证。代价是只能设计内容，不能随便设计题目。

算法要求：能写成 DP 的不要枚举；但**必须把暴力参考实现留在包里做对拍**，因为 DP 无法目视验算。数织靠这条抓到 3 个真 bug。

**轮廓类谜题天然有多个正确答案，这是设计而不是漏洞**。石影（`shadows`）判的是三张影子的位掩码，不是"你搭得跟我一样"；任何能投出这三张影子的搭法都算过。所以引擎里 `source` 是**永不出场**的答案之一，而"改一块石头必须被判错"这种断言**本身是错的**——要么写成构造性反例（前视旋转、侧视镜像、保地面的加块），要么改成"第二种搭法通过，且这不是 bug"。写这类测试时先问：这个谜题有唯一解吗，没有就别写"必须唯一"的断言。

## 首页卡面不许手抄坐标

卡片图形必须从一个**零 import 的派生模块**引入（例：`packages/tangram-engine/src/card.ts` + exports `"./card"`），并由测试与引擎的真实几何逐字比对。手抄的常量已经错过一次：图集把 `house` 删掉后，卡片继续画那座房子，还挂着 "Ready"。

## 验收标准

提示永远不能骗人——提示指向的格必须当时仍为空白。测试要从空盘开始反复取提示直到 `complete`，每一步先断言那格是 blank。这个 bug 能活过"最终结果一致"这类断言。

**判定器本身要被"故意改坏"验一次**：把 `checkFigure` 临时改成恒 true / 恒 false，看有哪几条测试会红。数织与七巧板都做过这一步，结论相同——「每张图合法」这类单向断言在判定器恒 true 时全绿，真正的分辨力来自负例，负例不在就等于没测。

**提示的粒度是产品决定，不是实现细节**。五个游戏守同一条线：提示把玩家**已有的**信息端回来，不做最后一步。数独讲技巧不填格、数织讲计数不标格、七巧板说哪里不对不搬块、记忆花园**只报行不报列**（报列等于指出答案；只报行仍是玩家自己走一步）、石影说"计划这里有石头而你的地上空着"但**不替人放**。石影还有一层顺序决定：地上同时多一块、少一块时，先报**缺的那格**——叫人拿掉刚放下的石头，剩下空盘一样是错的。改提示前先问：这条和另外四个还守同一条线吗。

设计层面的多样性也要写成断言（七巧板：`cores.test.ts` 要求六张图的五小块骨架互不相同）。"每张图都拼得出来"和"这些图不是同一道题"是两条不同的断言，后者只能靠人先看出来再固化成测试。

**断言的地理位置会骗人**：一条"投放后必须精确落在洞里"的 e2e，在桌面宽度能过、手机宽度会红——差别不在产品而在指针取整，因为那一像素在窄屏上值三倍图单位。写这类断言前先问"这里的精确性是谁保证的"：靠吸附就一定会精确，靠指针就一定不会。

**新增一个游戏会撞红几条 e2e，撞红的地方就是"能数出来的地方"**：`garden.spec.ts` 卡数、书架那句 "N games finished"、`seo.spec.ts` 的 `WebApplication` 条数与 sitemap 条数。能派生就别写死——sitemap 现在与 `ROUTES` 的 canonical 集合互为等式，结构化数据与 `/play/` 路由集合互为等式；只有**书架卡片顺序**保持手写，因为它断言的是 `GAMES` 的顺序本身。

**`requestfailed` 要放过浏览器自己撤回的请求**：`page.reload()` 会取消还在飞的图片，WebKit 报 `cancelled`、Chromium 报 `net::ERR_ABORTED`，两者都不是站点故障。记忆花园那条"半翻开的盘面能活过重载"就因此常年 flaky。真正坏掉的资源仍会以 console error（`Failed to load resource: … 404`）出现，所以放过不影响分辨力。

**大 chunk 的 e2e 要先等游戏真的在**：`shadows` 路由先画一行 fallback，three.js 约 140 kB gzip 才到。`expect` 会重试，裸 `.count()` / `getAttribute()` 不会——它们会拿半加载页面当"计划缺失"。凡是要读 DOM 再断言的测试，先等一个只有真游戏才有的选择器。

## 容器类游戏：物理边界 = 画出来的容器，不是舞台

Bloom 换生成美术后，引擎的 `JAR` 仍是 340×440 的整个舞台，而画出来的玻璃只有中间 ~164×230。
结果是生物落在罐口外的花丛上、罐底以下，"满了"要堆到舞台顶才触发。e2e 只测"合成加分"
和"舞台不是 6×3"，两年都没抓到，因为**没有任何断言把渲染位置和画面里的容器对齐**。

规则：**只要有"装东西的容器"，引擎就要有嘴（mouth）/内腔（inside）两组边界，数值从美术实测，
不从舞台尺寸推**。投放点夹嘴，合并后的物体夹内腔；溢出线画在嘴的位置。回归断言写相对舞台的
百分比（Bloom：落点中心 30%–70%、落到下半部），不要写绝对 px。
