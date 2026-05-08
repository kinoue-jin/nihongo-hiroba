# Phase 2: Supabase → Neon 移行計画

> **ステータス:** ドラフト（PO レビュー待ち）
> **作成:** 2026-05-08（Claude Code、handoff 起点 [OPEN] 2026-05-08）
> **対象リポジトリ:** `~/Projects/nihongo-hiroba`
> **前提:** Phase 1（Supabase 構成）の実装は完了済み。本計画は **コード変更を一切伴わない調査・計画フェーズ** の成果物であり、本ドキュメント承認後に Phase 2-A 以降の実装 [OPEN] を別途起票する。

---

## エグゼクティブサマリー

にほんごひろばは Phase 1 で **Supabase（PostgreSQL + RLS + Storage + Auth）+ supabase-py** で実装された。同じ React + FastAPI スタックを後続プロジェクト（フトコロ・golf-compe）が **Neon + SQLAlchemy 2.0 async + asyncpg + Clerk + Cloudflare R2** で再構築し、Phase 1 で踏んだ罠（supabase-py バージョン固定 / RLS 循環参照 / モックテスト限界）を回避できている。

本計画は、後続プロジェクトで実証済みのスタックパターンへ Phase 1 実装を移植する手順を示す。**5 つのサブフェーズ（2-A〜2-E）に分割**し、各フェーズが独立して rollback 可能となるよう設計する。**認証スタック（Clerk vs Supabase Auth 継続）の最終決定は PO 判断**として §2.4 に比較表を提示する。

| 指標 | 値 |
|---|---|
| 既存テーブル数 | 19 |
| 既存 RLS ポリシー数 | 41 |
| `supabase.from_()` 直接呼び出し（backend） | 67 箇所 / 10 routers |
| 既存テスト関数 | 282 関数 / 33 ファイル |
| 推定総工数（5 フェーズ合計） | 250K〜400K tokens（model 混在） |
| 推定実装期間 | Cowork 並走で 2〜3 セッション（仁さん側）+ Claude Code 実装複数 [OPEN] |

---

## 1. 現状把握（Phase 1 実装の棚卸し）

### 1.1 backend 側の Supabase 依存

#### バージョン
- `supabase-py` **2.7.4**（`==` 固定、§1 の罠ゆえ）
- `storage3` **0.7.7**

#### 環境変数
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` / `JWT_SECRET`
- `dependencies.py` (行 9–14) で読み込み

#### Supabase Auth 利用
- **ログイン**: `routers/auth.py` 行 72–96 で `auth.sign_in_with_password()`
- **招待フロー**: `services/invitation.py`
  - `auth.admin.invite_user_by_email()`（行 51, 120）
  - `auth.admin.delete_user()`（行 84、再招待 race condition 対策で先に削除）
- **JWT 検証**: `dependencies.py` 行 33–57、`jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")` で **独自実装**（Supabase JWKS は使っていない、HS256 + 共有秘密）
- **Auth Webhook**: 連携なし（`routers/auth.py` は webhook ではなくカスタム JWT 受け）

#### Supabase Storage 利用
- `services/storage.py`
  - 2 バケット: `media-public`（`is_public=True`）と `media-private`
  - 公開 URL: `storage.from_(bucket).get_public_url()`（行 187）
  - 署名付き URL: `storage.from_(PRIVATE_BUCKET).create_signed_url(expires_in=3600)`（行 133）
  - バケット間移動: `move_between_buckets()`（行 162–168、`is_public` 切替時）

#### Supabase REST 直叩き（`.from_().select/insert/...`）
**67 箇所 / 10 routers**：
| Router | 呼び出し数 | 主な用途 |
|---|---:|---|
| `admin.py` | 12 | ユーザー権限変更 |
| `sessions.py` | 10 | セッション・ペアリング |
| `learners.py` | 8 | 学習者一覧・詳細 |
| `members.py` | 7 | メンバー CRUD |
| `media.py` | 7 | メディアメタデータ |
| `events.py` | 5 | イベント |
| `master.py` | 5 | マスタ |
| `news.py` | 5 | ニュース |
| `stats.py` | 5 | 統計 |
| `auth.py` | 3 | members/learners 検索 |

> CLAUDE.md には「`supabase.from()` は使わない、全て FastAPI 経由」と記載があるが、これは **frontend 規約**。backend では `supabase-py` 経由で PostgREST を叩く実装となっており、ここを SQLAlchemy 2.0 async ORM に置き換えるのが Phase 2-A の主作業。

### 1.2 frontend 側の Supabase 依存

- `@supabase/supabase-js` **2.39.0**
- `src/lib/apiClient.ts` 行 10: `supabase.auth.getSession()` でセッション取得 → access_token を Bearer ヘッダに付与
- セッション監視: `supabase.auth.onAuthStateChange()`（CLAUDE.md 記載、要 grep 再確認）
- MSW モック対象（`src/mocks/handlers.ts`）:
  - PostgREST 直叩き: `*/rest/v1/news`, `/events`, `/schedule_sessions`, `/stats`, `/hometown_stories`, `/cultural_lectures`, `/members`, `/public_members`, `/learners`, `/public_learners`
  - FastAPI: `*/auth/login`, `/invite-learner`, `/generate-pairings`, `/media/upload`
- 環境変数: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_API_URL`, `VITE_USE_MOCK`

> **⚠ 整合性の問題（Phase 2-A 着手前に必須調査）:** MSW が `rest/v1/*` を mock している事実は、frontend のどこかが PostgREST を直接叩いているか、過去の実装の名残のいずれか。Phase 2-A 着手前に以下を **必ず** 実行し、結果を §6 チェックリストにフィードバックする:
>
> ```bash
> grep -rn "supabase\.from\|supabase\.rest\|supabase\.rpc" frontend/src/
> grep -rn "/rest/v1" frontend/src/ | grep -v mocks
> ```
>
> **発見された場合:** Phase 2-A の依存タスクとして、それらを `fastapi.get()` / `fastapi.post()` に置換する作業を含める（追加 +20K tokens 程度の見込み）。**発見されなかった場合:** MSW モックは legacy として記録、Phase 2-B で削除候補。**この実態調査が完了するまで Phase 2-A の [OPEN] は起票しない**。

### 1.3 supabase/migrations/

| ファイル | 内容 |
|---|---|
| `001_create_tables.sql` | 19 テーブル（master_items, media, members, member_class_types, learners, learner_class_types, news, events, schedule_sessions, stats, hometown_stories, cultural_lectures, media_attachments, member_participations, learner_participations, learning_records, member_session_registrations, learner_session_registrations, session_pairings） |
| `002_create_indexes.sql` | 20 インデックス |
| `003_rls_policies.sql` | 41 ポリシー + `public_members` / `public_learners` ビュー（PII 隔離） |
| `004_seed_master_items.sql` | 27 件のマスタデータ（news_category 4 / event_type 7 / cancel_case 5 / member_role 4 / media_role 3 / class_type 3 + 1） |

#### Supabase 固有機能の利用箇所
- `auth.uid()`：33 箇所（`supabase_user_id = auth.uid()` 比較）
- `auth.jwt()->'app_metadata'->>'role'`：33 箇所（role 判定）
- `ENABLE ROW LEVEL SECURITY`：全テーブル
- `authenticator` ロールへの GRANT
- `gen_random_uuid()`：標準 PostgreSQL（移行容易、`pgcrypto` 拡張）
- `public_members` / `public_learners` VIEW：PII 隔離パターン

### 1.4 統計

| 指標 | 値 |
|---|---:|
| `backend/app/` Python ファイル数 | 36 |
| `backend/app/` 総行数 | 3,942 |
| `frontend/src/` TS/TSX ファイル数 | 71 |
| `frontend/src/` 総行数 | 8,718 |
| `backend/tests/` ファイル数 | 33 |
| `backend/tests/` テスト関数数（`def test_`） | 282 |

---

## 2. 移行先スタック決定

### 2.1 DB: Neon PostgreSQL（確定）

| 項目 | 値 |
|---|---|
| プロバイダ | Neon（PostgreSQL 17） |
| リージョン | シンガポール（フトコロ・golf-compe と同一、レイテンシ低減） |
| プラン | Free（複数プロジェクト対応、3 GB / branch・branching 機能） |
| 接続 | `postgresql+asyncpg://...?sslmode=require` |
| ORM | SQLAlchemy 2.0 async + asyncpg |
| マイグレーション | Alembic（フトコロ・golf-compe で実証済み）または素の SQL（既存 `supabase/migrations/` を `db/schema.sql` に統合） |

**根拠:** 後続 2 プロジェクトが Free 枠で MVP 〜本番運用できているため、にほんごひろばの規模（19 テーブル）でも問題なし。Branching 機能で PR ごとの review DB を作れる。

### 2.2 ORM / DB アクセス: SQLAlchemy 2.0 async + asyncpg（確定）

- すべての `supabase.from_(...)` 呼び出しを **declarative model + async session** に置換
- パターン: フトコロ `backend/app/models/` + `backend/app/database.py` を踏襲
- マイグレーション戦略: 既存 SQL を再利用（後述 §3.1）

### 2.3 ストレージ: Cloudflare R2（確定）

| 項目 | 値 |
|---|---|
| プロバイダ | Cloudflare R2（S3 互換） |
| プラン | Free（10 GB / 月） |
| SDK | `boto3` + `endpoint_url` + `region_name="auto"` |
| パブリック URL | R2 Public Domain（`pub-xxx.r2.dev`） |
| プライベート URL | 署名付き URL（boto3 `generate_presigned_url`、TTL 1 時間） |

**根拠:** 既存 `services/storage.py` の `media-public` / `media-private` 2 バケット構成を **1 バケット + キープレフィックス**（`public/<id>` / `private/<id>`）に集約することで、`is_public` 切替時のコピーが軽くなる。boto3 は同期 API のため、**`asyncio.to_thread()` ラップ必須**（フトコロ §10 / golf-compe で実証済み）。

### 2.4 認証: Clerk vs Supabase Auth 継続（**PO 判断**）

| 観点 | Clerk 移行（フトコロ・golf-compe 採用） | Supabase Auth 継続 |
|---|---|---|
| 既存実装の流用 | ❌ 認証層を全置き換え（routers/auth.py + services/invitation.py + dependencies.py の JWT 検証ロジック） | ✅ 既存 HS256 検証ロジックそのまま、JWT_SECRET も維持 |
| 招待フロー | Clerk の `invitations.create_invitation()` API（メールテンプレート Clerk 管理画面で編集可能） | 既存 `invite_user_by_email()` 維持（無料枠の制約あり、月 100 通など要確認） |
| パスワードリセット / メール認証 | Clerk 標準 UI フロー（実装ほぼ不要） | Supabase 標準 UI フロー（既存運用継続） |
| MAU 課金 | Hobby プラン 50K MAU 無料、超過後 $25/MAU 1K | Supabase Free 50K MAU、超過後 Pro $25/月（DB 含む） |
| JWT アルゴリズム | RS256（公開鍵 JWKS、`python-jose` でキャッシュ検証） | HS256（共有秘密、現状維持） |
| frontend SDK | `@clerk/clerk-react`（プリビルト UI 充実） | `@supabase/supabase-js`（カスタム UI 自前） |
| 多言語対応 | Clerk Localization（ja / zh / en 対応済み） | Supabase Auth UI 自前（現状ja のみ） |
| Webhook | `svix` で署名検証（フトコロ §10 で実装済み、新規導入の余地） | Webhook 未利用（独自実装で対応中） |
| 移行コスト | **大**（既存 ユーザーの Clerk 移行 + frontend ログイン画面置き換え + Webhook 同期実装） | **小**（移行不要、Phase 2-A〜2-E でも認証層は触らない選択肢） |
| 後続プロジェクトとの一貫性 | ✅ 高（フトコロ・golf-compe と同じスタック） | ❌ にほんごひろばだけが Supabase Auth 残存 |
| RLS 撤廃との整合性 | ◯（Clerk JWT に `role` claim を入れて FastAPI で判定、現行 `app_metadata.role` 互換） | ◯（既存 JWT 構造そのまま、Phase 2-B でアプリ層認可に統合） |

#### 推奨と PO への質問

**推奨案（Claude Code 提案）:** 段階的アプローチを採用し、Phase 2-A〜2-C は **Supabase Auth 継続** で進める。理由:
1. JWT 検証は既に独自実装（HS256）で、Supabase Auth と疎結合
2. Storage / DB / RLS の移行が完了するまで認証層は安定しているのが望ましい
3. Clerk 移行は既存ユーザーのアカウント移行（パスワードハッシュ移管不可）が大課題のため、Phase 2-D で **新規プロジェクト相当の規模感** で実施

**PO 判断項目（仁さんへの質問）:**
1. Phase 1 で発行した既存ユーザー（招待済み learner / member）の数はどの程度か？ Clerk 移行で再招待を許容できる規模か？
2. 多言語ログイン UI（中国語）の優先度は？ Clerk なら標準 UI のみで対応可、Supabase 継続だと自前実装の負担あり
3. 月次 MAU の見込みは？ 50K 以下が確実なら Clerk の方がコスト・運用ともに楽（フトコロ・golf-compe と同様）

### 2.5 ホスティング: Vercel(FE) + Railway(BE)（確定）

- 既存 backend は **Railway** にデプロイ済み（`backend/Procfile` / `nixpacks.toml` 確認済み）。継続
- 既存 frontend は **Vercel** にデプロイ済み（`frontend/vercel.json` 確認済み）。継続
- Phase 2 では `DATABASE_URL` を Supabase URL → Neon URL に切り替えるだけ（既存の Railway / Vercel 設定は流用）

---

## 3. 移行ステップ案（Phase 2-A 〜 2-E）

> **原則:** 各フェーズは **独立した [OPEN] として起票** し、それぞれが独立に rollback 可能であること。フェーズ間でテストブレイクが起こらないよう、各フェーズ完了時点で **既存テスト 282 関数が全 Green** を完了条件とする。

### Phase 2-A: SQLAlchemy + asyncpg 導入（DB アクセス層の入れ替え）

**目的:** Neon に接続し、67 箇所の `supabase.from_(...)` を SQLAlchemy 2.0 async session に置換。RLS は **まだ撤廃しない**（後段 2-B で実施）。

**作業:**
1. `backend/app/database.py` 新規作成（`create_async_engine` + `async_sessionmaker`、**接続プール設定**: `pool_size=5, max_overflow=10, pool_pre_ping=True`、フトコロ・golf-compe と同じ値）
2. `backend/app/models/` に declarative SQLAlchemy モデル 19 個を新規作成（既存 Pydantic スキーマと 1:1 対応）
3. Neon 上に既存 SQL を適用するための **互換 stub migration** を新設:
   - `supabase/migrations/000_neon_compat_stubs.sql` を新規作成（**`001` 適用前に必ず実行**）:
     ```sql
     -- Supabase 認証関数の互換 stub。Phase 2-B で削除予定
     CREATE SCHEMA IF NOT EXISTS auth;
     CREATE OR REPLACE FUNCTION auth.uid() RETURNS UUID
       LANGUAGE SQL STABLE AS $$ SELECT NULL::UUID $$;
     CREATE OR REPLACE FUNCTION auth.jwt() RETURNS JSONB
       LANGUAGE SQL STABLE AS $$ SELECT '{}'::JSONB $$;
     -- anon ロール互換（Neon にはデフォルト存在しないため）
     CREATE ROLE anon NOLOGIN;
     CREATE ROLE authenticated NOLOGIN;
     CREATE ROLE authenticator NOLOGIN;
     ```
   - 既存 `001`〜`004` はそのまま適用可能になる。stub が `NULL` を返すため RLS は **anon 全件不可視 = 実質無効化** の挙動になり、Phase 2-A 時点では **FastAPI 認可（既存 dependencies.py の HS256 検証）が唯一の認可レイヤー** になる
4. `routers/` 10 ファイルの `.from_()` 呼び出し 67 箇所を SQLAlchemy session 経由に置換
5. `dependencies.py` で `get_db()` async dependency を導入（`AsyncSession` を yield）
6. `services/storage.py` は **2-C** で別途置換するため、本フェーズでは触らない
7. `services/invitation.py` の Supabase Auth Admin API は **2-D** で別途置換するため、本フェーズでは触らない（Supabase Auth 継続のまま、DB 接続だけ Neon に切り替え）
8. `requirements.txt` から `supabase`, `storage3` を **削除しない**（Storage / Auth で残存利用中）。`sqlalchemy[asyncio]` + `asyncpg` を追加
9. `python-magic` の Railway nixpacks 設定（`backend/nixpacks.toml`）は **そのまま維持**（§3 の罠の対策、Neon 移行とは独立）
10. **Neon 拡張機能の有効化**:
    - `CREATE EXTENSION IF NOT EXISTS pgcrypto;`（既存 DDL の `gen_random_uuid()` で必須）を `000_neon_compat_stubs.sql` 冒頭に追加

> **⚠ Phase 2-A 終了時点の認可状態（重要）:**
> - stub `auth.uid() → NULL` のため、既存 41 ポリシーは全て **常に FALSE 判定** になる
> - 例: `learner_self_read USING (supabase_user_id = auth.uid())` → `supabase_user_id = NULL` は常に NULL（FALSE 扱い）
> - これは learner が **自分のレコードすら DB レベルでは読めない** ことを意味する
> - **しかし FastAPI のエンドポイントは Supabase Anon Key ではなく `service_role` 相当（または既存独自 JWT）で接続するため、RLS bypass で問題なく動作する**
> - **Phase 2-A 期間中は FastAPI 認可（HS256 JWT 検証 + 既存ロジック）が唯一のゲートキーパー** になる、この前提で動作確認すること
> - frontend が直接 Neon に PostgREST で叩いている場合（§1.2 で要調査）は **Phase 2-A で必ず破綻する** ため、Phase 2-A 着手前に frontend 直叩きを根絶する依存タスクが必要

**完了条件:**
- `pytest backend/tests/` 282 関数 Green（**実 Neon 接続**、`tests/test_integration/` 新設または既存 `tests/` の DB 部分を実 Neon に切替）
- Neon PostgreSQL 17 で既存 41 ポリシー適用後、`SELECT count(*) FROM pg_policies` が 41 を返すことを確認（DDL 互換性検証）
- `pgcrypto` 拡張が有効: `SELECT extname FROM pg_extension WHERE extname='pgcrypto'` が 1 行返す
- `gen_random_uuid()` 動作確認: `SELECT gen_random_uuid()` が UUID を返す
- `anon` / `authenticated` / `authenticator` ロールが存在: `SELECT rolname FROM pg_roles WHERE rolname IN (...)` が 3 行返す
- `test_rls.py` 14 ケースは stub 経由のため部分 Green（`auth.uid() = NULL` で常時 anon 不可視 = 一部ケース仕様変更）。**完全な認可保証は Phase 2-B で `test_authorization.py` 化して実施**
- frontend 動作確認: ログイン → ニュース一覧表示 → セッション登録 → 学習記録閲覧 → メディア表示（5 動線、ブラウザで実際にクリック確認、**FastAPI 認可が唯一のゲートとして機能していることも併せて検証**）
- rate limit middleware（slowapi）が変わらず動作（Neon 移行と独立、別途 `pytest tests/test_middleware/` で確認）

#### Phase 2-A の migration 適用順（参考）

```
000_neon_compat_stubs.sql      ← 新規（Phase 2-A）
001_create_tables.sql          ← 既存、無修正で再利用
002_create_indexes.sql         ← 既存、無修正で再利用
003_rls_policies.sql           ← 既存、無修正で再利用（stub の NULL で実質無効化）
004_seed_master_items.sql      ← 既存、無修正で再利用
```

**Recommended model:** Sonnet
**Estimated tokens:** ~80K–120K（67 箇所の置換 + モデル 19 個 + テスト調整）
**rollback:** Phase 2-A の commit 群を `git revert`、`DATABASE_URL` を Supabase に戻す

### Phase 2-B: RLS → アプリケーション層認可

**目的:** PostgreSQL RLS（41 ポリシー）を撤廃し、FastAPI の dependency で同等の認可を実現。`auth.uid()` / `auth.jwt()` 依存を削除。

**作業:**
1. `dependencies.py` に **認可 dependency** を整備:
   - `require_authenticated`（既存）
   - `require_staff`（`role in ('staff','admin')`、新規）
   - `require_admin`（`role == 'admin'`、新規）
   - `require_self_or_staff`（learner 自分のみ or staff、新規）
   - `require_session_staff`（session ownership + staff、nested IDOR 対策）
2. **IDOR 対策の対象エンドポイント**（明示）:
   - **必須**（DELETE / UPDATE 全て）:
     - `DELETE /learners/{id}`, `PATCH /learners/{id}` → `require_admin` + 自身比較
     - `DELETE /sessions/{id}/pairings/{pid}`, `PATCH /sessions/{id}` → `require_session_staff`
     - `DELETE /media/{id}`, `PATCH /media/{id}` → uploader 比較 + `require_staff`
     - `DELETE /learning_records/{id}` → 関連 session の staff のみ
   - **必須**（GET の個人情報系）:
     - `GET /learners/{id}/records` → `require_self_or_staff`（learner_id 比較）
     - `GET /media/{id}/signed-url` → uploader 比較 or staff
   - **不要**（公開エンドポイント）:
     - `GET /news`, `GET /events`, `GET /sessions`（公開可、ただし `is_published` / `is_public` フィルタは適用）
3. **公開ビューの戦略決定（推奨案: ビュー廃止）**:
   - **採用案**: `public_members` / `public_learners` VIEW を削除 + 専用 FastAPI エンドポイント `GET /public/members` / `GET /public/learners` を新設し、`PublicMemberResponse` / `PublicLearnerResponse` schema で PII を除外して配信
   - **理由**: Neon の `anon` ロールは stub のみ（実権限なし）、VIEW の GRANT は機能しない。FastAPI 経由なら認可と PII 隔離が Pydantic で型保証され、frontend は引き続き anon で叩ける（`apiClient.fastapi.get('/public/members')`）
   - **frontend 影響**: `apiClient.ts` の rest/v1 直叩き（あれば §1.2 で発見されたもの）を `/public/*` エンドポイント経由に書き換える
   - **migration `005_drop_public_views.sql`** で VIEW を削除
4. `learning_records` の自分のみ参照、`media` の自分のみアップロード等の認可を Python 側で実装（前述 IDOR 対策に統合）
5. `supabase/migrations/003_rls_policies.sql` を **無効化**:
   - 別 migration `006_disable_rls.sql` を新設し、全テーブルに対して `ALTER TABLE ... DISABLE ROW LEVEL SECURITY` + `DROP POLICY IF EXISTS ... ON ...` を実行
   - rollback 用に `999_re_enable_rls_emergency.sql` を準備（Phase 2-A の stub と組み合わせて元の挙動を復元可能）
6. `tests/test_rls.py` 14 ケースを **`tests/test_authorization.py`** にリネーム + アプリ層認可を検証する形に書き換え（後述 §4.3 の対応関係表に従う）

> **`auth` schema / stub の扱い:** Phase 2-B では `auth.uid()` / `auth.jwt()` / `anon` ロールの **削除はしない**（Case A の場合は永続的に残存しても無害、Case B の場合は Phase 2-D で削除）。`006_disable_rls.sql` で RLS が DISABLE になり、ポリシーも DROP されるため、`auth.*` 関数の呼び出し元は消える。残った stub は **将来の Case B 移行時の削除タイミングまで保持**。

**完了条件:**
- `pytest` 既存 282 + 認可新規テスト Green
- Neon DB 上で `SELECT count(*) FROM pg_policies` が 0（DROP 完了）
- `SELECT relname FROM pg_class WHERE relrowsecurity = true` が空（全テーブルで RLS DISABLE）
- frontend の公開ページ（Top, EventCalendar, MemberList）が **anon でも表示できる**（`/public/*` FastAPI 経由）
- IDOR 対策 verification: `tests/test_authorization.py` で各エンドポイントを 3 ロール（learner / staff / admin）+ owner / non-owner で網羅

**Recommended model:** Sonnet（複雑度は中、Opus 不要）
**Estimated tokens:** ~50K–70K
**rollback:** `999_re_enable_rls_emergency.sql` を実行（Phase 2-A の stub と組み合わせて元の挙動を復元）+ commit revert

#### Phase 2-B の migration 適用順（参考）

```
005_drop_public_views.sql                ← 新規（VIEW 削除）
006_disable_rls.sql                       ← 新規（RLS 全 DISABLE + POLICY DROP）
（007 は使用しない、Case B で 010 として再利用予定）
```

### Phase 2-C: ストレージ移行（Supabase Storage → Cloudflare R2）

**目的:** `services/storage.py` を boto3-R2 に置換。既存の `media.url` / `media.thumbnail_url` を段階的に R2 URL に切替。

**戦略決定（推奨案: 一発カットオーバー）**:
- §4.1 同様、メンテ時間内に Supabase Storage 全量を R2 にコピー → `media.url` 一括更新 → frontend デプロイ
- **理由**: 段階運用は分岐ロジック（`if media.url.startswith('https://...supabase.co/') → Supabase, else → R2`）が複雑で、CDN キャッシュとの整合性管理が困難。データ量が小さい（実測必要、§4.4）場合は一発カットオーバーで安全
- **段階運用が必要な場合**（データ量が大きい、メンテ時間内に完了不可）: 別途 [OPEN] で URL prefix 分岐方式の詳細設計を起票

**作業:**
1. R2 アカウント作成 + バケット作成（`nihongo-hiroba-media`、Public Domain 有効化）
2. `services/r2.py` 新規作成（boto3 + `endpoint_url=https://<account>.r2.cloudflarestorage.com` + `region_name="auto"`、async wrapper は `asyncio.to_thread`、boto3 は同期 API のため必須）
3. `routers/media.py` の `upload` / `download` / `signed-url` を R2 経由に置換
4. **migration_log テーブルの新設**（`008_create_migration_log.sql`）:
   ```sql
   CREATE TABLE migration_log (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     media_id UUID NOT NULL REFERENCES media(id),
     old_url TEXT NOT NULL,
     new_url TEXT NOT NULL,
     migrated_at TIMESTAMP NOT NULL DEFAULT NOW(),
     status TEXT NOT NULL CHECK (status IN ('pending','completed','failed')),
     error_message TEXT
   );
   CREATE INDEX idx_migration_log_status ON migration_log(status);
   ```
5. **移行スクリプト** `scripts/migrate_storage_to_r2.py`:
   - 全 media レコードを取得 → 各ファイルを Supabase Storage からダウンロード → R2 にアップロード（キー: `is_public ? "public/<id>.<ext>" : "private/<id>.<ext>"`）→ `media.url` / `media.thumbnail_url` を新 URL に更新 → `migration_log` に記録
   - **idempotent**: 再実行可能、既に `migration_log.status='completed'` のレコードはスキップ
   - **`media.thumbnail_url`** も同時移行（thumbnail も R2 に再アップロード、サムネイル生成は既存ロジック維持）
   - **新規アップロード対策**: スクリプト実行直前にメンテモード（FastAPI 503）に入る → 移行完了後解除（一発カットオーバー方式）
6. `is_public` 切替ロジックを R2 キープレフィックス方式に変更:
   - `move_between_buckets()` → `r2_change_visibility()`（`copy_object` で `public/<id>` ↔ `private/<id>` 間コピー → 旧 key を `delete_object`）
   - **signed URL TTL は 1 時間継続**（既存挙動と同じ）
7. 移行完了後（`migration_log` 全件 `completed` + 動作確認後）、`services/storage.py` 削除 + `requirements.txt` から `storage3` 削除

**完了条件:**
- `migration_log` の全件が `status='completed'`（`SELECT count(*) FROM migration_log WHERE status != 'completed'` が 0）
- `pytest tests/test_storage.py` を `tests/test_r2.py` にリネームして R2 接続テストとして Green（実 R2 接続）
- frontend の画像表示が全箇所で動作（公開ページ + 管理画面 + マイページ）
- 既存 Supabase Storage 上のファイルは **削除しない**（rollback 用に 1 ヶ月保持、料金無視できるレベル）

**Recommended model:** Sonnet
**Estimated tokens:** ~40K–60K
**rollback:**
- 移行スクリプトは **Supabase ファイルを削除しない**（R2 アップロードのみ）→ rollback 時は `media.url` を旧 URL に戻すだけ
- 旧 URL → 新 URL のマッピング表を `migration_log` テーブルに保持

### Phase 2-D: 認証移行（PO 判断後）

**目的:** Supabase Auth → Clerk（**PO 判断結果による**）

#### Case A: Supabase Auth 継続（PO 判断）

**作業:**
- 何もしない（Phase 2-A〜2-C 完了で Phase 2 終了）
- `services/invitation.py` は Supabase Auth Admin API のままで残す
- `JWT_SECRET` 環境変数は維持

**Recommended model:** N/A
**Estimated tokens:** 0

#### Case B: Clerk 移行（PO 判断）

**作業:**
1. Clerk アカウント作成 + アプリ作成（ja / en / zh ロケール有効化）
2. `requirements.txt` に `clerk-backend-api`, `python-jose[cryptography]`, `svix` を追加
3. `dependencies.py` の JWT 検証を Clerk JWKS 検証（RS256）に置換、`JWT_SECRET` 削除（**JWKS は TTL 1 時間でキャッシュ**、フトコロ §10 のパターン流用）
4. `services/invitation.py` を Clerk `invitations.create_invitation()` に置換:
   - **既存の race condition 対策（delete → re-invite）は不要**: Clerk は重複 invitation を `redirect_url` 付きで自動マージするため、自前 race condition 対策は廃止
   - 既存 `learners.invitation_status` カラムは Clerk の `invitation_status`（pending/accepted/revoked）に値が増えるが、互換のため **保持**
5. `routers/auth.py` の `sign_in_with_password` を **削除**（FE が Clerk SDK で取得した JWT を Bearer 送信、BE は検証のみ）
6. **退避テーブル** `_migration_user_backup` を新設（rollback 用、`009_create_migration_user_backup.sql`）:
   ```sql
   CREATE TABLE _migration_user_backup (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     entity_type TEXT NOT NULL CHECK (entity_type IN ('member','learner')),
     entity_id UUID NOT NULL,
     old_supabase_user_id UUID NOT NULL,
     old_email TEXT NOT NULL,
     migrated_at TIMESTAMP NOT NULL DEFAULT NOW(),
     UNIQUE (entity_type, entity_id)
   );
   ```
7. **カラムリネーム migration** `010_rename_supabase_user_id_to_clerk_user_id.sql`:
   ```sql
   -- members: supabase_user_id → clerk_user_id
   ALTER TABLE members RENAME COLUMN supabase_user_id TO clerk_user_id;
   ALTER TABLE members ALTER COLUMN clerk_user_id TYPE TEXT;
   -- 旧 UNIQUE 制約は自動リネーム（PostgreSQL 仕様）、明示で改名する場合:
   -- ALTER TABLE members RENAME CONSTRAINT members_supabase_user_id_key TO members_clerk_user_id_key;

   -- learners: 同じパターン
   ALTER TABLE learners RENAME COLUMN supabase_user_id TO clerk_user_id;
   ALTER TABLE learners ALTER COLUMN clerk_user_id TYPE TEXT;
   ```
   - **型変更の理由**: Supabase `auth.uid()` は UUID だが Clerk `user_id` は `user_xxx...` 形式の TEXT のため、`UUID` → `TEXT` への変換が必須
   - **rollback**: `git revert` で migration ファイル削除 + `010_revert_clerk_rename.sql` を別途作成（`ALTER ... RENAME COLUMN clerk_user_id TO supabase_user_id; ALTER ... ALTER COLUMN supabase_user_id TYPE UUID USING ...::UUID`）
   - **データ migration の順序**: カラムリネームは Clerk 招待発行 + Webhook 同期完了後に実行（手順 8 移行の **末尾**）。順序が逆だと既存 `supabase_user_id` の UUID 値が TEXT に変換されて auth が壊れる
8. **stub 削除 migration** `011_remove_supabase_auth_stubs.sql`（**Case B 専用**、Case A では実行しない）:
   ```sql
   DROP FUNCTION IF EXISTS auth.uid();
   DROP FUNCTION IF EXISTS auth.jwt();
   DROP SCHEMA IF EXISTS auth CASCADE;
   DROP ROLE IF EXISTS anon;
   DROP ROLE IF EXISTS authenticated;
   DROP ROLE IF EXISTS authenticator;
   ```
9. `routers/clerk_webhook.py` 新規作成:
   - **svix の署名検証パターンはフトコロで実装済み**（`_shared-knowledge/knowledge-base-nihongo-hiroba.md §10` Clerk Webhook 署名検証参照）→ そのまま流用
   - 同期対象イベント: `user.created` → 既存 `members` / `learners` レコードの旧 `supabase_user_id` IS NULL のレコードに `clerk_user_id` を埋める
   - `user.deleted` → 既存ロジックと同等（論理削除）
10. **既存ユーザー移行スクリプト** `scripts/migrate_users_to_clerk.py`:
    - **手順**:
      1. 既存 `members` / `learners` の email + supabase_user_id を `_migration_user_backup` に退避
      2. Clerk `invitations.create_invitation(email_address, redirect_url)` を順次発行（rate limit 注意、フトコロ §10 のパターン流用）
      3. 招待発行成功時、`members.supabase_user_id` / `learners.supabase_user_id` を `NULL` に更新（旧 ID を切り離し）
      4. Clerk Webhook の `user.created` イベントで新 `clerk_user_id` が自動同期される（手順 9 で実装）
      5. 全件同期完了確認後、migration `010` でカラムリネーム実行
      6. 最終確認後、migration `011` で `auth` schema / stub を削除
    - **タイムアウト**: Clerk 招待は **30 日でデフォルト失効**、期限切れユーザーは個別フォロー対象として log に記録
11. frontend `apiClient.ts` を `@clerk/clerk-react` に置換、`supabase` クライアント削除
12. `requirements.txt` から `supabase`, `storage3` を完全削除（2-C と本フェーズで全 Supabase 依存が消える）

**完了条件:**
- 既存 active ユーザー全員に Clerk 招待発行済み（受諾 100% は強制せず、30 日後の未受諾者を別途フォロー）
- `_migration_user_backup` に全 active ユーザーの旧 ID が保持されている
- migration `010` 完了後、`SELECT count(*) FROM information_schema.columns WHERE column_name = 'clerk_user_id'` が 2（members + learners）
- migration `011` 完了後、`SELECT 1 FROM information_schema.schemata WHERE schema_name = 'auth'` が 0 行
- `pytest` Green、E2E（招待 → ログイン）Green
- Webhook 署名検証テストが Green（svix の `verify` 失敗時 401 を返す）

**Recommended model:** Opus（複雑度高、認証層の置換は <important> ファイル変更で **plan review 二重化必須**。Sonnet では認証スタック全置換 + frontend SDK 移行 + 既存ユーザー破壊リスクの判断負荷が高すぎる）
**Estimated tokens:** ~80K–150K（内訳: 既存パターン流用込みで `dependencies.py` 約 20K、`services/invitation.py` 約 25K、`routers/auth.py` + `clerk_webhook.py` 約 30K、frontend 認証 UI 約 40K、テスト + migration 約 25K）

**rollback:**
- Clerk 統合 commit 群を `git revert`
- migration `011` の reverse: `000_neon_compat_stubs.sql` を再適用
- migration `010` の reverse: `010_revert_clerk_rename.sql` を実行（カラム名 + 型を UUID に戻す）
- `_migration_user_backup` から `supabase_user_id` を SELECT して各テーブルに UPDATE
- `JWT_SECRET` を Supabase ダッシュボードから再取得して環境変数に再設定
- 既存 Supabase Auth は **削除しない**（移行期間中は並走）

#### Phase 2-D Case B の migration 適用順（参考）

```
009_create_migration_user_backup.sql      ← 新規（退避テーブル）
（手順 10 の移行スクリプト実行）
010_rename_supabase_user_id_to_clerk_user_id.sql  ← 新規（カラムリネーム）
011_remove_supabase_auth_stubs.sql        ← 新規（stub 削除）
```

#### Case 別 migration 一覧

| migration | Case A（継続） | Case B（Clerk 移行） |
|---|:---:|:---:|
| `000_neon_compat_stubs.sql` | ✅ Phase 2-A で適用、永続保持 | ✅ Phase 2-A で適用、Phase 2-D で削除 |
| `005_drop_public_views.sql` | ✅ Phase 2-B | ✅ Phase 2-B |
| `006_disable_rls.sql` | ✅ Phase 2-B | ✅ Phase 2-B |
| `008_create_migration_log.sql` | ✅ Phase 2-C | ✅ Phase 2-C |
| `009_create_migration_user_backup.sql` | ❌ 不要 | ✅ Phase 2-D |
| `010_rename_supabase_user_id_to_clerk_user_id.sql` | ❌ 不要 | ✅ Phase 2-D |
| `011_remove_supabase_auth_stubs.sql` | ❌ 実行禁止 | ✅ Phase 2-D 末尾 |

### Phase 2-E: 統合テスト拡充

**目的:** モックテストの限界（`knowledge-base-nihongo-hiroba.md §4`）を解消し、実 Neon 接続テストでカバレッジを担保。

**開始タイミング:**
- Phase 2-A 完了後すぐに着手可能（2-B, 2-C と並列起動 OK）
- ただし **Phase 2-D Case B 完了までは Clerk 関連の統合テストは保留**（認証スタックが移行中のためテスト実装が二度手間になる）
- 推奨運用: Phase 2-A 末尾で integration テスト雛形（`conftest.py` + 1〜2 ケース）→ 各 Phase 完了時に追加

**作業:**
1. `backend/tests/test_integration/` ディレクトリ新設、`backend/tests/test_unit/` ディレクトリ新設
2. **`conftest.py` の分割戦略**（フトコロ・golf-compe と同パターン）:
   - `tests/conftest.py`（共通）: 環境変数読み込み + base fixture（DB engine など）
   - `tests/test_unit/conftest.py`: **mock fixture**（`AsyncMock` で DB session を mock）
   - `tests/test_integration/conftest.py`: **実 Neon 接続 fixture**（test 専用 DB branch を Neon Branching で作成 → テスト後削除）
   - **共有 fixture の override**: `pytest` の階層的 fixture lookup で、上位 `tests/conftest.py` の DB session を下位がそれぞれ override
3. 既存 `backend/tests/` の **mock 中心テスト**を `tests/test_unit/` 配下に移動、**実 DB を要求するテスト** を `tests/test_integration/` に振り分け（既存 282 関数を 2 分類、目安 70% unit / 30% integration）
4. 主要フローを実 Neon 接続で網羅（30+ ケース新規）:
   - 招待 → ログイン → セッション登録 → ペアリング生成 → 学習記録 → 統計集計
   - メディアアップロード（R2）→ 公開切替 → 削除
   - 認可 IDOR（learner 自分以外不可）
5. **CI/CD 分離設定** (`.github/workflows/ci.yml` 編集):
   - 毎 PR: `pytest tests/test_unit/ --cov` （高速、5 分以内）
   - main マージ時 + nightly: `pytest tests/test_integration/` （Neon Branch 作成料金は無料枠内）
   - Phase 2-E 完了条件に **CI 設定の更新も含める**（CI 設定は Phase 2-E のスコープ）

**完了条件:**
- 統合テスト 30+ ケース追加、全 Green
- カバレッジ 80% 以上維持（unit + integration 合算）
- CI 上で test_unit / test_integration が分離実行され、main マージ後に integration が走ることを確認

**Recommended model:** Sonnet
**Estimated tokens:** ~40K–60K
**rollback:** 統合テストの追加のみのため、独立 revert 可能

---

## 4. リスクとロールバック

### 4.1 段階的カットオーバー戦略

**並行運用 vs 一発カットオーバー:**

| 戦略 | メリット | デメリット | 採用 |
|---|---|---|---|
| 並行運用（Supabase + Neon 両方稼働） | 段階的・安全・rollback 容易 | DB 二重書き込み実装が複雑 / コスト二重 | ❌ MVP 規模では複雑度過剰 |
| 一発カットオーバー（メンテ時間で切替） | 実装シンプル | 失敗時の戻しが慎重 | ✅ Phase 2-A / 2-C で採用 |

**メンテ時間の見積もり**（事前に §6 チェックリストで実測必要）:

| 工程 | データ量小（< 100 MB） | データ量中（100 MB 〜 1 GB） | データ量大（1 GB 以上） |
|---|---:|---:|---:|
| メンテモード移行 | 1 分 | 1 分 | 1 分 |
| `pg_dump` Supabase 全量 | 5 分 | 15 分 | 30 分以上 |
| `pg_restore` Neon | 5 分 | 15 分 | 30 分以上 |
| `DATABASE_URL` 切替 + Railway 再起動 | 3 分 | 3 分 | 3 分 |
| `pytest tests/test_integration/` 疎通 | 5 分 | 5 分 | 5 分 |
| frontend ブラウザ動作確認（5 動線） | 5 分 | 5 分 | 5 分 |
| メンテ解除 | 1 分 | 1 分 | 1 分 |
| **合計（バッファ込み 1.5 倍）** | **~ 35 分** | **~ 70 分** | **~ 110 分以上** |

**rollback 閾値:**
- 上記合計の **2 倍** を超えたら rollback 判断（例: 35 分予定が 70 分超過したら停止）
- 疎通確認時点で `pytest test_integration/` が 5 件以上失敗したら rollback
- frontend 動作確認の 5 動線中 **1 つでも壊れたら** rollback

**カットオーバー手順（Phase 2-A）:**
1. メンテ告知（24 時間前 / トップページ + 招待済み learner にメール）
2. Supabase DB を read-only モード（または FastAPI を 503 維持）
3. `pg_dump --format=custom --no-owner --no-privileges` で Supabase 全データ取得
4. Neon に `pg_restore --no-owner --no-privileges --schema=public` で restore（`auth` schema 等は **excludeしない**、Phase 2-A では stub と一緒に流用）
5. `DATABASE_URL` を Neon に切替（Railway 環境変数）
6. `pytest tests/test_integration/` で疎通確認
7. frontend 動作確認 → メンテ解除

### 4.2 各フェーズの rollback 手順（再掲）

| Phase | rollback 手段 | 復旧時間（推定） |
|---|---|---:|
| 2-A | Phase 2-A の commit 群を `git revert` + `DATABASE_URL` を Supabase に戻す + Railway 再デプロイ。**並行作業中の commit との conflict** が想定されるため、Phase 2-A 期間中は他フェーズの実装を着手しない（並列開始は 2-A 完了後） | 30 分〜1 時間 |
| 2-B | `999_re_enable_rls_emergency.sql` migration 適用（Phase 2-A の `auth.uid()` stub と組み合わせて元の挙動を復元）+ revert | 15 分 |
| 2-C | `media.url` を旧 URL に戻すだけ（旧ファイルは Supabase Storage に 1 ヶ月残存）。`migration_log` テーブルから一括 UPDATE | 即時〜5 分 |
| 2-D | revert + `JWT_SECRET` 再設定、`_migration_user_backup` テーブルから `supabase_user_id` を復元、Clerk 招待は revoke | 1 時間 |
| 2-E | テスト追加のみ → 影響なし | 即時 |

### 4.3 既存 RLS 挙動の回帰テスト戦略

**現状の `test_rls.py` 14 ケース（CLAUDE.md 記載）を Phase 2-B で `test_authorization.py` に書き換える際、以下の対応関係を保証する:**

| RLS 挙動 | Phase 2-B 後のアプリ層実装 |
|---|---|
| `learner_self_read`（learner は自分の記録のみ） | `require_self_or_staff` dependency + `learner_id` フィルタ |
| `learner_anon_deny`（anon は learner テーブル不可視） | API レベルで auth required + `PublicLearnerResponse` のみ公開 |
| `member_email_not_in_public_response` | `PublicMemberResponse` schema で `email` 除外（Pydantic で型保証） |
| `media_anon_read`（is_public=true のみ） | `routers/media.py` で `is_public` フィルタ |
| `media_attachment_public_only_for_anon` | `routers/media_attachments.py` で同様にフィルタ |
| `pairing_staff_admin`（staff/admin のみ） | `require_staff` dependency |

**テスト書き換え方針:**
- 各 RLS 挙動に対し、**Pytest で 3 つのロール（learner / staff / admin）で 200/403/404 を検証**
- `parametrize` で網羅、フィクスチャは `test_integration/conftest.py` に集約

### 4.4 不確実性の高い領域（PO 確認推奨）

| 領域 | 不確実性 | 確認方法 |
|---|---|---|
| 既存 frontend が PostgREST を直接叩いている可能性 | MSW handlers に `*/rest/v1/*` がある事実 | `grep -rn "supabase.from\|rest/v1" frontend/src/` で実態調査 |
| `services/invitation.py` の race condition 対策の挙動 | コメントに記載のみ、実テストカバレッジ要確認 | `tests/test_invitation.py` で edge ケースを再確認 |
| Supabase Storage の現在のデータ量 | 移行スクリプトの実行時間に直結 | Supabase ダッシュボードでバケットサイズ確認 |
| Phase 1 で発行済みの learner / member の人数 | Clerk 移行（Case B）の判断材料 | Supabase users テーブルを `count()` |

---

## 5. 工数・トークン見積もり（参考値）

### 5.1 フェーズ別

| Phase | Recommended model | Estimated tokens | 並列可否 | 備考 |
|---|---|---:|:---:|---|
| 2-A: SQLAlchemy 導入 | Sonnet | 80K–120K | ❌ | 全フェーズの blocker、最初に実施 |
| 2-B: RLS → アプリ層認可 | Sonnet | 50K–70K | ❌ | 2-A 完了後 |
| 2-C: R2 移行 | Sonnet | 40K–60K | ✅（2-B と並列可） | 2-A 完了後、2-B との依存なし |
| 2-D Case A（Supabase Auth 継続） | — | 0 | — | 何もしない |
| 2-D Case B（Clerk 移行） | Opus | 80K–150K | ❌ | 2-A〜2-C 完了後、認証層は最後 |
| 2-E: 統合テスト拡充 | Sonnet | 40K–60K | ✅（2-D と並列可） | 各フェーズの末尾で部分実施も可 |

**合計（Case A）:** 210K–310K tokens
**合計（Case B）:** 290K–460K tokens

### 5.2 Cowork セッション数の目安

- Phase 2-A: 1 セッション（仁さん側）+ Claude Code 実装 1〜2 [OPEN]
- Phase 2-B + 2-C 並列: 1 セッション + 各 [OPEN] 1 つ
- Phase 2-D Case B: 1 セッション + Claude Code 実装 1 [OPEN]
- Phase 2-E: 1 セッション + Claude Code 実装 1 [OPEN]

**合計:** 3〜4 Cowork セッション + 5〜7 Claude Code [OPEN]（約 2〜3 週間、PO 確認待ちを除く）

### 5.3 並列化可能なフェーズ

```
2-A ──┬── 2-B ──┐
      │          ├── 2-D ── 2-E
      └── 2-C ──┘
```

**並列実行ペア:**
- **2-B & 2-C**: backend の認可と Storage は独立、同時に [OPEN] 起票可能。**ただし以下の前提が必要:**
  - **conftest.py 分割の事前完了**: Phase 2-A 末尾で `tests/conftest.py` の階層化（共通 / unit / integration）を済ませる。済んでいないと 2-B（`test_authorization.py` 新設）と 2-C（`test_r2.py` リネーム）が同じ `db_session` / `supabase_client` fixture を奪い合い、PR マージ順で conflict が発生する
  - **dependencies.py の同時編集を回避**: 2-B は新規 dependency 追加、2-C は変更なし → 2-C 側で `dependencies.py` を読み取り専用扱い
  - 上記が満たせない場合は **直列実行（2-B → 2-C）**に切り替え
- **2-D & 2-E**: Clerk 移行とテスト拡充は独立、ただし 2-D が認証 API を変更するため 2-E は **2-D 完了後の方が安全**

---

## 6. 開始前チェックリスト（PO 承認後）

PO が本ドキュメントを承認したら、以下を確認してから Phase 2-A の [OPEN] を起票する:

### 6.1 必須実態調査（Cowork セッションで実施、PO 判断と並走）

- [ ] **frontend PostgREST 直叩き実態調査**（Phase 2-A blocker）:
  - [ ] `grep -rn "supabase\.from\|supabase\.rest\|supabase\.rpc" frontend/src/`
  - [ ] `grep -rn "/rest/v1" frontend/src/ | grep -v mocks`
  - [ ] 発見されたファイルと行を `claude-code-to-cowork.md` で報告 → Phase 2-A の依存タスク化
- [ ] **既存 Supabase Storage データ量計測**: ダッシュボードで `media-public` / `media-private` のサイズ確認 → §4.1 メンテ時間表で該当列を選択
- [ ] **既存ユーザー数計測**:
  - [ ] `SELECT count(*) FROM members WHERE is_active = TRUE` （member 数）
  - [ ] `SELECT count(*) FROM learners WHERE invitation_status IN ('invited','active')` （learner 数）
  - [ ] 結果を §2.4 PO 判断の材料にする
- [ ] **既存 DB データ量計測**: `pg_database_size('postgres')` を Supabase で実行 → §4.1 メンテ時間表で該当列を選択
- [ ] **既存テスト Green 確認**: `pytest backend/tests/` 全 282 関数 Green
- [ ] **`services/invitation.py` race condition の現挙動確認**: `tests/test_invitation.py` カバレッジ確認、edge case が網羅されているか

### 6.2 PO 判断項目への回答取得

- [ ] §2.4 認証スタック（Case A or Case B）の決定
- [ ] §4.4 既存ユーザー数 / Storage データ量 / frontend PostgREST 直叩き有無 を §6.1 から PO に共有
- [ ] §3.3 R2 段階運用 vs 一発カットオーバー の確定（データ量に応じて）

### 6.3 アカウント・インフラ準備

- [ ] **Neon アカウント準備**: Free プランでプロジェクト作成（リージョン: シンガポール）、`DATABASE_URL` 取得、Branching 機能の動作確認
- [ ] **R2 アカウント準備**: バケット作成（`nihongo-hiroba-media`）、API キー発行、Public Domain 有効化
- [ ] **（Case B のみ）Clerk アカウント準備**: アプリ作成（ja / en / zh ロケール有効化）、JWT 公開鍵 URL / Webhook シークレット取得
- [ ] **メンテ時間調整**: Phase 2-A / 2-C カットオーバー枠（§4.1 メンテ時間表で計算した枠 × 2）を仁さん側で確保
- [ ] **データバックアップ**: 既存 Supabase の `pg_dump` を取得、ローカル + クラウドの 2 箇所に保管

---

## 7. 関連ドキュメント

- `_shared-knowledge/knowledge-base-nihongo-hiroba.md` — 本プロジェクトの先行知見（§1 supabase-py 罠 / §2 RLS 循環 / §3 python-magic / §4 モックテスト限界）
- `_shared-knowledge/futokoro-handoff.md` — フトコロ Neon スタックの全体像
- `_shared-knowledge/golf-compe-handoff.md` — golf-compe の Phase 1+2 構成と認証
- `_shared-knowledge/knowledge-base/` — 汎用実装教訓（索引: `knowledge-base/CLAUDE.md`）
- `CLAUDE.md`（プロジェクトルート） — Phase 1 の Agent Teams 並列実装指示書
- `.handoff/CURRENT.md` — 現在の状態
- `.handoff/cowork-to-claude-code.md`（[OPEN] 2026-05-08: Phase 2 調査）— 本タスクの起点

---

## 8. 改訂履歴

| 日付 | 内容 | 担当 |
|---|---|---|
| 2026-05-08 | 初版作成（[OPEN] 2026-05-08 への応答） | Claude Code |
| 2026-05-08 | Plan adversarial review iter 1（@everything-claude-code:planner Opus）の Critical 6 件 + Important 6 件 を反映:<br>・§1.2 frontend PostgREST 直叩き実態調査の必須化<br>・§3.1 `auth.uid()` 互換 stub migration `000_neon_compat_stubs.sql` 明示<br>・§3.2 公開ビュー戦略（廃止 + FastAPI 経由）+ IDOR 対象エンドポイント明示<br>・§3.3 段階運用 → 一発カットオーバー推奨 + `migration_log` テーブル DDL 明示<br>・§3.4.2 Clerk 移行スクリプト仕様詳細化 + svix パターン流用明記<br>・§3.5 test_unit/integration 分割の conftest 設計 + CI 設定<br>・§4.1 メンテ時間見積もり表（データ量別）+ rollback 閾値<br>・§4.2 rollback 復旧時間の現実化<br>・§6 必須実態調査チェックリスト整理 | Claude Code |
| 2026-05-08 | Plan adversarial review iter 2（@everything-claude-code:planner Opus）の新規 Critical 3 件 + Important 4 件 を反映:<br>・§3.1 Phase 2-A 認可状態の警告ボックス追加（stub NULL → RLS 全 FALSE → FastAPI 認可が唯一のゲート）<br>・§3.1 完了条件に pgcrypto 拡張 / role 存在確認 / gen_random_uuid 動作テスト追加<br>・§3.2 `auth` schema / stub の削除タイミング統一（Case A 永続保持 / Case B Phase 2-D で削除）<br>・§3.4.2 Phase 2-D Case B の migration DDL 明示（`009`〜`011`、退避テーブル / カラムリネーム / stub 削除）<br>・§3.4.2 Case 別 migration 一覧表追加<br>・§5.3 並列実行（2-B & 2-C）の conftest 競合回避条件を明記 | Claude Code |
| 2026-05-08 | Plan adversarial review iter 3 で convergence: clean 確認（残存 Critical/Important 0 件） | Claude Code |
