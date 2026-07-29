import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { useRealtimeTransfers } from '../../hooks/useRealtime'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { cn, formatCurrency, formatDate, getPartnerDisplayName, getPartnerColor } from '../../lib/utils'
import { ArrowLeftRight, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { transferSchema, type TransferInput } from '../../lib/validations'
import type { User } from '../../types/database'

interface TransferDisplay {
  id: string
  from_user: string
  to_user: string
  amount: number
  note: string | null
  created_at: string
  fromUser?: { name: string }
  toUser?: { name: string }
}

export function TransfersPage() {
  const { profile } = useAuth()
  const { transfers } = useRealtimeTransfers()
  const [users, setUsers] = useState<User[]>([])
  const [showForm, setShowForm] = useState(false)
  const [totalIn, setTotalIn] = useState(0)
  const [totalOut, setTotalOut] = useState(0)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<TransferInput>({
    resolver: zodResolver(transferSchema)
  })

  useEffect(() => {
    supabase.from('users').select('*').then(({ data }) => {
      if (data) setUsers(data.filter(u => u.id !== profile?.id))
    })
  }, [profile])

  useEffect(() => {
    if (!profile || !transfers.length) return
    setTotalIn(
      transfers
        .filter(t => t.to_user === profile.id)
        .reduce((sum, t) => sum + Number(t.amount), 0)
    )
    setTotalOut(
      transfers
        .filter(t => t.from_user === profile.id)
        .reduce((sum, t) => sum + Number(t.amount), 0)
    )
  }, [transfers, profile])

  async function onSubmit(data: TransferInput) {
    if (!profile) return
    await supabase.from('transfers').insert({
      from_user: profile.id,
      to_user: data.to_user,
      amount: data.amount,
      note: data.note
    })
    reset()
    setShowForm(false)
  }

  async function deleteTransfer(id: string) {
    await supabase.from('transfers').delete().eq('id', id)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">التحويلات الداخلية</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          تحويل جديد
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <Card>
          <p className="text-sm text-gray-500">وارد</p>
          <p className="text-xl font-bold text-green-600">{formatCurrency(totalIn)}</p>
        </Card>
        <Card>
          <p className="text-sm text-gray-500">صادر</p>
          <p className="text-xl font-bold text-red-600">{formatCurrency(totalOut)}</p>
        </Card>
      </div>

      {showForm && (
        <Card className="mb-4">
          <div className="flex items-center gap-2 mb-4 p-3 bg-blue-50 rounded-lg text-sm">
            <span className="text-gray-500">من:</span>
            <span className={cn('font-medium', getPartnerColor(profile?.name || ''))}>{getPartnerDisplayName(profile?.name)}</span>
          </div>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">إلى</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('to_user')}>
                <option value="">اختر شريكاً</option>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              {errors.to_user && <p className="text-sm text-danger">{errors.to_user.message}</p>}
            </div>
            <Input id="amount" label="المبلغ" type="number" step="0.01" {...register('amount')} error={errors.amount?.message} />
            <Input id="note" label="ملاحظة" {...register('note')} />
            <Button type="submit" disabled={isSubmitting}>إرسال التحويل</Button>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {(() => {
          const userMap = Object.fromEntries(users.map(u => [u.id, u.name]))
          userMap[profile?.id || ''] = profile?.name || ''
          return null
        })()}
        {transfers.map(t => {
          const fromName = users.find(u => u.id === t.from_user)?.name || users.find(u => u.id === profile?.id && t.from_user === profile?.id)?.name || 'شريك'
          const toName = users.find(u => u.id === t.to_user)?.name || 'شريك'
          return (
          <Card key={t.id} className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <ArrowLeftRight className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm font-medium">{formatCurrency(t.amount)}</p>
                <p className="text-xs text-gray-500">
                  من <span className={cn('font-medium', getPartnerColor(fromName))}>{getPartnerDisplayName(fromName)}</span> ← إلى <span className={cn('font-medium', getPartnerColor(toName))}>{getPartnerDisplayName(toName)}</span>
                  {t.note && ` — ${t.note}`}
                </p>
                <p className="text-xs text-gray-400">{formatDate(t.created_at)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {t.from_user === profile?.id && (
                <Button variant="ghost" size="sm" onClick={() => deleteTransfer(t.id)}>
                  حذف
                </Button>
              )}
            </div>
          </Card>
          )
        })}
        {transfers.length === 0 && (
          <div className="text-center py-12 text-gray-500">لا توجد تحويلات</div>
        )}
      </div>
    </div>
  )
}
