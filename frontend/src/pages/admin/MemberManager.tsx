import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fastapi } from '../../lib/apiClient'

interface MemberRole {
  id: string
  label: string
  value: string
}

interface ClassType {
  id: string
  label: string
  value: string
}

interface Member {
  id: string
  name: string
  role_id: string
  role?: MemberRole
  contact: string | null
  joined_at: string | null
  is_active: boolean
  email: string
  class_types?: ClassType[]
}

export function MemberManager() {
  const queryClient = useQueryClient()
  const [editingMember, setEditingMember] = useState<Member | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { data: memberRoles } = useQuery({
    queryKey: ['masterItems', 'member_role'],
    queryFn: async () => {
      const res = await fastapi.get('/master/?group_key=member_role&is_active=true')
      if (!res.ok) throw new Error('Failed to fetch member roles')
      return (await res.json()) as MemberRole[]
    },
  })

  const { data: classTypes } = useQuery({
    queryKey: ['masterItems', 'class_type'],
    queryFn: async () => {
      const res = await fastapi.get('/master/?group_key=class_type&is_active=true')
      if (!res.ok) throw new Error('Failed to fetch class types')
      return (await res.json()) as ClassType[]
    },
  })

  const { data: members, isLoading } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await fastapi.get('/members/')
      if (!res.ok) throw new Error('Failed to fetch members')
      return (await res.json()) as Member[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Member> & { class_type_ids: string[] }) => {
      const { class_type_ids, ...memberData } = data
      const res = await fastapi.post('/members/', memberData)
      if (!res.ok) throw new Error('Failed to create member')
      const newMember = await res.json()
      if (class_type_ids.length > 0) {
        await fastapi.post(`/members/${newMember.id}/class-types`, { class_type_ids })
      }
      return newMember
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setIsCreating(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Member> & { id: string; class_type_ids: string[] }) => {
      const { id, class_type_ids, ...memberData } = data
      const res = await fastapi.patch(`/members/${id}`, memberData)
      if (!res.ok) throw new Error('Failed to update member')
      await fastapi.delete(`/members/${id}/class-types`)
      if (class_type_ids.length > 0) {
        await fastapi.post(`/members/${id}/class-types`, { class_type_ids })
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
      setEditingMember(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fastapi.patch(`/members/${id}`, { is_active: false })
      if (!res.ok) throw new Error('Failed to deactivate member')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['members'] })
    },
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">メンバー管理</h1>

      <button
        onClick={() => setIsCreating(true)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        新規作成
      </button>

      {(isCreating || editingMember) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {isCreating ? '新規メンバー' : 'メンバーを編集'}
            </h2>
            <MemberForm
              member={editingMember}
              memberRoles={memberRoles ?? []}
              classTypes={classTypes ?? []}
              onSubmit={(data) => {
                if (isCreating) {
                  createMutation.mutate(data)
                } else if (editingMember) {
                  updateMutation.mutate({ ...data, id: editingMember.id })
                }
              }}
              onCancel={() => { setIsCreating(false); setEditingMember(null) }}
              isLoading={createMutation.isPending || updateMutation.isPending}
            />
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">読み込み中...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">名前</th>
                <th className="px-4 py-3 text-left text-sm">役職</th>
                <th className="px-4 py-3 text-left text-sm">メールアドレス</th>
                <th className="px-4 py-3 text-left text-sm">ステータス</th>
                <th className="px-4 py-3 text-left text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {members?.map((member) => (
                <tr key={member.id} className="border-t">
                  <td className="px-4 py-3">{member.name}</td>
                  <td className="px-4 py-3">{member.role?.label ?? '-'}</td>
                  <td className="px-4 py-3">{member.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${member.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {member.is_active ? 'アクティブ' : '非アクティブ'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditingMember(member)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">編集</button>
                    {member.is_active && (
                      <button onClick={() => { if (confirm('非アクティブにしますか？')) deleteMutation.mutate(member.id) }} className="text-red-600 hover:text-red-800 text-sm">非アクティブ化</button>
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

function MemberForm({
  member,
  memberRoles,
  classTypes,
  onSubmit,
  onCancel,
  isLoading,
}: {
  member: Member | null
  memberRoles: MemberRole[]
  classTypes: ClassType[]
  onSubmit: (data: Partial<Member> & { class_type_ids: string[] }) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [name, setName] = useState(member?.name ?? '')
  const [roleId, setRoleId] = useState(member?.role_id ?? '')
  const [contact, setContact] = useState(member?.contact ?? '')
  const [joinedAt, setJoinedAt] = useState(member?.joined_at ?? '')
  const [email, setEmail] = useState(member?.email ?? '')
  const [classTypeIds, setClassTypeIds] = useState<string[]>(
    member?.class_types?.map((ct) => ct.id) ?? []
  )

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ name, role_id: roleId, contact: contact || null, joined_at: joinedAt || null, email, class_type_ids: classTypeIds }) }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">名前</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">役職</label>
        <select value={roleId} onChange={(e) => setRoleId(e.target.value)} className="w-full border rounded px-3 py-2" required>
          <option value="">選択...</option>
          {memberRoles.map((r) => <option key={r.id} value={r.id}>{r.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">メールアドレス</label>
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">連絡先</label>
        <input type="text" value={contact} onChange={(e) => setContact(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">入会日</label>
        <input type="date" value={joinedAt} onChange={(e) => setJoinedAt(e.target.value)} className="w-full border rounded px-3 py-2" />
      </div>
      <div>
        <label className="block text-sm font-medium mb-2">クラス種別</label>
        <div className="flex flex-wrap gap-2">
          {classTypes.map((ct) => (
            <label key={ct.id} className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={classTypeIds.includes(ct.id)}
                onChange={(e) => {
                  if (e.target.checked) {
                    setClassTypeIds([...classTypeIds, ct.id])
                  } else {
                    setClassTypeIds(classTypeIds.filter((id) => id !== ct.id))
                  }
                }}
              />
              <span className="text-sm">{ct.label}</span>
            </label>
          ))}
        </div>
      </div>
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">キャンセル</button>
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
