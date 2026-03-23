/**
 * Auto-generated types from Pydantic schemas
 * This file should be regenerated when schemas change
 */

// Base types
export type DateString = string; // YYYY-MM-DD
export type TimeString = string; // HH:MM
export type DateTimeString = string; // YYYY-MM-DDTHH:MM:SS

// Master items
export interface MasterItem {
  id?: string;
  group_key: string;
  label: string;
  value: string;
  order: number;
  is_active: boolean;
}

export interface MasterItemResponse {
  id: string;
  group_key: string;
  label: string;
  value: string;
  order: number;
  is_active: boolean;
}

// Member
export interface Member {
  id?: string;
  name: string;
  role_id: string;
  contact?: string;
  joined_at?: DateString;
  is_active: boolean;
  profile_media_id?: string;
  supabase_user_id: string;
  email: string;
  admin_role: boolean;
}

export interface MemberCreate {
  name: string;
  role_id: string;
  contact?: string;
  joined_at?: DateString;
  is_active: boolean;
  profile_media_id?: string;
  supabase_user_id: string;
  email: string;
  admin_role: boolean;
}

export interface MemberUpdate {
  name?: string;
  role_id?: string;
  contact?: string;
  joined_at?: DateString;
  is_active?: boolean;
  profile_media_id?: string;
  admin_role?: boolean;
}

export interface PublicMemberResponse {
  id: string;
  name: string;
  role_id: string;
  is_active: boolean;
  profile_media_id?: string;
}

// Learner
export type InvitationStatus = "pending" | "invited" | "active" | "expired";

export interface Learner {
  id?: string;
  nickname: string;
  origin_country: string;
  arrived_japan: DateString;
  joined_at: DateString;
  japanese_level?: string;
  self_intro?: string;
  is_public: boolean;
  profile_media_id?: string;
  supabase_user_id?: string;
  email: string;
  invitation_status: InvitationStatus;
}

export interface LearnerCreate {
  nickname: string;
  origin_country: string;
  arrived_japan: DateString;
  joined_at: DateString;
  japanese_level?: string;
  self_intro?: string;
  is_public: boolean;
  profile_media_id?: string;
  email: string;
  supabase_user_id?: string;
  invitation_status: InvitationStatus;
}

export interface LearnerUpdate {
  nickname?: string;
  origin_country?: string;
  arrived_japan?: DateString;
  joined_at?: DateString;
  japanese_level?: string;
  self_intro?: string;
  is_public?: boolean;
  profile_media_id?: string;
  invitation_status?: InvitationStatus;
}

export interface PublicLearnerResponse {
  id: string;
  nickname: string;
  origin_country: string;
  arrived_japan: DateString;
  japanese_level?: string;
  self_intro?: string;
  profile_media_id?: string;
}

// News
export interface News {
  id?: string;
  title: string;
  body: string;
  category_id: string;
  published_at: DateTimeString;
  author: string;
  is_published: boolean;
}

export interface NewsCreate {
  title: string;
  body: string;
  category_id: string;
  published_at: DateTimeString;
  author: string;
  is_published: boolean;
}

export interface NewsUpdate {
  title?: string;
  body?: string;
  category_id?: string;
  published_at?: DateTimeString;
  author?: string;
  is_published?: boolean;
}

// Event
export interface Event {
  id?: string;
  title: string;
  event_type_id: string;
  date: DateString;
  start_time: TimeString;
  end_time: TimeString;
  venue: string;
  max_capacity?: number;
  actual_attendees?: number;
  host_member_id: string;
  report_id?: string;
}

export interface EventCreate {
  title: string;
  event_type_id: string;
  date: DateString;
  start_time: TimeString;
  end_time: TimeString;
  venue: string;
  max_capacity?: number;
  host_member_id: string;
}

export interface EventUpdate {
  title?: string;
  event_type_id?: string;
  date?: DateString;
  start_time?: TimeString;
  end_time?: TimeString;
  venue?: string;
  max_capacity?: number;
  actual_attendees?: number;
  host_member_id?: string;
  report_id?: string;
}

// Schedule Session
export type SessionStatus = "open" | "pairing" | "confirmed" | "completed" | "cancelled";

export interface ScheduleSession {
  id?: string;
  class_type_id: string;
  date: DateString;
  start_time: TimeString;
  end_time: TimeString;
  venue: string;
  is_cancelled: boolean;
  cancel_case_id?: string;
  cancel_reason?: string;
  note?: string;
  session_status: SessionStatus;
}

export interface SessionCreate {
  class_type_id: string;
  date: DateString;
  start_time: TimeString;
  end_time: TimeString;
  venue: string;
}

export interface SessionUpdate {
  class_type_id?: string;
  date?: DateString;
  start_time?: TimeString;
  end_time?: TimeString;
  venue?: string;
  is_cancelled?: boolean;
  cancel_case_id?: string;
  cancel_reason?: string;
  note?: string;
  session_status?: SessionStatus;
}

// Learning Record
export interface LearningRecord {
  id?: string;
  session_id: string;
  member_id: string;
  learner_id: string;
  study_content?: string;
  learner_level?: string;
  attended: boolean;
  absence_reason?: string;
  note?: string;
}

export interface LearningRecordCreate {
  session_id: string;
  member_id: string;
  learner_id: string;
  study_content?: string;
  learner_level?: string;
  attended: boolean;
  absence_reason?: string;
  note?: string;
}

// Stat
export type Granularity = "monthly" | "yearly";

export interface Stat {
  id?: string;
  period_start: DateString;
  period_end: DateString;
  granularity: Granularity;
  class_type_id: string;
  total_sessions: number;
  total_attendees: number;
  breakdown: Record<string, number>;
  is_manual_override: boolean;
  manual_note?: string;
}

export interface StatCreate {
  period_start: DateString;
  period_end: DateString;
  granularity: Granularity;
  class_type_id: string;
  total_sessions: number;
  total_attendees: number;
  breakdown: Record<string, number>;
  is_manual_override: boolean;
  manual_note?: string;
}

// Hometown Story
export interface HometownStory {
  id?: string;
  speaker_name: string;
  origin_city: string;
  origin_country: string;
  arrived_japan: DateString;
  joined_at: DateString;
  content: string;
  topics: string[];
  event_id: string;
}

export interface HometownStoryCreate {
  speaker_name: string;
  origin_city: string;
  origin_country: string;
  arrived_japan: DateString;
  joined_at: DateString;
  content: string;
  topics: string[];
  event_id: string;
}

// Cultural Lecture
export interface CulturalLecture {
  id?: string;
  title: string;
  event_id: string;
  countries: string[];
}

export interface CulturalLectureCreate {
  title: string;
  event_id: string;
  countries: string[];
}

// Media
export type MimeType = "image/jpeg" | "image/png" | "image/webp" | "application/pdf";

export interface Media {
  id?: string;
  filename: string;
  url: string;
  thumbnail_url?: string;
  mime_type: MimeType;
  size: number;
  caption?: string;
  credit?: string;
  taken_at?: DateString;
  uploaded_at: DateTimeString;
  uploaded_by_member_id?: string;
  uploaded_by_learner_id?: string;
  is_public: boolean;
}

export interface MediaCreate {
  filename: string;
  url: string;
  thumbnail_url?: string;
  mime_type: MimeType;
  size: number;
  caption?: string;
  credit?: string;
  taken_at?: DateString;
  uploaded_at: DateTimeString;
  uploaded_by_member_id?: string;
  uploaded_by_learner_id?: string;
  is_public: boolean;
}

// Session Pairing
export type PairingType = "auto" | "manual";
export type PairingStatus = "proposed" | "confirmed" | "cancelled";

export interface SessionPairing {
  id?: string;
  session_id: string;
  member_id: string;
  learner_id: string;
  pairing_type: PairingType;
  auto_score?: number;
  status: PairingStatus;
  confirmed_by?: string;
  confirmed_at?: DateTimeString;
  note?: string;
}

export interface SessionPairingCreate {
  session_id: string;
  member_id: string;
  learner_id: string;
  pairing_type: PairingType;
  auto_score?: number;
  status: PairingStatus;
  confirmed_by?: string;
  confirmed_at?: DateTimeString;
  note?: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  page_size: number;
}
