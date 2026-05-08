## [OPEN] 2026-05-08: EventList.tsx のフィルタを master_items 連動に変更（H-6）
**Severity:** 🟠 High
**Source:** FE レビュー (Cowork 2026-05-08) §H-6
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~5K-10K

**Context:**
`EventList.tsx` では `EVENT_TYPE_FILTERS = [{value:'hometown'}, ...]` がハードコードされているが、同じ画面で `master_items` から `eventTypes` を fetch している。マスター変更（管理画面でイベントタイプを追加）した瞬間にフィルタボタンが追従しない。

**Decision:**
ハードコード配列を削除し、`eventTypes` をそのまま map してフィルタボタンを生成。

```tsx
const { data: eventTypes } = useQuery({ queryKey: ['eventTypes'], queryFn: ... });
return (
  <>
    {eventTypes?.map(type => (
      <button key={type.value} onClick={() => setFilter(type.value)}>
        {t(`events.type.${type.value}`)}
      </button>
    ))}
  </>
);
```

**Target:** `frontend/src/pages/public/EventList.tsx`

**Expected file(s):**
- `frontend/src/pages/public/EventList.tsx`（修正）

**注意点:**
- **i18n キー連動**: `events.type.hometown`, `events.type.culture` 等。master_items の `value` をキーに使えば DB 側 master 追加時に i18n キー追加だけで済む
- **`is_active=false` のフィルタ**: master_items に `is_active` カラムがあるので、 `eventTypes.filter(t => t.is_active)` する
- **同種の問題が他のページにないか調査**: `cancel_case` / `news_category` / `member_role` 等のマスター連動フィルタの有無を grep で確認
- **テスト**: master_items が空でもエラーにならないこと、追加された type が即フィルタに出ることを確認

**Status:** OPEN
