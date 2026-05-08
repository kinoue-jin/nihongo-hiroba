## [OPEN] 2026-05-08: i18n 完全化・言語永続化・モック多言語クリーン（M-5 / M-6 / M-8 / L-6）
**Severity:** 🟡 Medium（多言語サイトとして致命的）
**Source:** FE レビュー (Cowork 2026-05-08) §M-5, §M-6, §M-8, §L-6
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Sonnet
**Estimated tokens:** ~30K-50K

**Context:**

1. **M-5**: `events.title` 等のキーはあるが、`'活動内容'`, `'場所'`, `'時間'`, `'登録メンバー'`, `'自動ペアリング生成'` 等のハードコード日本語が公開ページ全体に散在。多言語切替が機能していない箇所多数
2. **M-6**: `i18n/index.ts` の `lng: 'ja'` 固定。`i18next-browser-languagedetector` を使うか localStorage 永続化を入れないと、リロードで日本語に戻る
3. **M-8**: `mocks/handlers.ts` の `mockSessions[1].venue: '图书馆'`、`mockEvents[1].venue: '图书馆'` 等の中国語簡体字混入（C-6 の韓国語混入と同根の事故）
4. **L-6**: `EventCalendar.tsx` の凡例ラベル `'イベント'`, `'学習セッション'` がハードコード

**Decision:**
1. **CI に grep ベースのリンタ追加**: i18n.md ルール通り `grep -rn ">[^<]*[ぁ-ん]" frontend/src/routes/` を `npm run lint:i18n` として登録、件数 0 を CI 完了条件
2. **既存ハードコードを全 t() 化**: `npm run lint:i18n` を実行 → 件数を数える → 各キーを `ja.ts` / `zh.ts` / `en.ts` の 3 ファイルに同時追加
3. **`i18next-browser-languagedetector`** または localStorage 永続化を導入。優先順: localStorage → ブラウザ言語 → ja
4. **モック clean**: `mocks/handlers.ts` から簡体字 / 韓国語 / 英語混入を全削除し、日本語 / 中国語 / 英語の 3 ロケール mock を分離

**Target:**
- `frontend/src/i18n/index.ts`（言語検出 / 永続化）
- `frontend/src/i18n/{ja,zh,en}.ts`（キー追加）
- `frontend/src/pages/**/*.tsx`（ハードコード文字列を全 t() 化）
- `frontend/src/mocks/handlers.ts`（多言語混入クリーン）
- `frontend/package.json`（`lint:i18n` script 追加）
- `.github/workflows/*.yml` または CI（lint:i18n を必須化）

**Expected file(s):**
- 上記すべて
- `scripts/lint-i18n.sh` または `scripts/lint-i18n.ts`（grep ラッパ）

**注意点:**
- **影響範囲が広い**: 30+ ファイルに及ぶため段階的に。Phase A: lint:i18n 導入と仮許容リスト → Phase B: ページごとに撲滅 → Phase C: CI 必須化
- **C-6（Top.tsx 韓国語混入）と統合**: Top.tsx 修正のついでに全ページの i18n 化
- **i18n キー命名規則**: `{screen}.{section}.{item}` 形式（例: `dashboard.header.welcome`）。CLAUDE.md 既存指示書に準拠
- **翻訳未確定キー**: 仮訳でもよいが**空文字列禁止**（i18n.md ルール）
- **動的引数**: `{count} 件` 等は ICU MessageFormat を検討
- **複数キーの DRY**: 「主催者」「会場」等は `common.label.host`, `common.label.venue` で共通化
- **テスト**: i18n キー漏れチェックを E2E テストに追加（言語切替後にキー文字列がそのまま画面に出ていないこと）

**Status:** OPEN
