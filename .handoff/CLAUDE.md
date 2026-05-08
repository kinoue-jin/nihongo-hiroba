# .handoff/ 運用ガイド

> Cowork ↔ Claude Code 連携の handoff システム運用ルール。
> このディレクトリ配下のファイルに触れる前に必ず一読。

## ファイル一覧

| ファイル | 役割 | 誰が書く |
|---|---|---|
| `CURRENT.md` | 現状ダッシュボード | Cowork |
| `cowork-to-claude-code.md` | 作業依頼 | Cowork → Claude Code |
| `claude-code-to-cowork.md` | 質問・Plan review 通知 | Claude Code → Cowork |
| `lesson-candidates.md` | 教訓候補 | Claude Code → Cowork |
| `_archive/{YYYY-MM-DD}.md` | 解決済み記録（日単位） | （上記から移動） |
| `drafts/` | 起票下書き | Cowork |
| `scripts/` | 運用スクリプト | （shared から symlink） |

## 書く場所 早見表

| 状況 | 書く場所 | ステータス |
|---|---|---|
| Cowork が新規作業を依頼 | `cowork-to-claude-code.md` | `[OPEN]` |
| Claude Code が実装完了 | 同 | `[OPEN]` → `[APPLIED]` |
| Claude Code が timeout 検知 | 同 | `[OPEN]` → `[FAILED]` |
| Cowork が次の起票時 | 既存 `[APPLIED]` を `_archive/{YYYY-MM-DD}.md` 移動 | （移動） |
| Claude Code が実装中に質問 | `claude-code-to-cowork.md` | `[OPEN]` (フォーマット A) |
| Claude Code が Plan review 実施 | 同 | `[OPEN]` (フォーマット B) |
| Cowork が回答 → 直後 archive 移動 | 同 | `[OPEN]` → `[RESOLVED]` |
| Claude Code が教訓発見 | `lesson-candidates.md` | `[CANDIDATE]` |
| Cowork レビュー → 直後 archive 移動 | 同 | `[CANDIDATE]` → `[PROMOTED]` / `[SKIP]` |

## ステータスタグ

`[OPEN]` 未対応 / `[APPLIED]` 実装完了 / `[FAILED]` 失敗（要訂正検証） / `[RESOLVED]` 回答済 / `[CANDIDATE]` 教訓候補 / `[PROMOTED]` knowledge-base 昇格 / `[SKIP]` 個別事例として却下

## アーカイブのファイル名

`_archive/{YYYY-MM-DD}.md` 形式（日単位）。同日に複数 entry がある場合は同じファイルに集約。

## ❌ 書かないもの

- 仁さん個人のメモ → Notion / Apple Notes 等
- 別プロジェクトの ToDo → 別の場所
- プロジェクト不変ルール → ルートの `CLAUDE.md`
- Cowork セッション中の議論 → 該当チャットで完結

## 詳細参照

- 自動コミット: `.claude/rules/handoff-apply.md`
- レビュー Agent 使い分け: `.claude/rules/code-review.md`
- Cowork 運用: ルートの `CLAUDE-cowork.md`
- 詳細運用教訓: `_shared-knowledge/knowledge-base/12-cowork-ops.md`
