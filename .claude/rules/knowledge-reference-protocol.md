# 知識参照プロトコル（knowledge-reference-protocol）

<!-- owner: knowledge-ref-protocol -->

作業でファクト（根拠）が要るとき、この順で参照する。層を混同すると SSOT（single source of truth）が崩れる。

## 4つの層

- **L0 プロジェクト固有** … このリポの `CLAUDE.md` + コード + `.handoff/`。その案件の実装・設定・状態の**唯一の SSOT**。**wiki に複製しない。**
- **L1 エンジニアリング（プロセス/スタック）** … 本リポの `.claude/rules/`（2026-10-02 に shared から写した実ファイル）と `docs/knowledge-base-nihongo-hiroba.md`。レビュー観点・API 規約・テスト・handoff 運用など横断ルール。
- **L2 ドメイン/概念知識** … `~/Projects/LLM-Wiki/`（本・記事・研究の compiled 済みナレッジ。not RAG）。`index.md` → 該当 space（tech/research/…）→ ページの順にたどる。
- **L3 最新・欠落・frontier** … web / 自前知識。

## 参照順

**L0 →（必要な知識の種類に応じて L1 か L2）→ L3。**
自前知識は「層」ではなく全層を読む処理役。最初から常時使うが、"根拠の出所" としては最後・限定的に使う。

## ガード

- **stale** … L2 のページが `status: stale`、または `updated` が古ければ、L3（web）を先に当てて裏を取る。
- **provenance** … 自前知識は下書き・当たりづけまで。断定や成果物の根拠は必ず L0 / L2 / web に接地（せっち）する。出所のない主張は書かない。
- **還元** … L3 で得た再利用価値のある知見は、`LLM-Wiki` に ingest して L2 に compound させる（次回から使い回せる）。
