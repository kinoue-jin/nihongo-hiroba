import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { fastapi } from '../../lib/apiClient'
import { supabase } from '../../lib/apiClient'

interface Member {
  id: string
  name: string
  class_type_id: string
}

interface Learner {
  id: string
  nickname: string
  class_type_id: string
}

interface Session {
  id: string
  date: string
  class_type_id: string
  venue: string
}

interface Pairing {
  id: string
  member_id: string
  learner_id: string
  status: 'proposed' | 'confirmed' | 'cancelled'
}

interface RegisteredMember extends Member {
  registered_at: string
}

interface RegisteredLearner extends Learner {
  registered_at: string
}

function SortableLearnerItem({ learner, onRemove }: { learner: RegisteredLearner; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: learner.id })
  const style = { transform: CSS.Transform.toString(transform), transition }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="flex items-center justify-between bg-white p-3 rounded border mb-2 cursor-move"
    >
      <span>{learner.nickname}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onRemove() }}
        className="text-red-500 hover:text-red-700"
      >
        解除
      </button>
    </div>
  )
}

export function PairingManager() {
  const queryClient = useQueryClient()
  const [selectedSession, setSelectedSession] = useState<string>('')
  const [memberLearners, setMemberLearners] = useState<Record<string, RegisteredLearner[]>>({})

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const { data: sessions } = useQuery({
    queryKey: ['pairingSessions'],
    queryFn: async () => {
      const res = await supabase
        .from('schedule_sessions')
        .select('id, date, venue, class_type_id')
        .eq('session_status', 'open')
        .order('date')
      return res.data as Session[]
    },
  })

  const { data: registeredMembers } = useQuery({
    queryKey: ['registeredMembers', selectedSession],
    queryFn: async () => {
      const res = await supabase
        .from('member_session_registrations')
        .select('member_id, registered_at, members(id, name, class_type_id)')
        .eq('session_id', selectedSession)
        .eq('status', 'registered')
      return (res.data ?? []).map((r: any) => ({
        ...r.members,
        registered_at: r.registered_at,
      })) as RegisteredMember[]
    },
    enabled: !!selectedSession,
  })

  const { data: registeredLearners } = useQuery({
    queryKey: ['registeredLearners', selectedSession],
    queryFn: async () => {
      const res = await supabase
        .from('learner_session_registrations')
        .select('learner_id, registered_at, learners(id, nickname, class_type_id)')
        .eq('session_id', selectedSession)
        .eq('status', 'registered')
      return (res.data ?? []).map((r: any) => ({
        ...r.learners,
        registered_at: r.registered_at,
      })) as RegisteredLearner[]
    },
    enabled: !!selectedSession,
  })

  const generatePairingsMutation = useMutation({
    mutationFn: async () => {
      const res = await fastapi.post(`/sessions/${selectedSession}/generate-pairings`, {})
      if (!res.ok) throw new Error('Failed to generate pairings')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairings'] })
    },
  })

  const updatePairingMutation = useMutation({
    mutationFn: async ({ pairingId, status }: { pairingId: string; status: string }) => {
      const res = await fastapi.patch(`/pairings/${pairingId}`, { status })
      if (!res.ok) throw new Error('Failed to update pairing')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pairings'] })
    },
  })

  function handleDragEnd(event: DragEndEvent, memberId: string) {
    const { active, over } = event
    if (!over) return

    setMemberLearners((prev) => {
      const memberList = [...(prev[memberId] ?? [])]
      const oldIndex = memberList.findIndex((l) => l.id === active.id)
      const newIndex = memberList.findIndex((l) => l.id === over.id)
      return { ...prev, [memberId]: arrayMove(memberList, oldIndex, newIndex) }
    })
  }

  function removeLearnerFromMember(memberId: string, learnerId: string) {
    setMemberLearners((prev) => ({
      ...prev,
      [memberId]: (prev[memberId] ?? []).filter((l) => l.id !== learnerId),
    }))
  }

  function addLearnerToMember(memberId: string, learner: RegisteredLearner) {
    setMemberLearners((prev) => {
      const current = prev[memberId] ?? []
      if (current.some((l) => l.id === learner.id)) return prev
      return { ...prev, [memberId]: [...current, learner] }
    })
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">ペアリング管理</h1>

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
        <>
          <div className="mb-6 flex gap-4">
            <button
              onClick={() => generatePairingsMutation.mutate()}
              disabled={generatePairingsMutation.isPending}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {generatePairingsMutation.isPending ? '生成中...' : '自動ペアリング生成'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div>
              <h2 className="font-semibold mb-3">登録メンバー</h2>
              <div className="bg-gray-50 p-4 rounded">
                {registeredMembers?.map((member) => (
                  <div key={member.id} className="mb-4">
                    <div className="font-medium mb-2">{member.name}</div>
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, member.id)}
                    >
                      <SortableContext
                        items={memberLearners[member.id]?.map((l) => l.id) ?? []}
                        strategy={verticalListSortingStrategy}
                      >
                        {memberLearners[member.id]?.map((learner) => (
                          <SortableLearnerItem
                            key={learner.id}
                            learner={learner}
                            onRemove={() => removeLearnerFromMember(member.id, learner.id)}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h2 className="font-semibold mb-3">登録学習者（未割り当て）</h2>
              <div className="bg-gray-50 p-4 rounded">
                {registeredLearners
                  ?.filter((l) => !Object.values(memberLearners).flat().some((ml) => ml.id === l.id))
                  .map((learner) => (
                    <div
                      key={learner.id}
                      className="flex items-center justify-between bg-white p-3 rounded border mb-2"
                    >
                      <span>{learner.nickname}</span>
                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            addLearnerToMember(e.target.value, learner)
                            e.target.value = ''
                          }
                        }}
                        className="text-sm border rounded px-2 py-1"
                        value=""
                      >
                        <option value="">追加...</option>
                        {registeredMembers?.map((m) => (
                          <option key={m.id} value={m.id}>{m.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
