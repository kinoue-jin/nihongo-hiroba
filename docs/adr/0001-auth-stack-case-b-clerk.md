# ADR-0001: 認証スタック — Clerk 移行（Case B）採用

**Status:** Accepted
**Date:** 2026-05-08
**Deciders:** 仁 (PO)
**Related:** `docs/p2-neon-migration.md` §2.4 / Phase 2-D / `.handoff/CURRENT.md`
**Supersedes:** （なし — 初版）

---

## Context

にほんごひろばは Phase 1 で **Supabase Auth + supabase-py** で認証層を実装済み（HS256 JWT、`@supabase/supabase-js` での frontend ログイン、`services/invitation.py` での招待フロー）。Phase 2 で **Supabase → Neon 移行**を進めるにあたり、認証スタックを移行するか継続するかの判断が必要になった（移行計画書 §2.4 で 2 案を比較）。

### 現状の数値（2026-05-08 Cowork 実態調査 + PO 自己申告）

**コードベース実測（Cowork bash で grep / count 取得）:**

| 観点 | 値 |
|---|---|
| backend `supabase-py` 利用ファイル | 6（`auth.py` / `sessions.py` / `media.py` / `members.py` 等） |
| backend `.from_()` 直叩き総数 | **103 件**（計画書 §1.4 想定の 67 件を上回る） |
| frontend `supabase.from(...)` 直叩き | **10 件**（Top / News* / EventDetail / About / LearningRecords / PairingManager） |
| frontend `supabase.auth.*` 利用 | **6 箇所**（apiClient / Header / AdminLayout / Login / LearnerMyPage） |
| 既存 RLS ポリシー | **41 件**（`supabase/migrations/003_rls_policies.sql`） |
| 既存テスト | **282 関数**（うち `services/invitation.py` の race condition test = `test_invite_learner_cleans_up_existing_user` 含む） |

**運用規模（PO 自己申告 small scale、2026-05-08 Cowork セッション）:**

| 観点 | 値 | 影響 |
|---|---|---|
| メンバー（admin / staff / volunteer） | **10 名以下** | 再招待は 1 日で完結、顧客サポート体制不要 |
| 学習者（招待済み + active） | **20 名以下** | 同上、合計 30 通以下のメール送信で済む |
| DB 容量 | small（< 1GB 想定） | Phase 2-A メンテ時間 30 分で十分 |
| Storage バケット容量 | small（< 10GB 想定） | Phase 2-C は **rclone 一発カットオーバー**（段階運用スキップ可） |
| 月次 MAU | small（< 50K 確実） | Clerk **Hobby 永続**で課金不要 |
| **Phase 2 全体 token 見積もり** | **下限値 290K 寄り** | 計画書 §5.1 の Case B レンジ（290K-460K）の下限側 |

### 後続プロジェクトの実例

- フトコロ（Futokoro）: Clerk + Neon + R2 + SQLAlchemy で再構築済み（`_shared-knowledge/futokoro-handoff.md`）
- golf-compe: 同上（`_shared-knowledge/golf-compe-handoff.md`）

### PO（仁さん）の判断材料への追加質問への回答（2026-05-08 セッション）

- **多言語ログイン UI 優先度**: **高** — Clerk Localization で ja / zh / en を default 提供できる利点を重視
- 既存ユーザー数 / Storage データ量 / DB 容量 / 月次 MAU 見込み は §6.1 実態調査の続きで PO 側で計測予定（`cowork-to-claude-code.md` に [OPEN] 起票）

---

## Decision

**Case B: Clerk への完全移行を採用**する。Phase 2-D で実施。

具体的には以下を採用:

- **認証 SDK**: backend `clerk-backend-api` (Python) / frontend `@clerk/clerk-react`
- **JWT アルゴリズム**: RS256（Clerk の JWKS を `python-jose` で公開鍵キャッシュ検証）
- **招待フロー**: Clerk `invitations.create_invitation()` API + 既存メンバー / 学習者の再招待スクリプト
- **多言語 UI**: Clerk Localization で ja / zh / en を default で提供
- **Webhook 署名検証**: `svix` ライブラリ（フトコロ §10 採用パターン）
- **既存ユーザー移行**: パスワードハッシュは移管不可のため、全員に再招待メール送付（Phase 2-D で実施）

---

## Options Considered

### Option A: Supabase Auth 継続

| Dimension | Assessment |
|---|---|
| Complexity | Low（既存実装そのまま） |
| Cost | Supabase Free 50K MAU、超過後 Pro $25/月（DB 含む） |
| Scalability | 50K MAU まで無料、超過時に DB と一緒に課金される |
| Team familiarity | High（Phase 1 で実装済み） |
| 多言語ログイン UI | ❌ 自前実装必要（zh / en は別途開発） |
| 後続プロジェクトとの一貫性 | ❌ にほんごひろばのみが Supabase Auth 残存 |

**Pros:**
- Phase 2-D の移行コストが**ゼロ**になる（Phase 2-A〜2-C のみで Phase 2 完了）
- 既存ユーザーの再招待が不要
- `services/invitation.py` の race condition 対策（`test_invite_learner_cleans_up_existing_user`）も流用可能

**Cons:**
- 多言語ログイン UI を自前実装する継続コスト
- フトコロ・golf-compe と異なるスタックとなり、`_shared-knowledge` での横断ナレッジ共有が一部分断
- Supabase の Auth 機能が将来 deprecated や仕様変更されたとき、にほんごひろばだけ独自対応が必要
- Phase 1 既存実装には auth と DB 層の疎結合が一部不徹底（routers から `supabase.auth.sign_in_with_password` 直接呼び）

### Option B: Clerk 移行（**選択**）

| Dimension | Assessment |
|---|---|
| Complexity | High（Phase 2-D で認証層全置き換え + 既存ユーザー再招待） |
| Cost | Hobby プラン 50K MAU 無料、超過後 $25 / 1K MAU |
| Scalability | 50K MAU まで無料、Hobby → Pro へのアップグレードが滑らか |
| Team familiarity | Medium（フトコロ・golf-compe で実績あり、shared-knowledge 参照可能） |
| 多言語ログイン UI | ✅ Clerk Localization で ja / zh / en 標準対応 |
| 後続プロジェクトとの一貫性 | ✅ 高（フトコロ・golf-compe と同じスタック） |

**Pros:**
- 多言語ログイン UI を**実装ゼロ**で提供（PO の優先度判断「高」と整合）
- フトコロ・golf-compe で実証済みのパターンを `_shared-knowledge/futokoro-handoff.md §10` から流用できる
- パスワードリセット / メール認証 / SSO 等の標準機能を Clerk が提供（自前実装の継続コストを回避）
- JWT を RS256 化することで、**シークレット共有が不要** になり Vercel / Railway / 開発環境の secret 管理が単純化
- Webhook 署名検証 (`svix`) のベストプラクティスを継承

**Cons:**
- 既存ユーザー（招待済み learner / member）の **再招待が必須**（パスワードハッシュ移管不可）
- 認証層全置き換えのため Phase 2-D は最大規模（estimated 100K-160K tokens、計画書 §5.1）
- frontend `supabase.auth.*` 6 箇所 + backend auth.py / dependencies.py / invitation.py すべてを書き換え
- Clerk のサービス障害が直接影響する（依存先増加）

---

## Trade-off Analysis

主要トレードオフ:

1. **「短期コスト」 vs 「長期保守性」**
   - Case A: Phase 2 完了が**早い**（2-D スキップ可能）が、長期保守で個別対応が継続発生
   - Case B: Phase 2 完了が**遅い**（2-D に最大ボリュームが乗る）が、長期では shared-knowledge / 後続プロジェクトと同じスタックで保守性が高い
2. **「既存ユーザー体験」 vs 「機能完成度」**
   - Case A: 既存ユーザーは何もしなくて良い
   - Case B: 全員に再招待メールが届く（混乱要因だが、Clerk 標準 UI が日本語対応しているのでサポートコストは限定的）
3. **「多言語 UI」**
   - Case A: 自前実装（中国語学習者向けサービスの中国語ログイン UI が後回しになる）
   - Case B: Clerk Localization で即時対応（**PO の最重視ポイント**）

→ **多言語 UI 即時対応の必要性 + 後続プロジェクトとの一貫性** が決定打となり Case B を採用。

---

## Consequences

### 容易になること

- **多言語ログイン UI**: zh / en を Phase 2-D 完了と同時に有効化（実装コストゼロ）
- **`_shared-knowledge` 横断ナレッジ活用**: フトコロ・golf-compe の Clerk 実装パターン (`futokoro-handoff.md §10` 等) をほぼコピペで適用
- **secret 管理単純化**: HS256 共有秘密 (`JWT_SECRET`) を撤廃し RS256 公開鍵キャッシュへ
- **将来の SSO / Passkey 等の認証方式追加**: Clerk が提供する追加機能を有効化するだけ

### 困難になること

- **Phase 2-D の規模感**: 計画書 §5.1 で Case B 全体 290K-460K tokens の見積もり、内 Phase 2-D だけで 100K-160K tokens
- **既存ユーザーへの再招待コミュニケーション**: 仁さん側で「Clerk 移行のため再ログインが必要」というアナウンスが必要（メール / お知らせバナー等）
- **Clerk Webhook の signature 検証実装**: `svix` を新規導入し、フトコロ実例を参照して安全に実装する必要
- **Clerk service 障害への対応**: 依存先が増えるため、Clerk のステータスを監視する手順が必要（incident-response runbook 候補）

### 後で見直すべきこと

- **MAU が 50K を超えた場合のコスト見直し** — Hobby プラン超過時に Pro へのアップグレード判断（年次レビュー）
- **多言語コンテンツの拡張**（ベトナム語 / フィリピン語等）— Clerk が対応しているか年次確認
- **`services/invitation.py` race condition 対策**（`cleans_up_existing_user`）の Clerk 版同等処置 — Phase 2-D 実装時に検証

---

## Action Items

### 優先（Phase 2-A 着手前）

1. [ ] **§6.1 開始前実態調査の残項目を PO が計測**（`cowork-to-claude-code.md` の [OPEN] 参照）
   - Storage データ量（`media-public` / `media-private`）
   - DB 容量（`pg_database_size`）
   - 既存ユーザー数（`SELECT count(*) FROM members WHERE is_active = TRUE` / `learners WHERE invitation_status IN ('invited','active')`）
   - 月次 MAU 見込み（過去 30 日 active user 数）
2. [ ] **Clerk アカウント準備**（計画書 §6.3）
   - アプリ作成（development / production の 2 環境）
   - Localization 有効化（ja / zh / en）
   - JWT 公開鍵 URL（JWKS）取得
   - Webhook シークレット取得
3. [ ] **Phase 2-A の [OPEN] 起票**（SQLAlchemy + asyncpg 導入、認証は Phase 2-A 段階では Supabase Auth のまま）

### Phase 2-D 着手時

4. [ ] **既存ユーザー再招待スクリプト実装**（フトコロ §10 パターンを参照）
5. [ ] **`@clerk/clerk-react` 導入** + frontend `supabase.auth.*` 6 箇所書き換え
6. [ ] **`clerk-backend-api` 導入** + backend `routers/auth.py` / `services/invitation.py` 書き換え
7. [ ] **`svix` Webhook 検証** + Clerk → DB 同期実装
8. [ ] **JWT 検証ロジック書き換え**（HS256 → RS256 + JWKS キャッシュ）
9. [ ] **既存ユーザーへのアナウンス**（仁さん側、再招待メール送付前にコミュニケーション）
10. [ ] **`JWT_SECRET` を全環境から削除**（Vercel / Railway / `.env.local`）

### Phase 2 完了後

11. [ ] **Clerk MAU / コスト監視ダッシュボード**を設定（年次レビュー基準）
12. [ ] **`_shared-knowledge/knowledge-base-nihongo-hiroba.md`** に Phase 2-D の教訓を §X として追記

---

## Notes

- 本 ADR は **Case A / B の両論併記を残した移行計画書 (`docs/p2-neon-migration.md` §2.4)** を上書きしない。計画書は両論併記のままにし、本 ADR で「2026-05-08 時点で Case B を採用」を明示記録する。
- 将来 Case B が機能不足等で見直しになる場合は、新 ADR（例: `0002-revisit-auth-stack.md`）を起票して `Status: Superseded` に変更する。
- 関連 [OPEN]: `cowork-to-claude-code.md` の §6.1 PO データ計測依頼（次セッションで起票予定）
