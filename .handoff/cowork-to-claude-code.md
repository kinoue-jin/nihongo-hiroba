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
- **Pre-implementation review**: yes（**重要 tier**〔`.handoff/important-paths.md` の台帳に当たるか、認証・権限・金銭・DB migration・取り消せない操作に触れる変更。判定条件の SSOT だった shared の `impl-model-tiers.md` §重要判定は 2026-10-02 に shared から切り離したため無効。⚠ 本リポの起票フォーマットは `**Tier:**` / `**Blast radius:**` 欄を持たないので、該当したら `**Context:**` に「重要 tier（理由）」と 1 行書く〕/ **`Estimated tokens` が起票フォーマットの上位 2 帯**〔本リポは帯を列挙しないので、起票者が上位 2 帯と判断し `**Context:**` に理由を 1 行書いたとき〕）/ no（軽微）

詳細な agent 使い分けを持っていた `.claude/rules/code-review.md`（shared の規則）は 2026-09-06 に shared 側で分割・削除済み（2026-10-02 に shared から切り離したため無効）。

---

（現在 OPEN 項目はありません。アーカイブ: `_archive/2026-05-08.md`）
