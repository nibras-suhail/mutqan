import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useOrders } from '../../hooks/useOrders'
import { useAuth } from '../../context/AuthContext'
import { orderSchema, type OrderInput } from '../../lib/validations'
import type { Order } from '../../types/database'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'
import { FileUpload } from '../../components/shared/FileUpload'
import { formatDate } from '../../lib/utils'

export function OrderCreate() {
  const navigate = useNavigate()
  const { profile } = useAuth()
  const { createOrder } = useOrders()
  const [createdOrder, setCreatedOrder] = useState<Order | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<OrderInput>({
    resolver: zodResolver(orderSchema),
    defaultValues: { warranty_days: 0, repair_cost: 0 }
  })

  async function onSubmit(data: OrderInput) {
    const order = await createOrder({ ...data, created_by: profile?.id })
    if (order) setCreatedOrder(order)
  }

  if (createdOrder) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <h2 className="text-lg font-bold text-primary mb-2">{createdOrder.order_no}</h2>
          <p className="text-gray-700">{createdOrder.customer_name}</p>
          <p className="text-sm text-gray-500">{createdOrder.part_type} — {createdOrder.repair_type}</p>
          <p className="text-sm text-gray-500 mt-1">قيمة الإصلاح: {new Intl.NumberFormat('ar-SA', { style: 'currency', currency: 'SAR' }).format(createdOrder.repair_cost)}</p>
          <p className="text-xs text-gray-400 mt-1">{formatDate(createdOrder.created_at)}</p>
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">صور قبل الإصلاح</h3>
          <FileUpload orderId={createdOrder.id} type="before" onUploaded={() => {}} />
        </Card>

        <Card>
          <h3 className="font-semibold mb-4">صور بعد الإصلاح</h3>
          <FileUpload orderId={createdOrder.id} type="after" onUploaded={() => {}} />
        </Card>

        <div className="flex gap-3">
          <Button onClick={() => navigate(`/orders/${createdOrder.id}`)}>
            عرض التفاصيل
          </Button>
          <Button variant="secondary" onClick={() => navigate('/orders')}>
            العودة للطلبات
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">طلب جديد</h2>
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
              {isSubmitting ? 'جاري الحفظ...' : 'حفظ'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => navigate('/orders')}>
              إلغاء
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
