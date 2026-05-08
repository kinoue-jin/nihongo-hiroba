## [OPEN] 2026-05-08: FE 設計レベル提案 7 件 + 優先対応リストの ADR 化
**Severity:** 🟡 Medium（中長期の設計判断、Phase 2 以降）
**Source:** FE レビュー (Cowork 2026-05-08) 設計レベル提案 + 優先対応リスト
**Task type:** docs
**Review required:** yes
**Pre-implementation review:** **yes**
**Recommended model:** Opus
**Estimated tokens:** ~40K-60K

**Context:**
レビューで指摘された設計レベルの 7 提案は、個別 [OPEN] では局所最適化に留まる。プロジェクト全体の方向性として ADR (Architecture Decision Record) で意思決定を残し、Phase 2 以降の指針にする。

**設計提案 7 件:**

1. **認証層を 1 ファイルに集約** (`lib/auth.ts`) — C-4 と密接
2. **API 取得層を openapi-typescript + 軽量クライアントに統一** — C-7 / M-17 と密接
3. **i18n 全文言化テスト** — `npm run lint:i18n` を CI 必須化（M-5 統合）
4. **lazy route + route-based code splitting を全 admin に適用** — M-13 統合
5. **UI コンポーネント切り出し**（Storybook / Ladle で単体検証）— Button / Card / Table / Avatar 等
6. **Error Boundary 未設置**（`RouterProvider` を ErrorBoundary で wrap）
7. **アクセシビリティ監査**（`eslint-plugin-jsx-a11y` + Lighthouse CI）

**優先対応リスト 10 件**は、本 [OPEN] と独立して個別 draft で管理（既起票済み）。

**Decision:**
1. **`docs/adr/` ディレクトリ新設**し、設計判断を ADR として残す:
   - `adr/0001-frontend-auth-layer.md`（認証 1 本化、案 A: lib/auth.ts / 案 B: Zustand store / 案 C: TanStack Router context）
   - `adr/0002-api-client-architecture.md`（fetch wrapper の throw ApiError パターン）
   - `adr/0003-i18n-strict-mode.md`（CI lint 必須化）
   - `adr/0004-route-code-splitting.md`（lazy route 全面適用）
   - `adr/0005-ui-component-library.md`（Storybook / Ladle / 自前コンポーネント、shadcn/ui 採用判断）
   - `adr/0006-error-boundary.md`（境界とフォールバック UI 設計）
   - `adr/0007-a11y-audit-flow.md`（CI 組込み）
2. 各 ADR で **Status / Context / Decision / Consequences** を記述（engineering:architecture skill 準拠）
3. ADR 確定後、それぞれを実装する個別 [OPEN] を起票

**Target:** `docs/adr/` 配下（新規）

**Expected file(s):**
- `docs/adr/CLAUDE.md`（ADR 索引、新規）
- `docs/adr/0001` 〜 `0007.md`（各 ADR、新規）
- `docs/adr/template.md`（ADR テンプレート、新規）

**注意点:**
- **engineering:architecture skill を活用**: ADR 作成時に skill のガイドに従う（Status / Context / Decision / Consequences の 4 セクション必須）
- **Phase 2（Neon 移行）と整合**: `0001-frontend-auth-layer` の判断は Phase 2 の認証スタック選択（Clerk vs Supabase Auth 継続）と密接 → ADR 作成時に Phase 2 計画も並行参照
- **shadcn/ui 採用検討**: golf-compe で実績あり。本プロジェクトでも採用すれば Avatar / Button / Card / Table が一気に揃う
- **ADR は不変原則**: 一度確定した ADR は変更せず、後続の判断で覆すなら新 ADR (例: `0008-supersedes-0001.md`) を起票
- **優先対応リスト 10 件の完了順**: C-6 → C-1 → C-4 → C-3/C-5 → C-7 → C-8 → C-10/M-9 → H-1/H-2/H-3 → H-13 → M-13 を尊重し、各 [OPEN] の依存関係を CURRENT.md に明記

**Status:** OPEN
