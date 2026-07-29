import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useAuth } from '../../context/AuthContext'
import { loginSchema, type LoginInput } from '../../lib/validations'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Card } from '../../components/ui/card'

export function LoginPage() {
  const { signIn, user } = useAuth()
  const [error, setError] = useState<string | null>(null)

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema)
  })

  if (user) return <Navigate to="/" replace />

  async function onSubmit(data: LoginInput) {
    setError(null)
    const err = await signIn(data.email, data.password)
    if (err) setError(err)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-primary">متقن</h1>
          <p className="text-gray-500 mt-1">نظام إدارة ورشة الصيانة</p>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
            {isSubmitting ? 'جاري تسجيل الدخول...' : 'تسجيل الدخول'}
          </Button>
        </form>
        <p className="text-center text-sm text-gray-500 mt-4">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="text-primary hover:underline">إنشاء حساب</Link>
        </p>
      </Card>
    </div>
  )
}
