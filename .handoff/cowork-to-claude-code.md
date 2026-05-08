# Pending Decisions

> Cowork → Claude Code の作業依頼。書く場所/タイミングは [`.handoff/CLAUDE.md`](./CLAUDE.md) 参照。

## フォーマット

```
## [Status] YYYY-MM-DD: タイトル
**Task type:** code | docs | mixed
**Review required:** yes | no | partial
**Pre-implementation review:** yes | no
**Recommended model:** Sonnet | Opus | Haiku
**Estimated tokens:** ~XXK

**Context:** 背景
**Decision:** 決定内容
**Target:** 反映先 / 修正範囲
**Expected file(s):** 修正対象ファイル
**Status:** OPEN | APPLIED | FAILED
```

**判断基準:**
- **Task type**: code（.ts/.tsx/.py/.css/.sql）/ docs（.md）/ mixed
- **Review required**: yes（code または mixed の code 部分）/ no（docs・機械的置換）/ partial（code 部分のみ）
- **Pre-implementation review**: yes（30K+ tokens または `<important>` ファイル）/ no（軽微）

詳細な agent 使い分けは [`.claude/rules/code-review.md`](../.claude/rules/code-review.md) 参照。

---

## [OPEN] 2026-05-08: Phase 2 §6.1 開始前実態調査 — PO データ計測依頼（Supabase Studio）
**Task type:** docs
**Review required:** no
**Pre-implementation review:** no
**Recommended model:** Haiku（Cowork 内で結果整形のみ、計測は仁さん側）
**Estimated tokens:** ~5K-10K（結果反映時）

**Context:**
ADR-0001（2026-05-08 確定）で **Case B: Clerk 移行**を選択した。Phase 2-A 着手前に、計画書 `docs/p2-neon-migration.md` §6.1 の必須実態調査のうち **Cowork bash で取れない 4 項目** を PO（仁さん）に計測依頼する。

Cowork セッションで既に完了した調査項目:
- ✅ frontend PostgREST 直叩き: **10 件**（Top.tsx / NewsList.tsx / NewsDetail.tsx / EventDetail.tsx / About.tsx / LearningRecords.tsx / PairingManager.tsx の 3 箇所）
- ✅ backend `.from_()` 直叩き: **103 件**（auth / sessions / media / members / その他）
- ✅ frontend `supabase.auth.*` 利用: **6 箇所**（apiClient / Header / AdminLayout / Login / LearnerMyPage）
- ✅ RLS ポリシー数: **41**
- ✅ test_invitation.py の race condition test: **`test_invite_learner_cleans_up_existing_user` 存在確認**
- ⚠️ backend tests Green 確認: pytest 実行未完（venv path 問題、本 [OPEN] と統合実施）

**Decision:**
PO（仁さん）が **Supabase Studio** で以下 4 つの SQL / ダッシュボード操作を実施し、結果を本 [OPEN] のコメント欄に貼り付ける:

```sql
-- 1. 既存メンバー数（Active）
SELECT count(*) AS active_members FROM members WHERE is_active = TRUE;

-- 2. 既存学習者数（招待済み + アクティブ）
SELECT count(*) AS active_learners,
       count(*) FILTER (WHERE invitation_status = 'invited') AS invited_only,
       count(*) FILTER (WHERE invitation_status = 'active') AS active_only
FROM learners
WHERE invitation_status IN ('invited','active');

-- 3. DB 容量（pg_database_size）
SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size;

-- 4. 過去 30 日の MAU 見込み（active な session_registrations を proxy として）
SELECT count(DISTINCT learner_id) AS learner_mau
FROM learner_session_registrations
WHERE registered_at >= NOW() - INTERVAL '30 days';
```

**ダッシュボード操作（SQL では取れない）:**

5. **Storage データ量**: Supabase ダッシュボード → Storage → `media-public` バケットと `media-private` バケットの **Total size** を確認
6. **既存テスト Green 確認**: ローカルで以下を実行（host 側の仁さん）:
   ```bash
   cd ~/Projects/nihongo-hiroba/backend
   source venv/bin/activate
   pytest tests/ --tb=short -q | tail -5
   ```

**Target:** 計測のみ。結果をどこに記録するかは **本 [OPEN] のコメントに直接記入** → Cowork セッションが自動的に ADR / 計画書に反映。

**Expected file(s):**
- 計測結果: 本 [OPEN] のコメント欄（仁さんが貼り付け）
- 反映先（次セッション）:
  - `docs/p2-neon-migration.md` §6.1 のチェックリストに ✅ + 数値を追記
  - `docs/adr/0001-auth-stack-case-b-clerk.md` の "現状の数値" 表に追記
  - `.handoff/CURRENT.md` の "Blocked by" を更新（PO データ計測完了 → Phase 2-A 起票可能状態へ）

**注意点:**
- **本 [OPEN] は code 変更を伴わない**: 仁さんがデータを貼り付けるだけ。Claude Code 側で実装する作業はない（ステータス上は `[APPLIED]` ではなく `[RESOLVED]` 化が適切かもしれないが、現行運用では `[APPLIED]` で統一）
- **Storage データ量で migration 戦略が変わる**: 計画書 §3.3 で「~10GB 未満なら一発カットオーバー / 10-50GB なら段階運用 / 50GB+ なら専用検討」となっているため、PO の数値次第で Phase 2-C のサブ [OPEN] 数が変わる
- **MAU 50K 超は Clerk Pro 課金**: ADR-0001 の "後で見直すべきこと" 1 項目目に該当。直近の MAU 見込みが 50K 未満であることを確認できれば Hobby プラン継続で行ける
- **既存ユーザー数 = 再招待メール送信数**: 計画書 Phase 2-D の規模感（Case B で 100K-160K tokens 見積もり）の根拠になる。100 ユーザー超えなら一斉メール送信と顧客サポート体制を整備
- **既存テスト Green 確認**: もし fail があれば Phase 2-A 着手の blocker になる。事前に修正が必要

**Status:** OPEN（仁さん計測待ち、計測完了後に Cowork セッションで [APPLIED] 化 + 結果を ADR-0001 / 計画書 §6.1 に反映）
