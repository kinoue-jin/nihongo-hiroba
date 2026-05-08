## [OPEN] 2026-05-08: AdminLayout のモバイルメニュー / 高さ計算 / 固定配置を修正（H-1 / H-2 / H-3 / L-9 / M-15）
**Severity:** 🟠 High（モバイル UX が壊れている）
**Source:** FE レビュー (Cowork 2026-05-08) §H-1, §H-2, §H-3, §L-9, §M-15
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Sonnet
**Estimated tokens:** ~15K-25K

**Context:**
`AdminLayout.tsx` には以下の複合バグがある:

1. **H-1**: `const [, setIsMobileMenuOpen] = useState(false)` で getter を捨てているため、`{isMobileMenuOpen && (...)}` の条件レンダが効かず、**モバイル幅では常時オーバーレイが出る**
2. **H-2**: `h-calc(100vh-120px)` は無効な Tailwind class（角括弧抜け）。正しくは `h-[calc(100vh-120px)]`。現状ナビが画面外に切れる
3. **H-3**: Sidebar の logout / 公開サイトボタンが `absolute bottom-0` だが親 `aside` に `relative` がない → 最近接 relative（`<html>`）基準で配置され、複数画面で位置崩壊
4. **L-9**: モバイルメニューを開いたまま画面回転すると md ブレークポイントを跨いでも閉じない
5. **M-15**: `LearnerMyPage.tsx` が独自 `<header>` を置いており、`router.tsx` の root `<Header />` と二重表示

**Decision:**
1. `useState<boolean>(false)` を `[isMobileMenuOpen, setIsMobileMenuOpen]` に修正、`{isMobileMenuOpen && ...}` で条件レンダ
2. `h-[calc(100vh-120px)]` に修正。可能なら flex layout に置き換えて magic number 撤廃
3. `aside` に `relative` 追加、もしくは `flex flex-col h-full` + `mt-auto` で bottom 押し下げ（後者推奨）
4. `useEffect(() => { setIsMobileMenuOpen(false) }, [matchMedia('(min-width: 768px)').matches])` で auto-close
5. `LearnerMyPage.tsx` から独自 header を削除し、root layout の `<Header />` のみに統一

**Target:**
- `frontend/src/components/admin/AdminLayout.tsx`
- `frontend/src/pages/auth/LearnerMyPage.tsx`

**Expected file(s):**
- `frontend/src/components/admin/AdminLayout.tsx`（修正、~150-200 行想定）
- `frontend/src/pages/auth/LearnerMyPage.tsx`（独自 header 削除）
- `frontend/src/__tests__/components/admin/AdminLayout.test.tsx`（モバイル / デスクトップ / 回転時の挙動テスト追加）

**注意点:**
- **`<important>`**: `AdminLayout.tsx` は CLAUDE.md `<important>` 指定対象（共通基盤）。Plan review 推奨に格上げしても良い
- **既存 admin 全 13 ページ** に影響するため、layout 変更後は Visual Regression Test（Playwright `toHaveScreenshot`）推奨
- **flex layout 移行で一気に H-2 / H-3 解消**: `h-screen flex flex-col` + content `flex-1` + bottom buttons `mt-auto` パターン
- **`matchMedia` の SSR 対応**: Vite SSR は使っていないので問題なしだが、`window` undefined チェックは念のため
- **L-9 関連**: `useEffect` の依存配列に `matchMedia` 結果を直接入れると stale closure になる。`addEventListener('change', ...)` で listener 経由が正解

**Status:** OPEN
