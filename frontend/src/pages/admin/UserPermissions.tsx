import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/apiClient'
import { fastapi } from '../../lib/apiClient'

interface Member {
  id: string
  name: string
  email: string
  admin_role: boolean
  supabase_user_id: string
}

interface Learner {
  id: string
  nickname: string
  email: string
  supabase_user_id: string | null
  invitation_status: string
}

export function UserPermissions() {
  const queryClient = useQueryClient()
  const [searchEmail, setSearchEmail] = useState('')
  const [userType, setUserType] = useState<'member' | 'learner'>('member')

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['membersForPermissions'],
    queryFn: async () => {
      const res = await supabase.from('members').select('*').order('name')
      return res.data as Member[]
    },
  })

  const { data: learners, isLoading: learnersLoading } = useQuery({
    queryKey: ['learnersForPermissions'],
    queryFn: async () => {
      const res = await supabase.from('learners').select('*').order('nickname')
      return res.data as Learner[]
    },
  })

  const updateAdminRoleMutation = useMutation({
    mutationFn: async ({ id, admin_role }: { id: string; admin_role: boolean }) => {
      const res = await supabase.from('members').update({ admin_role }).eq('id', id).select().single()
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['membersForPermissions'] })
    },
  })

  const updateInvitationMutation = useMutation({
    mutationFn: async ({ id, invitation_status }: { id: string; invitation_status: string }) => {
      const res = await supabase.from('learners').update({ invitation_status }).eq('id', id).select().single()
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learnersForPermissions'] })
    },
  })

  const resendInviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fastapi.post('/invite-learner', { email })
      if (!res.ok) throw new Error('Failed to resend invite')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learnersForPermissions'] })
    },
  })

  const data = userType === 'member' ? members : learners
  const isLoading = userType === 'member' ? membersLoading : learnersLoading

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">ユーザー権限管理</h1>

      <div className="mb-6 flex gap-4">
        <select
          value={userType}
          onChange={(e) => setUserType(e.target.value as 'member' | 'learner')}
          className="border rounded px-3 py-2"
        >
          <option value="member">メンバー</option>
          <option value="learner">学習者</option>
        </select>
        <input
          type="email"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          placeholder="メールアドレスで検索..."
          className="border rounded px-3 py-2 flex-1"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">読み込み中...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">名前/ニックネーム</th>
                <th className="px-4 py-3 text-left text-sm">メールアドレス</th>
                <th className="px-4 py-3 text-left text-sm">
                  {userType === 'member' ? '管理者' : 'ステータス'}
                </th>
                <th className="px-4 py-3 text-left text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {data
                ?.filter((u) => !searchEmail || ('email' in u && u.email.includes(searchEmail)))
                .map((user) => (
                  <tr key={'id' in user ? user.id : ''} className="border-t">
                    <td className="px-4 py-3">{'name' in user ? user.name : user.nickname}</td>
                    <td className="px-4 py-3">{'email' in user ? user.email : ''}</td>
                    <td className="px-4 py-3">
                      {userType === 'member' ? (
                        <button
                          onClick={() => {
                            const m = user as Member
                            updateAdminRoleMutation.mutate({ id: m.id, admin_role: !m.admin_role })
                          }}
                          className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                            (user as Member).admin_role ? 'bg-green-500' : 'bg-gray-300'
                          }`}
                        >
                          <span
                            className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                              (user as Member).admin_role ? 'translate-x-6' : ''
                            }`}
                          />
                        </button>
                      ) : (
                        <span className={`px-2 py-1 rounded text-sm ${
                          (user as Learner).invitation_status === 'active'
                            ? 'bg-green-100 text-green-700'
                            : (user as Learner).invitation_status === 'invited'
                            ? 'bg-yellow-100 text-yellow-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}>
                          {(user as Learner).invitation_status}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {userType === 'learner' && (user as Learner).invitation_status === 'pending' && (
                        <button
                          onClick={() => resendInviteMutation.mutate((user as Learner).email)}
                          className="text-blue-600 hover:text-blue-800 text-sm mr-2"
                        >
                          再招待
                        </button>
                      )}
                      {userType === 'learner' && (
                        <select
                          value={(user as Learner).invitation_status}
                          onChange={(e) => updateInvitationMutation.mutate({ id: (user as Learner).id, invitation_status: e.target.value })}
                          className="text-sm border rounded px-2 py-1"
                        >
                          <option value="pending">保留中</option>
                          <option value="invited">招待済み</option>
                          <option value="active">アクティブ</option>
                          <option value="expired">期限切れ</option>
                        </select>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
