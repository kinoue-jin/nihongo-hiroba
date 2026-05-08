# Pending Decisions

> Cowork → Claude Code の作業依頼。書く場所/タイミングは [`.handoff/CLAUDE.md`](./CLAUDE.md) 参照。

## フォーマット

```
## [Status] YYYY-MM-DD: タイトル
**Task type:** code | docs | mixed
**Review required:** yes | no | partial
**Pre-implementation review:** yes | no
**Recommended model:** Sonnet | Opus | Haiku
**Estimated tokens:** ~XXK

**Context:** 背景
**Decision:** 決定内容
**Target:** 反映先 / 修正範囲
**Expected file(s):** 修正対象ファイル
**Status:** OPEN | APPLIED | FAILED
```

**判断基準:**
- **Task type**: code（.ts/.tsx/.py/.css/.sql）/ docs（.md）/ mixed
- **Review required**: yes（code または mixed の code 部分）/ no（docs・機械的置換）/ partial（code 部分のみ）
- **Pre-implementation review**: yes（30K+ tokens または `<important>` ファイル）/ no（軽微）

詳細な agent 使い分けは [`.claude/rules/code-review.md`](../.claude/rules/code-review.md) 参照。

---

## [OPEN] 2026-05-08: Phase 2 調査 — Supabase → Neon 移行計画の策定
**Task type:** docs
**Review required:** yes
**Pre-implementation review:** yes
**Recommended model:** Opus
**Estimated tokens:** ~40K-60K

**Context:**
にほんごひろばは Phase 1 で Supabase（PostgreSQL + RLS + Storage + Auth）構成で実装された。
後続プロジェクト（フトコロ / golf-compe）は同スタックを **Neon + SQLAlchemy + asyncpg + Clerk + Cloudflare R2** で再構築し、以下の罠を回避できている（`_shared-knowledge/knowledge-base-nihongo-hiroba.md` 参照）:

- §1: supabase-py バージョン固定問題 → SQLAlchemy + asyncpg で安定
- §2: RLS サブクエリ無限ループ → アプリ層で `household_id` / `group_id` を WHERE に含める認可
- §4: モックテストの限界 → `test_integration/` で実 DB 接続テスト

本タスクは **コード変更を一切伴わない調査タスク**。移行計画を `docs/p2-neon-migration.md`（仮）として作成し、PO（仁さん）レビュー後に実装フェーズの [OPEN] 群を別途起票する。

**Decision:**
以下を網羅した移行計画書を作成する:

1. **現状把握**:
   - 既存の `backend/` 構成（supabase-py / RLS ポリシー / Storage バケット / Auth Webhook）の棚卸し
   - 既存 19 テーブルの DDL（`supabase/migrations/001_create_tables.sql` 等）と RLS ポリシー（`003_rls_policies.sql`）の整理
   - `frontend/src/lib/apiClient.ts` の `supabase.auth.*` 直接呼び出し箇所の列挙
2. **移行先スタック決定**:
   - DB: Neon（無料枠 / Branching / Pricing 確認）
   - 認証: Clerk or Supabase Auth 継続（PO 判断）
   - Storage: Cloudflare R2（既存 Supabase Storage からのデータ移行手順）
   - ホスティング: Vercel(FE) / Railway(BE) — フトコロ・golf-compe と統一
3. **移行ステップ案**（Phase 2-A / 2-B / 2-C 等に分割）:
   - 2-A: SQLAlchemy + asyncpg 導入 + Pydantic v2 への確実な移行確認
   - 2-B: RLS → アプリ層認可（dependency 化）
   - 2-C: Storage 移行（Supabase Storage → R2、URL 移行 + バケット整合性）
   - 2-D: Auth 移行（決定したスタックに応じて）
   - 2-E: 統合テスト（`test_integration/` 拡充）
4. **リスクとロールバック**:
   - 各 Phase での rollback 手順
   - DB マイグレーション中の停止時間最小化（並行運用 vs カットオーバー）
   - 既存 RLS の挙動を回帰テストで担保する戦略
5. **トークン / 工数見積もり**:
   - 各 Phase の Recommended model / Estimated tokens
   - 並列化可能な Phase の特定

**Target:** `docs/p2-neon-migration.md`（新規作成）

**Expected file(s):**
- `docs/p2-neon-migration.md`（新規、~400-600 行想定）
- `_shared-knowledge/knowledge-base-nihongo-hiroba.md` 末尾に Phase 2 開始ログを追記（任意）

**注意点:**
- **既存実装は触らない**: 本タスクは調査・計画のみ。コード変更は別 [OPEN] で実施
- **`_shared-knowledge/` の重複排除**: フトコロ・golf-compe で既に解決済みの罠は計画書から個別解説を省き、§番号で参照のみ
- **Pydantic v2 / SQLAlchemy 2.0 async / asyncpg / openapi-typescript の組合せはフトコロ・golf-compe で実証済み** — 同じパターンを採用する前提で計画
- **R2 移行は段階的**: 既存 Supabase Storage の URL を抱えたまま並行運用 → 段階的に R2 URL に切替
- **認証の選択は PO 判断**: 計画書では Clerk / Supabase Auth 継続の両案を比較表で提示し、最終決定は仁さんに委ねる

**Status:** OPEN
