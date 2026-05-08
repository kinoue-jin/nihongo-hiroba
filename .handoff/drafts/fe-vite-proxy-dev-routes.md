## [OPEN] 2026-05-08: vite proxy のパス整理と _dev_routes 開発時専用化（M-11 / M-12）
**Severity:** 🟡 Medium（混乱の元）
**Source:** FE レビュー (Cowork 2026-05-08) §M-11, §M-12
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~3K-5K

**Context:**

1. **M-11**: `vite.config.ts` で `proxy '/rest' → :8000` を定義しているが、本プロジェクトの BE は FastAPI で Supabase PostgREST ではない。`/rest` は Supabase 用パス → 設計が混乱
2. **M-12**: `_dev_routes.tsx` が router に index 化されておらず、開発時の動作確認しづらい。さらに本番ビルドに混入するリスクあり

**Decision:**
1. **M-11**: proxy を `/api → :8000` に変更（または FastAPI が `/api` プレフィックスを付けないなら proxy 不要）。Supabase PostgREST 経由を全廃するなら `/rest` proxy も削除
2. **M-12**: `import.meta.env.DEV` ガードで `_dev_routes` を条件登録:
   ```tsx
   const router = createRouter({
     routeTree: import.meta.env.DEV
       ? routeTreeWithDevRoutes
       : routeTree,
   });
   ```
   または `_dev_routes.tsx` 内で `if (import.meta.env.PROD) throw new Error('dev routes leaked')` を入れる

**Target:**
- `frontend/vite.config.ts`
- `frontend/src/router.tsx`
- `frontend/src/pages/admin/_dev_routes.tsx`（M-12）

**Expected file(s):**
- `frontend/vite.config.ts`（proxy 修正）
- `frontend/src/router.tsx`（dev gate）

**注意点:**
- **C-7（Supabase 直叩き廃止）と整合**: 直叩きを全廃すると `/rest` proxy は完全に不要になる
- **vite preview / build 検証**: `npm run build && npm run preview` で _dev_routes が含まれていないこと確認
- **Vercel ビルドの NODE_ENV**: production では `import.meta.env.DEV === false` になる前提

**Status:** OPEN
