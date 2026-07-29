import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOrders } from '../../hooks/useOrders'
import { orderSchema, type OrderInput } from '../../lib/validations'
import type { Order } from '../../types/database'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'

export function OrderEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getOrder, updateOrder } = useOrders()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema)
  })

  useEffect(() => {
    if (id) loadOrder()
  }, [id])

  async function loadOrder() {
    if (!id) return
    const data = await getOrder(id)
    if (data) {
      setOrder(data)
      reset({
        customer_name: data.customer_name,
        customer_phone: data.customer_phone || '',
        part_type: data.part_type,
        repair_type: data.repair_type,
        repair_cost: data.repair_cost,
        warranty_days: data.warranty_days,
        notes: data.notes || ''
      })
    }
    setLoading(false)
  }

  async function onSubmit(data: OrderInput) {
    if (!id) return
    await updateOrder(id, data)
    navigate(`/orders/${id}`)
  }

  if (loading) return <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
  if (!order) return <div className="text-center py-12 text-gray-500">الطلب غير موجود</div>

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">تعديل الطلب {order.order_no}</h2>
      <Card>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="customer_name"
            label="اسم العميل"
            {...register('customer_name')}
            error={errors.customer_name?.message}
          />
          <Input
            id="customer_phone"
            label="رقم الجوال"
            type="tel"
            dir="ltr"
            {...register('customer_phone')}
            error={errors.customer_phone?.message}
          />
          <Input
            id="part_type"
            label="نوع القطعة"
            {...register('part_type')}
            error={errors.part_type?.message}
          />
          <Input
            id="repair_type"
            label="نوع الإصلاح"
            {...register('repair_type')}
            error={errors.repair_type?.message}
          />
          <Input
            id="repair_cost"
            label="قيمة الإصلاح (﷼)"
            type="number"
            step="0.01"
            {...register('repair_cost')}
            error={errors.repair_cost?.message}
          />
          <Input
            id="warranty_days"
            label="مدة الضمان (أيام)"
            type="number"
            {...register('warranty_days')}
            error={errors.warranty_days?.message}
          />
          <div className="space-y-1">
            <label htmlFor="notes" className="block text-sm font-medium text-gray-700">ملاحظات</label>
            <textarea
              id="notes"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
              rows={3}
              {...register('notes')}
            />
          </div>
          <div className="flex gap-3">
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ التغييرات'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate(`/orders/${id}`)}>
              إلغاء
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
