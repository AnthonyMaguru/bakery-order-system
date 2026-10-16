import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/ToastProvider'
import { BakeryProvider } from './context/BakeryProvider'
import { BuilderOptionsPage } from './pages/BuilderOptionsPage'
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
        <BakeryProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route index element={<Navigate to="/orders" replace />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="orders/:id" element={<OrderDetailPage />} />
              <Route path="schedule" element={<SchedulePage />} />
              <Route path="products" element={<ProductsPage />} />
              <Route path="builder" element={<BuilderOptionsPage />} />
              <Route path="stock" element={<StockPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="*" element={<p>Page not found.</p>} />
            </Route>
          </Routes>
        </BakeryProvider>
      </ToastProvider>
    </BrowserRouter>
  )
}
