import { useState } from 'react'
import { Upload } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { cn } from '../../lib/utils'

interface FileUploadProps {
  orderId: string
  type: 'before' | 'after' | 'doc'
  onUploaded: (url: string) => void
}

export function FileUpload({ orderId, type, onUploaded }: FileUploadProps) {
  const [uploading, setUploading] = useState(false)

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const filePath = `${orderId}/${type}/${Date.now()}_${file.name}`

    const { data, error } = await supabase.storage
      .from('attachments')
      .upload(filePath, file)

    if (error) {
      console.error('Upload error:', error)
      setUploading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage
      .from('attachments')
      .getPublicUrl(data.path)

    await supabase.from('attachments').insert({
      order_id: orderId,
      url: publicUrl,
      type,
      uploaded_by: (await supabase.auth.getUser()).data.user?.id!
    })

    onUploaded(publicUrl)
    setUploading(false)
  }

  return (
    <label className={cn(
      'flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer',
      'hover:border-primary-light hover:bg-blue-50 transition-colors',
      uploading && 'opacity-50 cursor-wait'
    )}>
      <Upload className="w-4 h-4 text-gray-500" />
      <span className="text-sm text-gray-600">
        {uploading ? 'جاري الرفع...' : 'رفع صورة'}
      </span>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleUpload}
        disabled={uploading}
      />
    </label>
  )
}
