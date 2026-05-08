# Field Findings

> Claude Code が発見した教訓候補（`_shared-knowledge/knowledge-base/` §X.Y への昇格候補）。書く場所/タイミングは [`.handoff/CLAUDE.md`](./CLAUDE.md) 参照。

## フォーマット

```
## [CANDIDATE] YYYY-MM-DD: タイトル
**Severity:** Major | Minor
**What happened:** 何が起きたか
**Root cause:** 根本原因
**Generalizable lesson:** 一般化可能な教訓
**Applied to:** 修正済みの場所
**Promote to §x.y?:** YES | NO
```

---

## [CANDIDATE] 2026-05-08: sessions.py の generate-pairings — service が空を返した時の status 遷移バグ
**Severity:** Minor（エッジケース、本番では通常踏まない）
**What happened:**
backend 実コード review（commit `120d82af`）で `routers/sessions.py` の 501 STUB を `app.services.pairing.generate_pairings` 接続に差し替えた際、service 内部のバリデーション失敗（pairing 不可能なメンバー構成等）で空 pairings が返るケースでも `session_status` が無条件に `"pairing"` に更新される実装になっている。service 側の整合性チェック失敗を router 側で吸収できておらず、UI 上「pairing 中」のまま進めなくなる可能性。
**Root cause:**
- router 側で service の戻り値 (`len(pairings) == 0`) を見て status 更新の可否を判断していない
- service 自体は raise せず空配列で「失敗を黙って通知」する設計だが、router がその semantics を理解していない
- pre-existing pattern（agent E 実装時にエラー shape の合意が無かった）
**Generalizable lesson:**
- **service 層 → router 層のエラー伝達は raise / Result 型 / 戻り値 sentinel の 3 通り**。3 つを混在させると router 側で「空配列 = 失敗」「raise = 致命的失敗」を区別する必要が生じてバグの温床
- agent 並列実装時は **エラー伝達 contract** を agent 指示書に明記すべき（B-N と E のような分業時に特に重要）
- 状態遷移 (status update) を行う router は、service の戻り値を必ず**整合性チェックしてから** transition すべき。少なくとも `if not pairings: return without_status_update()` 程度のガードが必要
**Applied to:** 未修正、Phase 2 着手前に確認推奨（[OPEN] 起票候補）
**Promote to §x.y?:** YES（候補: §15 Agent Teams 並列実装の error contract / §16 状態遷移 router の整合性ガード）

---

## [CANDIDATE] 2026-05-08: GeneratePairingsResponse.pairings の型が List[dict] で型安全性が欠落
**Severity:** Minor（型システムでバグを早期検出できない）
**What happened:**
`GeneratePairingsResponse.pairings: List[dict]` という Pydantic schema になっており、Pairing 1 件の shape が型システムで縛られていない。Phase 2 の SQLAlchemy + asyncpg 移行時に response shape が変わると compile-time に検出できず、frontend / test の壊れに気づくのは runtime。
**Root cause:**
- agent E（pairing service）のレスポンス schema が確定する前に router 側 stub を書いてしまった
- Pydantic v2 の `BaseModel` でネスト型を厳密に定義する代わりに `dict` で逃げた
- code review でも気付かれず通過（`<important>` 指定対象のはずが、Phase 1 並列実装時はチェックが緩かった）
**Generalizable lesson:**
- **schema-first design**: agent 並列実装で「同じ型を使う 2 agent」がいる場合、schema を別 agent (Agent A 相当) に先行実装させてから両方が import する設計が必要。にほんごひろば Phase 1 でも Agent A が schemas を担当しており、思想は正しかったが実装中に逸脱した
- **`List[dict]` は赤信号**: Pydantic schema 内で `dict` / `List[dict]` / `Dict[str, Any]` が出てきたら設計のサインを疑う。型エイリアスに置き換えれば必ず狭められる
- **openapi-typescript の生成物を frontend 側で使うなら**、`dict` は `Record<string, unknown>` になり実質型なし → frontend 側でも any 化されて二重で型システムが効かない
**Applied to:** 未修正、Phase 2 schema 整理時に同時対応推奨
**Promote to §x.y?:** YES（候補: §15 Agent Teams schema-first design / §16 Pydantic schema の `dict` 警戒）

---

## [CANDIDATE] 2026-05-08: Cowork サンドボックスから外部 HTTPS（Supabase 等）への直接アクセスは不可
**Severity:** Minor（運用設計の落とし穴）
**What happened:**
ADR-0001 の §6.1 PO データ計測 [OPEN] を起票後、「仁さんの手間を減らすため Cowork 内で curl / supabase REST 経由で計測してしまえないか」を試みた。`backend/.env.local` から `SUPABASE_URL` / `SUPABASE_ANON_KEY` は読めたが、`curl` で Supabase の REST endpoint へのアクセスはすべて **HTTP 000（接続失敗）**。DNS は解決可能だったが TLS handshake / connect の段階で完全に弾かれた。
**Root cause:**
- Cowork サンドボックス bash の network policy は **allowlisted domain のみ HTTPS 許可**（CLAUDE Agent SDK / Anthropic 系のみが allowlist 入りしている想定）
- Supabase / Neon / Vercel / その他外部 SaaS は domain allowlist に含まれない
- 環境変数として鍵は読めても、 outbound 通信が遮断されているため SaaS 計測には使えない
**Generalizable lesson:**
- **Cowork セッションは「コード生成 / ファイル操作 / 静的解析 / git」の sandbox**。外部 SaaS の動的計測（DB count / Storage size / API rate-limit テスト等）には使えない
- 「PO 依頼 [OPEN] vs Cowork 内自動化」の判断は、**最初に外部到達性を確認する** 手順を含めるべき。`curl --max-time 5 <SaaS endpoint>` で HTTP code を確認するワンライナーを `.handoff/CLAUDE.md` か `_shared-knowledge/cowork/CLAUDE-cowork.md` に明記候補
- SaaS 計測系の handoff [OPEN] は最初から「PO 実施が前提」で起票するのが運用上効率的（Cowork で試行錯誤する時間を削れる）
- 同様の制約は Neon / Cloudflare R2 / Clerk admin API 等にも当てはまる可能性高 → Phase 2 実装時にも遭遇予定
**Applied to:** ADR-0001 / `cowork-to-claude-code.md` の §6.1 [OPEN] は仁さん実施の方針で維持
**Promote to §x.y?:** YES（候補: `_shared-knowledge/knowledge-base/12-cowork-ops.md §14.5` Cowork 制約の補強 / または同 §14 末尾に新節）
