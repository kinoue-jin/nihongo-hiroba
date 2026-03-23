import { http, HttpResponse } from 'msw';

// Mock data matching E2E test expectations
const mockNews = [
  {
    id: 'news-001',
    title: '活動報告：3月の様子',
    body: '3月の活動風景です。',
    category_id: 'cat-1',
    published_at: '2026-03-20T10:00:00',
    author: 'member-001',
    is_published: true
  },
  {
    id: 'news-002',
    title: 'イベントお知らせ',
    body: '新しいイベントのお知らせです。',
    category_id: 'cat-2',
    published_at: '2026-03-15T10:00:00',
    author: 'member-001',
    is_published: false
  }
];

const mockEvents = [
  {
    id: 'event-001',
    title: 'ふるさとを語ろう',
    event_type_id: 'event-type-hometown',
    date: '2026-04-15',
    start_time: '14:00',
    end_time: '16:00',
    venue: '公民館大ホール',
    max_capacity: 20,
    actual_attendees: 15,
    host_member_id: 'member-001',
    report_id: null
  },
  {
    id: 'event-002',
    title: '海外文化講座',
    event_type_id: 'event-type-culture',
    date: '2026-04-20',
    start_time: '14:00',
    end_time: '16:00',
    venue: '图书馆',
    max_capacity: 15,
    actual_attendees: 10,
    host_member_id: 'member-002',
    report_id: null
  }
];

const mockSessions = [
  {
    id: 'session-001',
    class_type_id: 'class-type-monday',
    date: '2026-03-30',
    start_time: '10:00',
    end_time: '12:00',
    venue: '公民館A',
    is_cancelled: false,
    cancel_case_id: null,
    cancel_reason: null,
    note: null,
    session_status: 'open'
  },
  {
    id: 'session-002',
    class_type_id: 'class-type-saturday',
    date: '2026-03-28',
    start_time: '14:00',
    end_time: '16:00',
    venue: '图书馆',
    is_cancelled: false,
    cancel_case_id: null,
    cancel_reason: null,
    note: null,
    session_status: 'confirmed'
  }
];

const mockStats = [
  {
    id: 'stats-001',
    period_start: '2026-03-01',
    period_end: '2026-03-31',
    granularity: 'monthly',
    class_type_id: 'class-type-monday',
    total_sessions: 4,
    total_attendees: 32,
    breakdown: { monday: 16, saturday: 16 },
    is_manual_override: false,
    manual_note: null
  }
];

const mockMembers = [
  {
    id: 'member-001',
    name: '田中先生',
    role_id: 'role-director',
    is_active: true,
    profile_media_id: null
  },
  {
    id: 'member-002',
    name: '鈴木担当',
    role_id: 'role-staff',
    is_active: true,
    profile_media_id: null
  }
];

const mockLearners = [
  {
    id: 'learner-001',
    nickname: 'John',
    origin_country: 'United States',
    arrived_japan: '2024-04-01',
    joined_at: '2024-04-01',
    japanese_level: 'N3',
    self_intro: '日本語を勉強しています',
    is_public: true,
    profile_media_id: null,
    supabase_user_id: 'supabase-user-learner-001',
    email: 'john@example.com',
    invitation_status: 'active'
  },
  {
    id: 'learner-002',
    nickname: 'Maria',
    origin_country: 'Spain',
    arrived_japan: '2024-06-15',
    joined_at: '2024-06-15',
    japanese_level: 'N4',
    self_intro: 'Hola!',
    is_public: true,
    profile_media_id: null,
    supabase_user_id: 'supabase-user-learner-002',
    email: 'maria@example.com',
    invitation_status: 'active'
  },
  {
    id: 'learner-003',
    nickname: 'Kim',
    origin_country: 'Korea',
    arrived_japan: '2025-01-10',
    joined_at: '2025-01-10',
    japanese_level: 'N5',
    self_intro: 'Annyeonghaseyo',
    is_public: false,
    profile_media_id: null,
    email: 'kim@example.com',
    invitation_status: 'pending'
  }
];

const mockHometownStories = [
  {
    id: 'story-001',
    speaker_name: '鈴木さん',
    origin_city: 'ニューヨーク',
    origin_country: 'アメリカ',
    arrived_japan: '2010-04-01',
    joined_at: '2015-04-01',
    content: '私の故郷の紹介',
    topics: ['文化', '食'],
    event_id: 'event-001'
  }
];

const mockCulturalLectures = [
  {
    id: 'lecture-001',
    title: '韓国の文化',
    event_id: 'event-002',
    countries: ['韓国', '日本']
  }
];

export const handlers = [
  // Supabase PostgREST handlers
  http.get('*/rest/v1/news', async ({ request }) => {
    const url = new URL(request.url);
    const idFilter = url.searchParams.get('id');
    const publishedFilter = url.searchParams.get('is_published');

    let result = [...mockNews];

    // Filter by id if present (e.g., id=eq.news-001)
    if (idFilter) {
      const match = idFilter.match(/eq\.(\w+)/);
      if (match) {
        result = result.filter(n => n.id === match[1]);
      }
    }

    // Filter by is_published if present
    if (publishedFilter === 'true') {
      result = result.filter(n => n.is_published);
    }

    return HttpResponse.json(result);
  }),

  http.get('*/rest/v1/events', () => {
    return HttpResponse.json(mockEvents);
  }),

  http.get('*/rest/v1/schedule_sessions', () => {
    return HttpResponse.json(mockSessions);
  }),

  http.get('*/rest/v1/stats', () => {
    return HttpResponse.json(mockStats);
  }),

  http.get('*/rest/v1/hometown_stories', () => {
    return HttpResponse.json(mockHometownStories);
  }),

  http.get('*/rest/v1/cultural_lectures', () => {
    return HttpResponse.json(mockCulturalLectures);
  }),

  http.get('*/rest/v1/members', () => {
    return HttpResponse.json(mockMembers);
  }),

  http.get('*/rest/v1/public_members', () => {
    return HttpResponse.json(mockMembers);
  }),

  http.get('*/rest/v1/learners', () => {
    return HttpResponse.json(mockLearners);
  }),

  http.get('*/rest/v1/public_learners', () => {
    return HttpResponse.json(mockLearners.filter(l => l.is_public));
  }),

  // Supabase Auth - signInWithPassword
  // POST /auth/v1/token?grant_type=password&apikey=xxx
  http.post('*/auth/v1/token*', async ({ request }) => {
    const url = new URL(request.url);
    const grantType = url.searchParams.get('grant_type');

    // Handle password grant type
    if (grantType === 'password') {
      // Return mock session for any email/password combination in mock mode
      return HttpResponse.json({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'user-mock-001',
          email: 'learner1@test.com',
          role: 'learner',
          email_confirmed_at: new Date().toISOString(),
          app_metadata: {
            provider: 'email',
            role: 'learner'
          },
          user_metadata: {
            nickname: 'learner1'
          }
        },
        session: {
          id: 'session-mock-001',
          access_token: 'mock-access-token',
          token_type: 'bearer',
          expires_at: Math.floor(Date.now() / 1000) + 3600,
          expires_in: 3600,
          refresh_token: 'mock-refresh-token',
          user: {
            id: 'user-mock-001',
            email: 'learner1@test.com',
            role: 'learner'
          }
        }
      }, {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }

    // Handle refresh token grant
    if (grantType === 'refresh_token') {
      return HttpResponse.json({
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_in: 3600,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'user-mock-001',
          email: 'learner1@test.com',
          role: 'learner'
        }
      });
    }

    return HttpResponse.json({ error: 'invalid_grant', message: 'Invalid login credentials' }, { status: 400 });
  }),

  // Supabase Auth - getSession
  http.get('*/auth/v1/session', () => {
    return HttpResponse.json({
      access_token: 'mock-access-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'mock-refresh-token',
      user: {
        id: 'user-mock-001',
        email: 'learner1@test.com',
        role: 'learner',
        email_confirmed_at: new Date().toISOString(),
        app_metadata: {
          provider: 'email',
          role: 'learner'
        },
        user_metadata: {
          nickname: 'learner1'
        }
      },
      session: {
        id: 'session-mock-001',
        access_token: 'mock-access-token',
        token_type: 'bearer',
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        expires_in: 3600,
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'user-mock-001',
          email: 'learner1@test.com',
          role: 'learner'
        }
      }
    });
  }),

  // Supabase Auth - logout
  http.post('*/auth/v1/logout', () => {
    return new HttpResponse(null, { status: 204 });
  }),

  // FastAPI handlers
  http.post('*/invite-learner', async ({ request }) => {
    const body = await request.json() as { email: string };
    return HttpResponse.json({
      id: 'learner-new',
      email: body.email,
      invitation_status: 'pending'
    });
  }),

  http.post('*/generate-pairings', async () => {
    return HttpResponse.json({
      session_id: 'session-001',
      pairings: []
    });
  }),

  http.post('*/media/upload', async () => {
    return HttpResponse.json({
      id: 'media-new',
      url: 'https://example.com/media/new.jpg'
    });
  }),

  http.get('*/media/:id/signed-url', ({ params }) => {
    return HttpResponse.json({
      url: `https://example.com/media/${params.id}?signed=true`
    });
  })
];
