## [OPEN] 2026-05-08: Supabase PostgREST 直叩きを廃止し全ページ FastAPI 経由に統一（C-7 / C-8）
**Severity:** 🔴 Critical
**Source:** FE レビュー (Cowork 2026-05-08) §C-7, §C-8
**Task type:** code
**Review required:** yes
**Pre-implementation review:** **yes**
**Recommended model:** Sonnet
**Estimated tokens:** ~80K-120K

**Context:**
CLAUDE.md は「**全データ取得は FastAPI 経由・`supabase.from(...)` は使わない**」と明示しているが、設計が二派に分裂している:

**直叩き派（規約違反）:**
- `Top.tsx`（news / events）
- `NewsList.tsx`, `NewsDetail.tsx`
- `EventDetail.tsx`
- `About.tsx`（public_members）
- `PairingManager.tsx`（schedule_sessions, member_session_registrations, learner_session_registrations）

**FastAPI 経由派（規約遵守）:**
- `EventCalendar.tsx`, `EventList.tsx`

**派生問題（C-8）:**
- `EventDetail.tsx` の `.single()` は 0 件 / 多数件で error を返すが、`isError` 分岐を実装していないため永久ローディングになる。`NewsDetail.tsx` も同様

二派分裂のままだと、本番 RLS と FastAPI の認可仕様が二重保守になり、片方だけ通る／落ちるバグの温床。Phase 2 で Neon 移行する際にも、Supabase 直叩き箇所が**全部削除対象**になるので今のうちに整理しておくと移行コストが下がる。

**Decision:**
1. **全ページ FastAPI 経由に統一**: 直叩き 5 ページを `fastapi.get(...)` に書き換え。必要な BE エンドポイントが未実装なら BE 側に [OPEN] を別途起票
2. **`useQuery` の `isError` 分岐 + `retry: 0`** を全ページで一律に追加（C-8 対策）
3. **`Pairing` 系は Phase 2 で再設計** の前提もあるが、Phase 1 段階で FastAPI ラッパだけ用意しておく
4. **MSW handler の整合**: `mocks/handlers.ts` も `*/rest/v1/*` 系を全削除し、FastAPI モック (`*/api/*`) のみに統一

**Target:**
- FE: 5 ページ × 6 つの useQuery / mutation を書き換え
- FE: `mocks/handlers.ts` の Supabase PostgREST モック削除
- BE: 必要に応じて `/api/news`, `/api/events`, `/api/about/public-members`, `/api/pairings/sessions/{id}/registrations` 等を整備（既存実装を再確認の上、足りない分だけ別 [OPEN]）

**Expected file(s):**
- FE: `Top.tsx`, `NewsList.tsx`, `NewsDetail.tsx`, `EventDetail.tsx`, `About.tsx`, `PairingManager.tsx`
- FE: `mocks/handlers.ts`（直叩き系モック削除）
- BE: 不足エンドポイントは別 [OPEN] で起票

**注意点:**
- **`<important>`**: `apiClient.ts` 関連の修正を伴うので Plan review 必須
- **既存テストの大規模書き換え**: MSW モック前提のテストは全部影響を受ける → 統合テスト Green を完了条件に
- **C-8 の `.single()` 問題は FastAPI 側でも同じ思想で**: 0 件は 404、複数件は 500 を返すか、API contract で `null` を許容する schema にする
- **段階的移行**: 1 ページずつ commit を分けると review しやすい（5 commit に分割推奨、ただし 1 [OPEN] のままでよい）
- **C-9（EventDetail 詳細表示不足）と同時着手**を強く推奨: どうせ EventDetail を書き換えるなら表示フィールドも追加した方が効率的

**Status:** OPEN
