import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { AppLayout } from './components/AppLayout.jsx'
import { LoginPage } from './pages/LoginPage.jsx'
import {
  MaisPage,
  ResumoPage,
  VendasPage,
  VenderPage,
} from './pages/PlaceholderPages.jsx'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<AppLayout />}>
            <Route path="/vender" element={<VenderPage />} />
            <Route path="/vendas" element={<VendasPage />} />
            <Route path="/resumo" element={<ResumoPage />} />
            <Route path="/mais" element={<MaisPage />} />
          </Route>
          <Route path="/" element={<Navigate to="/vender" replace />} />
          <Route path="*" element={<Navigate to="/vender" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
