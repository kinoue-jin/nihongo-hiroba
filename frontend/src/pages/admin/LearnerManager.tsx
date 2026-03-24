import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fastapi } from '../../lib/apiClient'

interface Learner {
  id: string
  nickname: string
  origin_country: string
  arrived_japan: string
  japanese_level: string | null
  invitation_status: 'pending' | 'invited' | 'active' | 'expired'
  is_public: boolean
  email: string
}

export function LearnerManager() {
  const queryClient = useQueryClient()
  const [searchEmail, setSearchEmail] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')

  const { data: learners, isLoading } = useQuery({
    queryKey: ['learners'],
    queryFn: async () => {
      const res = await fastapi.get('/learners/')
      if (!res.ok) throw new Error('Failed to fetch learners')
      return (await res.json()) as Learner[]
    },
  })

  const inviteMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await fastapi.post('/invite-learner', { email })
      if (!res.ok) throw new Error('Failed to invite learner')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learners'] })
      setInviteEmail('')
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const res = await fastapi.patch(`/learners/${id}`, { invitation_status: status })
      if (!res.ok) throw new Error('Failed to update status')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learners'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fastapi.delete(`/learners/${id}`)
      if (!res.ok) throw new Error('Failed to delete learner')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learners'] })
    },
  })

  const statusLabels: Record<string, { label: string; color: string }> = {
    pending: { label: '保留中', color: 'bg-gray-100 text-gray-700' },
    invited: { label: '招待済み', color: 'bg-yellow-100 text-yellow-700' },
    active: { label: 'アクティブ', color: 'bg-green-100 text-green-700' },
    expired: { label: '期限切れ', color: 'bg-red-100 text-red-700' },
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">学習者管理</h1>

      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-4">新規招待</h2>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            if (inviteEmail) inviteMutation.mutate(inviteEmail)
          }}
          className="flex gap-4"
        >
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="招待するメールアドレス"
            className="flex-1 border rounded px-3 py-2"
            required
          />
          <button
            type="submit"
            disabled={inviteMutation.isPending}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {inviteMutation.isPending ? '招待中...' : '招待する'}
          </button>
        </form>
        {inviteMutation.isError && (
          <p className="mt-2 text-red-600 text-sm">招待に失敗しました</p>
        )}
        {inviteMutation.isSuccess && (
          <p className="mt-2 text-green-600 text-sm">招待を送信しました</p>
        )}
      </div>

      <div className="mb-6">
        <input
          type="email"
          value={searchEmail}
          onChange={(e) => setSearchEmail(e.target.value)}
          placeholder="メールアドレスで検索..."
          className="border rounded px-3 py-2 w-64"
        />
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">読み込み中...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">メールアドレス</th>
                <th className="px-4 py-3 text-left text-sm">ニックネーム</th>
                <th className="px-4 py-3 text-left text-sm">ステータス</th>
                <th className="px-4 py-3 text-left text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {learners
                ?.filter((l) => !searchEmail || l.email.includes(searchEmail))
                .map((learner) => (
                  <tr key={learner.id} className="border-t">
                    <td className="px-4 py-3">{learner.email}</td>
                    <td className="px-4 py-3">{learner.nickname}</td>
                    <td className="px-4 py-3">
                      <select
                        value={learner.invitation_status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({ id: learner.id, status: e.target.value })
                        }
                        className={`px-2 py-1 rounded text-sm ${statusLabels[learner.invitation_status]?.color ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        <option value="pending">保留中</option>
                        <option value="invited">招待済み</option>
                        <option value="active">アクティブ</option>
                        <option value="expired">期限切れ</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => {
                          if (confirm('この学習者を削除しますか？')) {
                            deleteMutation.mutate(learner.id)
                          }
                        }}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        削除
                      </button>
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
