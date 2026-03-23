import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/apiClient'

interface ClassType {
  id: string
  label: string
  value: string
}

interface CancelCase {
  id: string
  label: string
  value: string
}

interface Session {
  id: string
  class_type_id: string
  class_type?: ClassType
  date: string
  start_time: string
  end_time: string
  venue: string
  is_cancelled: boolean
  cancel_case_id: string | null
  cancel_case?: CancelCase
  cancel_reason: string | null
  note: string | null
  session_status: 'open' | 'pairing' | 'confirmed' | 'completed' | 'cancelled'
}

export function ScheduleManager() {
  const queryClient = useQueryClient()
  const [editingSession, setEditingSession] = useState<Session | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { data: classTypes } = useQuery({
    queryKey: ['masterItems', 'class_type'],
    queryFn: async () => {
      const res = await supabase.from('master_items').select('*').eq('group_key', 'class_type').eq('is_active', true)
      return res.data as ClassType[]
    },
  })

  const { data: cancelCases } = useQuery({
    queryKey: ['masterItems', 'cancel_case'],
    queryFn: async () => {
      const res = await supabase.from('master_items').select('*').eq('group_key', 'cancel_case').eq('is_active', true)
      return res.data as CancelCase[]
    },
  })

  const { data: sessions, isLoading } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const res = await supabase
        .from('schedule_sessions')
        .select('*, class_type:class_type_id(*), cancel_case:cancel_case_id(*)')
        .order('date', { ascending: false })
      return res.data as Session[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Session>) => {
      const res = await supabase.from('schedule_sessions').insert(data).select().single()
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setIsCreating(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Session> & { id: string }) => {
      const { id, ...rest } = data
      const res = await supabase.from('schedule_sessions').update(rest).eq('id', id).select().single()
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
      setEditingSession(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('schedule_sessions').delete().eq('id', id)
      if (res.error) throw res.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] })
    },
  })

  const statusColors: Record<string, string> = {
    open: 'bg-blue-100 text-blue-700',
    pairing: 'bg-yellow-100 text-yellow-700',
    confirmed: 'bg-green-100 text-green-700',
    completed: 'bg-gray-100 text-gray-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">スケジュール管理</h1>

      <button
        onClick={() => setIsCreating(true)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        新規作成
      </button>

      {(isCreating || editingSession) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {isCreating ? '新規セッション' : 'セッションを編集'}
            </h2>
            <SessionForm
              session={editingSession}
              classTypes={classTypes ?? []}
              cancelCases={cancelCases ?? []}
              onSubmit={(data) => {
                if (isCreating) {
                  createMutation.mutate(data)
                } else if (editingSession) {
                  updateMutation.mutate({ ...data, id: editingSession.id })
                }
              }}
              onCancel={() => { setIsCreating(false); setEditingSession(null) }}
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
                <th className="px-4 py-3 text-left text-sm">日付</th>
                <th className="px-4 py-3 text-left text-sm">クラス</th>
                <th className="px-4 py-3 text-left text-sm">時間帯</th>
                <th className="px-4 py-3 text-left text-sm">会場</th>
                <th className="px-4 py-3 text-left text-sm">ステータス</th>
                <th className="px-4 py-3 text-left text-sm">取消</th>
                <th className="px-4 py-3 text-left text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {sessions?.map((session) => (
                <tr key={session.id} className="border-t">
                  <td className="px-4 py-3">{session.date}</td>
                  <td className="px-4 py-3">{session.class_type?.label ?? '-'}</td>
                  <td className="px-4 py-3">{session.start_time} - {session.end_time}</td>
                  <td className="px-4 py-3">{session.venue}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${statusColors[session.session_status]}`}>
                      {session.session_status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {session.is_cancelled ? (
                      <span className="text-red-600">{session.cancel_case?.label ?? '取消'}</span>
                    ) : '-'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditingSession(session)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">編集</button>
                    <button onClick={() => { if (confirm('削除しますか？')) deleteMutation.mutate(session.id) }} className="text-red-600 hover:text-red-800 text-sm">削除</button>
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

function SessionForm({
  session,
  classTypes,
  cancelCases,
  onSubmit,
  onCancel,
  isLoading,
}: {
  session: Session | null
  classTypes: ClassType[]
  cancelCases: CancelCase[]
  onSubmit: (data: Partial<Session>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [classTypeId, setClassTypeId] = useState(session?.class_type_id ?? '')
  const [date, setDate] = useState(session?.date ?? '')
  const [startTime, setStartTime] = useState(session?.start_time ?? '')
  const [endTime, setEndTime] = useState(session?.end_time ?? '')
  const [venue, setVenue] = useState(session?.venue ?? '')
  const [isCancelled, setIsCancelled] = useState(session?.is_cancelled ?? false)
  const [cancelCaseId, setCancelCaseId] = useState(session?.cancel_case_id ?? '')
  const [cancelReason, setCancelReason] = useState(session?.cancel_reason ?? '')
  const [note, setNote] = useState(session?.note ?? '')

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ class_type_id: classTypeId, date, start_time: startTime, end_time: endTime, venue, is_cancelled: isCancelled, cancel_case_id: isCancelled ? cancelCaseId : null, cancel_reason: isCancelled ? cancelReason : null, note }) }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">クラス種別</label>
        <select value={classTypeId} onChange={(e) => setClassTypeId(e.target.value)} className="w-full border rounded px-3 py-2" required>
          <option value="">選択...</option>
          {classTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">日付</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">開始時刻</label>
          <input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">終了時刻</label>
          <input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} className="w-full border rounded px-3 py-2" required />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">会場</label>
        <input type="text" value={venue} onChange={(e) => setVenue(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isCancelled} onChange={(e) => setIsCancelled(e.target.checked)} />
          <span className="text-sm font-medium">取消</span>
        </label>
      </div>
      {isCancelled && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">取消理由</label>
            <select value={cancelCaseId} onChange={(e) => setCancelCaseId(e.target.value)} className="w-full border rounded px-3 py-2" required>
              <option value="">選択...</option>
              {cancelCases.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">取消詳細</label>
            <input type="text" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} className="w-full border rounded px-3 py-2" />
          </div>
        </>
      )}
      <div>
        <label className="block text-sm font-medium mb-1">メモ</label>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} className="w-full border rounded px-3 py-2" rows={2} />
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
