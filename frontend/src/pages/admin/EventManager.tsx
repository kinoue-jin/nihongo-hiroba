import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/apiClient'

interface EventType {
  id: string
  label: string
  value: string
}

interface Member {
  id: string
  name: string
}

interface Event {
  id: string
  title: string
  event_type_id: string
  event_type?: EventType
  date: string
  start_time: string
  end_time: string
  venue: string
  max_capacity: number | null
  actual_attendees: number | null
  host_member_id: string
  host_member?: Member
  report_id: string | null
}

export function EventManager() {
  const queryClient = useQueryClient()
  const [editingEvent, setEditingEvent] = useState<Event | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { data: eventTypes } = useQuery({
    queryKey: ['masterItems', 'event_type'],
    queryFn: async () => {
      const res = await supabase.from('master_items').select('*').eq('group_key', 'event_type').eq('is_active', true)
      return res.data as EventType[]
    },
  })

  const { data: members } = useQuery({
    queryKey: ['members'],
    queryFn: async () => {
      const res = await supabase.from('members').select('id, name').eq('is_active', true)
      return res.data as Member[]
    },
  })

  const { data: events, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const res = await supabase
        .from('events')
        .select('*, event_type:event_type_id(*), host_member:host_member_id(*)')
        .order('date', { ascending: false })
      return res.data as Event[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<Event>) => {
      const res = await supabase.from('events').insert(data).select().single()
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setIsCreating(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<Event> & { id: string }) => {
      const { id, ...rest } = data
      const res = await supabase.from('events').update(rest).eq('id', id).select().single()
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
      setEditingEvent(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('events').delete().eq('id', id)
      if (res.error) throw res.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] })
    },
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">イベント管理</h1>

      <button
        onClick={() => setIsCreating(true)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        新規作成
      </button>

      {(isCreating || editingEvent) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {isCreating ? '新規イベント' : 'イベントを編集'}
            </h2>
            <EventForm
              event={editingEvent}
              eventTypes={eventTypes ?? []}
              members={members ?? []}
              onSubmit={(data) => {
                if (isCreating) {
                  createMutation.mutate(data)
                } else if (editingEvent) {
                  updateMutation.mutate({ ...data, id: editingEvent.id })
                }
              }}
              onCancel={() => { setIsCreating(false); setEditingEvent(null) }}
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
                <th className="px-4 py-3 text-left text-sm">タイトル</th>
                <th className="px-4 py-3 text-left text-sm">種別</th>
                <th className="px-4 py-3 text-left text-sm">日程</th>
                <th className="px-4 py-3 text-left text-sm">会場</th>
                <th className="px-4 py-3 text-left text-sm">主催</th>
                <th className="px-4 py-3 text-left text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {events?.map((event) => (
                <tr key={event.id} className="border-t">
                  <td className="px-4 py-3">{event.title}</td>
                  <td className="px-4 py-3">{event.event_type?.label ?? '-'}</td>
                  <td className="px-4 py-3">{event.date} {event.start_time}</td>
                  <td className="px-4 py-3">{event.venue}</td>
                  <td className="px-4 py-3">{event.host_member?.name ?? '-'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => setEditingEvent(event)} className="text-blue-600 hover:text-blue-800 text-sm mr-3">編集</button>
                    <button onClick={() => { if (confirm('削除しますか？')) deleteMutation.mutate(event.id) }} className="text-red-600 hover:text-red-800 text-sm">削除</button>
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

function EventForm({
  event,
  eventTypes,
  members,
  onSubmit,
  onCancel,
  isLoading,
}: {
  event: Event | null
  eventTypes: EventType[]
  members: Member[]
  onSubmit: (data: Partial<Event>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState(event?.title ?? '')
  const [eventTypeId, setEventTypeId] = useState(event?.event_type_id ?? '')
  const [date, setDate] = useState(event?.date ?? '')
  const [startTime, setStartTime] = useState(event?.start_time ?? '')
  const [endTime, setEndTime] = useState(event?.end_time ?? '')
  const [venue, setVenue] = useState(event?.venue ?? '')
  const [maxCapacity, setMaxCapacity] = useState(event?.max_capacity ?? '')
  const [hostMemberId, setHostMemberId] = useState(event?.host_member_id ?? '')

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ title, event_type_id: eventTypeId, date, start_time: startTime, end_time: endTime, venue, max_capacity: maxCapacity ? Number(maxCapacity) : null, host_member_id: hostMemberId }) }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">タイトル</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">種別</label>
          <select value={eventTypeId} onChange={(e) => setEventTypeId(e.target.value)} className="w-full border rounded px-3 py-2" required>
            <option value="">選択...</option>
            {eventTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">主催者</label>
          <select value={hostMemberId} onChange={(e) => setHostMemberId(e.target.value)} className="w-full border rounded px-3 py-2" required>
            <option value="">選択...</option>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
        </div>
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
        <label className="block text-sm font-medium mb-1">最大参加数</label>
        <input type="number" value={maxCapacity} onChange={(e) => setMaxCapacity(e.target.value)} className="w-full border rounded px-3 py-2" />
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
