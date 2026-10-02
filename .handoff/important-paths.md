<!-- format: 1 -->
# important paths — tier 判定 (a) の機械可読な入力

> 行書式 = `- \`<パス or glob>\` — (区分)理由`。区分 = (i) 認証・権限・金銭・DB migration・取り消せない操作を実装している面 / (ii) 判定・配達の仕組みそのもの / (iii) 全画面・全エンドポイントへ波及する共通基盤。
> 2026-10-02 に shared から切り離した（台帳の書き方を持っていた shared の規則と、判定器 `.handoff/scripts/tier-check.py` への参照は外した）。

## paths

- `.handoff/important-paths.md` — (ii)本台帳自身
- `backend/app/main.py` — (iii)アプリ構成の根幹
- `backend/app/dependencies.py` — (i)認可の依存注入
- `backend/app/middleware/**` — (i)RLS / 認可のミドルウェア
- `backend/app/routers/**` — (i)全 routers（認証・権限の実装面）
- `frontend/src/lib/apiClient.ts` — (iii)全画面が使う共通基盤
- `frontend/src/router.tsx` — (iii)ルーティング根幹
- `frontend/src/mocks/handlers.ts` — (iii)MSW の共通ハンドラ
- `supabase/migrations/**` — (i)DB migration
