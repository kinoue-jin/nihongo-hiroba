## [OPEN] 2026-05-08: PairingManager のドラッグ領域分離と queryKey 連動修正（H-12 / H-13）
**Severity:** 🟠 High（管理画面の中核機能）
**Source:** FE レビュー (Cowork 2026-05-08) §H-12, §H-13
**Task type:** code
**Review required:** yes
**Pre-implementation review:** yes
**Recommended model:** Sonnet
**Estimated tokens:** ~25K-40K

**Context:**

1. **H-12**: `{...listeners}` を行全体に貼っているため「解除」ボタン押下時にもドラッグが開始されかける。`stopPropagation` だけでは不十分（@dnd-kit のリスナーは pointerdown でつかむため、click が発火する前にドラッグになる）。drag handle 専用要素（≡ アイコン等）を分離するのがベストプラクティス
2. **H-13**: `generatePairingsMutation.onSuccess` で `['pairings']` を invalidate しているが、本画面では `['pairings']` という queryKey で取得していない。生成ボタンを押しても画面が変わらない（mutation success 後の自動再取得が効いていない）

**Decision:**
1. **H-12**: `<button {...listeners} aria-label="ドラッグして移動">≡</button>` を drag handle として分離。行本体の click イベントは独立に動く
2. **H-13**: `useQuery` の queryKey を `['pairings', sessionId]` 形式の階層型 array に統一し、mutation の `onSuccess` でも同じ key を invalidate
3. C-7（Supabase 直叩き廃止）と同時着手で `fastapi.get('/api/pairings/sessions/{id}/registrations')` 等への切替も完了させる

**Target:** `frontend/src/pages/admin/PairingManager.tsx`

**Expected file(s):**
- `frontend/src/pages/admin/PairingManager.tsx`（修正、~300-400 行想定）
- `frontend/src/__tests__/admin/PairingManager.test.tsx`（drag handle / 解除ボタン / 生成ボタン → 画面更新の各テスト追加）

**注意点:**
- **`<important>`**: PairingManager は組み合わせロジック（Phase 1 Agent E）の UI。Plan review 必須
- **C-7 と統合する形がベスト**: Supabase 直叩き → FastAPI 経由 + queryKey 整理を 1 commit で
- **@dnd-kit の `useSortable`**: `attributes`, `listeners`, `setNodeRef`, `transform` を分けて使う。listeners は handle 要素にだけ
- **a11y**: drag handle に `aria-label` 必須。キーボードドラッグの sensors（KeyboardSensor）も追加するとなお良い
- **mutation の楽観的更新**: invalidate に頼らず `setQueryData` で即時反映するパターンも検討（生成 → 即座に UI に反映、その後 server fetch で確認）

**Status:** OPEN
