import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR'
  }).format(amount)
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('ar-SA', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(new Date(date))
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    received: 'bg-blue-100 text-blue-800',
    in_progress: 'bg-yellow-100 text-yellow-800',
    ready: 'bg-green-100 text-green-800',
    delivered: 'bg-gray-100 text-gray-800'
  }
  return colors[status] || 'bg-gray-100 text-gray-800'
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    received: 'مستلم',
    in_progress: 'قيد العمل',
    ready: 'جاهز',
    delivered: 'مُسلّم'
  }
  return labels[status] || status
}

const partnerNames: Record<string, string> = {
  'falah': 'فلاح',
  'sultan': 'سلطان',
}

const partnerColorMap: Record<string, string> = {
  'فلاح': 'text-blue-600',
  'falah': 'text-blue-600',
  'سلطان': 'text-purple-600',
  'sultan': 'text-purple-600',
}

export function getPartnerDisplayName(name: string | null | undefined): string {
  if (!name) return 'غير معروف'
  return partnerNames[name.toLowerCase()] || name
}

export function getPartnerColor(name: string): string {
  if (!name) return 'text-gray-700'
  const n = name.toLowerCase()
  return partnerColorMap[n] || 'text-gray-700'
}

export function getWhatsAppMessage(order: { order_no: string; customer_name: string; part_type: string; repair_type: string; repair_cost: number; status: string }): string {
  const label = getStatusLabel(order.status)
  const date = new Intl.DateTimeFormat('ar-SA', { dateStyle: 'short' }).format(new Date())
  return `طلب رقم ${order.order_no} | العميل: ${order.customer_name} | القطعة: ${order.part_type} | الإصلاح: ${order.repair_type} | القيمة: ${order.repair_cost} ر.س | الحالة: ${label} | التاريخ: ${date}`
}
