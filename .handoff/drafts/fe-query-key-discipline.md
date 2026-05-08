## [OPEN] 2026-05-08: 複数ページの queryKey 競合を解消（M-14）
**Severity:** 🟡 Medium（表示崩れリスク）
**Source:** FE レビュー (Cowork 2026-05-08) §M-14
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~5K-10K

**Context:**
`Top.tsx`、`EventCalendar.tsx`、`EventList.tsx` の 3 か所が同じ queryKey `['events']` を使っているが、それぞれ条件（fetch 元 / 件数 / フィルタ）が違う。TanStack Query が同じキーで cache 共有するため、ある画面の変更が他画面に伝播し表示崩れる。

**Decision:**
queryKey を object-key 化して条件を含める:

```ts
// Top.tsx
useQuery({ queryKey: ['events', { source: 'top', limit: 5, upcoming: true }], ... });

// EventCalendar.tsx
useQuery({ queryKey: ['events', { source: 'calendar', month }], ... });

// EventList.tsx
useQuery({ queryKey: ['events', { source: 'list', filter, page }], ... });
```

または queryKey 階層型:

```ts
['events', 'top']
['events', 'calendar', month]
['events', 'list', { filter, page }]
```

`news` / `members` / `learners` / `pairings` 等も同様に、queryKey 衝突がないか全ページ grep で洗い出し → 統一。

**Target:** 全ページの useQuery / useMutation 呼び出し箇所

**Expected file(s):**
- `frontend/src/lib/queryKeys.ts`（新規、queryKey factory パターンで全 key を集約）:
  ```ts
  export const qk = {
    events: {
      all: ['events'] as const,
      top: () => ['events', 'top'] as const,
      calendar: (month: string) => ['events', 'calendar', month] as const,
      list: (filter: string, page: number) => ['events', 'list', { filter, page }] as const,
    },
    // ...
  };
  ```
- 全画面の useQuery 呼び出しを `qk.events.top()` 等に置換

**注意点:**
- **影響範囲が広い**: 全 useQuery 呼び出しに影響するため段階的に
- **TanStack Query 公式パターン**: query key factory pattern（[公式 doc](https://tanstack.com/query/latest/docs/framework/react/guides/query-keys)）に準拠
- **invalidateQueries の整合**: mutation 後に `qk.events.all` を invalidate すれば配下の全 key が無効化される
- **H-13（PairingManager の queryKey 不整合）も同タイミングで解消可能**
- **テスト**: 同じ画面に複数 useQuery がある場合、それぞれ別の data を返すか E2E で確認

**Status:** OPEN
