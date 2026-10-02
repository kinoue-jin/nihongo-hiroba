> 2026-10-02 に `_shared-knowledge` から移した。

# ナレッジベース：にほんごひろばプロジェクト

> 先行プロジェクト（React + FastAPI + Supabase/Neon 系列）で得られた教訓集。
> フトコロ（Futokoro）、golf-compe が同じ技術スタックで継承している知見。

---

## 概要

「にほんごひろば」は、フトコロや golf-compe の前身となる先行プロジェクト。同じスタック（React + TanStack Router + FastAPI + 認証+ストレージ）で実装された。本ファイルは、そこで得られた教訓を後続プロジェクトが参照できるようにまとめたもの。

> ⚠️ オリジナルの詳細ドキュメントは別リポジトリ（にほんごひろば）に存在。ここでは主要な教訓のみサマリ化。詳細が必要な場合は元プロジェクトの `docs/knowledge-base.md` を参照のこと。

---

## 主な適用済み知見

### 1. supabase-py のバージョン固定問題

**問題:** supabase-py のマイナーバージョンアップで API 互換性が壊れることが頻発した。

**対応:** `requirements.txt` で `==` 固定、マイナー互換アップグレード不可。

**後続対応:** フトコロ・golf-compe では Neon（直接 PostgreSQL 接続）へ移行したため、この問題は解消。SQLAlchemy + asyncpg で安定。

---

### 2. RLS サブクエリ無限ループ問題

**問題:** Supabase の Row Level Security（RLS）ポリシーで、テーブル A → B → A の循環参照が発生し、クエリが無限ループして timeout。

**対応（当時）:** RLS ポリシーの設計を見直し、中間テーブルで直接参照するパターンに変更。

**後続対応:** Neon は RLS を使わない方針に統一。代わりに全エンドポイントで `household_id` / `group_id` を WHERE 句に含めるアプリケーション層での認可を徹底。

---

### 3. python-magic の Railway デプロイ問題

**問題:** `python-magic` は libmagic（C ライブラリ）に依存しており、Railway の標準ビルドでは欠落する。

**対応:** `nixpacks.toml` で `nixPkgs = ["file"]` を指定し、libmagic を同梱。

```toml
# nixpacks.toml
[phases.setup]
nixPkgs = ["python311", "file"]
```

**後続対応:** フトコロ・golf-compe でも同様の設定をテンプレート化。Render / Railway どちらでも使える。

---

### 4. モックテストの限界

**問題:** 単体テストでモック（MagicMock）を多用した結果、実環境（Supabase / Neon 接続、実 Clerk JWT）で通らないケースが多発。モックが通っても本番で壊れる。

**対応:** `test_integration/` ディレクトリを作り、実 DB 接続・実 API 呼び出しを含む統合テストを必ず追加する運用に変更。

**後続対応:** 同じパターンをフトコロ・golf-compe でも採用。`conftest.py` を `test_unit/` と `test_integration/` で分離。

---

### 5. Agent 間の MSW Mock 形式不一致

**問題:** C-1〜C-3 が独立して MSW ハンドラーを書いた結果、レスポンス形式（camelCase vs snake_case、配列ラップの有無）が Agent ごとに違った。BE との結合時に全書き直し。

**対応:** Agent D（型定義専任）を新設し、Pydantic スキーマから OpenAPI → TypeScript 型を生成。MSW ハンドラーもこの型を使って統一。

**後続対応:** フトコロ・golf-compe では「C-1 が MSW 基盤 + 全 API モック」を先行実装、C-2/C-3 が上乗せする構成に進化。

---

## その他の教訓（サマリ）

- **TanStack Router v1 の破壊的変更**: ファイルベースルーティングの命名規則変更。マイグレーションコストが大きかった。バージョン固定推奨。
- **Clerk Webhook の署名検証**: `svix` ライブラリを使わないと署名検証ロジックを自前で書くことになり危険。`svix.Webhook(secret).verify(payload, headers)` 一択。
- **Cloudflare R2 の boto3 使用**: R2 は S3 互換だが、`endpoint_url` と `region_name="auto"` の指定が必須。
- **Pydantic v1 → v2 移行**: `BaseSettings` が `pydantic-settings` パッケージに分離された。config クラスは要書き換え。
- **openapi-typescript のバージョン**: `6.x` と `7.x` で生成される型の形式が違う。FE 側の型参照コードも影響を受ける。

---

## 後続プロジェクトへの反映状況

| 教訓 | フトコロ | golf-compe |
|---|---|---|
| Neon 採用（Supabase 回避） | ✅ | ✅ |
| 統合テスト（test_integration/） | ✅ | ✅ |
| MSW 型統一（Agent D / C-1 基盤） | ✅ | ✅ |
| python-magic nixpacks 設定 | ✅ | 不要（R2 直接） |
| Clerk svix 署名検証 | ✅ | ✅ |

---

## 関連ドキュメント

- `_shared-knowledge/knowledge-base/` — 汎用実装教訓（MSW ワークフロー、FastAPI 罠、テスト戦略）。
  ⚠ **索引 = `knowledge-base/CLAUDE.md`**（旧記載 `knowledge-base.md` は**本リポの git 履歴には一度も存在しない**（2026-04-26 の初回 commit が既に分割後）・2026-08-22 是正）
- `_shared-knowledge/futokoro-handoff.md` — フトコロプロジェクト引き継ぎ
- `_shared-knowledge/rules/` — 汎用ルールテンプレート

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-04-23 | 初版作成（フトコロ knowledge-base.md §10 から抽出・拡張） |
