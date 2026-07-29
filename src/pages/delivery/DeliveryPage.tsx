import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Card } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Badge } from '../../components/ui/badge'
import { getStatusLabel, formatDate, formatCurrency } from '../../lib/utils'
import { CheckCircle, Package, Phone } from 'lucide-react'

export function DeliveryPage() {
  const { order_no } = useParams()
  const [order, setOrder] = useState<any>(null)
  const [payments, setPayments] = useState<{ amount: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [confirmed, setConfirmed] = useState(false)

  useEffect(() => {
    if (order_no) loadOrder()
  }, [order_no])

  async function loadOrder() {
    const { data, error } = await supabase.rpc('get_order_for_delivery', { p_order_no: order_no })
    if (error) { setError('الطلب غير موجود'); setLoading(false); return }
    if (!data) { setError('الطلب غير موجود'); setLoading(false); return }
    setOrder(data)

    const { data: pay } = await supabase.from('payments').select('amount').eq('order_id', data.id)
    if (pay) setPayments(pay)

    if (data.status === 'delivered') setConfirmed(true)
    setLoading(false)
  }

  async function handleConfirm() {
    const { data, error } = await supabase.rpc('confirm_delivery', { p_order_no: order_no })
    if (error) return
    if (data) {
      setConfirmed(true)
      setOrder((prev: any) => ({ ...prev, status: 'delivered' }))
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center">
          <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-700 mb-2">الطلب غير موجود</h2>
          <p className="text-gray-500">تأكد من رابط الاستلام</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-blue-50 to-gray-50 p-4">
      <Card className="w-full max-w-md text-center">
        <Package className="w-12 h-12 text-primary mx-auto mb-4" />

        {confirmed ? (
          <>
            <div className="mb-4">
              <CheckCircle className="w-16 h-16 text-success mx-auto" />
            </div>
            <h2 className="text-xl font-bold text-success mb-2">تم التأكيد!</h2>
            <p className="text-gray-500 mb-4">شكراً لك، تم تسليم القطعة بنجاح</p>
            <p className="text-sm text-gray-400">رقم الطلب: {order.order_no}</p>
          </>
        ) : (
          <>
            <h2 className="text-xl font-bold text-gray-900 mb-1">تفاصيل طلبك</h2>
            <p className="text-lg font-bold text-primary mb-6">{order.order_no}</p>

            <div className="space-y-3 text-right mb-6">
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">العميل</span>
                <span className="font-medium">{order.customer_name}</span>
              </div>
              {order.customer_phone && (
                <div className="flex justify-between py-2 border-b">
                  <span className="text-gray-500">الجوال</span>
                  <span className="font-medium flex items-center gap-1" dir="ltr">
                    <Phone className="w-3 h-3" />
                    {order.customer_phone}
                  </span>
                </div>
              )}
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">القطعة</span>
                <span className="font-medium">{order.part_type}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">الإصلاح</span>
                <span className="font-medium">{order.repair_type}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">قيمة الإصلاح</span>
                <span className="font-medium">{formatCurrency(order.repair_cost)}</span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">مدة الضمان</span>
                <span className="font-medium">
                  {order.warranty_days > 0 ? `${order.warranty_days} يوم` : 'بدون ضمان'}
                  {order.warranty_expires_at && ` (حتى ${formatDate(order.warranty_expires_at)})`}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b">
                <span className="text-gray-500">تاريخ الاستلام</span>
                <span className="font-medium">{formatDate(order.created_at)}</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-gray-500">الحالة</span>
                <Badge className="bg-blue-100 text-blue-800">{getStatusLabel(order.status)}</Badge>
              </div>
            </div>

            <div className="mb-6 p-3 bg-blue-50 rounded-lg space-y-1 text-sm text-right">
              <p className="font-semibold mb-2">تفاصيل الدفع</p>
              <div className="flex justify-between">
                <span className="text-gray-500">المبلغ الإجمالي</span>
                <span className="font-medium">{formatCurrency(Number(order.repair_cost))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">تم دفع</span>
                <span className="font-medium text-success">{formatCurrency(payments.reduce((s, p) => s + Number(p.amount), 0))}</span>
              </div>
              {(() => {
                const remaining = Number(order.repair_cost) - payments.reduce((s, p) => s + Number(p.amount), 0)
                return remaining > 0 ? (
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-gray-500">المتبقي عليك</span>
                    <span className="font-bold text-danger">{formatCurrency(remaining)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between border-t pt-1">
                    <span className="text-gray-500">الحالة</span>
                    <span className="font-bold text-success">مدفوع بالكامل ✓</span>
                  </div>
                )
              })()}
            </div>

            <Button className="w-full text-lg py-4" onClick={handleConfirm}>
              <CheckCircle className="w-5 h-5" />
              تأكيد الاستلام
            </Button>
            <p className="text-xs text-gray-400 mt-3">
              بالضغط على تأكيد، أنت تقر باستلام القطعة
            </p>
          </>
        )}
      </Card>
    </div>
  )
}
