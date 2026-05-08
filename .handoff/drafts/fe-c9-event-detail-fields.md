## [OPEN] 2026-05-08: EventDetail.tsx に必須フィールド表示を追加（C-9）
**Severity:** 🔴 Critical（詳細ページの体を成していない）
**Source:** FE レビュー (Cowork 2026-05-08) §C-9
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Sonnet
**Estimated tokens:** ~10K-20K

**Context:**
`EventDetail.tsx` は「← 戻る」リンクのみで、`host_member_id`、`report_id`、`event_type_id`、`description` のいずれも UI に出ていない。詳細ページとして機能していない。

**Decision:**
以下のフィールドを表示するレイアウトに改修:
- 主催者（host_member_id → public_members.name 解決）
- イベントタイプ（event_type_id → master_items.label 解決）
- 開催日時（date / start_time / end_time）
- 会場（venue）
- 定員 / 参加実数（max_capacity / actual_attendees）
- 紹介文（description — schema にあるはず、なければ追加）
- レポートリンク（report_id → /news/{id}）
- 写真ギャラリー（media_attachments の event 種別を取得）

C-7（FastAPI 経由統一）と同時実施を強く推奨。

**Target:** `frontend/src/pages/public/EventDetail.tsx`

**Expected file(s):**
- `frontend/src/pages/public/EventDetail.tsx`（書き直し、~250 行想定）
- 必要なら `frontend/src/components/event/EventInfoCard.tsx`, `EventGallery.tsx` を切り出し
- BE: `/api/events/{id}` が host_member, event_type, media_attachments を join して返すよう修正（必要なら別 [OPEN]）

**注意点:**
- **C-7 / C-8 との同時着手必須**: Supabase 直叩き → FastAPI 経由 + isError 分岐 + 詳細フィールド表示を一括対応
- **i18n 化**: 「主催者」「会場」「定員」等のラベルはハードコード禁止。`event.detail.*` キーで管理（i18n.md）
- **media 解決**: profile_media_id / event 添付メディアは署名付き URL が必要 (private bucket)。`/api/media/{id}/signed-url` を経由
- **モックデータ更新**: handlers.ts に詳細レスポンスのモックを追加

**Status:** OPEN
