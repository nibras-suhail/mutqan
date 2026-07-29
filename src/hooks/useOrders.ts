import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Order } from '../types/database'

export function useOrders() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchOrders()
  }, [])

  async function fetchOrders() {
    setLoading(true)
    const { data } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setOrders(data)
    setLoading(false)
  }

  async function getOrder(id: string): Promise<Order | null> {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()
    return data
  }

  async function createOrder(order: Partial<Order>): Promise<Order | null> {
    const { data } = await supabase
      .from('orders')
      .insert(order)
      .select()
      .single()
    if (data) {
      setOrders(prev => [data, ...prev])
    }
    return data
  }

  async function updateOrder(id: string, updates: Partial<Order>): Promise<Order | null> {
    const { data } = await supabase
      .from('orders')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) {
      setOrders(prev => prev.map(o => o.id === id ? data : o))
    }
    return data
  }

  async function deleteOrder(id: string): Promise<void> {
    const { error } = await supabase
      .from('orders')
      .delete()
      .eq('id', id)
    if (error) throw error
    setOrders(prev => prev.filter(o => o.id !== id))
  }

  return { orders, loading, getOrder, createOrder, updateOrder, deleteOrder, refetch: fetchOrders }
}
