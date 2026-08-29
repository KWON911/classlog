import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { HomePage } from './routes/HomePage'
import { StudentListPage } from './routes/StudentListPage'
import { StudentDetailPage } from './routes/StudentDetailPage'
import { StudentManagePage } from './routes/StudentManagePage'
import { GrowthGardenPage } from './routes/GrowthGardenPage'
import { GrowthGardenStudentPage } from './routes/GrowthGardenStudentPage'
import { GrowthGardenReportPage } from './routes/GrowthGardenReportPage'
import { GrowthGardenSettingsPage } from './routes/GrowthGardenSettingsPage'
import { AttendancePage } from './routes/AttendancePage'
import { SeatingPage } from './routes/SeatingPage'
import { AppsPage } from './routes/AppsPage'
import { AdminPage } from './routes/AdminPage'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { GrowthSettingsProvider } from './lib/growth-garden/GrowthSettingsProvider'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route
            element={
              <GrowthSettingsProvider>
                <AppShell />
              </GrowthSettingsProvider>
            }
          >
            <Route path="/home" element={<HomePage />} />
            <Route path="/students" element={<StudentListPage />} />
            <Route path="/students/:id" element={<StudentDetailPage />} />
            <Route path="/students/manage" element={<StudentManagePage />} />
            <Route path="/growth-garden" element={<GrowthGardenPage />} />
            <Route path="/growth-garden/report" element={<GrowthGardenReportPage />} />
            <Route path="/growth-garden/settings" element={<GrowthGardenSettingsPage />} />
            <Route path="/growth-garden/:studentId" element={<GrowthGardenStudentPage />} />
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
