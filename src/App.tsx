import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { StudentListPage } from './routes/StudentListPage'
import { StudentDetailPage } from './routes/StudentDetailPage'
import { ProtectedRoute } from './routes/ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/students" element={<StudentListPage />} />
          <Route path="/students/:id" element={<StudentDetailPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/students" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
