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

## [OPEN] 2026-05-08: Plan review 修正通知 — Phase 2 調査 — Supabase → Neon 移行計画の策定
**Source:** cowork-to-claude-code.md の [OPEN] 2026-05-08「Phase 2 調査 — Supabase → Neon 移行計画の策定」
**Reviewer:** @everything-claude-code:planner (Opus)
**Iterations:** 3（early exit）
**Convergence:** clean

### Iteration 1
**Issues:** Critical 6 件 + Important 6 件 + Suggestion 6 件
- Critical: ① `auth.uid()` 互換 stub 未定義 / ② 公開ビュー戦略の曖昧さ / ③ frontend PostgREST 直叩き実態未確認 / ④ Phase 2-C 段階運用ロジック不明 / ⑤ Phase 2-D Case B 既存ユーザー再招待スクリプト不完全 / ⑥ メンテ時間 30 分の現実性未検証
- Important: ① RLS 互換性検証 / ② test_unit/integration 分割戦略 / ③ `migration_log` テーブル DDL / ④ Phase 2-E 開始タイミング / ⑤ svix パターン流用明記 / ⑥ IDOR 対象エンドポイント明記

**Auto-fix applied:** Critical 6 + Important 6 を `docs/p2-neon-migration.md` に直接反映（[OPEN] 自体ではなく **計画書ドラフト**を修正対象とした、本タスクは「計画書を作る」タスクのため）

### Iteration 2
**Issues:** 新規 Critical 3 件 + Important 4 件
- Critical: ① `auth` schema / stub 削除タイミング曖昧（Case A vs B）/ ② migration `007_remove_supabase_auth_stubs.sql` の Phase 2-B / 2-D 分散 / ③ `009_rename_supabase_user_id_to_clerk_user_id.sql` DDL 欠落
- Important: ① Phase 2-A 認可状態の明示 / ② pgcrypto 拡張 / authenticator ロール存在確認 / ③ 2-B & 2-C 並列時 conftest 競合 / ④ `_migration_user_backup` テーブル DDL

**Auto-fix applied:** Critical 3 + Important 4 をすべて反映:
- §3.1 に Phase 2-A 認可状態の警告ボックス + pgcrypto 拡張 / role 存在確認の完了条件追加
- §3.2 で `auth` schema / stub の削除タイミングを Case A 永続保持 / Case B Phase 2-D で削除に統一、migration `007` への参照削除
- §3.4.2 で migration `009`〜`011` の DDL snippet 明示（退避テーブル / カラムリネーム / stub 削除）+ Case 別 migration 一覧表追加
- §5.3 で 2-B & 2-C 並列実行の conftest 競合回避条件 + 直列フォールバック明記

### Iteration 3
**Issues:** Critical 0 件 + Important 0 件 → **Convergence: clean**

**確認した整合性ポイント:**
- migration 番号体系（000 → 001-004 → 005-006 → 008 → 009-011）の一貫性
- Case A / Case B 分岐の一貫性（§3.4.2 表で明示）
- 開始前チェックリスト（§6）と §1.2 の整合
- rollback 手順の具体性（§4.2 表 + 各 Phase 末尾）
- 推定トークン透明性（Case A: 210K–310K / Case B: 290K–460K）

**Reasoning:** 本タスクは「コード変更を一切伴わない調査タスク」で、生成物は計画書 1 本。ルール上は [OPEN] のレビューが想定されるが、`Decision:` 章は概念的指示のみで実装可能性を判定する具体性に欠けるため、**生成物（計画書ドラフト）に対する review を実施**した。Pre-implementation review の精神（実装前に plan を磨く）に沿う運用。

**Suggestions（修正対象外、参考のみ）:**
1. iter 1 §1.3 の「RLS 挙動の回帰テスト戦略」が §4.3 と重複 → §1.3 削除候補（軽微）
2. §6.1 「race condition 現挙動確認」を「race condition 模擬テストの存在」確認に明確化（軽微）
3. iter 1 並列化図 ASCII の clarify（軽微）
4. §5.1 model 混在比率の数値化（参考情報）

**Status:** OPEN（次回 Cowork セッションで確認後 RESOLVED 化）
