import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/apiClient'

interface ClassType {
  id: string
  label: string
  value: string
}

interface Stat {
  id: string
  period_start: string
  period_end: string
  granularity: 'monthly' | 'yearly'
  class_type_id: string
  class_type?: ClassType
  total_sessions: number
  total_attendees: number
  breakdown: Record<string, number>
  is_manual_override: boolean
  manual_note: string | null
}

export function StatInput() {
  const queryClient = useQueryClient()
  const [editingStat, setEditingStat] = useState<Stat | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { data: classTypes } = useQuery({
    queryKey: ['masterItems', 'class_type'],
    queryFn: async () => {
      const res = await supabase.from('master_items').select('*').eq('group_key', 'class_type').eq('is_active', true)
      return res.data as ClassType[]
    },
  })

  const { data: stats, isLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: async () => {
      const res = await supabase
        .from('stats')
        .select('*, class_type:class_type_id(*)')
        .order('period_start', { ascending: false })
      return res.data as Stat[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Stat>) => {
      const res = await supabase.from('stats').insert(data).select().single()
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setIsCreating(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Stat> & { id: string }) => {
      const { id, ...rest } = data
      const res = await supabase.from('stats').update(rest).eq('id', id).select().single()
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] })
      setEditingStat(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('stats').delete().eq('id', id)
      if (res.error) throw res.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stats'] })
    },
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">統計データ入力</h1>

      <button
        onClick={() => setIsCreating(true)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        新規作成
      </button>

      {(isCreating || editingStat) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {isCreating ? '新規統計' : '統計を編集'}
            </h2>
            <StatForm
              stat={editingStat}
              classTypes={classTypes ?? []}
              onSubmit={(data) => {
                if (isCreating) {
                  createMutation.mutate(data)
                } else if (editingStat) {
                  updateMutation.mutate({ ...data, id: editingStat.id })
                }
              }}
              onCancel={() => { setIsCreating(false); setEditingStat(null) }}
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
                <th className="px-4 py-3 text-left text-sm">期間</th>
                <th className="px-4 py-3 text-left text-sm">粒度</th>
                <th className="px-4 py-3 text-left text-sm">クラス</th>
                <th className="px-4 py-3 text-left text-sm">セッション数</th>
                <th className="px-4 py-3 text-left text-sm">参加者数</th>
                <th className="px-4 py-3 text-left text-sm">手動上書き</th>
                <th className="px-4 py-3 text-left text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {stats?.map((stat) => (
                <tr key={stat.id} className="border-t">
                  <td className="px-4 py-3">{stat.period_start} ~ {stat.period_end}</td>
                  <td className="px-4 py-3">{stat.granularity === 'monthly' ? '月次' : '年次'}</td>
                  <td className="px-4 py-3">{stat.class_type?.label ?? '-'}</td>
                  <td className="px-4 py-3">{stat.total_sessions}</td>
                  <td className="px-4 py-3">{stat.total_attendees}</td>
                  <td className="px-4 py-3">
                    {stat.is_manual_override && (
                      <span className="px-2 py-1 rounded text-sm bg-yellow-100 text-yellow-700">
                        手動
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditingStat(stat)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">編集</button>
                    <button onClick={() => { if (confirm('削除しますか？')) deleteMutation.mutate(stat.id) }} className="text-red-600 hover:text-red-800 text-sm">削除</button>
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

function StatForm({
  stat,
  classTypes,
  onSubmit,
  onCancel,
  isLoading,
}: {
  stat: Stat | null
  classTypes: ClassType[]
  onSubmit: (data: Partial<Stat>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [periodStart, setPeriodStart] = useState(stat?.period_start ?? '')
  const [periodEnd, setPeriodEnd] = useState(stat?.period_end ?? '')
  const [granularity, setGranularity] = useState<'monthly' | 'yearly'>(stat?.granularity ?? 'monthly')
  const [classTypeId, setClassTypeId] = useState(stat?.class_type_id ?? '')
  const [totalSessions, setTotalSessions] = useState(stat?.total_sessions ?? 0)
  const [totalAttendees, setTotalAttendees] = useState(stat?.total_attendees ?? 0)
  const [isManualOverride, setIsManualOverride] = useState(stat?.is_manual_override ?? false)
  const [manualNote, setManualNote] = useState(stat?.manual_note ?? '')

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ period_start: periodStart, period_end: periodEnd, granularity, class_type_id: classTypeId, total_sessions: totalSessions, total_attendees: totalAttendees, breakdown: {}, is_manual_override: isManualOverride, manual_note: isManualOverride ? manualNote : null }) }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">開始日</label>
          <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">終了日</label>
          <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">粒度</label>
          <select value={granularity} onChange={(e) => setGranularity(e.target.value as 'monthly' | 'yearly')} className="w-full border rounded px-3 py-2" required>
            <option value="monthly">月次</option>
            <option value="yearly">年次</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">クラス種別</label>
          <select value={classTypeId} onChange={(e) => setClassTypeId(e.target.value)} className="w-full border rounded px-3 py-2" required>
            <option value="">選択...</option>
            {classTypes.map((ct) => <option key={ct.id} value={ct.id}>{ct.label}</option>)}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">セッション数</label>
          <input type="number" value={totalSessions} onChange={(e) => setTotalSessions(Number(e.target.value))} className="w-full border rounded px-3 py-2" required min={0} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">参加者数</label>
          <input type="number" value={totalAttendees} onChange={(e) => setTotalAttendees(Number(e.target.value))} className="w-full border rounded px-3 py-2" required min={0} />
        </div>
      </div>
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isManualOverride} onChange={(e) => setIsManualOverride(e.target.checked)} />
          <span className="text-sm font-medium">手動上書き</span>
        </label>
      </div>
      {isManualOverride && (
        <div>
          <label className="block text-sm font-medium mb-1">上書き理由</label>
          <textarea value={manualNote} onChange={(e) => setManualNote(e.target.value)} className="w-full border rounded px-3 py-2" rows={2} placeholder="手動上書きの理由を記載..." />
        </div>
      )}
      <div className="flex justify-end gap-3">
        <button type="button" onClick={onCancel} className="px-4 py-2 border rounded">キャンセル</button>
        <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">
          {isLoading ? '保存中...' : '保存'}
        </button>
      </div>
    </form>
  )
}
