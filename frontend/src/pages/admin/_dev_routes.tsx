import { ProtectedRoute } from '../../components/ProtectedRoute'
import { Dashboard } from './Dashboard'
import { PairingManager } from './PairingManager'
import { LearningRecords } from './LearningRecords'
import { LearnerManager } from './LearnerManager'
import { NewsManager } from './NewsManager'
import { EventManager } from './EventManager'
import { ScheduleManager } from './ScheduleManager'
import { RegistrationManager } from './RegistrationManager'
import { MemberManager } from './MemberManager'
import { MediaManager } from './MediaManager'
import { StatInput } from './StatInput'
import { MasterManager } from './MasterManager'
import { UserPermissions } from './UserPermissions'

export const adminRoutes = [
  {
    path: '/admin',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><Dashboard /></ProtectedRoute>,
  },
  {
    path: '/admin/pairing',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><PairingManager /></ProtectedRoute>,
  },
  {
    path: '/admin/records',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><LearningRecords /></ProtectedRoute>,
  },
  {
    path: '/admin/learners',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><LearnerManager /></ProtectedRoute>,
  },
  {
    path: '/admin/news',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><NewsManager /></ProtectedRoute>,
  },
  {
    path: '/admin/events',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><EventManager /></ProtectedRoute>,
  },
  {
    path: '/admin/schedule',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><ScheduleManager /></ProtectedRoute>,
  },
  {
    path: '/admin/registrations',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><RegistrationManager /></ProtectedRoute>,
  },
  {
    path: '/admin/members',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><MemberManager /></ProtectedRoute>,
  },
  {
    path: '/admin/media',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><MediaManager /></ProtectedRoute>,
  },
  {
    path: '/admin/stats',
    element: <ProtectedRoute allowedRoles={['admin', 'staff']}><StatInput /></ProtectedRoute>,
  },
  {
    path: '/admin/master',
    element: <ProtectedRoute allowedRoles={['admin']}><MasterManager /></ProtectedRoute>,
  },
  {
    path: '/admin/permissions',
    element: <ProtectedRoute allowedRoles={['admin']}><UserPermissions /></ProtectedRoute>,
  },
]
