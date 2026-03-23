# にほんごひろば Webアプリ 実装指示書

## このファイルについて
Claude Codeが起動時に自動で読み込む実装指示書です。
`--dangerously-skip-permissions` で起動すれば全自動で実行されます。

## 自動実行ルール
1. `.agent_progress/` の各JSONを確認して未完了タスクから再開する
2. 全てのダイアログは自動承認する
3. テストが失敗したら自動修正してからGreenになるまで繰り返す
4. 制限に達したら status="suspended" にして停止する
5. `/orchestrate` スキルと `/checkpoint` スキルを常に使う

## 起動時の動作
`.agent_progress/` を確認して以下を判断する：
- JSONが存在しない → 全Agentを新規起動
- status="in_progress" → そのAgentを再開
- status="suspended" → 5時間待機後に再開
- status="completed" → スキップして次のAgentへ

## 停止条件（重要）
以下の全てが status="completed" の場合は即座に停止する：
  agent_a / agent_b0 / agent_b / agent_c / agent_d / agent_e / orchestrator / test_phase

停止時の動作：
1. 「全タスク完了済みです」と報告する
2. それ以上の作業は実施しない
3. 新しい指示があるまで待機する
4. E2Eテストの再実行・ファイル修正・確認作業は行わない

---

## 技術スタック

### フロントエンド
React + TypeScript + Vite / TanStack Router / TanStack Query / Tailwind CSS
Recharts / FullCalendar（lazy load）/ @dnd-kit / i18next（UIラベルのみ）
MSW（Mock Service Worker）/ Vitest + Testing Library

### バックエンド
Python + FastAPI + Pydantic + SlowAPI + python-magic + supabase-py / pytest

### 環境変数
backend/.env.local:
  SUPABASE_URL / SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY
  JWT_SECRET / ALLOWED_ORIGINS=http://localhost:5173

frontend/.env.local:
  VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY
  VITE_API_URL=http://localhost:8000 / VITE_USE_MOCK=true

### CSRF方針
Bearer トークン（JWT）のみ・Cookie認証不使用 → CSRF対策不要

### apiClient.tsアーキテクチャ
① Supabase PostgREST（直接）: 公開データ読み取り → supabase.from('news').select()
② FastAPI（独立APIサーバー）: ビジネスロジック → fastapi.post('/auth/login')

---

## チェックポイントファイル形式
```json
{
  "agent": "{agent_name}",
  "started_at": "YYYY-MM-DDTHH:MM:SS",
  "last_updated": "YYYY-MM-DDTHH:MM:SS",
  "completed_tasks": [],
  "in_progress": "",
  "pending_tasks": [],
  "status": "in_progress"
}
```

---

## 実装順序

```
並列: Agent B-0（DBスキーマ）+ Agent A（Pydanticスキーマ）
↓ 両方 status="completed" 後
並列: Agent B（API）+ Agent C（公開サイト）+ Agent D（管理画面）
↓ Agent B status="completed" 後
Agent E（ペアリングロジック）
↓ 全Agent status="completed" 後
Orchestrator（E2Eテスト）
```

---

## Agent B-0（DBスキーマ）

### チェックポイント
`.agent_progress/agent_b0.json`

### タスク一覧
1. .agent_progress/agent_b0.json 初期化
2. backend/supabase/migrations/001_create_tables.sql
3. backend/supabase/migrations/002_create_indexes.sql
4. backend/supabase/migrations/003_rls_policies.sql
5. backend/supabase/migrations/004_seed_master_items.sql
6. Supabaseに適用・動作確認
7. status="completed"

### 001_create_tables.sql

```sql
CREATE TABLE master_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key TEXT NOT NULL CHECK (group_key IN (
    'news_category','event_type','cancel_case','member_role','media_role','class_type'
  )),
  label TEXT NOT NULL, value TEXT NOT NULL, "order" INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  UNIQUE (group_key, value), UNIQUE (group_key, "order")
);

CREATE TABLE media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  filename TEXT NOT NULL, url TEXT NOT NULL, thumbnail_url TEXT,
  mime_type TEXT NOT NULL CHECK (mime_type IN ('image/jpeg','image/png','image/webp','application/pdf')),
  size INT NOT NULL, caption TEXT, credit TEXT, taken_at DATE,
  uploaded_at TIMESTAMP NOT NULL,
  uploaded_by_member_id UUID, uploaded_by_learner_id UUID,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  CONSTRAINT uploaded_by_one_required CHECK (
    uploaded_by_member_id IS NOT NULL OR uploaded_by_learner_id IS NOT NULL),
  CONSTRAINT uploaded_by_exclusive CHECK (
    NOT (uploaded_by_member_id IS NOT NULL AND uploaded_by_learner_id IS NOT NULL))
);

CREATE TABLE members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, role_id UUID NOT NULL REFERENCES master_items(id),
  contact TEXT, joined_at DATE, is_active BOOLEAN NOT NULL DEFAULT TRUE,
  profile_media_id UUID REFERENCES media(id),
  supabase_user_id UUID UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
  admin_role BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE member_class_types (
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  class_type_id UUID NOT NULL REFERENCES master_items(id),
  PRIMARY KEY (member_id, class_type_id)
);

CREATE TABLE learners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL, origin_country TEXT NOT NULL,
  arrived_japan DATE NOT NULL, joined_at DATE NOT NULL,
  japanese_level TEXT, self_intro TEXT,
  is_public BOOLEAN NOT NULL DEFAULT FALSE,
  profile_media_id UUID REFERENCES media(id),
  supabase_user_id UUID UNIQUE, email TEXT UNIQUE NOT NULL,
  invitation_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (invitation_status IN ('pending','invited','active','expired'))
);

CREATE TABLE learner_class_types (
  learner_id UUID NOT NULL REFERENCES learners(id) ON DELETE CASCADE,
  class_type_id UUID NOT NULL REFERENCES master_items(id),
  PRIMARY KEY (learner_id, class_type_id)
);

CREATE TABLE news (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, body TEXT NOT NULL,
  category_id UUID NOT NULL REFERENCES master_items(id),
  published_at TIMESTAMP NOT NULL,
  author UUID NOT NULL REFERENCES members(id),
  is_published BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, event_type_id UUID NOT NULL REFERENCES master_items(id),
  date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
  venue TEXT NOT NULL, max_capacity INT, actual_attendees INT,
  host_member_id UUID NOT NULL REFERENCES members(id),
  report_id UUID REFERENCES news(id)
);

CREATE TABLE schedule_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_type_id UUID NOT NULL REFERENCES master_items(id),
  date DATE NOT NULL, start_time TIME NOT NULL, end_time TIME NOT NULL,
  venue TEXT NOT NULL, is_cancelled BOOLEAN NOT NULL DEFAULT FALSE,
  cancel_case_id UUID REFERENCES master_items(id),
  cancel_reason TEXT, note TEXT,
  session_status TEXT NOT NULL DEFAULT 'open'
    CHECK (session_status IN ('open','pairing','confirmed','completed','cancelled')),
  UNIQUE (date, class_type_id),
  CONSTRAINT cancel_case_consistency CHECK (
    (is_cancelled = FALSE AND cancel_case_id IS NULL)
    OR (is_cancelled = TRUE AND cancel_case_id IS NOT NULL))
);

CREATE TABLE stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  period_start DATE NOT NULL, period_end DATE NOT NULL,
  granularity TEXT NOT NULL CHECK (granularity IN ('monthly','yearly')),
  class_type_id UUID NOT NULL REFERENCES master_items(id),
  total_sessions INT NOT NULL, total_attendees INT NOT NULL,
  breakdown JSONB NOT NULL,
  is_manual_override BOOLEAN NOT NULL DEFAULT FALSE, manual_note TEXT,
  UNIQUE (period_start, class_type_id, granularity)
);

CREATE TABLE hometown_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  speaker_name TEXT NOT NULL, origin_city TEXT NOT NULL,
  origin_country TEXT NOT NULL, arrived_japan DATE NOT NULL,
  joined_at DATE NOT NULL, content TEXT NOT NULL,
  topics JSONB NOT NULL, event_id UUID NOT NULL REFERENCES events(id)
);

CREATE TABLE cultural_lectures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL, event_id UUID NOT NULL REFERENCES events(id),
  countries JSONB NOT NULL
);

CREATE TABLE media_attachments (
  media_id UUID NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('news','event','hometownStory','culturalLecture')),
  entity_id UUID NOT NULL, "order" INT NOT NULL,
  role_id UUID NOT NULL REFERENCES master_items(id),
  UNIQUE (entity_type, entity_id, "order")
);

CREATE TABLE member_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  member_id UUID NOT NULL REFERENCES members(id),
  role TEXT NOT NULL CHECK (role IN ('主催','担当','参加')),
  attended_at DATE NOT NULL, note TEXT,
  UNIQUE (event_id, member_id)
);

CREATE TABLE learner_participations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id),
  learner_id UUID NOT NULL REFERENCES learners(id),
  role TEXT NOT NULL DEFAULT '参加' CHECK (role = '参加'),
  attended_at DATE NOT NULL, note TEXT,
  UNIQUE (event_id, learner_id)
);

CREATE TABLE learning_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES schedule_sessions(id),
  member_id UUID NOT NULL REFERENCES members(id),
  learner_id UUID NOT NULL REFERENCES learners(id),
  study_content TEXT, learner_level TEXT,
  attended BOOLEAN NOT NULL DEFAULT TRUE,
  absence_reason TEXT, note TEXT,
  UNIQUE (session_id, learner_id),
  CONSTRAINT attended_consistency CHECK (
    (attended = TRUE) OR
    (attended = FALSE AND study_content IS NULL AND learner_level IS NULL AND absence_reason IS NOT NULL))
);

CREATE TABLE member_session_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES schedule_sessions(id),
  member_id UUID NOT NULL REFERENCES members(id),
  registered_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','cancelled')),
  note TEXT, UNIQUE (session_id, member_id)
);

CREATE TABLE learner_session_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES schedule_sessions(id),
  learner_id UUID NOT NULL REFERENCES learners(id),
  registered_at TIMESTAMP NOT NULL,
  status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered','cancelled')),
  note TEXT, UNIQUE (session_id, learner_id)
);

CREATE TABLE session_pairings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES schedule_sessions(id),
  member_id UUID NOT NULL REFERENCES members(id),
  learner_id UUID NOT NULL REFERENCES learners(id),
  pairing_type TEXT NOT NULL CHECK (pairing_type IN ('auto','manual')),
  status TEXT NOT NULL DEFAULT 'proposed'
    CHECK (status IN ('proposed','confirmed','cancelled')),
  auto_score NUMERIC, confirmed_by UUID REFERENCES members(id),
  confirmed_at TIMESTAMP, note TEXT,
  UNIQUE (session_id, learner_id),
  CONSTRAINT auto_score_required CHECK (pairing_type != 'auto' OR auto_score IS NOT NULL)
);
```

### 002_create_indexes.sql

```sql
CREATE INDEX idx_news_category ON news(category_id);
CREATE INDEX idx_events_event_type ON events(event_type_id);
CREATE INDEX idx_events_host_member ON events(host_member_id);
CREATE INDEX idx_sessions_class_type ON schedule_sessions(class_type_id);
CREATE INDEX idx_learning_records_session ON learning_records(session_id);
CREATE INDEX idx_learning_records_member ON learning_records(member_id);
CREATE INDEX idx_learning_records_learner ON learning_records(learner_id);
CREATE INDEX idx_pairings_session ON session_pairings(session_id);
CREATE INDEX idx_pairings_member ON session_pairings(member_id);
CREATE INDEX idx_pairings_learner ON session_pairings(learner_id);
CREATE INDEX idx_member_registrations_session ON member_session_registrations(session_id);
CREATE INDEX idx_learner_registrations_session ON learner_session_registrations(session_id);
CREATE INDEX idx_news_published ON news(is_published, published_at DESC);
CREATE INDEX idx_learners_public ON learners(is_public);
CREATE INDEX idx_learners_invitation ON learners(invitation_status);
CREATE INDEX idx_members_active ON members(is_active);
CREATE INDEX idx_sessions_date ON schedule_sessions(date, class_type_id);
CREATE INDEX idx_sessions_status ON schedule_sessions(session_status);
CREATE INDEX idx_media_public ON media(is_public);
CREATE INDEX idx_stats_period ON stats(period_start, class_type_id, granularity);
```

### 003_rls_policies.sql

```sql
-- ビュー定義（anon PII漏洩対策）
CREATE VIEW public_members AS
  SELECT id, name, role_id, is_active, profile_media_id FROM members WHERE is_active = TRUE;
CREATE VIEW public_learners AS
  SELECT id, nickname, origin_country, arrived_japan, japanese_level, self_intro, profile_media_id
  FROM learners WHERE is_public = TRUE;
ALTER VIEW public_members OWNER TO authenticator;
ALTER VIEW public_learners OWNER TO authenticator;
GRANT SELECT ON public_members TO anon;
GRANT SELECT ON public_learners TO anon;

-- members
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_anon_deny ON members FOR SELECT TO anon USING (FALSE);
CREATE POLICY member_self_read ON members FOR SELECT TO authenticated
  USING (supabase_user_id = auth.uid()
    OR (auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
CREATE POLICY member_admin_write ON members FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- learners
ALTER TABLE learners ENABLE ROW LEVEL SECURITY;
CREATE POLICY learner_anon_deny ON learners FOR SELECT TO anon USING (FALSE);
CREATE POLICY learner_self_read ON learners FOR SELECT TO authenticated
  USING (supabase_user_id = auth.uid()
    OR (auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
CREATE POLICY learner_staff_insert ON learners FOR INSERT TO authenticated
  WITH CHECK ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
CREATE POLICY learner_staff_update ON learners FOR UPDATE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
CREATE POLICY learner_staff_delete ON learners FOR DELETE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') = 'admin');

-- learning_records
ALTER TABLE learning_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY learning_record_anon_deny ON learning_records FOR SELECT TO anon USING (FALSE);
CREATE POLICY learning_record_self_read ON learning_records FOR SELECT TO authenticated
  USING (learner_id IN (SELECT id FROM learners WHERE supabase_user_id = auth.uid())
    OR (auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
CREATE POLICY learning_record_staff_write ON learning_records FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- media
ALTER TABLE media ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_anon_read ON media FOR SELECT TO anon USING (is_public = TRUE);
CREATE POLICY media_authenticated_read ON media FOR SELECT TO authenticated
  USING (is_public = TRUE
    OR uploaded_by_learner_id IN (SELECT id FROM learners WHERE supabase_user_id = auth.uid())
    OR (auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
CREATE POLICY media_learner_profile_insert ON media FOR INSERT TO authenticated
  WITH CHECK (uploaded_by_learner_id IN (SELECT id FROM learners WHERE supabase_user_id = auth.uid())
    OR (auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
CREATE POLICY media_learner_profile_update ON media FOR UPDATE TO authenticated
  USING (uploaded_by_learner_id IN (SELECT id FROM learners WHERE supabase_user_id = auth.uid())
    OR (auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
CREATE POLICY media_staff_delete ON media FOR DELETE TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- media_attachments
ALTER TABLE media_attachments ENABLE ROW LEVEL SECURITY;
CREATE POLICY media_attachment_anon ON media_attachments FOR SELECT TO anon
  USING (media_id IN (SELECT id FROM media WHERE is_public = TRUE));
CREATE POLICY media_attachment_staff ON media_attachments FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- session_pairings
ALTER TABLE session_pairings ENABLE ROW LEVEL SECURITY;
CREATE POLICY pairing_staff_admin ON session_pairings FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- news
ALTER TABLE news ENABLE ROW LEVEL SECURITY;
CREATE POLICY news_anon_read ON news FOR SELECT TO anon USING (is_published = TRUE);
CREATE POLICY news_staff_all ON news FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- learner_class_types
ALTER TABLE learner_class_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY learner_class_type_anon ON learner_class_types FOR SELECT TO anon
  USING (learner_id IN (SELECT id FROM learners WHERE is_public = TRUE));
CREATE POLICY learner_class_type_self ON learner_class_types FOR SELECT TO authenticated
  USING (learner_id IN (SELECT id FROM learners WHERE supabase_user_id = auth.uid())
    OR (auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- member_class_types
ALTER TABLE member_class_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_class_type_read ON member_class_types FOR SELECT TO anon
  USING (member_id IN (SELECT id FROM members WHERE is_active = TRUE));
CREATE POLICY member_class_type_staff ON member_class_types FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- session_registrations
ALTER TABLE member_session_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_registration_staff ON member_session_registrations FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
ALTER TABLE learner_session_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY learner_registration_staff ON learner_session_registrations FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- participations
ALTER TABLE member_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY member_participation_public ON member_participations FOR SELECT TO anon USING (TRUE);
CREATE POLICY member_participation_staff ON member_participations FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
ALTER TABLE learner_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY learner_participation_public ON learner_participations FOR SELECT TO anon USING (TRUE);
CREATE POLICY learner_participation_staff ON learner_participations FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- schedule_sessions
ALTER TABLE schedule_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY session_public ON schedule_sessions FOR SELECT TO anon USING (TRUE);
CREATE POLICY session_staff ON schedule_sessions FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- events
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
CREATE POLICY event_public ON events FOR SELECT TO anon USING (TRUE);
CREATE POLICY event_staff ON events FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- stats
ALTER TABLE stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY stat_public ON stats FOR SELECT TO anon USING (TRUE);
CREATE POLICY stat_staff ON stats FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- hometown_stories
ALTER TABLE hometown_stories ENABLE ROW LEVEL SECURITY;
CREATE POLICY story_public ON hometown_stories FOR SELECT TO anon USING (TRUE);
CREATE POLICY story_staff ON hometown_stories FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));

-- cultural_lectures
ALTER TABLE cultural_lectures ENABLE ROW LEVEL SECURITY;
CREATE POLICY lecture_public ON cultural_lectures FOR SELECT TO anon USING (TRUE);
CREATE POLICY lecture_staff ON cultural_lectures FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
```

### 004_seed_master_items.sql

```sql
INSERT INTO master_items (group_key, label, value, "order", is_active) VALUES
  ('news_category','活動報告','activity_report',1,TRUE),
  ('news_category','イベント','event',2,TRUE),
  ('news_category','お知らせ','notice',3,TRUE),
  ('news_category','受賞','award',4,TRUE),
  ('event_type','ふるさとを語ろう','hometown',1,TRUE),
  ('event_type','海外文化講座','culture',2,TRUE),
  ('event_type','文章を書こう','writing',3,TRUE),
  ('event_type','昼食会','lunch',4,TRUE),
  ('event_type','野外レク','outdoor',5,TRUE),
  ('event_type','こども学習塾','kids',6,TRUE),
  ('event_type','その他','other',7,TRUE),
  ('cancel_case','祝日','holiday',1,TRUE),
  ('cancel_case','図書館休館','library_closed',2,TRUE),
  ('cancel_case','天候','weather',3,TRUE),
  ('cancel_case','行事','event',4,TRUE),
  ('cancel_case','その他','other',5,TRUE),
  ('member_role','部長','director',1,TRUE),
  ('member_role','担当','staff',2,TRUE),
  ('member_role','ボランティア','volunteer',3,TRUE),
  ('member_role','写真構成','photo',4,TRUE),
  ('media_role','cover','cover',1,TRUE),
  ('media_role','gallery','gallery',2,TRUE),
  ('media_role','document','document',3,TRUE),
  ('class_type','月曜クラス','monday',1,TRUE),
  ('class_type','土曜クラス','saturday',2,TRUE),
  ('class_type','こども学習塾','kids',3,TRUE);
```

---

## Agent A（Pydanticスキーマ）

### チェックポイント
`.agent_progress/agent_a.json`

### タスク一覧（TDD順）
1. .agent_progress/agent_a.json 初期化
2-3. backend/app/schemas/base.py → backend/tests/test_schemas/test_base.py Green
4-5. backend/app/schemas/master.py → test_master.py Green
6-7. backend/app/schemas/member.py → test_member.py Green
8-9. backend/app/schemas/learner.py → test_learner.py Green
10-11. backend/app/schemas/news.py → test_news.py Green
12-13. backend/app/schemas/event.py → test_event.py Green
14-15. backend/app/schemas/session.py → test_session.py Green
16-17. backend/app/schemas/stat.py → test_stat.py Green
18-19. backend/app/schemas/story.py → test_story.py Green
20-21. backend/app/schemas/lecture.py → test_lecture.py Green
22-23. backend/app/schemas/media.py → test_media.py Green
24-25. backend/app/schemas/pairing.py → test_pairing.py Green
26. backend/app/main.py（FastAPI・openapi.json生成）
27. openapi-typescript → frontend/src/types/api.d.ts
28. status="completed"

### 主要バリデーション

```python
# base.py
DateString = str       # "YYYY-MM-DD"
TimeString = str       # "HH:MM"
DateTimeString = str   # "YYYY-MM-DDTHH:MM:SS"

# session.py
SESSION_STATUS_TRANSITIONS = {
    "open":      ["pairing", "cancelled"],
    "pairing":   ["confirmed", "cancelled"],
    "confirmed": ["completed", "open"],
    "completed": [],
    "cancelled": [],
}

# LearningRecord
# attended=False → study_content/learner_level は null 必須
# attended=False → absence_reason は必須

# SessionPairing
# pairing_type=auto → auto_score は必須

# Media
# uploaded_by_member_id / uploaded_by_learner_id どちらか一方必須・両方同時NG

# PublicMemberResponse（email/supabase_user_id を含まない）
class PublicMemberResponse(BaseModel):
    id: str
    name: str
    role_id: str
    is_active: bool
    profile_media_id: Optional[str]

# PublicLearnerResponse（email/supabase_user_id を含まない）
class PublicLearnerResponse(BaseModel):
    id: str
    nickname: str
    origin_country: str
    arrived_japan: DateString
    japanese_level: Optional[str]
    self_intro: Optional[str]
    profile_media_id: Optional[str]
```

---

## Agent B（FastAPI・認証・RLS）

### 前提条件
Agent A と Agent B-0 が両方 status="completed" であること

### チェックポイント
`.agent_progress/agent_b.json`

### Agent B/E 分界点
- Agent B: `POST /sessions/{id}/generate-pairings` エンドポイントの雛形のみ（HTTPレイヤー）
- Agent E: `backend/app/services/pairing/` 配下のservice層全体
- Agent B はservice層の中身を実装しない
- Agent E はrouterを変更しない

### タスク一覧
1. .agent_progress/agent_b.json 初期化
2. backend/app/dependencies.py（JWT検証・Supabaseクライアント）
3. backend/app/main.py（CORS・FastAPIアプリ）
4. backend/app/middleware/rate_limit.py（SlowAPI）
5-6. backend/app/routers/auth.py → tests/test_routers/test_auth.py Green
7-8. backend/app/routers/news.py → test Green（認可テスト含む）
9-10. backend/app/routers/events.py → test Green
11-12. backend/app/routers/sessions.py（generate-pairings雛形含む）→ test Green
13-14. backend/app/routers/learners.py → test Green
15-16. backend/app/routers/members.py → test Green
17-18. backend/app/routers/media.py（サニタイズ含む）→ test Green
19-20. backend/app/routers/stats.py / master.py / admin.py → test Green
21. backend/app/services/invitation.py → test_invitation.py Green
22. backend/app/services/stat_aggregator.py → test_stat_aggregator.py Green
23. backend/app/services/storage.py → test_storage.py Green
24. backend/tests/test_rls.py（14ケース）Green
25. status="completed"

### 主要仕様

```python
# dependencies.py
# JWT検証
payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"], audience="authenticated")
role = payload["app_metadata"]["role"]

# Supabaseクライアント
def get_supabase_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_ANON_KEY)  # anon（一般API）

def get_supabase_admin_client() -> Client:
    return create_client(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)  # service_role（3箇所限定）

# main.py CORS
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS","http://localhost:5173").split(",")
app.add_middleware(CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS, allow_credentials=True,
    allow_methods=["GET","POST","PUT","DELETE","PATCH"],
    allow_headers=["Authorization","Content-Type"])

# media.py ファイル名サニタイズ
def sanitize_filename(original: str) -> str:
    ext = original.rsplit(".",1)[-1].lower()
    if ext not in {"jpg","jpeg","png","webp","pdf"}: raise ValueError
    return f"{uuid.uuid4()}.{ext}"

# MIMEタイプ検証
actual_mime = magic.from_buffer(file_content, mime=True)

# storage.py バケット整合性
# is_public=true → publicバケット（永続URL）
# is_public=false → privateバケット（署名付きURL・1時間）
# is_public変更時 → バケット間移動・古いURL無効化必須

# invitation.py 再招待 race condition対策
# deleteUser（失敗は無視）→ supabase_user_id=NULL
# → inviteUserByEmail → supabase_user_id=新規UID
```

### Rate Limiting
```python
招待メール: 10回/時間/IP
ログイン: 5回/分/IP
アップロード: 20回/時間/ユーザー
一般API: 100回/分/IP
X-Forwarded-For対応（TRUSTED_PROXIES設定）
```

### test_rls.py（14ケース）
```
1. test_public_learner_hidden_when_not_public
2. test_learner_cannot_see_others_records
3. test_member_email_not_in_public_response
4. test_member_supabase_id_not_in_public_response
5. test_learner_cannot_access_others_private_media
6. test_learner_cannot_access_session_pairings
7. test_media_attachment_public_only_for_anon
8. test_admin_can_access_all_records
9. test_staff_cannot_access_m1_m2
10. test_anon_cannot_access_members_table_directly
11. test_anon_cannot_access_learners_table_directly
12. test_learner_can_upload_own_profile_media
13. test_learner_cannot_upload_others_profile_media
14. test_session_registration_hidden_from_learner
```

---

## Agent C（frontend公開サイト）

### 前提条件
Agent A が status="completed" であること（Mock先行可）

### チェックポイント
`.agent_progress/agent_c.json`

### 追加担当
- `frontend/src/lib/apiClient.ts`（共有APIクライアント）
- `frontend/src/router.tsx`（全ページルーティング定義）
- `frontend/src/mocks/handlers.ts`（MSW・2エンドポイント対応）

### タスク一覧
1. .agent_progress/agent_c.json 初期化
2. frontend/src/lib/apiClient.ts
3. frontend/src/mocks/handlers.ts（Supabase PostgREST + FastAPI両方）
4. frontend/src/i18n/（ja/en/zh・UIラベルのみ）
5. frontend/src/components/layout/Header.tsx / Footer.tsx
6. frontend/src/router.tsx（公開サイト分）
7-8. frontend/src/pages/public/Top.tsx → test Green（P1・最優先）
9-10. frontend/src/pages/public/EventCalendar.tsx → test Green（P5・FullCalendar lazy load）
11-18. P2〜P4/P6〜P11実装
19. レスポンシブ対応確認
20. status="completed"

### apiClient.ts仕様
```typescript
export const supabase = createClient(VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY)

async function getAuthHeader() {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  return token ? { "Authorization": `Bearer ${token}` } : {}
}

export const fastapi = {
  get: async (path: string) =>
    fetch(`${API_URL}${path}`, { headers: await getAuthHeader() }),
  post: async (path: string, body: unknown) =>
    fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: { ...await getAuthHeader(), "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }),
  // put / delete も同様
}
```

### MSWハンドラー（2エンドポイント対応）
```typescript
// Supabase PostgREST
http.get("*/rest/v1/news", ...) / events / schedule_sessions / stats
/ hometown_stories / cultural_lectures / public_members / public_learners

// FastAPI
http.post("*/auth/login", ...) / invite-learner / generate-pairings / media/upload
http.get("*/media/:id/signed-url", ...)
```

### Mock環境変数制御
```typescript
if (import.meta.env.VITE_USE_MOCK === 'true') { worker.start() }
```

---

## Agent D（frontend管理画面）

### 前提条件
Agent A が status="completed" であること（Mock先行可）

### チェックポイント
`.agent_progress/agent_d.json`

### 仮ルートとfallback
- タスク2: `frontend/src/pages/admin/_dev_routes.tsx` 作成（並列作業用）
- タスク23: router.tsxへ統合（Agent C完了後）
- Agent C未完了の場合: in_progress="router_integration_pending"に設定して待機
- 統合後: npm test でGreen確認 → status="completed"

### タスク一覧
1. .agent_progress/agent_d.json 初期化
2. frontend/src/pages/admin/_dev_routes.tsx（仮ルート）
3-4. frontend/src/components/ProtectedRoute.tsx → test Green
5-6. frontend/src/pages/auth/LearnerLogin.tsx / LearnerMyPage.tsx → test Green
7-8. frontend/src/pages/admin/PairingManager.tsx（@dnd-kit・1:N）→ test Green
9-10. frontend/src/pages/admin/LearningRecords.tsx（1:N）→ test Green
11-12. frontend/src/pages/admin/LearnerManager.tsx（招待フロー）→ test Green
13. frontend/src/pages/admin/Dashboard.tsx → test Green
14. frontend/src/pages/admin/NewsManager.tsx → test Green
15. frontend/src/pages/admin/EventManager.tsx → test Green
16. frontend/src/pages/admin/ScheduleManager.tsx → test Green
17. frontend/src/pages/admin/RegistrationManager.tsx → test Green
18. frontend/src/pages/admin/MemberManager.tsx → test Green
19. frontend/src/pages/admin/MediaManager.tsx → test Green
20. frontend/src/pages/admin/StatInput.tsx → test（isManualOverride含む）Green
21. frontend/src/pages/admin/MasterManager.tsx → test（isActive切り替え含む）Green
22. frontend/src/pages/admin/UserPermissions.tsx → test Green
23. router.tsxへ統合・npm test Green確認
24. status="completed"

---

## Agent E（自動ペアリングロジック）

### 前提条件
Agent B が status="completed" であること

### チェックポイント
`.agent_progress/agent_e.json`

### 担当範囲
`backend/app/services/pairing/` 配下のみ・routerは変更しない

### fixture（Agent Bとは独立）
`backend/tests/test_pairing/conftest.py` に以下を定義：
- `pairing_test_session`
- `pairing_test_members`（3名）
- `pairing_test_learners`（3名）
- `pairing_learning_history`（Member[0]-Learner[0]過去3回・Member[1]-Learner[1]直近1か月1回）

### タスク一覧（TDD順）
1. .agent_progress/agent_e.json 初期化
2. backend/tests/test_pairing/conftest.py 作成
3-4. test_score.py（Red）→ score.py（Green）
5-6. test_matcher.py（Red）→ matcher.py（Green）
7-8. test_validator.py（Red）→ validator.py（Green）
9-10. 結合テスト Green
11. status="completed"

### スコア算出
```python
加算: 過去同ペア回数 × 10
加算: 直近3か月以内 × 5
加算: classType一致 × 3
減算: 直前セッション同ペア × -5
初回: スコア0
```

### ペアリング生成（1:N対応）
```python
1. E14a/b registered のMember/Learnerを取得
2. 全ペアスコア算出
3. スコア降順・同スコアはregisteredAt順で1:1割り当て
4. 余剰Learner → スコア合計最小Memberに追加
5. あぶれたMember → waitステータス・管理者通知
6. SessionPairing作成（pairingType="auto"）
```

### test_validator.py（session_status検証含む）
```python
test_member_zero / test_learner_zero / test_cancelled_excluded
test_generate_pairings_rejected_when_status_not_open
test_generate_pairings_allowed_when_status_is_open
```

---

## Orchestrator（E2Eテスト）

### 前提条件
全Agent が status="completed" であること

### チェックポイント
`.agent_progress/orchestrator.json`

### タスク一覧
1. scripts/check_progress.sh で全Agent status="completed" 確認
2. e2e/fixtures/seed.ts
3. e2e/tests/admin/pairing_flow.spec.ts → Green（最重要）
4. e2e/tests/auth/invitation_flow.spec.ts → Green
5. e2e/tests/auth/learner_mypage.spec.ts → Green
6. e2e/tests/admin/news_crud.spec.ts → Green
7. e2e/tests/public/top.spec.ts / calendar.spec.ts → Green
8. .github/workflows/keep-alive.yml（月・木 9:00 UTC）
9. .github/workflows/e2e.yml（push/PR時自動実行）
10. Vercelデプロイ確認
11. status="completed"

### pairing_flow.spec.ts（全フロー）
```typescript
test("ペアリング確定→E13自動生成→completed→E4集計")
test("1:Nペアリング（Member1/Learner2）一連フロー")
test("ロールバック（studyContent未入力E13のみ削除）")
test("ロールバック後の再完了フロー（completed→confirmed→再完了→E4更新）")
```

---

## scripts/check_progress.sh

```bash
#!/bin/bash
echo "=== Agent Progress ==="
for f in .agent_progress/*.json; do
  agent=$(jq -r '.agent' $f)
  status=$(jq -r '.status' $f)
  in_progress=$(jq -r '.in_progress // "none"' $f)
  echo "$agent: $status (in_progress: $in_progress)"
done
```

---

## テストフェーズ（全Agent完了後に自動実行）

### チェックポイント管理
各ステップ開始・完了時に `.agent_progress/test_phase.json` を更新する：

```json
{
  "phase": "test",
  "steps": {
    "unit_test": "pending",
    "e2e_test": "pending",
    "security": "pending",
    "verify": "pending"
  },
  "last_updated": "YYYY-MM-DDTHH:MM:SS"
}
```

ステータス定義：
- `pending`    → まだ実行していない
- `in_progress` → 実行中
- `completed`  → 完了（再開時はスキップ）
- `suspended`  → 制限到達（5時間後に再開）

### 再開手順（制限到達時）
5時間後に起動して以下を入力：
```
「.agent_progress/test_phase.jsonを確認して
 completedのステップをスキップして
 in_progressまたはpendingのステップから再開してください。」
```

---

### ステップ1：ユニットテスト（直列・最初に実行）

test_phase.jsonの unit_test を "in_progress" に更新してから実行。

/tdd スキルを使って以下を実行：
```bash
cd backend && pytest tests/ --tb=short
cd frontend && npm test
```
失敗したテストは自動修正してGreenになるまで繰り返す。
完了後に unit_test を "completed" に更新。

---

### ステップ2：E2EテストとセキュリティチェックをAgent Teamsで並列実行

unit_test が "completed" になってから実行。
test_phase.jsonの e2e_test と security を "in_progress" に更新してから実行。

以下を並列で同時起動：

**Agent 1（e2e-runner）：**
```bash
npx playwright test --headed
```
- ブラウザを画面上に表示してテストを実行すること
- 失敗したテストは自動修正してGreenになるまで繰り返す
- 完了後に test_phase.jsonの e2e_test を "completed" に更新

**Agent 2（security-reviewer）：**
- OWASP Top 10に基づいてセキュリティチェック
- 以下を重点的に確認：
  - JWT検証・認証フロー
  - RLSポリシーの漏れ
  - APIエンドポイントの認可
  - ファイルアップロードの検証
  - 環境変数・シークレットの管理
- 完了後に test_phase.jsonの security を "completed" に更新

---

### ステップ3：最終品質確認（直列）

e2e_test と security が両方 "completed" になってから実行。
test_phase.jsonの verify を "in_progress" に更新してから実行。

/verify スキルを使って以下を一括確認：
- 全テストGreen
- ビルド成功
- 型チェックエラーなし
- カバレッジ80%以上

完了後に verify を "completed" に更新。

---

### ステップ4：完了報告

全ステップが "completed" になったら以下のサマリーを報告：

```
=== テストフェーズ完了 ===
✅ ユニットテスト: Xテスト全Green
✅ E2Eテスト: Xテスト全Green（ブラウザ確認済み）
✅ セキュリティ: 問題なし（または指摘事項一覧）
✅ 最終確認: ビルド成功・型エラーなし・カバレッジX%
```

