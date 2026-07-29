import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { NotificationProvider } from './context/NotificationContext'
import { Layout } from './components/layout/Layout'
import { LoginPage } from './pages/auth/LoginPage'
import { RegisterPage } from './pages/auth/RegisterPage'
import { Dashboard } from './pages/Dashboard'
import { OrderList } from './pages/orders/OrderList'
import { OrderCreate } from './pages/orders/OrderCreate'
import { OrderDetail } from './pages/orders/OrderDetail'
import { OrderEdit } from './pages/orders/OrderEdit'
import { PaymentList } from './pages/payments/PaymentList'
import { TransfersPage } from './pages/transfers/TransfersPage'
import { InventoryPage } from './pages/inventory/InventoryPage'
import { DailyReport } from './pages/reports/DailyReport'
import { DeliveryPage } from './pages/delivery/DeliveryPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <NotificationProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/delivery/:order_no" element={<DeliveryPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/orders" element={<OrderList />} />
            <Route path="/orders/new" element={<OrderCreate />} />
            <Route path="/orders/:id" element={<OrderDetail />} />
            <Route path="/orders/:id/edit" element={<OrderEdit />} />
            <Route path="/inventory" element={<InventoryPage />} />
            <Route path="/payments" element={<PaymentList />} />
            <Route path="/transfers" element={<TransfersPage />} />
            <Route path="/reports/daily" element={<DailyReport />} />
          </Route>
        </Routes>
        </NotificationProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
