import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fastapi } from '../../lib/apiClient'

interface MediaItem {
  id: string
  filename: string
  url: string
  thumbnail_url: string | null
  mime_type: string
  size: number
  caption: string | null
  credit: string | null
  taken_at: string | null
  is_public: boolean
  uploaded_at: string
}

export function MediaManager() {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const { data: mediaList, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const res = await fastapi.get('/media/')
      if (!res.ok) throw new Error('Failed to fetch media')
      return (await res.json()) as MediaItem[]
    },
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setUploading(true)
      setUploadProgress(0)
      const formData = new FormData()
      formData.append('file', file)
      const res = await fastapi.post('/media/upload', formData)
      setUploading(false)
      if (!res.ok) throw new Error('Upload failed')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<MediaItem> & { id: string }) => {
      const res = await fastapi.patch(`/media/${id}`, data)
      if (!res.ok) throw new Error('Failed to update media')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fastapi.delete(`/media/${id}`)
      if (!res.ok) throw new Error('Failed to delete media')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] })
    },
  })

  function formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }

  function formatMimeType(mime: string): string {
    const map: Record<string, string> = {
      'image/jpeg': 'JPEG',
      'image/png': 'PNG',
      'image/webp': 'WebP',
      'application/pdf': 'PDF',
    }
    return map[mime] ?? mime
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">メディア管理</h1>

      <div className="mb-6 bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold mb-4">アップロード</h2>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) uploadMutation.mutate(file)
          }}
          className="hidden"
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {uploading ? `アップロード中... ${uploadProgress}%` : 'ファイルを選択'}
        </button>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">読み込み中...</div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm">プレビュー</th>
                <th className="px-4 py-3 text-left text-sm">ファイル名</th>
                <th className="px-4 py-3 text-left text-sm">種類</th>
                <th className="px-4 py-3 text-left text-sm">サイズ</th>
                <th className="px-4 py-3 text-left text-sm">公開</th>
                <th className="px-4 py-3 text-left text-sm">説明</th>
                <th className="px-4 py-3 text-left text-sm">操作</th>
              </tr>
            </thead>
            <tbody>
              {mediaList?.map((media) => (
                <tr key={media.id} className="border-t">
                  <td className="px-4 py-3">
                    {media.mime_type.startsWith('image/') ? (
                      <img src={media.thumbnail_url ?? media.url} alt="" className="h-12 w-12 object-cover rounded" />
                    ) : (
                      <div className="h-12 w-12 bg-gray-200 rounded flex items-center justify-center text-xs">
                        {formatMimeType(media.mime_type)}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm">{media.filename}</td>
                  <td className="px-4 py-3 text-sm">{formatMimeType(media.mime_type)}</td>
                  <td className="px-4 py-3 text-sm">{formatFileSize(media.size)}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={media.is_public}
                      onChange={(e) => updateMutation.mutate({ id: media.id, is_public: e.target.checked })}
                      className="rounded"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">{media.caption ?? '-'}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => {
                        if (confirm('削除しますか？')) deleteMutation.mutate(media.id)
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
