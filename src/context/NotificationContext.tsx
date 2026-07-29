import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from './AuthContext'

interface NotificationContextType {
  unread: boolean
  markRead: () => void
  lastActivity: number
}

const NotificationContext = createContext<NotificationContextType>({
  unread: false,
  markRead: () => {},
  lastActivity: 0
})

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile } = useAuth()
  const [lastRead, setLastRead] = useState(() => Date.now())
  const [lastActivity, setLastActivity] = useState(0)

  useEffect(() => {
    if (!profile) return

    const channel = supabase
      .channel('notifications')
      .on('postgres_changes',
        { event: '*', schema: 'public', table: 'audit_log' },
        () => { setLastActivity(Date.now()) }
      )
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'payments' },
        () => { setLastActivity(Date.now()) }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [profile])

  const markRead = useCallback(() => {
    setLastRead(Date.now())
  }, [])

  return (
    <NotificationContext.Provider value={{
      unread: lastActivity > lastRead,
      markRead,
      lastActivity
    }}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  return useContext(NotificationContext)
}
