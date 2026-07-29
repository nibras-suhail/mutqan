import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { cn, formatCurrency, formatDate, getPartnerDisplayName, getPartnerColor } from '../../lib/utils'
import { useAuth } from '../../context/AuthContext'
import { Plus, CheckCircle, XCircle } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { paymentSchema, type PaymentInput } from '../../lib/validations'

interface PaymentWithOrder {
  id: string
  order_id: string
  amount: number
  method: 'cash' | 'transfer'
  reference: string | null
  is_paid: boolean
  paid_at: string | null
  created_by: string | null
  created_at: string
  order: { order_no: string; customer_name: string; repair_cost: number }
  creator?: { name: string }
}

export function PaymentList() {
  const { profile } = useAuth()
  const [payments, setPayments] = useState<PaymentWithOrder[]>([])
  const [orders, setOrders] = useState<{ id: string; order_no: string; customer_name: string; repair_cost: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [totalAmount, setTotalAmount] = useState(0)
  const [paidAmount, setPaidAmount] = useState(0)
  const [remaining, setRemaining] = useState(0)
  const [existingPaid, setExistingPaid] = useState(0)

  const { register, handleSubmit, reset, setValue, formState: { errors, isSubmitting } } = useForm<PaymentInput>({
    resolver: zodResolver(paymentSchema),
    defaultValues: { method: 'cash' }
  })

  useEffect(() => { loadPayments(); loadOrders() }, [])

  async function loadPayments() {
    const { data } = await supabase
      .from('payments')
      .select('*, order:orders(order_no, customer_name, repair_cost), creator:users!created_by(name)')
      .order('created_at', { ascending: false })
    if (data) setPayments(data as unknown as PaymentWithOrder[])
    setLoading(false)
  }

  async function loadOrders() {
    const { data } = await supabase
      .from('orders')
      .select('id, order_no, customer_name, repair_cost')
      .order('order_no', { ascending: false })
    if (data) setOrders(data)
  }

  const [submitError, setSubmitError] = useState<string | null>(null)

  function handleOrderSelect(e: React.ChangeEvent<HTMLSelectElement>) {
    const orderId = e.target.value
    setSelectedOrderId(orderId)
    setValue('order_id', orderId)
    if (!orderId) { setTotalAmount(0); setExistingPaid(0); setPaidAmount(0); setRemaining(0); return }
    const order = orders.find(o => o.id === orderId)
    if (order) {
      setTotalAmount(order.repair_cost)
      const paid = payments
        .filter(p => p.order_id === orderId)
        .reduce((s, p) => s + Number(p.amount), 0)
      setExistingPaid(paid)
      setPaidAmount(0)
      setRemaining(order.repair_cost - paid)
    }
  }

  function handlePaidChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = parseFloat(e.target.value) || 0
    setPaidAmount(val)
    setRemaining(Math.max(0, totalAmount - existingPaid - val))
    setValue('amount', val)
  }

  async function onSubmit(data: PaymentInput) {
    setSubmitError(null)
    const { error } = await supabase.from('payments').insert({
      order_id: data.order_id,
      amount: data.amount,
      method: data.method,
      reference: data.reference || null,
      is_paid: true,
      paid_at: new Date().toISOString(),
      created_by: profile?.id
    })
    if (error) { setSubmitError(error.message); return }
    reset()
    setSelectedOrderId('')
    setTotalAmount(0)
    setPaidAmount(0)
    setRemaining(0)
    setExistingPaid(0)
    setShowForm(false)
    loadPayments()
  }

  function getOrderTotalPaid(orderId: string): number {
    return payments.filter(p => p.order_id === orderId).reduce((s, p) => s + Number(p.amount), 0)
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">السداد</h2>
        <Button onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4" />
          إضافة سداد
        </Button>
      </div>

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">رقم الطلب</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" value={selectedOrderId} onChange={handleOrderSelect}>
                <option value="">اختر طلباً</option>
                {orders.map(o => (
                  <option key={o.id} value={o.id}>{o.order_no} — {o.customer_name}</option>
                ))}
              </select>
              {errors.order_id && <p className="text-sm text-danger">{errors.order_id.message}</p>}
            </div>

            {selectedOrderId && (
              <>
                <div className="p-3 bg-blue-50 rounded-lg space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">المبلغ الإجمالي</span>
                    <span className="font-medium">{formatCurrency(totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">المدفوع سابقاً</span>
                    <span className="font-medium">{formatCurrency(existingPaid)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-gray-500">المتبقي</span>
                    <span className={`font-bold ${remaining > 0 ? 'text-danger' : 'text-success'}`}>
                      {formatCurrency(remaining)}
                    </span>
                  </div>
                </div>

                <Input id="paidAmount" label="المدفوع الآن" type="number" step="0.01"
                  value={paidAmount || ''} onChange={handlePaidChange}
                  error={errors.amount?.message} />
                <input type="hidden" {...register('amount')} />
                <input type="hidden" {...register('order_id')} />
              </>
            )}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700">طريقة الدفع</label>
              <select className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm" {...register('method')}>
                <option value="cash">نقداً</option>
                <option value="transfer">تحويل</option>
              </select>
            </div>
            <Input id="reference" label="المرجع" {...register('reference')} />
            {submitError && <p className="text-sm text-danger">{submitError}</p>}
            <Button type="submit" disabled={isSubmitting || paidAmount <= 0}>حفظ</Button>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : payments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">لا يوجد سداد</div>
      ) : (
        <div className="space-y-3">
          {[...new Set(payments.map(p => p.order_id))].map(orderId => {
            const orderPayments = payments.filter(p => p.order_id === orderId)
            const first = orderPayments[0]
            const totalPaid = getOrderTotalPaid(orderId)
            const total = Number(first.order?.repair_cost ?? 0)
            const remainingAmt = total - totalPaid
            return (
              <Card key={orderId}>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="font-semibold text-primary">{first.order?.order_no}</p>
                    <p className="text-sm text-gray-500">{first.order?.customer_name}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 mb-4 text-center">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">الإجمالي</p>
                    <p className="font-bold">{formatCurrency(total)}</p>
                  </div>
                  <div className="p-3 bg-green-50 rounded-lg">
                    <p className="text-xs text-gray-500 mb-1">المدفوع</p>
                    <p className="font-bold text-success">{formatCurrency(totalPaid)}</p>
                  </div>
                  <div className={`p-3 rounded-lg ${remainingAmt > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                    <p className="text-xs text-gray-500 mb-1">المتبقي</p>
                    {remainingAmt > 0 ? (
                      <div className="flex items-center justify-center gap-1">
                        <Badge className="bg-red-100 text-red-800 text-[10px]">متبقي</Badge>
                        <p className="font-bold text-danger">{formatCurrency(remainingAmt)}</p>
                      </div>
                    ) : (
                      <Badge className="bg-green-100 text-green-800">مدفوع بالكامل</Badge>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  {orderPayments.map(p => (
                    <div key={p.id} className="flex items-center justify-between py-1 px-2 bg-gray-50 rounded text-sm">
                      <span className="text-gray-500">
                        {formatDate(p.created_at)} — {p.method === 'cash' ? 'نقداً' : 'تحويل'}
                        {p.creator?.name && <span className={cn('mr-2 text-xs font-medium', getPartnerColor(p.creator.name))}>بواسطة {getPartnerDisplayName(p.creator.name)}</span>}
                      </span>
                      <span className="font-medium">{formatCurrency(p.amount)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
