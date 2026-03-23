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
