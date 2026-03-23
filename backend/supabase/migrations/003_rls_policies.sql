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
CREATE POLICY member_participation_anon_deny ON member_participations FOR SELECT TO anon USING (FALSE);
CREATE POLICY member_participation_auth_read ON member_participations FOR SELECT TO authenticated USING (TRUE);
CREATE POLICY member_participation_staff ON member_participations FOR ALL TO authenticated
  USING ((auth.jwt()->'app_metadata'->>'role') IN ('staff','admin'));
ALTER TABLE learner_participations ENABLE ROW LEVEL SECURITY;
CREATE POLICY learner_participation_anon_deny ON learner_participations FOR SELECT TO anon USING (FALSE);
CREATE POLICY learner_participation_auth_read ON learner_participations FOR SELECT TO authenticated USING (TRUE);
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
