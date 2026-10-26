# 八个游戏，一副门 · 2026-10-26

把两条分叉合成一条：`agy-redesign`（线上正在跑的新首页，7 游戏）和 `master`
（影子游戏，8 游戏但首页还是旧的介绍页）。合并后 master 第一次等于线上。

## 1. 合并后的首页

- h1：`Eight games. No ads. Play now.`
- 三扇门不变：Bloom → Memory Garden → Number Balance（`FIRST` 常量）。
- `The other four` → `The other five`：Sudoku / Nonogram / Tangram / Frog Road /
  **Stone Shadows**。
- 影子进的是"其他五张"，不是三扇门。agy 的门是按"多快能看到反应"排的，堆石头直到
  三面影子对上不是三秒能懂的东西，它属于货架，不属于门。

## 2. 冲突只有两处

`Home.tsx` 和 `e2e/garden.spec.ts`；`pages.css`、`App.tsx`、`registry.ts`、`site.json`
都自动合上了。原因：agy 重写的是首屏结构和 `.pb-start` 那套样式，影子加的是
`ShadowsArt` 和一条 mini-card 分支，两者在 `Art` 里正好撞上。

`Art` 的解法是 agy 的形状 + 影子的分支：

```tsx
function Art({ game }: { game: GameManifest }) {
  return (
    <div className={`pb-card__art pb-card__art--${game.tone}`} aria-hidden="true">
      ...
      {game.art === 'blooms' ? <BloomsArt /> : null}
      {game.art === 'shadows' ? <ShadowsArt /> : null}
      ...
```

agy 那版删掉了 `status === 'ready'` 的守卫和 `BloomsArt`——因为首屏不再用卡片画
Bloom 了。`BloomsArt` 我留下来了：`FIRST` 只是一个偏好表，掉出去的 manifest 会落进
"其他五张"，它不该带着一个空盒子落地。

## 3. 三件必须改的版面事

1. **五张卡挤不进一行。** 量出来的：1440 每张 201px 没问题，1024 是 183px 没问题，
   800 掉到 143px 就溢出（三张卡的标题列被压到放不下一个词）。加了一个
   `@media (max-width: 980px)` 断点，五列变三列，5 张排成 3 + 2。
2. **影子缩略图被裁。** 它的 viewBox 是 27.8 × 36.8 —— 九张缩略图里唯一的竖图，
   而 mini 卡是方形格。原来跟着其他图一起吃 `scale: 0.62`（按宽度算），结果高
   100px 塞进 76px 的格子，远角和近底都被裁掉，只剩一团绿色。改成按高度取
   `height: 72px`、`width: auto`，不进 `scale` 那一组。
3. **手机上第五张一个人占一行。** 两列排五张，最后一张孤零零。让它
   `grid-column: 1 / -1` 并退回桌面的横向排版（图左文右），同时把其他卡在手机上
   隐藏的那句说明补回来——宽卡有位置，空着才奇怪。

## 4. 顺手修掉的两个测试基础设施 bug

`bloom.spec.ts` 和 `balance-canvas.spec.ts` 里各有一处硬编码
`http://127.0.0.1:4173`。这两个用例自己 `chromium.launch`，不继承 config 的
`baseURL`，所以只能手写一个源——写死就把它们钉在了默认端口上：本地跑得过，
`PB_BASE_URL` 指向线上就必红。上一轮线上验收 13 passed / 1 failed 的那条就是它。

改成从 `testInfo.project.use.baseURL` 取，然后用 `page.goto('/play/...')` 走相对路径。
现在这两个用例在 4173、4178、线上都一样跑。

## 5. 验证

```
pnpm lint        clean（只剩 candidates-gallery.html 的 1.3 MiB 体积警告，入库已久）
pnpm typecheck   过
pnpm test        9 套，全绿
pnpm build:seo   PASS — 11 routes, artifact is complete
e2e（4178）      206 passed / 2 skipped / 0 failed（chromium + iPhone WebKit）
```

抓图在 `docs/reviews/merge-8/`：1440 / 1024 / 800 / 390 四个宽度的首屏与
"The other five" 那一带。实测每张卡的宽度、标题行数、是否溢出都记在下面：

| 宽度 | 列数 | 单卡宽                     | 溢出 |
| ---- | ---- | -------------------------- | ---- |
| 1440 | 5    | 201px                      | 无   |
| 1024 | 5    | 183px                      | 无   |
| 800  | 3    | 244px                      | 无   |
| 390  | 2    | 175px（第五张 358px 通栏） | 无   |
