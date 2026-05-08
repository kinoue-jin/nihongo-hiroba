# CURRENT.md — にほんごひろば 現在の状態

> このファイルは Cowork と Claude Code の協働を支える `.handoff/` システムの中核。
> 1 ファイルで「今プロジェクトはどういう状態か」が分かるダッシュボード。
>
> 更新タイミング: ステップ切替時 / 重要な決定時 / 毎日の作業開始時（任意）

**Last updated:** 2026-05-08 by Cowork session（Phase 0 完了 — `_shared-knowledge` / `.handoff` / Cowork 運用への接続を commit。Phase 2 調査 [OPEN] + pre-existing 整理 [OPEN] 2 件 = 計 3 件起票）

---

## アクティブ状態

| 項目 | 値 |
|------|---|
| **Active phase** | **Phase 0**（運用接続）→ 完了。次は **Phase 2 調査**（Supabase → Neon 移行計画策定） |
| **Active spec** | `CLAUDE.md`（Phase 1 = Agent Teams 並列実装の指示書、本体は Supabase ベースで実装済みの想定） |
| **Active implementation guide** | （Phase 2 計画書は調査タスク完了後に作成） |
| **Current focus** | Supabase → Neon 移行の事前調査・移行計画策定 |
| **Blocked by** | なし |

## オープン項目数

| ファイル | OPEN 数 |
|---------|---------|
| `cowork-to-claude-code.md` | 3（Phase 2 調査: Neon 移行計画 / __pycache__ 1841 件追跡解除 / 未 commit backend 実コード review） |
| `claude-code-to-cowork.md` | 0 |
| `lesson-candidates.md` | 0 |

## 次のマイルストーン

1. **Phase 2 調査タスク完了** → 移行計画 markdown が `docs/p2-neon-migration.md` 等に記載される
2. **PO（仁さん）が計画レビュー** → 承認後、実装フェーズの [OPEN] 群を起票
3. **Phase 2 実装** → SQLAlchemy + asyncpg 移行 + RLS 撤廃 + アプリ層認可導入

## 既知の課題（Phase 2 で扱う）

- **Supabase RLS 循環参照リスク**: `knowledge-base-nihongo-hiroba.md §2` 既知問題。Neon 移行で根本解消予定
- **supabase-py バージョン固定**: `==` 固定中（同 §1）
- **python-magic Railway デプロイ**: nixpacks 設定が必要（同 §3）。Neon 移行後も継続課題
- **モックテストの限界**: `test_integration/` での実 DB / 実 JWT テストが必要（同 §4）

## 既知の課題（別タスク）

- **巨大ファイル監査未実施**: `_shared-knowledge/knowledge-base/13-split-patterns.md` の業界標準（実装 500 行 / テスト 500 行 / CSS 300 行）に基づくリポジトリ全体監査。Phase 2 完了後に実施候補

## 最近の更新（直近 7 日）

- 2026-05-08: `.claude/rules/` 配下 6 ファイルを `_shared-knowledge/rules/` から symlink 接続
- 2026-05-08: `CLAUDE-cowork.md` を `_shared-knowledge/cowork/CLAUDE-cowork.md` から symlink 配置
- 2026-05-08: `.handoff/` ディレクトリ構造を作成（CLAUDE.md / CURRENT.md / cowork-to-claude-code.md / claude-code-to-cowork.md / lesson-candidates.md / _archive/ / drafts/ + scripts/ symlinks）
- 2026-05-08: `.gitignore` に Cowork 用エントリ（`.cowork-trash/` / `.handoff/.iterm-logs` 等）を追記
- 2026-05-08: 既存 `CLAUDE.md` 末尾に「shared-knowledge / handoff / Cowork 接続」セクションを追記（既存 Phase 1 指示書は保護）
- 2026-05-08: `cowork-to-claude-code.md` に Phase 2 調査用 [OPEN] 1 件を起票
- 2026-05-08: pre-existing 整理 [OPEN] 2 件追加起票（__pycache__ 1841 件追跡解除 / 7 週間前以降の未 commit backend 実コード変更 4 ファイルの review）

## 履歴（Phase 推移）

| Phase | 内容 | 状態 |
|---|---|---|
| Phase 1 | Agent Teams 並列実装（Agent A/B-0/B/C/D/E + Orchestrator + テストフェーズ） | 既存 CLAUDE.md 冒頭〜中盤の指示書通り、別プロジェクトで実装完了の想定（本セッションでは未確認） |
| Phase 0 (今回) | `_shared-knowledge` / `.handoff` / Cowork 運用接続 | ✅ 完了（2026-05-08） |
| Phase 2 (次) | Supabase → Neon 移行 | 🔍 調査中（[OPEN] 起票済） |
