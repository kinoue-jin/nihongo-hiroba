## [OPEN] 2026-05-08: MSW worker の二重起動を解消（C-1）
**Severity:** 🔴 Critical
**Source:** FE レビュー (Cowork 2026-05-08) §C-1
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~5K-10K

**Context:**
`main.tsx` と `App.tsx` の双方で `worker.start()` が呼ばれており、`VITE_USE_MOCK=true` のとき MSW worker が二重起動する。`A worker has already been registered` 警告が出るほか、ハンドラが二重登録されるリスクあり。さらに `main.tsx` の `worker.start()` は `await` されておらず、React レンダリング前に解決されないため、最初の `useQuery` が走る前に MSW が初期化されない race condition もある。

```ts
// main.tsx
if (import.meta.env.VITE_USE_MOCK === 'true') {
  const { worker } = await import('./mocks/browser');
  worker.start();    // await されていない
}
// App.tsx
if (import.meta.env.VITE_USE_MOCK === 'true') {
  worker.start();    // 二重起動
}
```

**Decision:**
1. `App.tsx` 側の `worker.start()` 呼び出しを削除
2. `main.tsx` 側を `await worker.start({ onUnhandledRequest: 'bypass' })` に変更し、worker 起動完了後に `ReactDOM.createRoot(...).render(...)` を実行する順序に修正

**Target:** `frontend/src/main.tsx` と `frontend/src/App.tsx` の MSW 起動箇所

**Expected file(s):**
- `frontend/src/main.tsx`（修正、worker 起動を await）
- `frontend/src/App.tsx`（worker 起動を削除、import も）

**注意点:**
- `App.tsx` から `worker` import を削除する際、未使用 import で `noUnusedLocals` エラーになりうる（M-2 関連）
- MSW v2 系なら `worker.start()` は Promise を返すので await 必須
- `onUnhandledRequest: 'bypass'` は本番 API への透過 fallback。エラーで止めたい開発者向けには `'warn'` も選択肢

**Status:** OPEN
