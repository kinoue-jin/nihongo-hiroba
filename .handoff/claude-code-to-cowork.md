# Pending Questions

> Claude Code → Cowork の質問・Plan review 通知。書く場所/タイミングは [`.handoff/CLAUDE.md`](./CLAUDE.md) 参照。

## フォーマット A: 通常の質問・判断依頼

```
## [Status] YYYY-MM-DD by agent-X (or Claude Code)
**Where:** 画面 ID / API パス / ファイル
**Question:** 質問内容
**Context:** 背景・選択肢
**Provisional impl:** 仮実装内容（あれば）
**Files affected:** 修正対象ファイル
**Blocked:** Yes / No
```

## フォーマット B: Plan review 修正通知

**再 review ルール（最大 5 iterations）:**
- 各 iter: review → Critical/Important あれば `[OPEN]` 修正 → 次 iter
- Critical/Important 0 件 → `Convergence: clean` → 即実装（早期終了）
- **5 iter 完了時点で残存 → 自動エスカレート**（実装中止 + フォーマット A で別起票）
- **修正不可能と判明した時点で即エスカレート**（5 iter 待たない）
- 修正対象は **[OPEN] 自体**（plan に直接修正反映、implementation strategy の脳内変更のみは NG）
- `accepted-with-issues` 判定は **廃止**（clean OR エスカレートのいずれか）
- フォーマット B は **1 タスクにつき 1 エントリー**（iter ごとに新規起票せず、同じエントリーに Iteration 1 / 2 / 3... を追記）

```
## [Status] YYYY-MM-DD: Plan review 修正通知 — {元 [OPEN] タイトル}
**Source:** cowork-to-claude-code.md の [OPEN] {タイトル}
**Reviewer:** @everything-claude-code:planner (Opus)（必要に応じて + @architect）
**Iterations:** N（max 5、early exit 可能）
**Convergence:** clean | escalated

**Iteration 1:** Issues / Auto-fix applied
**Iteration 2:** （実施した場合のみ）
...
**Iteration N:** （最終 iter）

**Unresolved issues:** （escalated 時のみ記載 — エスカレート理由を「フォーマット A: 別 [OPEN]」へリンク）
**Reasoning:** 各修正の根拠
**Status:** OPEN | RESOLVED
```

詳細は [`.claude/rules/code-review.md`](../.claude/rules/code-review.md) の「Pre-implementation plan review」セクション参照。

---

（現在 OPEN 項目はありません。アーカイブ: `_archive/2026-05-08.md`）
