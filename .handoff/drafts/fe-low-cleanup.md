## [OPEN] 2026-05-08: 軽微な clean-up を一括対応（L-1 / L-4 / L-5 / L-7 / L-8 / L-11）
**Severity:** 🟢 Low（複数の軽微な改善を 1 commit で）
**Source:** FE レビュー (Cowork 2026-05-08) §L-1, §L-4, §L-5, §L-7, §L-8, §L-11
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~10K-15K

**Context:**
個別に [OPEN] 化するほどではない軽微な改善を 1 タスクに集約:

1. **L-1**: `index.css` の `@layer utilities` で `line-clamp-2/3` を自前定義しているが、Tailwind 3.3+ で標準提供。削除可
2. **L-4**: `ProtectedRoute.tsx` のスピナー `border-blue-600` だけ他要素（indigo 系）と配色不統一 → H-5 統合済み
3. **L-5**: `Login.tsx` のボタン `bg-blue-600`、他は `indigo` で同上
4. **L-7**: `Login.tsx` に「パスワードをお忘れの方」リンク無し（招待フローでも reset 導線は欲しい）
5. **L-8**: 画像 `<img>` が public_members の avatar に存在せず `👤` 絵文字固定。`profile_media_id` の解決を実装
6. **L-11**: `console.error('Login error:', err)` は本番に残ると PII 漏れリスク → `if (import.meta.env.DEV)` ガード or 削除

**Decision:**
すべて軽微なので 1 commit にまとめる:

1. **L-1**: `@layer utilities .line-clamp-*` を削除し、Tailwind 標準の `line-clamp-N` クラスに置換
2. **L-4 / L-5**: 配色を indigo 系に統一（`bg-indigo-600` / `border-indigo-600`）。設計提案のデザイントークン化は別 [OPEN]
3. **L-7**: パスワードリセット導線追加。Supabase Auth の `auth.resetPasswordForEmail()` を呼ぶ `ForgotPassword.tsx` 新設
4. **L-8**: `profile_media_id` から media テーブルを join して URL 取得 → `<img src={...} />`、未設定時のみ絵文字 fallback
5. **L-11**: `console.error` を削除、エラーは UI に出すのみ（または `import.meta.env.DEV` ガード）

**Target:**
- `frontend/src/index.css`（L-1）
- `frontend/src/components/ProtectedRoute.tsx`（L-4 — H-5 と統合）
- `frontend/src/pages/Login.tsx`（L-5, L-7, L-11）
- `frontend/src/pages/auth/ForgotPassword.tsx`（L-7、新規）
- `frontend/src/pages/public/About.tsx`（L-8）
- `frontend/src/components/common/Avatar.tsx`（L-8、新規）

**Expected file(s):**
- 上記すべて
- `frontend/src/__tests__/auth/ForgotPassword.test.tsx`（新規）

**注意点:**
- **Avatar コンポーネント化**: profile_media_id 解決ロジックは複数箇所（Header / About / LearnerMyPage）で必要 → `components/common/Avatar.tsx` で共通化
- **設計提案 §5（UI コンポーネント切り出し）に整合**: Avatar / Button / Card 等は今後コンポーネント化が必要 → L-8 を起点に始める
- **Supabase Auth resetPasswordForEmail**: `redirectTo` URL 必須。本番 / 開発環境で URL を切替
- **C-4（auth-source-of-truth）と同時着手推奨**: ForgotPassword も `lib/auth.ts` 経由で
- **L-11 の本番ログ削除**: Sentry 等のエラートラッキング導入時は `Sentry.captureException(err)` に置換（別 [OPEN]）

**Status:** OPEN
