## [OPEN] 2026-05-08: Top.tsx 本文に混入した韓国語を修正＋i18n 経由化（C-6）
**Severity:** 🔴 Critical（**最優先**：本番に既に出ている可能性）
**Source:** FE レビュー (Cowork 2026-05-08) §C-6
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~3K-5K

**Context:**
`Top.tsx` のヒーロー文に LLM 機械翻訳の事故跡が残っている:

```tsx
にほんごひろばは、日本語学習者と日本人メンバーが 함께学ぶ交流の場です。
 다양한イベントを通じて、異文化間の理解を深めましょう。
```

「함께」「다양한」は韓国語のハングル。日本語サイトの hero に出ているとブランド毀損リスクが大きいので**最優先**で修正。

**Decision:**
1. **即時修正**: 該当文を正しい日本語にする（推奨案: 「にほんごひろばは、日本語学習者と日本人メンバーが共に学ぶ交流の場です。多様なイベントを通じて、異文化間の理解を深めましょう。」）
2. **同時に i18n 化**: ハードコード文字列をやめ、`t('top.hero.tagline')` を `i18n/ja.ts` / `zh.ts` / `en.ts` に追加
3. **再発防止**: M-5（i18n 完全化）の draft で grep ベースのリンタを CI に組み込み、`tsx` 内の漢字 / ハングル / 簡体字を検出させる

**Target:** `frontend/src/pages/public/Top.tsx` のヒーロー文セクション

**Expected file(s):**
- `frontend/src/pages/public/Top.tsx`（修正）
- `frontend/src/i18n/ja.ts`, `zh.ts`, `en.ts`（キー追加: `top.hero.tagline` 等）

**注意点:**
- **本番影響を即チェック**: 既に Vercel デプロイ済みなら hotfix で先に当てる
- ja.ts に追加した日本語確定文を中国語簡体字 / 英語に正しく翻訳する。仮訳でもよいが**空文字列は禁止**（i18n.md ルール）
- 同種の漢字 / 韓国語 / 中国語簡体字混入が他のページにもないか grep で全検出: `grep -rn "[가-힣]" frontend/src/`（ハングル）/ `grep -rn "[一-鿿]" frontend/src/`（漢字 / 簡体字 — 日本語と区別が難しいので人手確認）
- 関連: M-8（mocks/handlers.ts に `图书馆` 等の中国語簡体字混入）も同タイミングで修正候補

**Status:** OPEN
