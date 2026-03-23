import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/apiClient'

interface Stats {
  total_members: number
  total_learners: number
  total_sessions: number
  total_events: number
}

export function Dashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const [membersRes, learnersRes, sessionsRes, eventsRes] = await Promise.all([
        supabase.from('members').select('id', { count: 'exact', head: true }),
        supabase.from('learners').select('id', { count: 'exact', head: true }),
        supabase.from('schedule_sessions').select('id', { count: 'exact', head: true }),
        supabase.from('events').select('id', { count: 'exact', head: true }),
      ])

      return {
        total_members: membersRes.count ?? 0,
        total_learners: learnersRes.count ?? 0,
        total_sessions: sessionsRes.count ?? 0,
        total_events: eventsRes.count ?? 0,
      } as Stats
    },
  })

  if (isLoading) {
    return (
      <div className="animate-pulse p-8 space-y-4">
        <div className="h-8 bg-gray-200 rounded w-1/4" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-gray-200 rounded" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">管理ダッシュボード</h1>
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">会員数</p>
          <p className="text-3xl font-bold text-blue-600">{stats?.total_members ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">学習者数</p>
          <p className="text-3xl font-bold text-green-600">{stats?.total_learners ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">セッション数</p>
          <p className="text-3xl font-bold text-purple-600">{stats?.total_sessions ?? 0}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-500">イベント数</p>
          <p className="text-3xl font-bold text-orange-600">{stats?.total_events ?? 0}</p>
        </div>
      </div>
    </div>
  )
}
