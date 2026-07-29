import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { Transfer } from '../types/database'
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js'

export function useRealtimeTransfers() {
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchTransfers()

    const channel = supabase
      .channel('transfers-channel')
      .on<Transfer>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'transfers' },
        (payload: RealtimePostgresChangesPayload<Transfer>) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            setTransfers(prev => [payload.new as Transfer, ...prev])
          } else if (payload.eventType === 'DELETE' && payload.old) {
            setTransfers(prev => prev.filter(t => t.id !== (payload.old as Transfer).id))
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchTransfers() {
    setLoading(true)
    const { data } = await supabase
      .from('transfers')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setTransfers(data)
    setLoading(false)
  }

  return { transfers, loading }
}
