## [OPEN] 2026-05-08: Footer のブランド名確認と動的年表示（M-16 / L-3）
**Severity:** 🟡 Medium / 🟢 Low
**Source:** FE レビュー (Cowork 2026-05-08) §M-16, §L-3
**Task type:** code
**Review required:** partial
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~3K-5K

**Context:**

1. **M-16**: `Footer.tsx` の copyright が「株式会社Hanawa」固定。CLAUDE.md には運営主体が明記されていない → クライアント確認の上で決定が必要
2. **L-3**: `© 2026` ハードコード → 年が変わったら毎回コード修正することになる。`new Date().getFullYear()` で動的生成すべき

**Decision:**
1. **M-16**: PO（仁さん）に運営主体を確認し、`i18n/{ja,zh,en}.ts` の `footer.copyright.holder` キーで管理。"株式会社Hanawa" / "にほんごひろば" / 任意の運営団体名のいずれか
2. **L-3**: `© {new Date().getFullYear()} {t('footer.copyright.holder')}` に変更

**Target:** `frontend/src/components/layout/Footer.tsx`

**Expected file(s):**
- `frontend/src/components/layout/Footer.tsx`（修正）
- `frontend/src/i18n/{ja,zh,en}.ts`（`footer.copyright.holder` キー追加）

**注意点:**
- **PO 確認後に commit**: 運営主体名はクライアント確定事項。仮実装で commit しないこと
- **i18n 化**: 言語ごとに「株式会社」「Co., Ltd.」「公司」等の表記が異なる。i18n キーで全文を分けるか、`{holder}` だけ可変にするか方針確定
- **ICU MessageFormat**: `© {year} {holder}` 形式の文字列はそのまま i18n に置けば変数置換が効く

**Status:** OPEN
