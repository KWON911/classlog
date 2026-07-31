import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { StudentListPage } from './routes/StudentListPage'
import { StudentDetailPage } from './routes/StudentDetailPage'
import { StudentManagePage } from './routes/StudentManagePage'
import { AttendancePage } from './routes/AttendancePage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AppShell } from './components/AppShell'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/students/manage" element={<StudentManagePage />} />
            <Route path="/attendance" element={<AttendancePage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/students" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
