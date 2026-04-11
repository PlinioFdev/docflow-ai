import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Zap } from 'lucide-react'
import client from '../api/client'

export default function Register() {
  const navigate = useNavigate()
  const [form, setForm] = useState({
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setErrors({})
    setLoading(true)
    try {
      await client.post('/api/v1/auth/register/', form)
      navigate('/login')
    } catch (err) {
      setErrors(err.response?.data ?? { non_field_errors: ['Registration failed.'] })
    } finally {
      setLoading(false)
    }
  }

  const fieldError = (key) =>
    errors[key] ? (
      <p className="text-xs text-red-400 mt-1">{[errors[key]].flat().join(' ')}</p>
    ) : null

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <Zap className="w-7 h-7 text-brand" />
          <span className="text-xl font-bold tracking-tight text-slate-100">DocFlow AI</span>
        </div>

        <div className="bg-surface-1 border border-surface-3 rounded-2xl p-8">
          <h1 className="text-lg font-semibold text-slate-100 mb-6">Create account</h1>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              {[
                { name: 'first_name', label: 'First name', type: 'text' },
                { name: 'last_name',  label: 'Last name',  type: 'text' },
              ].map(({ name, label, type }) => (
                <div key={name}>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                  <input
                    type={type}
                    name={name}
                    value={form[name]}
                    onChange={handleChange}
                    className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand/60 transition-colors"
                  />
                  {fieldError(name)}
                </div>
              ))}
            </div>

            {[
              { name: 'email',     label: 'Email',            type: 'email',    placeholder: 'you@example.com', autoComplete: 'email' },
              { name: 'password',  label: 'Password',         type: 'password', placeholder: '••••••••',        autoComplete: 'new-password' },
              { name: 'password2', label: 'Confirm password', type: 'password', placeholder: '••••••••',        autoComplete: 'new-password' },
            ].map(({ name, label, type, placeholder, autoComplete }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-slate-400 mb-1.5">{label}</label>
                <input
                  type={type}
                  name={name}
                  value={form[name]}
                  onChange={handleChange}
                  required
                  autoComplete={autoComplete}
                  placeholder={placeholder}
                  className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand/60 transition-colors"
                />
                {fieldError(name)}
              </div>
            ))}

            {errors.non_field_errors && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-900/40 rounded-lg px-3 py-2">
                {[errors.non_field_errors].flat().join(' ')}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? 'Creating account…' : 'Create account'}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-light hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
