## [OPEN] 2026-05-08: Header.tsx の挙動・a11y を改善（H-4 / H-7 / M-7 / L-2）
**Severity:** 🟠 High
**Source:** FE レビュー (Cowork 2026-05-08) §H-4, §H-7, §M-7, §L-2
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Sonnet
**Estimated tokens:** ~10K-20K

**Context:**
`Header.tsx` に複合的な不備:

1. **H-4**: `useEffect` が `location.pathname` 変更で都度 `setState` する。ページ遷移ごとに毎回 localStorage を読み直し → 不要な再レンダ。`storage` イベントだけで十分
2. **H-7**: `useQuery` の enabled 条件が `userRole === 'admin' || 'staff'` のみ。`learner` ログイン時に displayName が出ない
3. **M-7**: 言語切替の `<select>` に `aria-label` が無く、SR で意図不明
4. **L-2**: ロゴリンクに `aria-label` が無い

**Decision:**
1. **C-4（auth-source-of-truth）と同時着手**: `lib/auth.ts` 経由でログイン状態を購読する形に変えれば `useEffect` 依存問題は自動解消
2. `learner` も含めた全 role で `/members/me` を叩いて displayName 取得（C-5 と同じ修正）
3. `<select aria-label="言語選択">` 追加
4. ロゴ `<Link aria-label="にほんごひろば トップへ">` 追加

**Target:** `frontend/src/components/layout/Header.tsx`

**Expected file(s):**
- `frontend/src/components/layout/Header.tsx`（修正）
- `frontend/src/__tests__/components/layout/Header.test.tsx`（admin / staff / learner 各 role の displayName 表示テスト追加）

**注意点:**
- **C-4 / C-5 の draft 起票後に着手**: auth.ts と /members/me が先に必要
- **a11y は eslint-plugin-jsx-a11y で機械検出可能**: 設計提案 §7 と同時着手で CI 化
- **`useEffect` 依存配列**: `location.pathname` 削除すると stale data リスクあり → SubScribe Pattern で `auth.ts` の onAuthStateChange に乗せ替え
- **i18n 化**: 言語ラベル「日本語 / 中文 / English」もハードコードならキー化（H-7 で displayName と一緒に整理）

**Status:** OPEN
