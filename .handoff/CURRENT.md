# CURRENT.md — にほんごひろば 現在の状態

> このファイルは Cowork と Claude Code の協働を支える `.handoff/` システムの中核。
> 1 ファイルで「今プロジェクトはどういう状態か」が分かるダッシュボード。
>
> 更新タイミング: ステップ切替時 / 重要な決定時 / 毎日の作業開始時（任意）

**Last updated:** 2026-05-08 by Cowork session（Phase 2 調査タスク完了 — 計画書 `docs/p2-neon-migration.md` (683 行) ＋ Plan review iter 3 clean。次は **PO 判断（Case A vs B 認証スタック選択 + §6.1 開始前実態調査）**）

---

## アクティブ状態

| 項目 | 値 |
|------|---|
| **Active phase** | **Phase 2 調査完了** → **PO 判断待ち** |
| **Active spec** | `CLAUDE.md`（Phase 1 = Agent Teams 並列実装の指示書） |
| **Active implementation guide** | **`docs/p2-neon-migration.md`**（683 行、Plan review clean） |
| **Current focus** | PO（仁さん）が計画書をレビュー → Case A/B 判断 → §6.1 実態調査 → Phase 2-A の [OPEN] 起票 |
| **Blocked by** | PO 判断（**Case A: Supabase Auth 継続** vs **Case B: Clerk 移行**） |

## オープン項目数

| ファイル | OPEN 数 |
|---------|---------|
| `cowork-to-claude-code.md` | 0（[APPLIED] 3 件 → `_archive/2026-05-08.md` に移動済） |
| `claude-code-to-cowork.md` | 0（Plan review 修正通知 [RESOLVED] 化済） |
| `lesson-candidates.md` | 2（sessions.py: 空 pairing 時の status 遷移バグ / `List[dict]` 型安全性欠落 — Phase 2 着手前確認推奨） |
| `drafts/` | 24（FE レビュー — Critical 7 / High 8 / Medium 7 / Low+ADR 2、`cowork-to-claude-code.md` 昇格待ち） |

## 次のマイルストーン

1. **PO（仁さん）が `docs/p2-neon-migration.md` をレビュー**
2. **Case A/B 判断**（認証: Supabase Auth 継続 / Clerk 移行）
3. **§6.1 開始前実態調査**（race condition 模擬テスト / pgcrypto 拡張確認 / authenticator ロール存在確認 等）
4. **Phase 2-A の [OPEN] 起票** → SQLAlchemy + asyncpg 導入
5. **Phase 2-B 〜 2-E** → 認可 / Storage / Auth / 統合テスト

## 既知の課題（Phase 2 で扱う）

- **Supabase RLS 循環参照リスク**: `knowledge-base-nihongo-hiroba.md §2`。Neon 移行で根本解消予定
- **supabase-py バージョン固定**: `==` 固定中（同 §1）
- **python-magic Railway デプロイ**: nixpacks 設定が必要（同 §3）。Neon 移行後も継続課題
- **モックテストの限界**: `test_integration/` での実 DB / 実 JWT テストが必要（同 §4）
- **sessions.py 状態遷移バグ**: lesson-candidates §1（空 pairing → "pairing" status エッジケース）
- **`List[dict]` 型安全性**: lesson-candidates §2（GeneratePairingsResponse スキーマ）

## 既知の課題（別タスク）

- **FE レビュー 24 件 drafts/**: 順次 `cowork-to-claude-code.md` に昇格。最優先 `fe-c6-top-korean-leak.md`（Top.tsx 韓国語混入）
- **巨大ファイル監査未実施**: `_shared-knowledge/knowledge-base/13-split-patterns.md` の業界標準（実装 500 行 / テスト 500 行 / CSS 300 行）に基づくリポジトリ全体監査。Phase 2 完了後に実施候補
- **`backend/venv/bin/*` 追跡**: 1841 件の `__pycache__` と同パターンで venv が追跡されている。`.gitignore` 追加 + `git rm --cached -r backend/venv/` の [OPEN] 起票候補

## 最近の更新（直近 7 日）

- 2026-05-08: `.claude/rules/` 配下 6 ファイルを `_shared-knowledge/rules/` から symlink 接続
- 2026-05-08: `CLAUDE-cowork.md` を `_shared-knowledge/cowork/CLAUDE-cowork.md` から symlink 配置
- 2026-05-08: `.handoff/` ディレクトリ構造を作成
- 2026-05-08: `.gitignore` に Cowork 用エントリを追記
- 2026-05-08: 既存 `CLAUDE.md` 末尾に「shared-knowledge / handoff / Cowork 接続」セクションを追記
- 2026-05-08: `cowork-to-claude-code.md` に Phase 2 調査用 [OPEN] 起票
- 2026-05-08: pre-existing 整理 [OPEN] 2 件追加起票（__pycache__ 1841 件追跡解除 / 未 commit backend 実コード review）
- 2026-05-08: FE レビュー 54 項目を `.handoff/drafts/` に 24 件の起票テンプレに整形
- 2026-05-08: **Phase 2 調査タスク [APPLIED]** → `docs/p2-neon-migration.md` (683 行) 完成、Plan review iter 3 clean
- 2026-05-08: __pycache__ 追跡解除 [APPLIED]（commit `9fc4b434`、1841 ファイル削除）
- 2026-05-08: backend 実コード review [APPLIED]（commit `120d82af`、4 ファイルすべて COMMIT 判断、282 tests pass）
- 2026-05-08: handoff 整理 — [APPLIED] 3 件 + Plan review [RESOLVED] 1 件を `_archive/2026-05-08.md` に移動、sessions.py 懸念 2 件を `lesson-candidates.md` に [CANDIDATE] 起票

## 履歴（Phase 推移）

| Phase | 内容 | 状態 |
|---|---|---|
| Phase 1 | Agent Teams 並列実装（Agent A/B-0/B/C/D/E + Orchestrator + テストフェーズ） | 既存 CLAUDE.md 冒頭〜中盤の指示書通り実装完了 |
| Phase 0 | `_shared-knowledge` / `.handoff` / Cowork 運用接続 | ✅ 完了（2026-05-08） |
| Phase 2 調査 | Supabase → Neon 移行計画策定 | ✅ 完了（2026-05-08）— `docs/p2-neon-migration.md` |
| Phase 2 実装 | DB / 認可 / Storage / Auth / 統合テスト の 5 段階 | 🔵 PO 判断待ち（Case A/B + §6.1 実態調査） |
