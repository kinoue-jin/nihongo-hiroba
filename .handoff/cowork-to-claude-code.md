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

---

## [OPEN] 2026-05-08: __pycache__ 1841 ファイルを git 追跡解除
**Task type:** code
**Review required:** no
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~5K-10K

**Context:**
本リポジトリの `.gitignore` には `__pycache__/` が登録されているが、過去 commit
（おそらく Phase 1 初期）で **1841 件**の `*.pyc` が追跡されたまま残っている。

```
$ git ls-files '*__pycache__*' | wc -l
1841
```

このため:
- `git status` を叩くたびに pyc の modified / deleted が大量に表示されてノイズ
- Python バージョン更新（3.9 → 3.12 など）のたびに `D ...cpython-39-pytest-8.4.2.pyc` /
  `M ...cpython-312-pytest-9.0.2.pyc` が混入し、本質的な変更が埋もれる
- 本セッションで Phase 0 commit を作る際にも、pre-existing 変更として混入していた

**Decision:**
機械的に追跡解除する chore タスク。コード変更は伴わない:

```bash
git rm --cached -r 'backend/app/**/__pycache__' \
                   'backend/tests/**/__pycache__' \
                   '**/__pycache__'
git commit -m "chore: __pycache__ を git 追跡解除（1841 ファイル）"
```

実行後、`.gitignore` の `__pycache__/` ルールが効いて以後は自動的に追跡されなくなる。
ローカル / リモートの動作影響なし（pyc は実行時に再生成される）。

**Target:** リポジトリ全体の `__pycache__/` 配下

**Expected file(s):**
- 削除（git rm --cached のみ、ファイル自体は残す）: 1841 ファイル
- 修正なし

**注意点:**
- **大量 commit 注意**: 1 commit で 1841 ファイル削除になる。サンドボックス git の
  45 秒タイムアウトリスクあり → 必要なら分割（routers / tests / その他）
- **`.pyc` 物理削除は別タスク**: 本タスクは追跡解除のみ。物理削除したい場合は
  `find . -name __pycache__ -type d -exec rm -rf {} +` を別途
- **CI 設定の確認**: もし CI で pyc を artifact として扱っているなら影響あり（通常はないはず）

**Status:** OPEN

---

## [OPEN] 2026-05-08: 未 commit の backend 実コード変更を review し、commit / revert を判断
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Sonnet
**Estimated tokens:** ~30K-50K

**Context:**
リポジトリに、7 週間前の "feat: 初回リリース"（`e6d7fe3a` by kinoue-jin）以降に
ローカルで積み上がった未 commit の変更が **4 ファイル**残っている:

```
 backend/app/routers/learners.py |  4 +--
 backend/app/routers/members.py  | 13 +++++----
 backend/app/routers/sessions.py | 65 +++++++++++++++++++++++++++++++++++------
 backend/tests/conftest.py       | 44 ++++++++++++++++++++++------
 4 files changed, 100 insertions(+), 26 deletions(-)
```

PO（仁さん）も内容を覚えていない可能性あり。Cowork セッションでも diff 内容に
踏み込んでいないため、変更意図が不明。Phase 0（運用接続）commit には**意図的に
含めなかった**ので、本 [OPEN] で別途処置を決める。

**Decision:**
Claude Code 側で各 diff を読み、以下のいずれかを判断:

1. **意図のある修正で品質も問題なし** → そのまま `feat(backend): ...` または
   `fix(backend): ...` で commit（コミットメッセージは diff から推測 + PO 承認）
2. **意図不明 / バグの可能性あり** → `claude-code-to-cowork.md` にフォーマット A
   で起票、PO 判断待ち
3. **明らかに不要 / 古い検証コード** → `git checkout HEAD -- <file>` で revert
   （ただしユーザー判断が必要なため、**revert 前に必ず PO 確認**）

**Target:** 以下 4 ファイルの未 stage 変更
- `backend/app/routers/learners.py` (+2 / -2)
- `backend/app/routers/members.py` (+8 / -5)
- `backend/app/routers/sessions.py` (+57 / -8)
- `backend/tests/conftest.py` (+33 / -11)

**Expected file(s):**
- 上記 4 ファイル（commit する場合）
- もしくは revert（PO 承認後）

**注意点:**
- **`<important>`ファイル**: routers / conftest.py は CLAUDE.md の `<important>` 指定対象。
  特に sessions.py は +57 行と大きめなので、Plan review を **追加で発動**することを推奨
  （`Pre-implementation review: yes` に格上げして良い）
- **テスト整合性**: conftest.py 変更が他のテストを壊していないか必ず `pytest` で確認
- **Phase 0 と独立**: 本 [OPEN] は Phase 2（Neon 移行調査）の blocker ではない。
  並列で進めて OK
- **revert 判断は慎重に**: 7 週間前以降の作業内容で、PO が忘れているだけで価値ある
  修正の可能性もある。まずは内容を読み込んでから判断

**Status:** OPEN
