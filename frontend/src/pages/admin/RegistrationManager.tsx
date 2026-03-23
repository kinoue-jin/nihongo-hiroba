import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/apiClient'

interface Session {
  id: string
  date: string
  venue: string
  class_type_id: string
}

interface Member {
  id: string
  name: string
}

interface Learner {
  id: string
  nickname: string
}

interface MemberRegistration {
  id: string
  session_id: string
  member_id: string
  status: 'registered' | 'cancelled'
  member: Member
}

interface LearnerRegistration {
  id: string
  session_id: string
  learner_id: string
  status: 'registered' | 'cancelled'
  learner: Learner
}

export function RegistrationManager() {
  const queryClient = useQueryClient()
  const [selectedSession, setSelectedSession] = useState('')
  const [registrationType, setRegistrationType] = useState<'member' | 'learner'>('member')

  const { data: sessions } = useQuery({
    queryKey: ['sessionsForRegistration'],
    queryFn: async () => {
      const res = await supabase
        .from('schedule_sessions')
        .select('id, date, venue, class_type_id')
        .eq('is_cancelled', false)
        .order('date', { ascending: false })
      return res.data as Session[]
    },
  })

  const { data: memberRegistrations, isLoading: memberLoading } = useQuery({
    queryKey: ['memberRegistrations', selectedSession],
    queryFn: async () => {
      const res = await supabase
        .from('member_session_registrations')
        .select('*, member:member_id(*)')
        .eq('session_id', selectedSession)
      return res.data as MemberRegistration[]
    },
    enabled: !!selectedSession && registrationType === 'member',
  })

  const { data: learnerRegistrations, isLoading: learnerLoading } = useQuery({
    queryKey: ['learnerRegistrations', selectedSession],
    queryFn: async () => {
      const res = await supabase
        .from('learner_session_registrations')
        .select('*, learner:learner_id(*)')
        .eq('session_id', selectedSession)
      return res.data as LearnerRegistration[]
    },
    enabled: !!selectedSession && registrationType === 'learner',
  })

  const { data: availableMembers } = useQuery({
    queryKey: ['availableMembers'],
    queryFn: async () => {
      const res = await supabase.from('members').select('id, name').eq('is_active', true)
      return res.data as Member[]
    },
    enabled: registrationType === 'member',
  })

  const { data: availableLearners } = useQuery({
    queryKey: ['availableLearners'],
    queryFn: async () => {
      const res = await supabase.from('learners').select('id, nickname').eq('invitation_status', 'active')
      return res.data as Learner[]
    },
    enabled: registrationType === 'learner',
  })

  const registerMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'member' | 'learner'; id: string }) => {
      const table = type === 'member' ? 'member_session_registrations' : 'learner_session_registrations'
      const res = await supabase.from(table).insert({
        session_id: selectedSession,
        [type === 'member' ? 'member_id' : 'learner_id']: id,
        registered_at: new Date().toISOString(),
      })
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberRegistrations', 'learnerRegistrations'] })
    },
  })

  const cancelMutation = useMutation({
    mutationFn: async ({ type, id }: { type: 'member' | 'learner'; id: string }) => {
      const table = type === 'member' ? 'member_session_registrations' : 'learner_session_registrations'
      const res = await supabase.from(table).update({ status: 'cancelled' }).eq('id', id)
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['memberRegistrations', 'learnerRegistrations'] })
    },
  })

  const registrations = registrationType === 'member' ? memberRegistrations : learnerRegistrations
  const available = registrationType === 'member' ? availableMembers : availableLearners
  const isLoading = registrationType === 'member' ? memberLoading : learnerLoading

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">登録管理</h1>

      <div className="mb-6 grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">セッションを選択</label>
          <select
            value={selectedSession}
            onChange={(e) => setSelectedSession(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">セッションを選択...</option>
            {sessions?.map((s) => (
              <option key={s.id} value={s.id}>
                {s.date} - {s.venue}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-2">登録種別</label>
          <select
            value={registrationType}
            onChange={(e) => setRegistrationType(e.target.value as 'member' | 'learner')}
            className="w-full border rounded px-3 py-2"
          >
            <option value="member">メンバー</option>
            <option value="learner">学習者</option>
          </select>
        </div>
      </div>

      {selectedSession && (
        <>
          <div className="mb-6 bg-white rounded-lg shadow p-4">
            <h2 className="font-semibold mb-3">新規登録</h2>
            <div className="flex gap-2">
              <select
                id="new-registration"
                className="flex-1 border rounded px-3 py-2"
                value=""
              >
                <option value="">選択...</option>
                {available?.map((p) => (
                  <option key={p.id} value={p.id}>
                    {'name' in p ? p.name : p.nickname}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  const select = document.getElementById('new-registration') as HTMLSelectElement
                  if (select.value) {
                    registerMutation.mutate({ type: registrationType, id: select.value })
                    select.value = ''
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                登録
              </button>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            {isLoading ? (
              <div className="p-8 text-center">読み込み中...</div>
            ) : registrations && registrations.length > 0 ? (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm">名前</th>
                    <th className="px-4 py-3 text-left text-sm">ステータス</th>
                    <th className="px-4 py-3 text-left text-sm">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {registrations.map((reg) => (
                    <tr key={reg.id} className="border-t">
                      <td className="px-4 py-3">
                        {'member' in reg ? reg.member?.name : reg.learner?.nickname}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded text-sm ${
                          reg.status === 'registered' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {reg.status === 'registered' ? '登録' : '取消'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {reg.status === 'registered' && (
                          <button
                            onClick={() => cancelMutation.mutate({ type: registrationType, id: reg.id })}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            取消
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-8 text-center text-gray-500">登録がありません</div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
