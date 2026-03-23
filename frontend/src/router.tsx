import {
  createRouter,
  createRootRoute,
  createRoute,
  Outlet
} from '@tanstack/react-router';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { ProtectedRoute } from './components/ProtectedRoute';

// Public pages
import { Top } from './pages/public/Top';
import { EventCalendar } from './pages/public/EventCalendar';
import { NewsList } from './pages/public/NewsList';
import { EventDetail } from './pages/public/EventDetail';
import { NewsDetail } from './pages/public/NewsDetail';
import { About } from './pages/public/About';
import { Contact } from './pages/public/Contact';

// Auth pages
import { LearnerLogin } from './pages/auth/LearnerLogin';
import { LearnerMyPage } from './pages/auth/LearnerMyPage';

// Admin pages
import { Dashboard } from './pages/admin/Dashboard';
import { PairingManager } from './pages/admin/PairingManager';
import { LearningRecords } from './pages/admin/LearningRecords';
import { LearnerManager } from './pages/admin/LearnerManager';
import { NewsManager } from './pages/admin/NewsManager';
import { EventManager } from './pages/admin/EventManager';
import { ScheduleManager } from './pages/admin/ScheduleManager';
import { RegistrationManager } from './pages/admin/RegistrationManager';
import { MemberManager } from './pages/admin/MemberManager';
import { MediaManager } from './pages/admin/MediaManager';
import { StatInput } from './pages/admin/StatInput';
import { MasterManager } from './pages/admin/MasterManager';
import { UserPermissions } from './pages/admin/UserPermissions';

// Root layout
const rootRoute = createRootRoute({
  component: () => (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
});

// Index route (Top page)
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Top
});

// Events list
const eventsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events',
  component: EventListPage
});

// Event detail
const eventDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/events/$eventId',
  component: EventDetail
});

// Calendar
const calendarRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/calendar',
  component: EventCalendar
});

// News list
const publicNewsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/news',
  component: NewsList
});

// News detail
const newsDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/news/$newsId',
  component: NewsDetail
});

// About
const aboutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/about',
  component: About
});

// Contact
const contactRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/contact',
  component: Contact
});

// Placeholder component for event list
function EventListPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">イベント一覧</h1>
      <EventCalendar />
    </div>
  );
}

// Auth routes
const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/login',
  component: LearnerLogin
});

const learnerMyPageRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/learner/mypage',
  component: () => <ProtectedRoute allowedRoles={['learner']}><LearnerMyPage /></ProtectedRoute>
});

// Admin layout route
const adminLayoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/admin',
  component: () => <ProtectedRoute allowedRoles={['admin', 'staff']}><Outlet /></ProtectedRoute>
});

const adminIndexRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: '/',
  component: Dashboard
});

const pairingRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'pairing',
  component: PairingManager
});

const recordsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'records',
  component: LearningRecords
});

const learnersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'learners',
  component: LearnerManager
});

const adminNewsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'news',
  component: NewsManager
});

const adminEventsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'events',
  component: EventManager
});

const scheduleRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'schedule',
  component: ScheduleManager
});

const registrationsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'registrations',
  component: RegistrationManager
});

const membersRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'members',
  component: MemberManager
});

const mediaRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'media',
  component: MediaManager
});

const statsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'stats',
  component: StatInput
});

const masterRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'master',
  component: () => <ProtectedRoute allowedRoles={['admin']}><MasterManager /></ProtectedRoute>
});

const permissionsRoute = createRoute({
  getParentRoute: () => adminLayoutRoute,
  path: 'permissions',
  component: () => <ProtectedRoute allowedRoles={['admin']}><UserPermissions /></ProtectedRoute>
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  eventsRoute,
  eventDetailRoute,
  calendarRoute,
  publicNewsRoute,
  newsDetailRoute,
  aboutRoute,
  contactRoute,
  loginRoute,
  learnerMyPageRoute,
  adminLayoutRoute.addChildren([
    adminIndexRoute,
    pairingRoute,
    recordsRoute,
    learnersRoute,
    adminNewsRoute,
    adminEventsRoute,
    scheduleRoute,
    registrationsRoute,
    membersRoute,
    mediaRoute,
    statsRoute,
    masterRoute,
    permissionsRoute
  ])
]);

export const router = createRouter({ routeTree });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
