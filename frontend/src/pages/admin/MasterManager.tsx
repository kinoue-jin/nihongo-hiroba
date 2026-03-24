import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fastapi } from '../../lib/apiClient'

interface MasterItem {
  id: string
  group_key: string
  label: string
  value: string
  order: number
  is_active: boolean
}

const GROUP_LABELS: Record<string, string> = {
  news_category: 'ニュースカテゴリ',
  event_type: 'イベント種別',
  cancel_case: '取消理由',
  member_role: '会員役職',
  media_role: 'メディア役割',
  class_type: 'クラス種別',
}

export function MasterManager() {
  const queryClient = useQueryClient()
  const [selectedGroup, setSelectedGroup] = useState<string>('news_category')

  const { data: items, isLoading } = useQuery({
    queryKey: ['masterItems', selectedGroup],
    queryFn: async () => {
      const res = await fastapi.get(`/master/?group_key=${selectedGroup}`)
      if (!res.ok) throw new Error('Failed to fetch master items')
      return (await res.json()) as MasterItem[]
    },
  })

  const updateActiveMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const res = await fastapi.patch(`/master/${id}`, { is_active })
      if (!res.ok) throw new Error('Failed to update master item')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['masterItems'] })
    },
  })

  const groups = Object.keys(GROUP_LABELS)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">マスタ管理</h1>

      <div className="mb-6">
        <select
          value={selectedGroup}
          onChange={(e) => setSelectedGroup(e.target.value)}
          className="border rounded px-3 py-2"
        >
          {groups.map((g) => (
            <option key={g} value={g}>{GROUP_LABELS[g]}</option>
          ))}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">読み込み中...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">表示順</th>
                <th className="px-4 py-3 text-left text-sm">ラベル</th>
                <th className="px-4 py-3 text-left text-sm">値</th>
                <th className="px-4 py-3 text-left text-sm">アクティブ</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="px-4 py-3">{item.order}</td>
                  <td className="px-4 py-3">{item.label}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{item.value}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => updateActiveMutation.mutate({ id: item.id, is_active: !item.is_active })}
                      className={`relative inline-block w-12 h-6 rounded-full transition-colors ${
                        item.is_active ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span
                        className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${
                          item.is_active ? 'translate-x-6' : ''
                        }`}
                      />
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
