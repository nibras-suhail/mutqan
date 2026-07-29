import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Card } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { ClipboardList, Wallet, Clock, AlertTriangle, PackageX, Phone, Activity, ChevronDown, ChevronUp, ExternalLink, MessageCircle } from 'lucide-react'
import { formatDate, formatCurrency, getStatusLabel, getStatusColor, getPartnerDisplayName, getPartnerColor, getWhatsAppMessage } from '../lib/utils'
import { cn } from '../lib/utils'
import { useAuth } from '../context/AuthContext'

export function Dashboard() {
  const { profile } = useAuth()
  const [stats, setStats] = useState({
    totalOrders: 0, pendingPayments: 0, inProgress: 0, warrantyAlerts: 0
  })
  const [unclaimed, setUnclaimed] = useState<any[]>([])
  const [activities, setActivities] = useState<any[]>([])
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [paidMap, setPaidMap] = useState<Record<string, number>>({})

  useEffect(() => {
    loadStats()
    loadUnclaimed()
    loadActivities()

    const channel = supabase
      .channel('dashboard-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => { loadActivities(); loadStats() })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'payments' }, () => loadActivities())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transfers' }, () => loadActivities())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  async function loadStats() {
    const today = new Date().toISOString()
    const { count: totalOrders } = await supabase.from('orders').select('*', { count: 'exact', head: true })
    const { count: inProgress } = await supabase.from('orders').select('*', { count: 'exact', head: true }).eq('status', 'in_progress')
    const { count: warrantyOrders } = await supabase.from('orders')
      .select('*', { count: 'exact', head: true })
      .not('warranty_expires_at', 'is', null)
      .gte('warranty_expires_at', today)

    const { data: allOrders } = await supabase.from('orders').select('id, repair_cost')
    const { data: allPayments } = await supabase.from('payments').select('order_id, amount')
    const pMap: Record<string, number> = {}
    allPayments?.forEach(p => { pMap[p.order_id] = (pMap[p.order_id] || 0) + Number(p.amount) })
    const pendingPayments = allOrders?.filter(o => Number(o.repair_cost) > (pMap[o.id] || 0)).length || 0

    setStats({
      totalOrders: totalOrders || 0, pendingPayments,
      inProgress: inProgress || 0, warrantyAlerts: warrantyOrders || 0
    })
  }

  async function loadUnclaimed() {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
    const { data } = await supabase.from('orders')
      .select('id, order_no, customer_name, customer_phone, received_at, status')
      .eq('status', 'ready').lte('updated_at', thirtyDaysAgo)
      .order('updated_at', { ascending: false })
    if (data) setUnclaimed(data)
  }

  async function loadActivities() {
    const [o, p, t, pay] = await Promise.all([
      supabase.from('orders').select('*, creatorUser:users!created_by(name), assignedUser:users!assigned_to(name)').order('created_at', { ascending: false }).limit(5) as any,
      supabase.from('payments').select('*, order:orders!order_id(*), creator:users!created_by(name)').order('created_at', { ascending: false }).limit(5) as any,
      supabase.from('transfers').select('*, fromUser:users!from_user(name), toUser:users!to_user(name)').order('created_at', { ascending: false }).limit(5) as any,
      supabase.from('payments').select('order_id, amount'),
    ])

    const pMap: Record<string, number> = {}
    pay.data?.forEach((r: any) => { pMap[r.order_id] = (pMap[r.order_id] || 0) + Number(r.amount) })
    setPaidMap(pMap)

    const merged: any[] = []

    o.data?.forEach((r: any) => merged.push({
      id: 'o-'+r.id, type: 'order',
      userId: r.created_by || r.assigned_to,
      partnerName: r.creatorUser?.name || r.assignedUser?.name || '',
      summary: `${r.customer_name} (${r.order_no})`,
      time: r.created_at,
      order: r
    }))

    p.data?.forEach((r: any) => merged.push({
      id: 'p-'+r.id, type: 'payment',
      userId: r.created_by,
      partnerName: r.creator?.name || '',
      summary: `${r.amount} ${r.method === 'cash' ? 'نقد' : 'تحويل'} (${r.order?.order_no || ''})`,
      time: r.created_at,
      payment: r,
      order: r.order
    }))

    t.data?.forEach((r: any) => merged.push({
      id: 't-'+r.id, type: 'transfer',
      userId: r.from_user,
      partnerName: r.fromUser?.name || '',
      summary: `${r.amount} ← ${r.toUser?.name || ''}`,
      time: r.created_at,
      transfer: r
    }))

    merged.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
    setActivities(merged.slice(0, 10))
  }

  const typeIcons: Record<string, string> = { order: '📋', payment: '💰', transfer: '🔄' }
  const typeLabels: Record<string, string> = { order: 'طلب جديد', payment: 'سداد', transfer: 'تحويل' }

  const items = [
    { label: 'إجمالي الطلبات', value: stats.totalOrders, icon: ClipboardList, color: 'text-blue-600 bg-blue-100' },
    { label: 'قيد العمل', value: stats.inProgress, icon: Clock, color: 'text-yellow-600 bg-yellow-100' },
    { label: 'سداد معلق', value: stats.pendingPayments, icon: Wallet, color: 'text-red-600 bg-red-100' },
    { label: 'تحت الضمان', value: stats.warrantyAlerts, icon: AlertTriangle, color: 'text-orange-600 bg-orange-100' },
  ]

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">لوحة التحكم</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {items.map(item => (
          <Card key={item.label} className="flex items-center gap-4">
            <div className={`p-3 rounded-lg ${item.color}`}><item.icon className="w-6 h-6" /></div>
            <div>
              <p className="text-sm text-gray-500">{item.label}</p>
              <p className="text-2xl font-bold text-gray-900">{item.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-primary" />
          <h3 className="font-semibold">آخر النشاطات</h3>
        </div>
        {activities.length === 0 ? (
          <p className="text-sm text-gray-400">لا توجد نشاطات حديثة</p>
        ) : (
          <div className="space-y-1">
            {activities.map(a => {
              const isOpen = expandedId === a.id
              const isMe = a.userId && a.userId === profile?.id
              const displayName = isMe ? 'أنا' : getPartnerDisplayName(a.partnerName)
              const partnerColor = getPartnerColor(isMe ? (profile?.name || '') : a.partnerName)
              const order = a.order
              const paid = order ? (paidMap[order.id] || 0) : 0
              const remaining = order ? (Number(order.repair_cost) - paid) : 0
              const waMsg = order ? getWhatsAppMessage(order) : ''
              return (
                <div key={a.id}>
                  <div
                    onClick={() => setExpandedId(isOpen ? null : a.id)}
                    className={cn(
                      'py-2 px-3 rounded-lg cursor-pointer transition-colors text-sm',
                      'hover:bg-gray-100', isOpen && 'bg-blue-50'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span>{typeIcons[a.type] || '•'}</span>
                          <span className={cn('font-medium', partnerColor)}>{displayName}</span>
                          <span className="text-gray-400">•</span>
                          <span className="text-gray-500">{typeLabels[a.type] || ''}</span>
                        </div>
                        <p className="text-gray-700 truncate mt-0.5">{a.summary}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 pt-0.5">
                        <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(a.time)}</span>
                        {isOpen ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                      </div>
                    </div>
                  </div>

                  {isOpen && (
                    <div className="mx-3 mb-2 p-3 bg-white border rounded-lg text-sm space-y-2">
                      {a.type === 'order' && order && (
                        <>
                          <Row label="أضافه" value={displayName} badge={partnerColor} />
                          <Row label="العميل" value={order.customer_name} />
                          {order.customer_phone && <Row label="الجوال" value={order.customer_phone} />}
                          <Row label="القطعة" value={order.part_type} />
                          <Row label="الإصلاح" value={order.repair_type} />
                          <Row label="قيمة الإصلاح" value={formatCurrency(order.repair_cost)} />
                          <Row label="المدفوع" value={formatCurrency(paid)} />
                          <Row label="المتبقي" value={formatCurrency(remaining)} />
                          <Row label="الحالة" value={getStatusLabel(order.status)} badge={getStatusColor(order.status)} />
                          <Row label="التاريخ" value={formatDate(order.created_at)} />
                          <div className="flex gap-2 mt-2">
                            <Link to={`/orders/${order.id}`} className="flex items-center gap-1 text-primary text-xs hover:underline">
                              <ExternalLink className="w-3 h-3" /> فتح الطلب كامل
                            </Link>
                            <a href={`https://wa.me/?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-green-600 text-xs hover:underline">
                              <MessageCircle className="w-3 h-3" /> مشاركة عبر واتساب
                            </a>
                          </div>
                        </>
                      )}
                      {a.type === 'payment' && order && (
                        <>
                          <Row label="أضافه" value={displayName} badge={partnerColor} />
                          <Row label="العميل" value={order.customer_name} />
                          <Row label="الطلب" value={order.order_no} />
                          <Row label="القطعة" value={order.part_type} />
                          <Row label="الإصلاح" value={order.repair_type} />
                          <Row label="قيمة الإصلاح" value={formatCurrency(order.repair_cost)} />
                          <Row label="المدفوع" value={formatCurrency(paid)} />
                          <Row label="المتبقي" value={formatCurrency(remaining)} />
                          <Row label="طريقة الدفع" value={a.payment?.method === 'cash' ? 'نقداً' : 'تحويل'} />
                          <Row label="التاريخ" value={formatDate(a.payment?.created_at)} />
                          <div className="flex gap-2 mt-2">
                            <Link to={`/orders/${order.id}`} className="flex items-center gap-1 text-primary text-xs hover:underline">
                              <ExternalLink className="w-3 h-3" /> فتح الطلب كامل
                            </Link>
                            <a href={`https://wa.me/?text=${encodeURIComponent(waMsg)}`} target="_blank" rel="noreferrer"
                              className="flex items-center gap-1 text-green-600 text-xs hover:underline">
                              <MessageCircle className="w-3 h-3" /> مشاركة عبر واتساب
                            </a>
                          </div>
                        </>
                      )}
                      {a.type === 'transfer' && (
                        <>
                          <Row label="من" value={getPartnerDisplayName(a.transfer?.fromUser?.name)} badge={getPartnerColor(a.transfer?.fromUser?.name || '')} />
                          <Row label="إلى" value={getPartnerDisplayName(a.transfer?.toUser?.name)} badge={getPartnerColor(a.transfer?.toUser?.name || '')} />
                          <Row label="المبلغ" value={formatCurrency(a.transfer?.amount || 0)} />
                          {a.transfer?.note && <Row label="ملاحظة" value={a.transfer.note} />}
                          <Row label="التاريخ" value={formatDate(a.transfer?.created_at)} />
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {unclaimed.length > 0 && (
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <PackageX className="w-5 h-5 text-danger" />
            <h3 className="font-semibold text-danger">قطع غير مستلمة — أكثر من 30 يوماً ({unclaimed.length})</h3>
          </div>
          <div className="space-y-2">
            {unclaimed.map(o => (
              <Link key={o.id} to={`/orders/${o.id}`}
                className="flex items-center justify-between p-3 bg-red-50 rounded-lg hover:bg-red-100 transition-colors">
                <div>
                  <p className="font-medium">{o.order_no} — {o.customer_name}</p>
                  {o.customer_phone && (
                    <p className="text-xs text-gray-500 flex items-center gap-1" dir="ltr">
                      <Phone className="w-3 h-3" /> {o.customer_phone}
                    </p>
                  )}
                </div>
                <p className="text-xs text-gray-400">{formatDate(o.received_at)}</p>
              </Link>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

function Row({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      {badge ? <Badge className={badge}>{value}</Badge> : <span className="font-medium">{value}</span>}
    </div>
  )
}
