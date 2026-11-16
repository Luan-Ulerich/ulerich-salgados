import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { AppLayout } from './components/AppLayout.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import {
  MaisPage,
  ResumoPage,
} from './pages/PlaceholderPages.jsx'
import { NewSalePage } from './pages/NewSalePage.jsx'
import { ProductFormPage } from './pages/ProductFormPage.jsx'
import { ProductsPage } from './pages/ProductsPage.jsx'
import { SalesPage } from './pages/SalesPage.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/vender" element={<NewSalePage />} />
            <Route path="/vendas" element={<SalesPage />} />
            <Route path="/resumo" element={<ResumoPage />} />
            <Route path="/mais" element={<MaisPage />} />
            <Route path="/produtos" element={<ProductsPage />} />
            <Route path="/produtos/novo" element={<ProductFormPage />} />
            <Route path="/produtos/:id" element={<ProductFormPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/vender" replace />} />
          <Route path="*" element={<Navigate to="/vender" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
