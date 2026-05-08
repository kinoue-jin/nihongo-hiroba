## [OPEN] 2026-05-08: Tailwind palette 整理・tsconfig 厳格化・型 alias 統一（M-1 / M-2 / M-3 / M-19）
**Severity:** 🟡 Medium
**Source:** FE レビュー (Cowork 2026-05-08) §M-1, §M-2, §M-3, §M-19
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Sonnet
**Estimated tokens:** ~15K-25K

**Context:**

1. **M-1**: `tailwind.config.js` で Tailwind デフォルト `indigo` と完全一致のパレットを再定義（無駄）
2. **M-2**: `tsconfig.json` で `allowImportingTsExtensions: true` & `noUnusedLocals: true` 同居。violation 多数（H-1 の getter 捨て、M-3 の `as any`、未使用 import）→ `tsc -b` で本番ビルド fail リスク
3. **M-3**: `EventCalendar.tsx` の `plugins: [...] as any` は `PluginDef[]` で正しく型付け可能なのに `any` キャスト
4. **M-19**: `Event` という型名がブラウザ `lib.dom.d.ts` の `Event` と衝突。`import type { Event as ApiEvent } from './types/api'` で alias 化が必要

**Decision:**
1. **M-1**: ブランド色変えるなら `colors.brand` 等の名前を使う。Tailwind デフォルトのままで良いなら `tailwind.config.js` から `indigo` 上書きを削除
2. **M-2**: 既存 violation を全修正してから `noUnusedLocals` を有効に保つ。CI で `tsc --noEmit` を必須化
3. **M-3**: `import type { PluginDef } from '@fullcalendar/core'` で正しく型付け
4. **M-19**: `frontend/src/types/api.ts`（新規 wrapper）で `import { Event as EventResponse, ... } from './api.gen'` のように alias 化、各画面はこの wrapper 経由 import

**Target:**
- `frontend/tailwind.config.js`
- `frontend/tsconfig.json`
- `frontend/src/pages/public/EventCalendar.tsx`（M-3）
- `frontend/src/types/`（M-19、新規 wrapper）
- 全画面の型 import パス（M-19 の影響）

**Expected file(s):**
- `frontend/tailwind.config.js`（修正 / 削除）
- `frontend/tsconfig.json`（必要なら strict 化）
- `frontend/src/pages/public/EventCalendar.tsx`（修正）
- `frontend/src/types/api.ts`（新規 wrapper、alias export）
- 全画面の型 import を wrapper 経由に置換

**注意点:**
- **段階的に**: M-2 は violation を 1 つずつ潰さないと一気にビルド fail する。`tsc --noEmit` を CI に入れる前に local で 0 violation 確認
- **M-19 の影響範囲確認**: `import { Event }` を grep で全検出（schemas / handlers / pages）。alias 後は `EventResponse` 等の名前に統一
- **Event 衝突は実際にバグるケースがある**: `addEventListener('event', handler: (e: Event) => void)` の `Event` がブラウザ DOM か API レスポンスかわからなくなる
- **`as any`** の他の箇所を grep で全検出（ESLint の `@typescript-eslint/no-explicit-any` rule を有効化することも検討）
- **Tailwind v4 移行を見据える**: golf-compe で v4 化済み。本プロジェクトも v4 化するなら `@tailwindcss/vite` プラグイン方式 + CSS `@theme` ディレクティブ

**Status:** OPEN
