## [OPEN] 2026-05-08: LearnerMyPage の navigate 副作用と null guard を修正（H-10 / H-11）
**Severity:** 🟠 High
**Source:** FE レビュー (Cowork 2026-05-08) §H-10, §H-11
**Task type:** code
**Review required:** yes
**Pre-implementation review:** no
**Recommended model:** Haiku
**Estimated tokens:** ~5K-10K

**Context:**

1. **H-10**: render 中に `navigate({ to: '/login' })` を呼んでいる。React は render 中の副作用を警告し、Suspense / Concurrent モードでバグの温床
2. **H-11**: テーブル `key` は `record.id`（DB UUID）で問題ないが、`record.session.date` で TypeError リスク（session が null の場合）

**Decision:**
1. **H-10**: `<Navigate to="/login" replace />` を return するか、`useEffect(() => { if (!profile) navigate({to:'/login'}) }, [profile])` にする。`<Navigate>` 推奨（再 render 時のループも防げる）
2. **H-11**: `record.session?.date ?? '-'` で null guard。session が null の場合は表示も「セッション情報なし」等にフォールバック

**Target:** `frontend/src/pages/auth/LearnerMyPage.tsx`

**Expected file(s):**
- `frontend/src/pages/auth/LearnerMyPage.tsx`（修正）

**注意点:**
- **M-15（独自 header 二重表示）と同時に解消可能**（admin-layout-fix の draft に統合済み、本 draft では触らない）
- **C-4（auth-source-of-truth）統合後は profile fetch 経路も書き換え**: `lib/auth.ts` 経由で profile を取得する設計にする
- **学習履歴テーブル**: session が null になる原因（schedule_sessions が削除された等）も別途調査するか、DB 側で foreign key NOT NULL を強制する判断が必要（schema 上は既に NOT NULL のはずだが、TypeScript 型の生成に問題があるなら openapi-typescript 再生成）

**Status:** OPEN
