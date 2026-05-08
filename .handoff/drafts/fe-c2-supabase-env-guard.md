## [OPEN] 2026-05-08: apiClient.ts の Supabase 初期化ガード追加（C-2）
**Severity:** 🔴 Critical
**Source:** FE レビュー (Cowork 2026-05-08) §C-2
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~3K-5K

**Context:**
`apiClient.ts` の `createClient(supabaseUrl, supabaseAnonKey)` は環境変数未定義でも例外なく実行され、後続の `supabase.auth.*` 呼び出し時点で意味不明なエラーが出る。`.env.local` を作り忘れた開発者は無言で白画面になり、トラブルシュートが極めて困難。

**Decision:**
モジュール読み込み時点で fail-fast する。エラーメッセージは初学者でもわかる日本語＋設定すべき変数名を明示。

```ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY が設定されていません。frontend/.env.local を作成してください。',
  );
}
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

`VITE_API_URL` も同様に必須化（fallback で `http://localhost:8000` でも可だが、本番ビルド時は明示推奨）。

**Target:** `frontend/src/lib/apiClient.ts`

**Expected file(s):**
- `frontend/src/lib/apiClient.ts`（環境変数ガード追加）
- `frontend/.env.local.example`（既存になければ新規、必須変数の雛形）

**注意点:**
- ビルド時に環境変数未定義だと CI/Vercel ビルドが落ちる → デプロイ環境にも環境変数が設定されていることを必ず確認
- Vite は `import.meta.env.MODE === 'test'` 時に MSW 経由でも `VITE_API_URL` の defaults があると安心
- Vercel の環境変数設定漏れで本番だけ落ちる事故を防ぐため、`.env.local.example` をチェックインする

**Status:** OPEN
