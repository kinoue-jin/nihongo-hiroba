# Architecture Decision Records (ADR) 索引

> プロジェクトの重要な設計判断を不変記録として残すディレクトリ。
> ADR は **一度確定したら変更しない**。後続の判断で覆すなら新 ADR (例: `0002-supersedes-0001.md`) を起票。

## 索引

| # | タイトル | Status | Deciders | 関連 |
|---|---|---|---|---|
| 0001 | [認証スタック: Clerk 移行（Case B）採用](./0001-auth-stack-case-b-clerk.md) | Accepted (2026-05-08) | 仁 (PO) | Phase 2-D / docs/p2-neon-migration.md §2.4 |

## ADR フォーマット

新規 ADR は `engineering:architecture` skill のテンプレートに準拠:

```
# ADR-NNNN: タイトル
**Status:** Proposed | Accepted | Deprecated | Superseded
**Date:** YYYY-MM-DD
**Deciders:** ...

## Context
## Decision
## Options Considered
## Trade-off Analysis
## Consequences
## Action Items
```

## 関連ドキュメント

- `docs/p2-neon-migration.md` — Phase 2 移行計画書（ADR 0001 の意思決定材料）
- `_shared-knowledge/futokoro-handoff.md` — フトコロ Clerk 採用の実例
- `_shared-knowledge/golf-compe-handoff.md` — golf-compe Clerk 採用の実例
- `.handoff/CURRENT.md` — 現在の Phase 状態
