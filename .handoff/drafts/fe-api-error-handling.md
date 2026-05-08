## [OPEN] 2026-05-08: API エラー shape 統一・abort 対応・throw ApiError 化（H-14 / M-17 / M-18）
**Severity:** 🟠 High → Medium 横断
**Source:** FE レビュー (Cowork 2026-05-08) §H-14, §M-17, §M-18
**Task type:** code
**Review required:** yes
**Pre-implementation review:** yes
**Recommended model:** Sonnet
**Estimated tokens:** ~25K-40K

**Context:**

1. **H-14**: ログイン UI のエラー表示が `errorData.detail` 前提だが、FastAPI の Pydantic 422 Validation Error では `detail` が**オブジェクト配列**になり `[object Object]` 表示。型ガードかフォールバック必須
2. **M-17**: `apiClient.fastapi.get/post/put/delete` がレスポンスをそのまま返すため、呼び出し側で毎回 `if (!res.ok) throw` していて重複コード多数
3. **M-18**: TanStack Query は `signal: AbortSignal` を queryFn に渡してくれる。`fastapi.get` が `signal` を受け取って fetch に渡せば、画面遷移時に走り続けるリクエストを中断できる

**Decision:**
1. **`ApiError` 型を新設**: `class ApiError extends Error { status: number; body: unknown }` を定義
2. **`apiClient` を薄いラッパに統一**:
   ```ts
   async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
     const res = await fetch(`${API_URL}${path}`, { ...init, signal: init?.signal });
     const body = await res.json().catch(() => ({}));
     if (!res.ok) throw new ApiError(res.status, body);
     return body as T;
   }
   export const fastapi = {
     get: <T>(path: string, opts?: { signal?: AbortSignal }) => fetchJson<T>(path, { headers: ..., signal: opts?.signal }),
     ...
   };
   ```
3. **エラーメッセージ抽出ヘルパ**: `getErrorMessage(err: unknown): string` で `ApiError` の `body.detail` が string / object 配列 / undefined のいずれでも妥当な表示文字列に変換
4. **TanStack Query の `signal` を全 useQuery に渡す**:
   ```ts
   useQuery({ queryKey: [...], queryFn: ({signal}) => fastapi.get(path, {signal}) });
   ```

**Target:**
- `frontend/src/lib/apiClient.ts`（中核修正）
- 全 useQuery / useMutation 呼び出し箇所（path のみの呼び出しを `({signal}) =>` 形式に書き換え）

**Expected file(s):**
- `frontend/src/lib/apiClient.ts`（refactor、ApiError export）
- `frontend/src/lib/errors.ts`（新規、`getErrorMessage` ヘルパ）
- 全ページの useQuery / useMutation の queryFn 引数を update（影響範囲: ~30+ ファイル）
- 全ページのエラー表示箇所が `getErrorMessage(error)` を使うよう統一

**注意点:**
- **`<important>`**: `apiClient.ts` は CLAUDE.md `<important>` 指定対象（共通基盤）。Plan review 必須
- **影響範囲が広い**: 全 useQuery 呼び出しに影響するため、段階的に置換 → CI green を確認しながら commit を分割
- **AbortError の握り潰し**: `signal.aborted` 時の DOMException は React Query が自動で扱うが、独自エラーバウンダリでログを取っている場合は `if (err.name === 'AbortError') return` を入れる
- **C-3 / C-4 の Auth 統一と並行可**: 別 [OPEN] として進めて OK だが、`getErrorMessage` を `auth.ts` でも使うため、ApiError 系の定義を先に固める方が効率的
- **テスト**: 422 Validation Error / 401 / 500 / network error / abort の 5 ケースで getErrorMessage が望ましい文字列を返すか unit test

**Status:** OPEN
