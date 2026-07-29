import { useEffect, useState } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import type { Order, Attachment, WarrantyClaim } from '../../types/database'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { QRCodeDisplay } from '../../components/shared/QRCodeDisplay'
import { FileUpload } from '../../components/shared/FileUpload'
import { cn, getStatusColor, getStatusLabel, formatDate, formatCurrency, getPartnerDisplayName, getPartnerColor } from '../../lib/utils'
import { ArrowRight, Edit3, Trash2, Plus, Phone, History } from 'lucide-react'

export function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile } = useAuth()
  const [order, setOrder] = useState<Order | null>(null)
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [claims, setClaims] = useState<WarrantyClaim[]>([])
  const [payments, setPayments] = useState<{ amount: number }[]>([])
  const [auditLog, setAuditLog] = useState<any[]>([])
  const [showClaimForm, setShowClaimForm] = useState(false)
  const [claimProblem, setClaimProblem] = useState('')
  const [claimDecision, setClaimDecision] = useState('')
  const [savingClaim, setSavingClaim] = useState(false)

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  async function loadOrder() {
    if (!id) return
    const { data: order } = await supabase.from('orders').select('*').eq('id', id).single()
    if (order) setOrder(order)

    const { data: atts } = await supabase.from('attachments').select('*').eq('order_id', id)
    if (atts) setAttachments(atts)

    const { data: c } = await supabase.from('warranty_claims').select('*').eq('order_id', id).order('created_at', { ascending: false })
    if (c) setClaims(c)

    const { data: pay } = await supabase.from('payments').select('amount').eq('order_id', id)
    if (pay) setPayments(pay)

    const { data: log } = await supabase
      .from('audit_log')
      .select('*, changer:users!changed_by(name)')
      .eq('table_name', 'orders')
      .eq('record_id', id)
      .order('created_at', { ascending: false })
      .limit(50)
    if (log) setAuditLog(log)
  }

  async function updateStatus(status: string) {
    if (!id) return
    await supabase.from('orders').update({ status }).eq('id', id)
    loadOrder()
  }

  async function deleteAttachment(attId: string) {
    await supabase.from('attachments').delete().eq('id', attId)
    loadOrder()
  }

  async function addClaim() {
    if (!id || !profile || !claimProblem.trim()) return
    setSavingClaim(true)
    await supabase.from('warranty_claims').insert({
      order_id: id,
      problem_description: claimProblem,
      decision: claimDecision || null,
      created_by: profile.id
    })
    setClaimProblem('')
    setClaimDecision('')
    setShowClaimForm(false)
    setSavingClaim(false)
    loadOrder()
  }

  if (!order) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>

  const beforeImgs = attachments.filter(a => a.type === 'before')
  const afterImgs = attachments.filter(a => a.type === 'after')
  const docs = attachments.filter(a => a.type === 'doc')

  const totalPaid = payments.reduce((s, p) => s + Number(p.amount), 0)
  const remaining = order.repair_cost - totalPaid

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => navigate('/orders')}>
          <ArrowRight className="w-4 h-4" /> العودة
        </Button>
        <Link to={`/orders/${id}/edit`}>
          <Button variant="secondary" size="sm"><Edit3 className="w-4 h-4" /> تعديل</Button>
        </Link>
      </div>

      <Card>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-primary">{order.order_no}</h2>
            <Badge className={getStatusColor(order.status)}>{getStatusLabel(order.status)}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-gray-700 font-medium">{order.customer_name}</span>
          {order.customer_phone && (
            <span className="text-sm text-gray-500 flex items-center gap-1" dir="ltr">
              <Phone className="w-3 h-3" /> {order.customer_phone}
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div><span className="text-gray-500">القطعة</span><p className="font-medium">{order.part_type}</p></div>
          <div><span className="text-gray-500">نوع الإصلاح</span><p className="font-medium">{order.repair_type}</p></div>
          <div><span className="text-gray-500">قيمة الإصلاح</span><p className="font-medium">{formatCurrency(order.repair_cost)}</p></div>
          <div><span className="text-gray-500">تاريخ الاستلام</span><p className="font-medium">{formatDate(order.received_at)}</p></div>
          <div><span className="text-gray-500">تاريخ التسليم</span><p className="font-medium">{order.delivered_at ? formatDate(order.delivered_at) : '—'}</p></div>
          <div><span className="text-gray-500">مدة الضمان</span><p className="font-medium">{order.warranty_days > 0 ? `${order.warranty_days} يوم` : 'بدون ضمان'}{order.warranty_expires_at && ` (حتى ${formatDate(order.warranty_expires_at)})`}</p></div>
        </div>
        {order.notes && <div className="mt-3 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">{order.notes}</div>}
      </Card>

      {order.status !== 'delivered' && (
        <Card>
          <h3 className="font-semibold mb-3">تحديث الحالة</h3>
          <div className="flex gap-2">
            {['received', 'in_progress', 'ready', 'delivered'].map(s => (
              <Button key={s} variant={order.status === s ? 'primary' : 'secondary'} size="sm"
                onClick={() => updateStatus(s)} disabled={order.status === s}>
                {getStatusLabel(s)}
              </Button>
            ))}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold mb-4">تفاصيل الدفع</h3>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-gray-500">المبلغ الإجمالي</span><span className="font-medium">{formatCurrency(Number(order.repair_cost))}</span></div>
          <div className="flex justify-between"><span className="text-gray-500">المدفوع</span><span className="font-medium text-success">{formatCurrency(totalPaid)}</span></div>
          {remaining > 0 ? (
            <div className="flex justify-between border-t pt-2"><span className="text-gray-500">المتبقي</span><span className="font-bold text-danger">{formatCurrency(remaining)}</span></div>
          ) : (
            <div className="flex justify-between border-t pt-2"><span className="text-gray-500">الحالة</span><Badge className="bg-green-100 text-green-800">مدفوع بالكامل</Badge></div>
          )}
        </div>
      </Card>

      <Card className="text-center">
        <QRCodeDisplay value={`${window.location.origin}/delivery/${order.order_no}`} />
        <p className="text-sm text-gray-500 mt-2">اعرض هذا للعميل عند التسليم</p>
      </Card>

      <Card>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">سجل الضمان</h3>
          <Button size="sm" onClick={() => setShowClaimForm(!showClaimForm)}><Plus className="w-4 h-4" /> إضافة رجوع</Button>
        </div>
        {showClaimForm && (
          <div className="mb-4 p-4 bg-yellow-50 rounded-lg space-y-3">
            <textarea className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" rows={2} value={claimProblem} onChange={e => setClaimProblem(e.target.value)} placeholder="وصف المشكلة" />
            <input className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={claimDecision} onChange={e => setClaimDecision(e.target.value)} placeholder="القرار: إصلاح مجاني / استبدال / رفض" />
            <Button size="sm" onClick={addClaim} disabled={savingClaim || !claimProblem.trim()}>{savingClaim ? 'جاري الحفظ...' : 'حفظ'}</Button>
          </div>
        )}
        {claims.length === 0 ? <p className="text-sm text-gray-400">لا توجد مرات رجوع سابقة</p> : (
          <div className="space-y-2">
            {claims.map(c => (
              <div key={c.id} className="p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium">{c.problem_description}</p>
                {c.decision && <p className="text-xs text-gray-500 mt-1">القرار: {c.decision}</p>}
                <p className="text-xs text-gray-400 mt-1">{formatDate(c.created_at)}</p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {auditLog.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4 flex items-center gap-2"><History className="w-4 h-4" /> سجل التعديلات</h3>
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {auditLog.map(entry => {
              const oldVals = entry.old_data ? Object.entries(entry.old_data).filter(([k]) => !['id','updated_at','created_at'].includes(k)) : []
              const newVals = entry.new_data ? Object.entries(entry.new_data).filter(([k]) => !['id','updated_at','created_at'].includes(k)) : []
              return (
                <div key={entry.id} className="p-2 bg-gray-50 rounded-lg text-xs">
                  <div className="flex justify-between text-gray-400 mb-1">
                    <span className={cn('font-medium', getPartnerColor(entry.changer?.name || ''))}>{getPartnerDisplayName(entry.changer?.name)}</span>
                    <span>{formatDate(entry.created_at)}</span>
                  </div>
                  {entry.action === 'UPDATE' && oldVals.map(([key, oldVal]) => {
                    const newVal = newVals.find(([k]) => k === key)?.[1]
                    return <div key={key} className="text-gray-600">{key === 'status' ? `الحالة: ${getStatusLabel(String(oldVal))} ← ${getStatusLabel(String(newVal))}` : `${key}: ${String(oldVal ?? '—')} ← ${String(newVal ?? '—')}`}</div>
                  })}
                  {entry.action === 'INSERT' && <span className="text-green-600">تم إنشاء الطلب</span>}
                  {entry.action === 'DELETE' && <span className="text-red-600">تم حذف الطلب</span>}
                </div>
              )
            })}
          </div>
        </Card>
      )}

      <Card>
        <h3 className="font-semibold mb-4">صور قبل الإصلاح</h3>
        <div className="mb-4"><FileUpload orderId={order.id} type="before" onUploaded={loadOrder} /></div>
        {beforeImgs.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {beforeImgs.map(att => (
              <div key={att.id} className="relative group">
                <img src={att.url} alt="قبل الإصلاح" className="w-full h-32 object-cover rounded-lg border" />
                <button onClick={() => deleteAttachment(att.id)} className="absolute top-1 left-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-white" /></button>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400">لا توجد صور</p>}
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">صور بعد الإصلاح</h3>
        <div className="mb-4"><FileUpload orderId={order.id} type="after" onUploaded={loadOrder} /></div>
        {afterImgs.length > 0 ? (
          <div className="grid grid-cols-3 gap-3">
            {afterImgs.map(att => (
              <div key={att.id} className="relative group">
                <img src={att.url} alt="بعد الإصلاح" className="w-full h-32 object-cover rounded-lg border" />
                <button onClick={() => deleteAttachment(att.id)} className="absolute top-1 left-1 p-1 bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-white" /></button>
              </div>
            ))}
          </div>
        ) : <p className="text-sm text-gray-400">لا توجد صور</p>}
      </Card>

      {docs.length > 0 && (
        <Card>
          <h3 className="font-semibold mb-4">المستندات</h3>
          <div className="grid grid-cols-3 gap-3">
            {docs.map(att => (
              <a key={att.id} href={att.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100">
                <span className="text-sm text-gray-600">مستند</span>
              </a>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
