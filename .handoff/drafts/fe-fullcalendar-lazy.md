## [OPEN] 2026-05-08: FullCalendar plugin の真の lazy import（M-4）
**Severity:** 🟡 Medium
**Source:** FE レビュー (Cowork 2026-05-08) §M-4
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~5K-10K

**Context:**
`EventCalendar.tsx` は `lazy(() => import('@fullcalendar/react'))` で React コンポーネント本体は lazy 化しているが、`plugins: [dayGridPlugin, timeGridPlugin, listPlugin]` の plugin 群は static import のため初回ロードに含まれる。CLAUDE.md の「FullCalendar lazy load」の意図が**半分しか達成されていない**。FullCalendar 本体 + plugins で 100KB+ あり、トップページ等を訪れただけで読まれてしまう。

**Decision:**
plugins も含めて全部 dynamic import にする:

```tsx
const FullCalendarComponent = lazy(async () => {
  const [{ default: FullCalendar }, dayGrid, timeGrid, list] = await Promise.all([
    import('@fullcalendar/react'),
    import('@fullcalendar/daygrid'),
    import('@fullcalendar/timegrid'),
    import('@fullcalendar/list'),
  ]);
  return {
    default: (props: any) => (
      <FullCalendar
        plugins={[dayGrid.default, timeGrid.default, list.default]}
        {...props}
      />
    ),
  };
});
```

**Target:** `frontend/src/pages/public/EventCalendar.tsx`

**Expected file(s):**
- `frontend/src/pages/public/EventCalendar.tsx`（修正）

**注意点:**
- **bundle 計測**: `npm run build && npx vite-bundle-visualizer` 等で /events/calendar チャンクが本当に分離されているか確認
- **Suspense fallback**: `<Suspense fallback={<CalendarSkeleton />}>` で読み込み中の表示を整える
- **M-3 と同時着手**: `as any` の plugins 型キャストもこの修正で解消
- **EventList も同パターンの lazy 化**を検討（FullCalendar は使わないが、recharts や @dnd-kit は admin だけで使う等の整理）
- **CDN cache**: dynamic import で chunk が変わると古い参照を取りに行って 404 になるケースがある。Vite の `build.rollupOptions.output.chunkFileNames` で hash 入りファイル名を確認

**Status:** OPEN
