import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { formatDate, formatCurrency } from '../../lib/utils'
import { startOfDay, endOfDay, format } from 'date-fns'
import { Save, FileText, Trash2, BarChart3 } from 'lucide-react'
import type { SavedReport } from '../../types/database'

type Tab = 'daily' | 'monthly'

export function DailyReport() {
  const { profile } = useAuth()
  const [tab, setTab] = useState<Tab>('daily')

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-6">التقارير</h2>

      <div className="flex gap-2 mb-6">
        <Button variant={tab === 'daily' ? 'primary' : 'secondary'} onClick={() => setTab('daily')}>
          تقرير يومي
        </Button>
        <Button variant={tab === 'monthly' ? 'primary' : 'secondary'} onClick={() => setTab('monthly')}>
          <BarChart3 className="w-4 h-4" />
          تقرير شهري
        </Button>
      </div>

      {tab === 'daily' ? <DailyTab /> : <MonthlyTab />}
    </div>
  )
}

function DailyTab() {
  const { profile } = useAuth()
  const [dateFrom, setDateFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [report, setReport] = useState({
    totalOrders: 0, deliveredOrders: 0, totalPayments: 0,
    pendingPayments: 0, cashTotal: 0, transferTotal: 0, totalTransfers: 0
  })
  const [savedReports, setSavedReports] = useState<SavedReport[]>([])
  const [title, setTitle] = useState('')
  const [saving, setSaving] = useState(false)

  const loadReport = useCallback(async () => {
    const from = startOfDay(new Date(dateFrom)).toISOString()
    const to = endOfDay(new Date(dateTo)).toISOString()

    const { count: totalOrders } = await supabase.from('orders')
      .select('*', { count: 'exact', head: true }).gte('created_at', from).lte('created_at', to)

    const { count: deliveredOrders } = await supabase.from('orders')
      .select('*', { count: 'exact', head: true }).eq('status', 'delivered')
      .gte('created_at', from).lte('created_at', to)

    const { data: payments } = await supabase.from('payments')
      .select('amount, method, is_paid').gte('created_at', from).lte('created_at', to)

    const totalPayments = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0
    const pendingPayments = payments?.filter(p => !p.is_paid).reduce((s, p) => s + Number(p.amount), 0) || 0
    const cashTotal = payments?.filter(p => p.method === 'cash' && p.is_paid).reduce((s, p) => s + Number(p.amount), 0) || 0
    const transferTotal = payments?.filter(p => p.method === 'transfer' && p.is_paid).reduce((s, p) => s + Number(p.amount), 0) || 0

    const { data: transfers } = await supabase.from('transfers')
      .select('amount').gte('created_at', from).lte('created_at', to)
    const totalTransfers = transfers?.reduce((s, t) => s + Number(t.amount), 0) || 0

    setReport({ totalOrders: totalOrders || 0, deliveredOrders: deliveredOrders || 0, totalPayments, pendingPayments, cashTotal, transferTotal, totalTransfers })
  }, [dateFrom, dateTo])

  const loadSavedReports = useCallback(async () => {
    const { data } = await supabase.from('saved_reports').select('*').order('created_at', { ascending: false })
    if (data) setSavedReports(data)
  }, [])

  useEffect(() => { loadReport(); loadSavedReports() }, [loadReport, loadSavedReports])

  async function handleSave() {
    if (!profile || !title.trim()) return
    setSaving(true)
    await supabase.from('saved_reports').insert({
      title, date_from: startOfDay(new Date(dateFrom)).toISOString(), date_to: endOfDay(new Date(dateTo)).toISOString(),
      total_orders: report.totalOrders, total_delivered: report.deliveredOrders,
      total_collected: report.totalPayments, total_pending: report.pendingPayments,
      cash_total: report.cashTotal, transfer_total: report.transferTotal,
      total_transfers: report.totalTransfers, created_by: profile.id
    })
    setTitle(''); setSaving(false); loadSavedReports()
  }

  async function handleDelete(id: string) {
    await supabase.from('saved_reports').delete().eq('id', id); loadSavedReports()
  }

  function applySavedReport(r: SavedReport) {
    setDateFrom(format(new Date(r.date_from), 'yyyy-MM-dd'))
    setDateTo(format(new Date(r.date_to), 'yyyy-MM-dd'))
  }

  const items = [
    { label: 'إجمالي الطلبات', value: report.totalOrders },
    { label: 'الطلبات المُسلمة', value: report.deliveredOrders },
    { label: 'إجمالي المقبوضات', value: formatCurrency(report.totalPayments), highlight: true },
    { label: 'المتبقي غير مدفوع', value: formatCurrency(report.pendingPayments) },
    { label: 'نقداً', value: formatCurrency(report.cashTotal) },
    { label: 'تحويل بنكي', value: formatCurrency(report.transferTotal) },
    { label: 'إجمالي التحويلات الداخلية', value: formatCurrency(report.totalTransfers) },
  ]

  return (
    <div>
      <Card className="mb-6">
        <h3 className="font-semibold mb-4">فلتر التاريخ</h3>
        <div className="flex flex-wrap items-end gap-4">
          <Input id="dateFrom" label="من" type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
          <Input id="dateTo" label="إلى" type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} />
          <Button onClick={loadReport}>عرض</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {items.map(item => (
          <Card key={item.label}>
            <p className="text-sm text-gray-500">{item.label}</p>
            <p className={`text-2xl font-bold mt-1 ${item.highlight ? 'text-primary' : 'text-gray-900'}`}>{item.value}</p>
          </Card>
        ))}
      </div>

      <Card className="mb-6">
        <h3 className="font-semibold mb-4">حفظ التقرير</h3>
        <div className="flex items-end gap-4">
          <Input id="title" label="اسم التقرير" value={title} onChange={e => setTitle(e.target.value)} placeholder="تقرير نهاية اليوم" />
          <Button onClick={handleSave} disabled={saving || !title.trim()}>
            <Save className="w-4 h-4" />{saving ? 'جاري الحفظ...' : 'حفظ التقرير'}
          </Button>
        </div>
      </Card>

      <Card>
        <h3 className="font-semibold mb-4">التقارير المحفوظة</h3>
        {savedReports.length === 0 ? (
          <p className="text-sm text-gray-400">لا توجد تقارير محفوظة</p>
        ) : (
          <div className="space-y-3">
            {savedReports.map(r => (
              <div key={r.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium flex items-center gap-2"><FileText className="w-4 h-4 text-primary" />{r.title}</p>
                  <p className="text-xs text-gray-500">{formatDate(r.date_from)} — {formatDate(r.date_to)}</p>
                  <p className="text-xs text-gray-400">مقبوضات: {formatCurrency(r.total_collected)} | غير مدفوع: {formatCurrency(r.total_pending)}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="secondary" size="sm" onClick={() => applySavedReport(r)}>فتح</Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDelete(r.id)}><Trash2 className="w-4 h-4 text-danger" /></Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}

function MonthlyTab() {
  const [month, setMonth] = useState(() => format(new Date(), 'yyyy-MM'))
  const [data, setData] = useState<{ user_id: string; user_name: string; total_orders: number; total_collected: number }[]>([])

  useEffect(() => { loadMonthly() }, [month])

  async function loadMonthly() {
    const year = parseInt(month.split('-')[0])
    const mon = parseInt(month.split('-')[1])
    const from = new Date(year, mon - 1, 1).toISOString()
    const to = new Date(year, mon, 0, 23, 59, 59).toISOString()

    const { data: users } = await supabase.from('users').select('id, name')
    if (!users) return

    const rows = await Promise.all(
      users.map(async (u) => {
        const { count: totalOrders } = await supabase.from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('assigned_to', u.id)
          .gte('created_at', from).lte('created_at', to)

        const { data: orderIds } = await supabase.from('orders')
          .select('id').eq('assigned_to', u.id)
          .gte('created_at', from).lte('created_at', to)
        const ids = orderIds?.map(o => o.id) || []

        let totalCollected = 0
        if (ids.length > 0) {
          const { data: payments } = await supabase.from('payments')
            .select('amount').in('order_id', ids).eq('is_paid', true)
          totalCollected = payments?.reduce((s, p) => s + Number(p.amount), 0) || 0
        }

        return { user_id: u.id, user_name: u.name, total_orders: totalOrders || 0, total_collected: totalCollected }
      })
    )

    setData(rows)
  }

  const grandTotalOrders = data.reduce((s, r) => s + r.total_orders, 0)
  const grandTotalCollected = data.reduce((s, r) => s + r.total_collected, 0)

  return (
    <div>
      <Card className="mb-6">
        <h3 className="font-semibold mb-4">اختر الشهر</h3>
        <Input id="month" type="month" value={month} onChange={e => setMonth(e.target.value)} className="max-w-xs" />
      </Card>

      <div className="space-y-3">
        {data.map(row => (
          <Card key={row.user_id} className="flex items-center justify-between p-4">
            <div>
              <p className="font-medium">{row.user_name}</p>
              <p className="text-sm text-gray-500">عدد الطلبات المنجزة: {row.total_orders}</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">المستلم</p>
              <p className="text-lg font-bold text-primary">{formatCurrency(row.total_collected)}</p>
            </div>
          </Card>
        ))}
      </div>

      <Card className="mt-4 bg-primary/5">
        <div className="flex items-center justify-between">
          <p className="font-bold">الإجمالي</p>
          <div className="text-left">
            <p className="text-sm text-gray-500">{grandTotalOrders} طلب</p>
            <p className="text-xl font-bold text-primary">{formatCurrency(grandTotalCollected)}</p>
          </div>
        </div>
      </Card>
    </div>
  )
}
