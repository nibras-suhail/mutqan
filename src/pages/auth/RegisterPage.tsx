import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../context/AuthContext'
import { registerSchema, type RegisterInput } from '../../lib/validations'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'

export function RegisterPage() {
  const { signUp, user } = useAuth()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema)
  })

  if (user) return <Navigate to="/" replace />

  async function onSubmit(data: RegisterInput) {
    setError(null)
    const err = await signUp(data.name, data.email, data.password)
    if (err) setError(err)
    else setSuccess(true)
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center">
          <h2 className="text-xl font-bold text-success mb-2">تم إنشاء الحساب</h2>
          <p className="text-gray-500">تحقق من بريدك الإلكتروني لتفعيل الحساب</p>
          <Link to="/login" className="text-primary hover:underline mt-4 inline-block">
            العودة لتسجيل الدخول
          </Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">إنشاء حساب</h1>
          <p className="text-gray-500 mt-1">انضم إلى نظام متقن</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            id="name"
            label="الاسم"
            {...register('name')}
            error={errors.name?.message}
          />
          <Input
            id="email"
            label="البريد الإلكتروني"
            type="email"
            {...register('email')}
            error={errors.email?.message}
          />
          <Input
            id="password"
            label="كلمة المرور"
            type="password"
            {...register('password')}
            error={errors.password?.message}
          />
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? 'جاري إنشاء الحساب...' : 'إنشاء حساب'}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="text-primary hover:underline">تسجيل الدخول</Link>
        </p>
      </Card>
    </div>
  )
}
