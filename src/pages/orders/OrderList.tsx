import { Link } from 'react-router-dom'
import { Plus, Search, Eye, Edit2, Trash2 } from 'lucide-react'
import { useOrders } from '../../hooks/useOrders'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { getStatusColor, getStatusLabel, formatDate } from '../../lib/utils'
import { useState } from 'react'

export function OrderList() {
  const { orders, loading, deleteOrder } = useOrders()
  const [search, setSearch] = useState('')

  const filtered = orders.filter(o =>
    o.order_no.includes(search) ||
    o.customer_name.includes(search) ||
    o.part_type.includes(search)
  )

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">الطلبات</h2>
        <Link to="/orders/new">
          <Button>
            <Plus className="w-4 h-4" />
            طلب جديد
          </Button>
        </Link>
      </div>

      <Card className="mb-4 p-3">
        <div className="relative">
          <Search className="absolute right-3 top-2.5 w-4 h-4 text-gray-400" />
          <input
            className="w-full pr-9 pl-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-light"
            placeholder="بحث برقم الطلب أو اسم العميل..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-500">لا توجد طلبات</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(order => (
            <Card key={order.id} className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div>
                  <p className="font-bold text-primary">{order.order_no}</p>
                  <p className="text-sm text-gray-700">{order.customer_name}</p>
                  <p className="text-xs text-gray-500">{order.part_type} — {order.repair_type}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Badge className={getStatusColor(order.status)}>
                  {getStatusLabel(order.status)}
                </Badge>
                <span className="text-xs text-gray-400">{formatDate(order.created_at)}</span>
                <Link to={`/orders/${order.id}`}>
                  <Button variant="ghost" size="sm"><Eye className="w-4 h-4" /></Button>
                </Link>
                <Link to={`/orders/${order.id}/edit`}>
                  <Button variant="ghost" size="sm"><Edit2 className="w-4 h-4" /></Button>
                </Link>
                <Button variant="ghost" size="sm" onClick={async () => { try { await deleteOrder(order.id) } catch { alert('لا يمكن حذف الطلب - قد لا تملك الصلاحية') } }}>
                  <Trash2 className="w-4 h-4 text-danger" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
