## [OPEN] 2026-05-08: 公開バンドル最適化・admin route lazy 化・フォント preload（M-10 / M-13 / L-10）
**Severity:** 🟡 Medium（公開ページの LCP / 初回ロード）
**Source:** FE レビュー (Cowork 2026-05-08) §M-10, §M-13, §L-10
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Sonnet
**Estimated tokens:** ~15K-25K

**Context:**

1. **M-10**: `index.html` で Noto Sans JP を 4 weight 取得。`display=swap` 指定はあるが、weight 数が多すぎて LCP 遅延要因。少なくとも `400, 700` のみに絞り、hero フォントだけ preload で先取り
2. **M-13**: `/admin/*` ルートは `react-i18next`, `@dnd-kit/*`, `recharts`, `@fullcalendar/*` 等の重い依存を抱えるが、すべて初期バンドルに同梱。公開ユーザーには無関係
3. **L-10**: `EventCalendar.tsx` / `EventList.tsx` の `pb-24` は Footer 被り回避用と思われるが、root layout で `flex-grow` を使えば不要

**Decision:**
1. **M-10**: Noto Sans JP は `400, 700` のみに絞る。hero テキスト用に `<link rel="preload" href="..." as="font" crossorigin>` を追加
2. **M-13**: TanStack Router の `createRoute` の `component` を `lazy` 化（`createLazyRouteComponent` パターン）し、admin / auth 系ルートを全部分離
3. **L-10**: root layout を `flex flex-col min-h-screen` + main `flex-1` + footer 自然配置に変更し、各ページの `pb-24` を削除

**Target:**
- `frontend/index.html`（フォント設定）
- `frontend/src/router.tsx`（lazy route 全面適用）
- `frontend/src/pages/public/EventCalendar.tsx`, `EventList.tsx`, root layout（pb-24 撤廃）

**Expected file(s):**
- `frontend/index.html`（修正）
- `frontend/src/router.tsx`（admin / auth 全 route を lazy 化、~15-20 ファイルが対象）
- `frontend/src/components/layout/RootLayout.tsx`（新設 or 既存編集）
- 各ページから `pb-24` 削除

**注意点:**
- **bundle 計測必須**: `npx vite-bundle-visualizer` で初期チャンクサイズの before/after を比較し、改善幅を記録
- **Suspense fallback の整備**: lazy 化したルートでロード中の表示を統一する `<RouteFallback />` コンポーネント新設
- **prefetch hints**: TanStack Router の `prefetch="intent"` を nav リンクに付けるとホバーで先読み
- **Web Vitals 計測**: Vercel Analytics か Lighthouse CI で LCP の改善を継続観測
- **admin 全 13 ページ** が影響範囲。lazy 化は機械的だが、テスト全 Green を完了条件に
- **fonts.googleapis.com vs self-host**: 公開ユーザーで font CSS の RTT を削るには self-host も検討（fontsource パッケージ等）

**Status:** OPEN
