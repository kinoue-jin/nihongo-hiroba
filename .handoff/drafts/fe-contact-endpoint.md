## [OPEN] 2026-05-08: Contact エンドポイントの存否決定（C-10 / M-9）
**Severity:** 🔴 Critical（ユーザー導線が壊れている）
**Source:** FE レビュー (Cowork 2026-05-08) §C-10, §M-9
**Task type:** mixed
**Review required:** yes
**Pre-implementation review:** yes
**Recommended model:** Sonnet
**Estimated tokens:** ~20K-30K

**Context:**
`Contact.tsx` は `fastapi.post('/contact')` を叩いているが、CLAUDE.md の Agent B のルーター一覧に `/contact` は存在しない。常に 404 になり「送信に失敗しました」が表示される。MSW handlers.ts にも `/contact` モックが無いため開発環境でも通らない（M-9）。

**Decision:**
以下 3 案から方針決定後に実装:

**案 A**: バックエンドに `routers/contact.py` を新設（推奨）
- `POST /api/contact` (rate limit: 5 件/時間/IP)
- メール送信は SendGrid / Resend / Cloudflare Workers Email Routing 等
- 送信先は `members.email` の admin_role=true ユーザー全員 or 専用問い合わせ box

**案 B**: フロントを `mailto:` リンクに置き換え
- 認証不要 / バックエンド改修不要
- メールクライアント環境がない訪問者には不便

**案 C**: 外部サービス (Formspree / Resend Forms 等) に委譲
- 設定楽だが運用コストが乗る

優先順位は A > B > C。Phase 1 完了直後の今は **案 A を推奨**（既存 `python-magic` / Cloudflare R2 連携と同じ運用に乗せやすい）。

**Target:**
- BE: `backend/app/routers/contact.py`（新規、案 A の場合）
- FE: `Contact.tsx`（エラーハンドリング改善）
- FE モック: `mocks/handlers.ts` に `POST /contact` の 200 レスポンスを追加

**Expected file(s):**
- `backend/app/routers/contact.py`（案 A: 新規）
- `backend/app/main.py`（router 登録）
- `backend/tests/test_routers/test_contact.py`（新規）
- `frontend/src/pages/public/Contact.tsx`（エラーメッセージ改善）
- `frontend/src/mocks/handlers.ts`（モック追加）

**注意点:**
- **メール送信プロバイダ選択は別 ADR 起票**: 一旦コードはプロバイダ抽象化レベルで書き、provider 実装を Phase 2 に延期する手もある
- **Rate limit / spam 対策必須**: SlowAPI で IP 単位 5/時 + reCAPTCHA は将来対応
- **bleach サニタイズ必須**: message フィールドを bleach.clean (CLAUDE.md §2)
- **ICU MessageFormat**: エラーメッセージ「{count} 件の入力エラー」等の i18n 化
- **本番テスト**: SendGrid 等への送信は staging で必ず動作確認
- **個人情報の扱い**: 送信内容のログ保存は GDPR / 個人情報保護法を考慮（保存しない or 自動削除）

**Status:** OPEN
