import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { ToastProvider } from './components/ToastProvider'
import { AuthGate } from './context/AuthGate'
import { AdminGate } from './context/AdminGate'
import { BakeryProvider } from './context/BakeryProvider'
import { AdminLayout } from './components/AdminLayout'
import { AdminOverviewPage } from './pages/AdminOverviewPage'
import { AdminBakeriesPage } from './pages/AdminBakeriesPage'
import { AdminUsersPage } from './pages/AdminUsersPage'
import { ApplicationPage } from './pages/ApplicationPage'
import { BakeryApplicationsPage } from './pages/BakeryApplicationsPage'
import { BuilderOptionsPage } from './pages/BuilderOptionsPage'
import { LandingPage } from './pages/LandingPage'
import { OrderDetailPage } from './pages/OrderDetailPage'
import { OrdersPage } from './pages/OrdersPage'
import { ProductsPage } from './pages/ProductsPage'
import { SchedulePage } from './pages/SchedulePage'
import { SettingsPage } from './pages/SettingsPage'
import { SignInPage } from './pages/SignInPage'
import { StockPage } from './pages/StockPage'

export default function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/apply" element={<ApplicationPage />} />
          <Route path="/signin" element={<SignInPage />} />

          {/* Platform Administration Console - Governs platform, not bakery business secrets */}
          <Route
            path="/admin"
            element={
              <AuthGate>
                <AdminGate>
                  <AdminLayout />
                </AdminGate>
              </AuthGate>
            }
          >
            <Route index element={<Navigate to="/admin/overview" replace />} />
            <Route path="overview" element={<AdminOverviewPage />} />
            <Route path="applications" element={<BakeryApplicationsPage />} />
            <Route path="bakeries" element={<AdminBakeriesPage />} />
            <Route path="users" element={<AdminUsersPage />} />
          </Route>

          {/* Bakery Workspace - For verified staff/owners of a bakery */}
          <Route element={<AuthGate><BakeryProvider><Layout /></BakeryProvider></AuthGate>}>
            <Route path="orders" element={<OrdersPage />} />
            <Route path="orders/:id" element={<OrderDetailPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="products" element={<ProductsPage />} />
            <Route path="builder" element={<BuilderOptionsPage />} />
            <Route path="stock" element={<StockPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ToastProvider>
    </BrowserRouter>
  )
}
