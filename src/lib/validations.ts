import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
})

export const registerSchema = z.object({
  name: z.string().min(2, 'الاسم يجب أن يكون حرفين على الأقل'),
  email: z.string().email('البريد الإلكتروني غير صالح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل')
})

export const orderSchema = z.object({
  customer_name: z.string().min(2, 'اسم العميل مطلوب'),
  customer_phone: z.string().optional(),
  part_type: z.string().min(1, 'نوع القطعة مطلوب'),
  repair_type: z.string().min(1, 'نوع الإصلاح مطلوب'),
  repair_cost: z.coerce.number().min(0, 'القيمة يجب أن تكون 0 أو أكثر'),
  warranty_days: z.coerce.number().min(0),
  notes: z.string().optional()
})

export const paymentSchema = z.object({
  order_id: z.string().uuid(),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  method: z.enum(['cash', 'transfer']),
  reference: z.string().optional(),
  is_paid: z.boolean().optional()
})

export const transferSchema = z.object({
  to_user: z.string().uuid(),
  amount: z.coerce.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  note: z.string().optional()
})

export type LoginInput = z.infer<typeof loginSchema>
export type RegisterInput = z.infer<typeof registerSchema>
export type OrderInput = z.infer<typeof orderSchema>
export type PaymentInput = z.infer<typeof paymentSchema>
export type TransferInput = z.infer<typeof transferSchema>
