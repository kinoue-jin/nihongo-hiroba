## [OPEN] 2026-05-08: ProtectedRoute のリトライ / エラー区別 / ローディング表示改善（H-5 / L-4）
**Severity:** 🟠 High
**Source:** FE レビュー (Cowork 2026-05-08) §H-5, §L-4
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Sonnet
**Estimated tokens:** ~10K-15K

**Context:**
`ProtectedRoute.tsx` には 2 つの問題:

1. **H-5**:
   - ローディング中 `min-h-screen` のスピナーが `<Header />` と重なって表示される
   - `/auth/me` が 1 回失敗しただけで即 `<Navigate to="/login">` → ネットワーク瞬断でログアウト挙動になる
2. **L-4**: スピナーの `border-blue-600` だけ他要素（indigo 系）と配色不統一

**Decision:**
1. **未ログイン状態とロード失敗を区別**:
   - HTTP 401 → 真に未ログイン → `/login` へ遷移
   - ネットワークエラー / 5xx → リトライ UI（最低 1 回 auto-retry、それでも失敗ならエラー画面）
2. **ローディング表示を inline 化**: `<Header />` の下に max-w container 内 spinner、画面全体を覆わない
3. **配色を indigo 系に統一**

```tsx
const { isLoading, isError, error, refetch } = useQuery({
  queryKey: ['auth', 'me'],
  queryFn: () => fastapi.get('/auth/me'),
  retry: (failureCount, error) => {
    if (error.status === 401) return false;  // 即未ログイン扱い
    return failureCount < 1;                  // ネットワークエラーは 1 回 auto retry
  },
});
```

**Target:** `frontend/src/components/ProtectedRoute.tsx`

**Expected file(s):**
- `frontend/src/components/ProtectedRoute.tsx`（修正）
- `frontend/src/__tests__/components/ProtectedRoute.test.tsx`（401 / 5xx / ネットワークエラー / 認証成功 の 4 ケース）

**注意点:**
- **`<important>`**: `ProtectedRoute.tsx` は CLAUDE.md 指定対象（共通基盤）。Plan review 推奨
- **H-14（FastAPI エラー shape）の修正と整合**: `error.status` を取れる構造に依存
- **C-4（auth-source-of-truth）と同時着手推奨**: localStorage / Supabase セッションの分裂を解消した上で /auth/me を叩く
- **リトライ UI の文言** は i18n 化（`auth.error.network_failed`, `auth.action.retry` 等）
- **MSW テストでは setTimeout で網羅困難** → MSW v2 `passthrough` でネットワークエラー擬似が必要。Vitest だと `nock` レベルの mock が要る場合あり

**Status:** OPEN
