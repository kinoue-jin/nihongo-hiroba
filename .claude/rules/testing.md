# テストルール(汎用テンプレート)

<!-- owner: testing-rules -->

React + FastAPI + Agent Teams プロジェクト共通。Agent Teams 並列実装では、テスト品質が目標に未達するケースが多発する(モックアップ優先実装の結果、テスト実装が簡略化されるため)。**カバレッジ閾値**で品質を担保し、テスト件数は補助指標として運用する。

## カバレッジ閾値(業界標準準拠)

| 領域 | Statements | Branches | Functions | Lines |
|---|---|---|---|---|
| **Global (BE/FE 共通)** | **≥ 80%** | **≥ 75%** | ≥ 80%* | **≥ 80%** |
| `src/lib/**` (純粋ロジック) | ≥ 95% | ≥ 93% | ≥ 95% | ≥ 95% |
| `src/routes/**` (Page 系) | ≥ 75% | ≥ 70% | ≥ 70% | ≥ 75% |

*Functions 閾値は目標値。React の event handler(`useCallback` 等)は render だけでは
未呼び出し＝未カバー扱いになる構造的要因で、lines/statements より低く出やすい。
各プロジェクトの実 gate(`vitest.config.ts` 等の閾値)は achieved 値に合わせて設定し、
本表はあくまで目標値とする。gate を coverage gaming で埋めるのは禁止(下記運用ルール参照)。

## テスト運用ルール

1. **Agent指示書に対象 module + 閾値を明記する**(ふんわりした "〜のテストを書く" は不可)
2. **Agent完了条件にカバレッジ閾値達成を含める**(`npm run coverage` / `pytest --cov` で確認、未達なら未完了扱い)
3. **境界値テストは省略しない**(`min=1, max=15` なら 0, 1, 15, 16 の 4 ケース)— カバレッジ数値達成しても**境界値抜けは Critical 扱い**
4. **Integration test を PRIMARY**、unit test を SECONDARY とする(Testing Trophy モデル準拠、Kent C. Dodds)
   - 純粋関数のみ unit test、コンポーネントは render + fireEvent で行カバレッジを伸ばす
   - unit test of business logic は line coverage を改善しない、integration test 必須
5. **「coverage gaming」は禁止**: ハンドラーを単に呼ぶだけのテストではなく、behavior(フォーム送信・状態変化・エラー表示)をテスト
6. テスト完了後に `pytest --tb=short -v` / `npm test` で Green 確認
7. **Flaky テスト(間欠的に失敗)は自動 retry ではなく原因究明**(→ rules/testing-pitfalls.md#flaky-uuid-affinity)
8. **determinism(ORDER BY 追加)系の RED は構造的に保証する**: 「ORDER BY なしで意図順に並ばない」ことを当てにすると、DB の暗黙順とランダム主キーの偶然一致で RED が確率化する。何が暗黙順を決めているかを先に実測し、それを期待順の逆に固定して、fix なしで決定的に FAIL させる(→ rules/testing-pitfalls.md#determinism-order-by-red)
9. **「採用版テストコード」を含む spec は起票前に実行して green を確認する**(最低でも未実行の旨を Verification に明記)。symbol 実在の grep 確認は hallucination は防ぐが、描画パス refactor や API キー規約の real-code 乖離は防げない。FE の assert は「どの component が DOM を供給するか」を実行時に固定する。

## Coverage 計測ツールの選定

- **BE (Python)**: `pytest-cov` (default)
- **FE (TypeScript)**: `vitest --coverage --coverage.provider=istanbul`
  - **v8 provider は使わない**(React コンポーネントを過大評価する known issue、GitHub issues #7660 / #9293)

## 型検査を無効化する props キャストの禁止(TypeScript)

**新規テストで `as unknown as <Props>` / `as any` を使ってコンポーネントに props を渡さない。**
必須 prop はリテラルで直接渡す(不足していれば `tsc --noEmit` が落ちるのが正しい状態)。

- **Why**: `as unknown as X` は missing-property チェックを**完全にバイパス**する。既存コンポーネントを直 render する既存テストがこの二重キャストで書かれていると、必須 prop が欠落したままでも `tsc --noEmit` が exit 0 になり得る。結果として、そのコンポーネントに新しい必須 prop を足しても**既存テストは 1 件も壊れず**、「テストが通ったから安全」という誤った安心を与える(当該箇所は新機能の回帰カバレッジを一切提供しない)。
- **起票・レビュー時の含意**: 「必須 prop 追加で N 箇所が tsc エラー化する」を **`grep -c "<Component"` の出現回数から見積もらない**。型安全なリテラル直渡しかキャスト経由かを区別しないため、影響を過大評価する。**必ず `tsc --noEmit` の実出力で判定する**。
- **既存の違反箇所は一括修正しない**(fixture の書き直しコストが便益に見合わない)。**そのファイルを触るチケットが出たときに、そのチケット内で直す**(合流方式)。
- 例外: 意図的に不正な props を渡して防御的分岐を検証する場合。その旨のコメントを必須とする。

## BE テスト分類
- **正常系**: 期待される入力で期待される出力
- **異常系**: バリデーションエラー、権限エラー、404、409
- **境界値**: min/max/0/負数/空文字/長大文字列
- **権限**: 各ロールで個別テスト

## FE テスト分類
- レンダリング(必須要素の存在)
- ユーザー操作(クリック・入力 → 状態変化)
- 条件分岐(loading/error/empty/success)
