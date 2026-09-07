<!-- format: 1 -->
# important paths — tier 判定 (a) の機械可読な入力

> [台帳の所在・行書式・登録基準・棚卸し手順] → ~/Projects/_shared-knowledge/rules/tiers.md#important-paths-ledger

## paths

- `.handoff/important-paths.md` — (ii)本台帳自身
- `.handoff/scripts/**` — (ii)運用スクリプト置き場
- `backend/app/main.py` — (iii)アプリ構成の根幹
- `backend/app/dependencies.py` — (i)認可の依存注入
- `backend/app/middleware/**` — (i)RLS / 認可のミドルウェア
- `backend/app/routers/**` — (i)全 routers（認証・権限の実装面）
- `frontend/src/lib/apiClient.ts` — (iii)全画面が使う共通基盤
- `frontend/src/router.tsx` — (iii)ルーティング根幹
- `frontend/src/mocks/handlers.ts` — (iii)MSW の共通ハンドラ
- `supabase/migrations/**` — (i)DB migration
