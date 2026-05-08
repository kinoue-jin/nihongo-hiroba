## [OPEN] 2026-05-08: Top / NewsList の id null フォールバック削除と events 日付フィルタ（H-8 / H-9）
**Severity:** 🟠 High
**Source:** FE レビュー (Cowork 2026-05-08) §H-8, §H-9
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~5K-10K

**Context:**

1. **H-8**: `Top.tsx` / `NewsList.tsx` の `news.id ?? ''` フォールバック。`id` が空文字だと `to="/news/$newsId" params={{newsId: ''}}` で `/news/` に遷移し React Router がエラー
2. **H-9**: `Top.tsx` の events 一覧は「今後のイベント」と銘打っているのに、過去日付のイベントも全部出る

**Decision:**
1. **H-8**: `id` 必須化 → 型を `News & { id: string }` で non-null にする。`?? ''` を削除し、`id` が無い記事は要素自体を render しない（`if (!news.id) return null` または filter）
2. **H-9**: FastAPI 側に `?upcoming=true` クエリを追加（`date >= today`）するか、フロントで `events.filter(e => new Date(e.date) >= today)` でフィルタ。**API 側で絞る方が転送量も少なく推奨**

**Target:**
- `frontend/src/pages/public/Top.tsx`
- `frontend/src/pages/public/NewsList.tsx`
- BE: `/api/events` に `?upcoming` クエリ追加（必要なら別 [OPEN]）

**Expected file(s):**
- `frontend/src/pages/public/Top.tsx`（修正）
- `frontend/src/pages/public/NewsList.tsx`（修正）
- BE 側別 [OPEN]（必要に応じて）

**注意点:**
- **C-7（FastAPI 経由統一）と同時着手推奨**: どうせ Top.tsx を書き換えるなら一緒に
- **API contract 変更**: `?upcoming=true` を追加する場合、`docs/api.md` 等に書く
- **TZ 注意**: `today` は「日本時間の今日」。CLAUDE.md `common-policies.md §4` のタイムゾーン方針に従い JST で計算
- **フィルタが効きすぎる**: 当日 0:00 に切り替わるとき「今日のイベントが消える」UX 劣化。`>= today 00:00` ではなく `>= now - 6h` 等の余裕を持たせる手も
- **件数制限**: トップは 5 件など固定で十分。filter + slice の順序確認

**Status:** OPEN
