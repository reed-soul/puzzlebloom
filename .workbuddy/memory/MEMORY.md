# PuzzleBloom — 长期项目约定

## 结构

pnpm monorepo：`apps/web`（站点外壳：路由器、页面、主题、样式）、`games/*`（每个游戏一个包）、`packages/*`（引擎与共享件）。

现有 4 个成品游戏：`games/sudoku` + `games/nonogram` + `games/tangram` + `games/memory-garden`。`SPROUTING` 已清空——花园暂时没有在长的东西。

## 新增一个游戏的完整接缝（漏一处就出错）

1. `packages/<name>-engine/` — 框架无关引擎，带 vitest
2. `games/<name>/` — React 实现 + `manifest.ts`，exports 要含 `"."` / `"./manifest"` / `"./<name>.css"`
3. `apps/web/package.json` 加 `workspace:*` 依赖，然后 `pnpm install --config.engine-strict=false`
4. `apps/web/src/games/registry.ts` — 从 `SPROUTING` 移入 `GAMES`
5. `apps/web/src/App.tsx` — `lazy()` + `known` 路径 + 路由分支
6. `apps/web/site.json` — 新页面条目（驱动预渲染、sitemap、产物校验三处）
7. `apps/web/src/app/head.ts` — 结构化数据按路由生成，不要第二份手写列表
8. `apps/web/src/pages/Home.tsx` — 按 `status` 分支；卡面图形由 manifest 的 `art` 字段决定，**不要 import 游戏包**
9. 根 `package.json` 的 `test` 脚本串入新引擎

## 硬约束

- `games/` 之间**只允许 type-only 依赖**。共享行为放 `packages/ui`（例：`useModalFocus`）。共享 30 行代码不如允许跨游戏 import 便宜——后者会把两个游戏的 chunk 绑在一起。
- 颜色一律 `var(--pb-*)` 或 `color-mix()`，跟随主题换肤。`packages/theme-core/src/tokens.css` 是唯一来源。
- CSS 类名 `pb-` 前缀 + 游戏专属二级前缀（`pb-nono-*`）。切路由后旧样式仍留在文档里，全局生效。
- 文案：英式拼写、祈使句、不用感叹号、不用哄小孩的句子。注释只解释**为什么**。
- 可访问性是硬指标：真实 `<h1>`（可 sr-only）、键盘全可操作、`aria-modal` 必须配真正的焦点陷阱——声明了模态却不实现，比不写更糟。
- 无新运行时依赖。只 React 19 + `@puzzlebloom/ui`。

## 工具链

- Node 22 实际，`engines` 写 >=26。**任何 `pnpm install` 都要 `--config.engine-strict=false`**。
- `pnpm verify` = lint + check:headers + typecheck + test + build:seo。
- e2e 跑生产产物：先 `pnpm build:seo` 再 `pnpm test:e2e`。两个 project：chromium + iPhone/WebKit。
- Chromium 与 WebKit 都在本机装好了。

## 引擎设计倾向

谜题**从一张确定的图/终盘反推线索**，不随机挖洞。这样"有解""唯一解""填完真的是一幅画"三个性质是构造出来的，不需要求解器去证。代价是只能设计内容，不能随便设计题目。

算法要求：能写成 DP 的不要枚举；但**必须把暴力参考实现留在包里做对拍**，因为 DP 无法目视验算。数织靠这条抓到 3 个真 bug。

## 首页卡面不许手抄坐标

卡片图形必须从一个**零 import 的派生模块**引入（例：`packages/tangram-engine/src/card.ts` + exports `"./card"`），并由测试与引擎的真实几何逐字比对。手抄的常量已经错过一次：图集把 `house` 删掉后，卡片继续画那座房子，还挂着 "Ready"。

## 验收标准

提示永远不能骗人——提示指向的格必须当时仍为空白。测试要从空盘开始反复取提示直到 `complete`，每一步先断言那格是 blank。这个 bug 能活过"最终结果一致"这类断言。

**判定器本身要被"故意改坏"验一次**：把 `checkFigure` 临时改成恒 true / 恒 false，看有哪几条测试会红。数织与七巧板都做过这一步，结论相同——「每张图合法」这类单向断言在判定器恒 true 时全绿，真正的分辨力来自负例，负例不在就等于没测。

**提示的粒度是产品决定，不是实现细节**。四个游戏守同一条线：提示把玩家**已有的**信息端回来，不做最后一步。数独讲技巧不填格、数织讲计数不标格、七巧板说哪里不对不搬块、记忆花园**只报行不报列**（报列等于指出答案；只报行仍是玩家自己走一步）。改提示前先问：这条和另外三个还守同一条线吗。

设计层面的多样性也要写成断言（七巧板：`cores.test.ts` 要求六张图的五小块骨架互不相同）。"每张图都拼得出来"和"这些图不是同一道题"是两条不同的断言，后者只能靠人先看出来再固化成测试。

**断言的地理位置会骗人**：一条"投放后必须精确落在洞里"的 e2e，在桌面宽度能过、手机宽度会红——差别不在产品而在指针取整，因为那一像素在窄屏上值三倍图单位。写这类断言前先问"这里的精确性是谁保证的"：靠吸附就一定会精确，靠指针就一定不会。
