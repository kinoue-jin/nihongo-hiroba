## [OPEN] 2026-05-08: Auth の source of truth を Supabase セッションに一本化（C-3 / C-4 / C-5）
**Severity:** 🔴 Critical
**Source:** FE レビュー (Cowork 2026-05-08) §C-3, §C-4, §C-5
**Task type:** code
**Review required:** yes
**Pre-implementation review:** **yes**
**Recommended model:** Sonnet
**Estimated tokens:** ~50K-80K

**Context:**
本プロジェクトの認証層には**3 つの矛盾**が同居している:

1. **C-4**: 認証情報の source of truth が二重化
   - `Login.tsx` → `localStorage` に独自書き込み
   - `Header.tsx` / `AdminLayout.tsx` → `localStorage` 直読み
   - `ProtectedRoute.tsx` → `fastapi.get('/auth/me')` (Supabase セッション経由)
   - `apiClient.ts` の `getAuthHeader` → Supabase セッションのみ
   → ログイン直後 Supabase セッション空 → `/auth/me` 401 → `/login` リダイレクト
2. **C-3**: `Login.tsx` の `setSession({ refresh_token: '' })` で Supabase JS の auto-refresh を破壊
3. **C-5**: `Header.tsx` で `fastapi.get('/members/${authState.userId}')` と呼んでいるが、`authState.userId` は Supabase auth user id であって `members.id` ではない（404 / 別人取得 / 全件取得のいずれか）

CLAUDE.md の規約「Supabase Auth 単一ソース／リフレッシュは Supabase JS が自動処理」とも乖離している。

**Decision:**
1. **`lib/auth.ts` を新設**し、認証ロジックを 1 箇所に集約（ログイン / ログアウト / セッション取得 / role 取得 / ストレージ同期）
2. **localStorage 独自管理を撤廃**。すべて Supabase セッション(`supabase.auth.getSession()`)を見る
3. **Login 経路の刷新**: バックエンドの `/auth/login` レスポンスに `refresh_token` を含めるよう backend 側に [OPEN] 起票（または `signInWithPassword` を直接使い `/auth/login` をやめる）
4. **`/members/me` エンドポイントを backend に追加**して、`Header.tsx` は `fastapi.get('/members/me')` で自分の member 情報を取得（role 関係なく displayName を出せる、H-7 も同時解消）
5. **`getAuthHeader`** は Supabase セッション一択。fallback で localStorage を見る方針は廃止

**Target:**
- FE: `frontend/src/pages/Login.tsx`, `frontend/src/components/layout/Header.tsx`, `frontend/src/components/admin/AdminLayout.tsx`, `frontend/src/components/ProtectedRoute.tsx`, `frontend/src/lib/apiClient.ts`
- FE 新設: `frontend/src/lib/auth.ts`
- BE: `/auth/login` のレスポンス schema に `refresh_token` 追加 / `/members/me` 新設（**別 [OPEN] で起票**）

**Expected file(s):**
- `frontend/src/lib/auth.ts`（新規、~150 行）
- `frontend/src/pages/Login.tsx`（修正）
- `frontend/src/components/layout/Header.tsx`（修正、`/members/me` 利用）
- `frontend/src/components/admin/AdminLayout.tsx`（修正）
- `frontend/src/components/ProtectedRoute.tsx`（修正、リトライ + ネットワーク瞬断対応は H-5 と同時に）
- `frontend/src/lib/apiClient.ts`（getAuthHeader 統一）
- `frontend/src/__tests__/auth/*.test.tsx`（新規 / 拡充、ログイン → `/admin` 遷移までの統合テスト）

**注意点:**
- **`<important>` 多数**: `apiClient.ts`, `ProtectedRoute.tsx`, `AdminLayout.tsx` は CLAUDE.md `<important>` 指定対象。Plan review **必須**
- **C-3 の修正は backend 修正が前提**: 先に `/auth/login` の refresh_token 返却を backend で実装する [OPEN] を起票し、それが APPLIED になってから FE 側を直す
- **localStorage 独自キー (`access_token` / `user_role` / `user_id` / `user_email`) は削除**: 既存ユーザーのブラウザに残っても害はないが、片付けスクリプトを `auth.ts` 初期化時に走らせて localStorage clean up
- **Phase 2 (Neon 移行) との衝突注意**: 認証スタックの最終形は Phase 2 で決める可能性 (Clerk vs Supabase Auth)。本タスクは「Phase 1 段階の Supabase Auth 前提」で整理し、Phase 2 で再統合する前提
- **既存テスト破壊リスク**: `localStorage` 直読みの mock があれば全部書き換え

**Status:** OPEN
