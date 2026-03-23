import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/apiClient'

interface NewsCategory {
  id: string
  label: string
  value: string
}

interface News {
  id: string
  title: string
  body: string
  category_id: string
  category?: NewsCategory
  published_at: string
  author: string
  is_published: boolean
}

export function NewsManager() {
  const queryClient = useQueryClient()
  const [editingNews, setEditingNews] = useState<News | null>(null)
  const [isCreating, setIsCreating] = useState(false)

  const { data: categories } = useQuery({
    queryKey: ['masterItems', 'news_category'],
    queryFn: async () => {
      const res = await supabase.from('master_items').select('*').eq('group_key', 'news_category').eq('is_active', true)
      return res.data as NewsCategory[]
    },
  })

  const { data: newsList, isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const res = await supabase
        .from('news')
        .select('*, category:category_id(*)')
        .order('published_at', { ascending: false })
      return res.data as News[]
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: Partial<News>) => {
      const res = await supabase.from('news').insert(data).select().single()
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      setIsCreating(false)
    },
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Partial<News> & { id: string }) => {
      const { id, ...rest } = data
      const res = await supabase.from('news').update(rest).eq('id', id).select().single()
      if (res.error) throw res.error
      return res.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
      setEditingNews(null)
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await supabase.from('news').delete().eq('id', id)
      if (res.error) throw res.error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] })
    },
  })

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">お知らせ管理</h1>

      <button
        onClick={() => setIsCreating(true)}
        className="mb-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
      >
        新規作成
      </button>

      {(isCreating || editingNews) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-screen overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {isCreating ? '新規お知らせ' : 'お知らせを編集'}
            </h2>
            <NewsForm
              news={editingNews}
              categories={categories ?? []}
              onSubmit={(data) => {
                if (isCreating) {
                  createMutation.mutate(data)
                } else if (editingNews) {
                  updateMutation.mutate({ ...data, id: editingNews.id })
                }
              }}
              onCancel={() => { setIsCreating(false); setEditingNews(null) }}
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
                <th className="px-4 py-3 text-left text-sm">カテゴリ</th>
                <th className="px-4 py-3 text-left text-sm">公開日</th>
                <th className="px-4 py-3 text-left text-sm">公開</th>
                <th className="px-4 py-3 text-left text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {newsList?.map((news) => (
                <tr key={news.id} className="border-t">
                  <td className="px-4 py-3">{news.title}</td>
                  <td className="px-4 py-3">{news.category?.label ?? '-'}</td>
                  <td className="px-4 py-3">{news.published_at}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-sm ${news.is_published ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'}`}>
                      {news.is_published ? '公開' : '下書き'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setEditingNews(news)}
                      className="text-blue-600 hover:text-blue-800 text-sm mr-3"
                    >
                      編集
                    </button>
                    <button
                      onClick={() => { if (confirm('削除しますか？')) deleteMutation.mutate(news.id) }}
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

function NewsForm({
  news,
  categories,
  onSubmit,
  onCancel,
  isLoading,
}: {
  news: News | null
  categories: NewsCategory[]
  onSubmit: (data: Partial<News>) => void
  onCancel: () => void
  isLoading: boolean
}) {
  const [title, setTitle] = useState(news?.title ?? '')
  const [body, setBody] = useState(news?.body ?? '')
  const [categoryId, setCategoryId] = useState(news?.category_id ?? '')
  const [publishedAt, setPublishedAt] = useState(news?.published_at ?? '')
  const [isPublished, setIsPublished] = useState(news?.is_published ?? false)

  return (
    <form onSubmit={(e) => { e.preventDefault(); onSubmit({ title, body, category_id: categoryId, published_at: publishedAt, is_published: isPublished }) }} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">タイトル</label>
        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">本文</label>
        <textarea value={body} onChange={(e) => setBody(e.target.value)} className="w-full border rounded px-3 py-2" rows={10} required />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">カテゴリ</label>
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border rounded px-3 py-2" required>
          <option value="">選択...</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">公開日</label>
        <input type="datetime-local" value={publishedAt} onChange={(e) => setPublishedAt(e.target.value)} className="w-full border rounded px-3 py-2" required />
      </div>
      <div>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={isPublished} onChange={(e) => setIsPublished(e.target.checked)} />
          <span className="text-sm font-medium">公開する</span>
        </label>
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
