import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import PipelineBuilder from './pages/PipelineBuilder'
import ReviewQueue from './pages/ReviewQueue'
import Analytics from './pages/Analytics'
import Profile from './pages/Profile'

function RequireAuth({ children }) {
  const token = localStorage.getItem('access_token')
  return token ? children : <Navigate to="/login" replace />
}

function RootRoute() {
  const token = localStorage.getItem('access_token')
  return token ? <Navigate to="/dashboard" replace /> : <Landing />
}

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<RootRoute />} />
      <Route path="/landing"   element={<Landing />} />
      <Route path="/login"     element={<Login />} />
      <Route path="/register"  element={<Register />} />
      <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
      <Route path="/pipelines" element={<RequireAuth><PipelineBuilder /></RequireAuth>} />
      <Route path="/review"    element={<RequireAuth><ReviewQueue /></RequireAuth>} />
      <Route path="/analytics" element={<RequireAuth><Analytics /></RequireAuth>} />
      <Route path="/profile"   element={<RequireAuth><Profile /></RequireAuth>} />
      <Route path="*"          element={<Navigate to="/" replace />} />
    </Routes>
  )
}
