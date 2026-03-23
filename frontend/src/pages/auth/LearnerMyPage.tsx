import { useQuery, useMutation } from '@tanstack/react-query'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '../../lib/apiClient'
import { fastapi } from '../../lib/apiClient'

interface LearnerProfile {
  id: string
  nickname: string
  origin_country: string
  arrived_japan: string
  japanese_level: string | null
  self_intro: string | null
  profile_media_id: string | null
}

interface LearningRecord {
  id: string
  session_id: string
  member_id: string
  attended: boolean
  study_content: string | null
  learner_level: string | null
  absence_reason: string | null
  note: string | null
  session: {
    date: string
    class_type_id: string
  }
}

export function LearnerMyPage() {
  const navigate = useNavigate()

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['learnerProfile'],
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not authenticated')
      const res = await fastapi.get('/learners/me')
      if (!res.ok) throw new Error('Failed to fetch profile')
      return res.json() as Promise<LearnerProfile>
    },
  })

  const { data: records, isLoading: recordsLoading } = useQuery({
    queryKey: ['myLearningRecords'],
    queryFn: async () => {
      const res = await fastapi.get('/learners/me/records')
      if (!res.ok) throw new Error('Failed to fetch records')
      return res.json() as Promise<LearningRecord[]>
    },
    enabled: !!profile,
  })

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await supabase.auth.signOut()
    },
    onSuccess: () => {
      navigate({ to: '/login' })
    },
  })

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!profile) {
    navigate({ to: '/login' })
    return null
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold">マイページ</h1>
          <button
            onClick={() => logoutMutation.mutate()}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ログアウト
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-8">
        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">プロフィール</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">ニックネーム</dt>
              <dd className="font-medium">{profile.nickname}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">出身国</dt>
              <dd className="font-medium">{profile.origin_country}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">来日年月</dt>
              <dd className="font-medium">{profile.arrived_japan}</dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">日本語レベル</dt>
              <dd className="font-medium">{profile.japanese_level || '-'}</dd>
            </div>
          </dl>
          {profile.self_intro && (
            <div className="mt-4">
              <dt className="text-sm text-gray-500">自己紹介</dt>
              <dd className="mt-1 text-gray-700">{profile.self_intro}</dd>
            </div>
          )}
        </section>

        <section className="bg-white rounded-lg shadow p-6">
          <h2 className="text-lg font-semibold mb-4">学習記録</h2>
          {recordsLoading ? (
            <div className="animate-pulse space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-200 rounded" />
              ))}
            </div>
          ) : records && records.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 border-b">
                  <th className="pb-2">日付</th>
                  <th className="pb-2">出席</th>
                  <th className="pb-2">学習内容</th>
                  <th className="pb-2">メモ</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-b last:border-0">
                    <td className="py-2">{record.session.date}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          record.attended
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {record.attended ? '出席' : '欠席'}
                      </span>
                    </td>
                    <td className="py-2">{record.study_content || '-'}</td>
                    <td className="py-2">{record.note || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">学習記録がありません</p>
          )}
        </section>
      </main>
    </div>
  )
}
