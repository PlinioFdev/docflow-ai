import { Navigate, Route, Routes } from 'react-router-dom'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PipelineBuilder from './pages/PipelineBuilder'
import ReviewQueue from './pages/ReviewQueue'
import Analytics from './pages/Analytics'

function RequireAuth({ children }) {
  const token = localStorage.getItem('access_token')
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login"    element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/"          element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/pipelines" element={<RequireAuth><PipelineBuilder /></RequireAuth>} />
      <Route path="/review"    element={<RequireAuth><ReviewQueue /></RequireAuth>} />
      <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  )
}
