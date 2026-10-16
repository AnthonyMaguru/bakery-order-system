import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/ToastProvider'
import { AuthGate } from './context/AuthGate'
import { BakeryProvider } from './context/BakeryProvider'
import { ApplicationPage } from './pages/ApplicationPage'
import { BakeryApplicationsPage } from './pages/BakeryApplicationsPage'
import { BuilderOptionsPage } from './pages/BuilderOptionsPage'
import { LandingPage } from './pages/LandingPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'
import { SchedulePage } from './pages/SchedulePage'
import { SettingsPage } from './pages/SettingsPage'
import { StockPage } from './pages/StockPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/apply" element={<ApplicationPage />} />
          <Route path="/admin/applications" element={<AuthGate><BakeryApplicationsPage /></AuthGate>} />
          <Route element={<AuthGate><BakeryProvider><Layout /></BakeryProvider></AuthGate>}>
            <Route index element={<Navigate to="/orders" replace />} />
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="builder" element={<BuilderOptionsPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
