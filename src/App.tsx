import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { HomePage } from './routes/HomePage'
import { StudentListPage } from './routes/StudentListPage'
import { StudentDetailPage } from './routes/StudentDetailPage'
import { StudentManagePage } from './routes/StudentManagePage'
import { AttendancePage } from './routes/AttendancePage'
import { SeatingPage } from './routes/SeatingPage'
import { AppsPage } from './routes/AppsPage'
import { AdminPage } from './routes/AdminPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AppShell } from './components/AppShell'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route element={<AppShell />}>
            <Route path="/home" element={<HomePage />} />
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/students/manage" element={<StudentManagePage />} />
            <Route path="/attendance" element={<AttendancePage />} />
            <Route path="/seating" element={<SeatingPage />} />
            <Route path="/apps" element={<AppsPage />} />
            <Route path="/admin" element={<AdminPage />} />
          </Route>
        </Route>
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
