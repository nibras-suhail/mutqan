export type OrderStatus = 'received' | 'in_progress' | 'ready' | 'delivered'
export type PaymentMethod = 'cash' | 'transfer'
export type AttachmentType = 'before' | 'after' | 'doc'
export type UserRole = 'admin' | 'partner'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  created_at: string
}

export interface Order {
  id: string
  order_no: string
  customer_name: string
  customer_phone: string | null
  part_type: string
  repair_type: string
  status: OrderStatus
  assigned_to: string | null
  created_by: string | null
  received_at: string
  delivered_at: string | null
  repair_cost: number
  warranty_days: number
  warranty_expires_at: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  order_id: string
  amount: number
  method: PaymentMethod
  created_by: string | null
  reference: string | null
  receipt_url: string | null
  is_paid: boolean
  paid_at: string | null
  created_at: string
}

export interface Transfer {
  id: string
  from_user: string
  to_user: string
  amount: number
  note: string | null
  created_at: string
}

export interface Attachment {
  id: string
  order_id: string
  url: string
  type: AttachmentType
  uploaded_by: string
  created_at: string
}

export interface WarrantyClaim {
  id: string
  order_id: string
  return_date: string
  problem_description: string
  decision: string | null
  created_by: string
  created_at: string
}

export interface SavedReport {
  id: string
  title: string
  date_from: string
  date_to: string
  total_orders: number
  total_delivered: number
  total_collected: number
  total_pending: number
  cash_total: number
  transfer_total: number
  total_transfers: number
  created_by: string
  created_at: string
}

export interface InventoryItem {
  id: string
  name: string
  category: string | null
  quantity: number
  min_quantity: number
  purchase_price: number
  selling_price: number | null
  supplier: string | null
  notes: string | null
  added_by: string | null
  created_at: string
  updated_at: string
}

export interface AuditLog {
  id: string
  table_name: string
  record_id: string
  action: string
  changed_by: string
  old_data: Record<string, unknown> | null
  new_data: Record<string, unknown> | null
  created_at: string
}

export interface Database {
  public: {
    Tables: {
      users: { Row: User; Insert: Omit<User, 'created_at'>; Update: Partial<Omit<User, 'id'>> }
      orders: { Row: Order; Insert: Omit<Order, 'id' | 'order_no' | 'created_at' | 'updated_at'>; Update: Partial<Omit<Order, 'id'>> }
      payments: { Row: Payment; Insert: Omit<Payment, 'id' | 'created_at'>; Update: Partial<Omit<Payment, 'id'>> }
      transfers: { Row: Transfer; Insert: Omit<Transfer, 'id' | 'created_at'>; Update: Partial<Omit<Transfer, 'id'>> }
      attachments: { Row: Attachment; Insert: Omit<Attachment, 'id' | 'created_at'>; Update: Partial<Omit<Attachment, 'id'>> }
      audit_log: { Row: AuditLog; Insert: Omit<AuditLog, 'id' | 'created_at'>; Update: never }
      inventory: { Row: InventoryItem; Insert: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Omit<InventoryItem, 'id'>> }
    }
  }
}
