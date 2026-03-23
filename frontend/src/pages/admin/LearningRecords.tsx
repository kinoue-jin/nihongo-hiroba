import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/apiClient'
import { fastapi } from '../../lib/apiClient'

interface Member {
  id: string
  name: string
}

interface Learner {
  id: string
  nickname: string
}

interface Session {
  id: string
  date: string
  class_type_id: string
  venue: string
}

interface LearningRecord {
  id: string
  session_id: string
  member_id: string
  learner_id: string
  attended: boolean
  study_content: string | null
  learner_level: string | null
  absence_reason: string | null
  note: string | null
  member: Member
  learner: Learner
  session: Session
}

export function LearningRecords() {
  const queryClient = useQueryClient()
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [editingRecord, setEditingRecord] = useState<LearningRecord | null>(null)

  const { data: sessions } = useQuery({
    queryKey: ['sessionsForRecords'],
    queryFn: async () => {
      const res = await supabase
        .from('schedule_sessions')
        .select('id, date, venue, class_type_id')
        .order('date', { ascending: false })
      return res.data as Session[]
    },
  })

  const { data: records, isLoading } = useQuery({
    queryKey: ['learningRecords', selectedSession],
    queryFn: async () => {
      const res = await fastapi.get(`/sessions/${selectedSession}/records`)
      if (!res.ok) throw new Error('Failed to fetch records')
      return res.json() as Promise<LearningRecord[]>
    },
    enabled: !!selectedSession,
  })

  const updateRecordMutation = useMutation({
    mutationFn: async (data: Partial<LearningRecord> & { id: string }) => {
      const res = await fastapi.patch(`/learning-records/${data.id}`, data)
      if (!res.ok) throw new Error('Failed to update record')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learningRecords'] })
      setEditingRecord(null)
    },
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">学習記録管理</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium mb-2">セッションを選択</label>
        <select
          value={selectedSession}
          onChange={(e) => setSelectedSession(e.target.value)}
          className="border rounded px-3 py-2"
        >
          <option value="">セッションを選択...</option>
          {sessions?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.date} - {s.venue}
            </option>
          ))}
        </select>
      </div>

      {selectedSession && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">読み込み中...</div>
          ) : records && records.length > 0 ? (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm">メンバー</th>
                  <th className="px-4 py-3 text-left text-sm">学習者</th>
                  <th className="px-4 py-3 text-left text-sm">出席</th>
                  <th className="px-4 py-3 text-left text-sm">学習内容</th>
                  <th className="px-4 py-3 text-left text-sm">レベル</th>
                  <th className="px-4 py-3 text-left text-sm">メモ</th>
                  <th className="px-4 py-3 text-left text-sm">操作</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => (
                  <tr key={record.id} className="border-t">
                    <td className="px-4 py-3">{record.member?.name ?? '-'}</td>
                    <td className="px-4 py-3">{record.learner?.nickname ?? '-'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-1 rounded text-sm ${
                          record.attended ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}
                      >
                        {record.attended ? '出席' : '欠席'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{record.study_content ?? '-'}</td>
                    <td className="px-4 py-3">{record.learner_level ?? '-'}</td>
                    <td className="px-4 py-3">{record.note ?? '-'}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setEditingRecord(record)}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        編集
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-gray-500">記録がありません</div>
          )}
        </div>
      )}

      {editingRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-lg w-full">
            <h2 className="text-lg font-semibold mb-4">学習記録を編集</h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateRecordMutation.mutate(editingRecord)
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium mb-1">出席</label>
                <input
                  type="checkbox"
                  checked={editingRecord.attended}
                  onChange={(e) => setEditingRecord({ ...editingRecord, attended: e.target.checked })}
                  className="rounded"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">学習内容</label>
                <input
                  type="text"
                  value={editingRecord.study_content ?? ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, study_content: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  disabled={!editingRecord.attended}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">学習者レベル</label>
                <input
                  type="text"
                  value={editingRecord.learner_level ?? ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, learner_level: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  disabled={!editingRecord.attended}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">欠席理由</label>
                <input
                  type="text"
                  value={editingRecord.absence_reason ?? ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, absence_reason: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  disabled={editingRecord.attended}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">メモ</label>
                <textarea
                  value={editingRecord.note ?? ''}
                  onChange={(e) => setEditingRecord({ ...editingRecord, note: e.target.value })}
                  className="w-full border rounded px-3 py-2"
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingRecord(null)}
                  className="px-4 py-2 border rounded"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  disabled={updateRecordMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                >
                  保存
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
