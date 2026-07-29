import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../context/AuthContext'
import { Card } from '../../components/ui/card'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { formatCurrency, getPartnerDisplayName } from '../../lib/utils'
import { Package, Plus, AlertTriangle, X, Warehouse } from 'lucide-react'
import type { InventoryItem } from '../../types/database'

export function InventoryPage() {
  const { profile } = useAuth()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', category: '', quantity: 0, min_quantity: 0, purchase_price: 0, selling_price: 0, supplier: '', notes: '' })

  useEffect(() => { loadItems() }, [])

  async function loadItems() {
    const { data } = await supabase.from('inventory').select('*').order('name')
    if (data) setItems(data)
    setLoading(false)
  }

  function resetForm() {
    setForm({ name: '', category: '', quantity: 0, min_quantity: 0, purchase_price: 0, selling_price: 0, supplier: '', notes: '' })
    setEditingId(null)
    setShowForm(false)
  }

  function editItem(item: InventoryItem) {
    setForm({
      name: item.name, category: item.category || '', quantity: item.quantity,
      min_quantity: item.min_quantity, purchase_price: item.purchase_price,
      selling_price: item.selling_price || 0, supplier: item.supplier || '', notes: item.notes || ''
    })
    setEditingId(item.id)
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) return

    if (editingId) {
      await supabase.from('inventory').update({
        name: form.name, category: form.category || null, quantity: form.quantity,
        min_quantity: form.min_quantity, purchase_price: form.purchase_price,
        selling_price: form.selling_price || null, supplier: form.supplier || null,
        notes: form.notes || null
      }).eq('id', editingId)
    } else {
      await supabase.from('inventory').insert({
        name: form.name, category: form.category || null, quantity: form.quantity,
        min_quantity: form.min_quantity, purchase_price: form.purchase_price,
        selling_price: form.selling_price || null, supplier: form.supplier || null,
        notes: form.notes || null, added_by: profile?.id
      })
    }
    resetForm()
    loadItems()
  }

  async function deleteItem(id: string) {
    await supabase.from('inventory').delete().eq('id', id)
    loadItems()
  }

  const totalValue = items.reduce((s, i) => s + (Number(i.purchase_price) * i.quantity), 0)
  const lowStockItems = items.filter(i => i.quantity <= i.min_quantity && i.min_quantity > 0)
  const outOfStock = items.filter(i => i.quantity <= 0)

  const lowStockWarn = [...new Set([...lowStockItems.map(i => i.id), ...outOfStock.map(i => i.id)])]

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">المخزون</h2>
        <Button onClick={() => { resetForm(); setShowForm(!showForm) }}>
          <Plus className="w-4 h-4" /> {showForm ? 'إلغاء' : 'إضافة قطعة'}
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-100"><Warehouse className="w-5 h-5 text-blue-600" /></div>
            <div>
              <p className="text-sm text-gray-500">إجمالي القطع</p>
              <p className="text-xl font-bold text-gray-900">{items.length}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-green-100"><Package className="w-5 h-5 text-green-600" /></div>
            <div>
              <p className="text-sm text-gray-500">إجمالي قيمة المخزون</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-red-100"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
            <div>
              <p className="text-sm text-gray-500">قطع منخفضة/منتهية</p>
              <p className="text-xl font-bold text-red-600">{lowStockWarn.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {lowStockWarn.length > 0 && (
        <Card className="mb-4 border-red-200 bg-red-50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-danger" />
            <h3 className="font-semibold text-danger">تنبيه المخزون</h3>
          </div>
          <div className="space-y-1">
            {items.filter(i => i.quantity <= 0).map(i => (
              <p key={i.id} className="text-sm text-red-700">• {i.name} — الكمية: {i.quantity} (نفد)</p>
            ))}
            {items.filter(i => i.quantity > 0 && i.quantity <= i.min_quantity).map(i => (
              <p key={i.id} className="text-sm text-orange-700">• {i.name} — الكمية: {i.quantity} (الحد الأدنى: {i.min_quantity})</p>
            ))}
          </div>
        </Card>
      )}

      {showForm && (
        <Card className="mb-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input id="inv-name" label="اسم القطعة" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
              <Input id="inv-category" label="الفئة" value={form.category} onChange={e => setForm({...form, category: e.target.value})} />
              <Input id="inv-qty" label="الكمية" type="number" value={form.quantity} onChange={e => setForm({...form, quantity: parseInt(e.target.value) || 0})} />
              <Input id="inv-min" label="الحد الأدنى للتنبيه" type="number" value={form.min_quantity} onChange={e => setForm({...form, min_quantity: parseInt(e.target.value) || 0})} />
              <Input id="inv-buy" label="سعر الشراء" type="number" step="0.01" value={form.purchase_price} onChange={e => setForm({...form, purchase_price: parseFloat(e.target.value) || 0})} />
              <Input id="inv-sell" label="سعر البيع" type="number" step="0.01" value={form.selling_price} onChange={e => setForm({...form, selling_price: parseFloat(e.target.value) || 0})} />
              <Input id="inv-supplier" label="المورد" value={form.supplier} onChange={e => setForm({...form, supplier: e.target.value})} />
            </div>
            <div className="space-y-1">
              <label htmlFor="inv-notes" className="block text-sm font-medium text-gray-700">ملاحظات</label>
              <textarea id="inv-notes" className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-light" rows={2} value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
            </div>
            <div className="flex gap-3">
              <Button type="submit">{editingId ? 'حفظ التغييرات' : 'إضافة'}</Button>
              <Button type="button" variant="secondary" onClick={resetForm}>إلغاء</Button>
            </div>
          </form>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">جاري التحميل...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-12 text-gray-500">لا توجد قطع في المخزون</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-gray-500">
                <th className="text-right py-3 px-2">القطعة</th>
                <th className="text-right py-3 px-2">الفئة</th>
                <th className="text-center py-3 px-2">الكمية</th>
                <th className="text-right py-3 px-2">سعر الشراء</th>
                <th className="text-right py-3 px-2">سعر البيع</th>
                <th className="text-right py-3 px-2">المورد</th>
                <th className="text-center py-3 px-2"></th>
              </tr>
            </thead>
            <tbody>
              {items.map(i => (
                <tr key={i.id} className="border-b hover:bg-gray-50">
                  <td className="py-3 px-2 font-medium">{i.name}</td>
                  <td className="py-3 px-2 text-gray-500">{i.category || '—'}</td>
                  <td className="py-3 px-2 text-center">
                    {i.quantity <= 0 ? (
                      <Badge className="bg-red-100 text-red-800">نفد</Badge>
                    ) : i.quantity <= i.min_quantity ? (
                      <span className="text-orange-600 font-medium">{i.quantity}</span>
                    ) : (
                      <span>{i.quantity}</span>
                    )}
                  </td>
                  <td className="py-3 px-2">{formatCurrency(i.purchase_price)}</td>
                  <td className="py-3 px-2">{i.selling_price ? formatCurrency(i.selling_price) : '—'}</td>
                  <td className="py-3 px-2 text-gray-500">{i.supplier || '—'}</td>
                  <td className="py-3 px-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => editItem(i)} className="p-1 hover:bg-gray-200 rounded text-xs text-gray-500">تعديل</button>
                      <button onClick={() => deleteItem(i.id)} className="p-1 hover:bg-red-100 rounded text-xs text-red-500"><X className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}