// Test data types
export interface TestMember {
  id: string;
  name: string;
  email: string;
  role: string;
  supabaseUserId: string;
}

export interface TestLearner {
  id: string;
  nickname: string;
  email: string;
  originCountry: string;
  arrivedJapan: string;
  invitationStatus: 'pending' | 'invited' | 'active' | 'expired';
  supabaseUserId?: string;
}

export interface TestSession {
  id: string;
  classType: string;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  sessionStatus: 'open' | 'pairing' | 'confirmed' | 'completed' | 'cancelled';
}

export interface TestEvent {
  id: string;
  title: string;
  eventType: string;
  date: string;
  venue: string;
}

// Seed data for E2E tests
export const seedData = {
  members: [
    {
      id: 'member-001',
      name: '田中先生',
      email: 'tanaka@example.com',
      role: 'director',
      supabaseUserId: 'supabase-user-member-001',
    },
    {
      id: 'member-002',
      name: '鈴木担当',
      email: 'suzuki@example.com',
      role: 'staff',
      supabaseUserId: 'supabase-user-member-002',
    },
    {
      id: 'member-003',
      name: '佐藤ボランティア',
      email: 'sato@example.com',
      role: 'volunteer',
      supabaseUserId: 'supabase-user-member-003',
    },
  ] as TestMember[],

  learners: [
    {
      id: 'learner-001',
      nickname: 'John',
      email: 'john@example.com',
      originCountry: 'United States',
      arrivedJapan: '2024-04-01',
      invitationStatus: 'active' as const,
      supabaseUserId: 'supabase-user-learner-001',
    },
    {
      id: 'learner-002',
      nickname: 'Maria',
      email: 'maria@example.com',
      originCountry: 'Spain',
      arrivedJapan: '2024-06-15',
      invitationStatus: 'active' as const,
      supabaseUserId: 'supabase-user-learner-002',
    },
    {
      id: 'learner-003',
      nickname: 'Kim',
      email: 'kim@example.com',
      originCountry: 'Korea',
      arrivedJapan: '2025-01-10',
      invitationStatus: 'pending' as const,
    },
  ] as TestLearner[],

  sessions: [
    {
      id: 'session-001',
      classType: 'monday',
      date: '2026-03-30',
      startTime: '10:00',
      endTime: '12:00',
      venue: '公民館A',
      sessionStatus: 'open' as const,
    },
    {
      id: 'session-002',
      classType: 'saturday',
      date: '2026-03-28',
      startTime: '14:00',
      endTime: '16:00',
      venue: '图书馆',
      sessionStatus: 'confirmed' as const,
    },
  ] as TestSession[],

  events: [
    {
      id: 'event-001',
      title: 'ふるさとを語ろう',
      eventType: 'hometown',
      date: '2026-04-15',
      venue: '公民館大ホール',
    },
    {
      id: 'event-002',
      title: '海外文化講座',
      eventType: 'culture',
      date: '2026-04-20',
      venue: '图书馆',
    },
  ] as TestEvent[],

  news: [
    {
      id: 'news-001',
      title: '活動報告：3月の様子',
      body: '3月の活動風景です。',
      category: 'activity_report',
      isPublished: true,
    },
    {
      id: 'news-002',
      title: 'イベントお知らせ',
      body: '新しいイベントのお知らせです。',
      category: 'notice',
      isPublished: false,
    },
  ],
};

// E2E test seeding functions
// In a real E2E environment, these would seed data to the database
export async function seedTestData(): Promise<void> {
  // For E2E tests, data should already be seeded via database migrations
  // This is a placeholder for environments that need explicit seeding
  console.log('E2E Test: seedTestData called - assuming data is pre-seeded');
}

export async function cleanupTestDataOnly(): Promise<void> {
  // For E2E tests, we don't delete data between tests
  // as tests should be independent and use their own test data
  console.log('E2E Test: cleanupTestDataOnly called - no cleanup needed');
}
