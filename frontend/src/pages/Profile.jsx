import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { User, Mail, Calendar, Package } from 'lucide-react'
import client from '../api/client'

export default function Profile() {
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    client.get('/api/v1/auth/me/').then(({ data }) => setProfile(data)).catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-3 bg-surface-1">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/dashboard" className="text-lg font-bold tracking-tight text-slate-100 hover:text-brand-light transition-colors">DocFlow AI</Link>
          <Link to="/dashboard" className="text-sm text-slate-400 hover:text-slate-100 transition-colors">← Back to Dashboard</Link>
        </div>
      </header>
      <main className="max-w-2xl mx-auto px-4 py-10">
        <h1 className="text-xl font-semibold text-slate-100 mb-6">Profile & Workspace</h1>
        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-6 space-y-4">
          {profile ? (
            <>
              <div className="flex items-center gap-3 text-slate-300">
                <User className="w-4 h-4 text-slate-500" />
                <span className="text-sm">{profile.name || profile.username || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Mail className="w-4 h-4 text-slate-500" />
                <span className="text-sm">{profile.email || '—'}</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Package className="w-4 h-4 text-slate-500" />
                <span className="text-sm">Free plan</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <Calendar className="w-4 h-4 text-slate-500" />
                <span className="text-sm">Member since {profile.date_joined ? new Date(profile.date_joined).toLocaleDateString() : '—'}</span>
              </div>
            </>
          ) : (
            <p className="text-sm text-slate-500">Loading profile…</p>
          )}
        </div>
      </main>
    </div>
  )
}
