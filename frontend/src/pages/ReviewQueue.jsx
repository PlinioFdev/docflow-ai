import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, LayoutDashboard, GitBranch, ClipboardList, BarChart2 } from 'lucide-react'
import client from '../api/client'
import ConfidenceBar from '../components/ConfidenceBar'

export default function ReviewQueue() {
  const [jobs, setJobs]         = useState([])
  const [docMap, setDocMap]     = useState({})   // id → document
  const [loading, setLoading]   = useState(true)
  const [edits, setEdits]       = useState({})   // { [jobId]: { [field]: value } }
  const [submitting, setSubmitting] = useState({})
  const [errors, setErrors]     = useState({})   // { [jobId]: string }

  const fetchData = useCallback(async () => {
    try {
      const [jRes, dRes] = await Promise.all([
        client.get('/api/v1/processing-jobs/'),
        client.get('/api/v1/documents/'),
      ])
      const allJobs  = jRes.data?.results ?? jRes.data ?? []
      const allDocs  = dRes.data?.results ?? dRes.data ?? []
      setJobs(allJobs.filter((j) => j.needs_review && j.status === 'completed'))
      setDocMap(Object.fromEntries(allDocs.map((d) => [d.id, d])))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const setFieldEdit = (jobId, fieldName, value) =>
    setEdits((prev) => ({ ...prev, [jobId]: { ...(prev[jobId] ?? {}), [fieldName]: value } }))

  const getFieldValue = (job, fieldName) =>
    edits[job.id]?.[fieldName] ?? job.result?.fields?.[fieldName]?.value ?? ''

  const handleApprove = async (job) => {
    setSubmitting((p) => ({ ...p, [job.id]: 'approving' }))
    setErrors((p) => ({ ...p, [job.id]: null }))
    try {
      const updatedFields = Object.fromEntries(
        Object.entries(job.result?.fields ?? {}).map(([k, v]) => [
          k,
          { ...v, value: edits[job.id]?.[k] ?? v.value, reviewed: true },
        ])
      )
      await client.patch(`/api/v1/processing-jobs/${job.id}/`, {
        result: { ...job.result, fields: updatedFields, reviewed: true },
      })
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
    } catch (err) {
      const msg = err.response?.status === 405
        ? 'Approve not yet supported by the API.'
        : (err.response?.data?.detail ?? 'Request failed.')
      setErrors((p) => ({ ...p, [job.id]: msg }))
    } finally {
      setSubmitting((p) => ({ ...p, [job.id]: null }))
    }
  }

  const handleReject = async (job) => {
    setSubmitting((p) => ({ ...p, [job.id]: 'rejecting' }))
    setErrors((p) => ({ ...p, [job.id]: null }))
    try {
      await client.patch(`/api/v1/processing-jobs/${job.id}/`, { status: 'failed' })
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
    } catch (err) {
      const msg = err.response?.status === 405
        ? 'Reject not yet supported by the API.'
        : (err.response?.data?.detail ?? 'Request failed.')
      setErrors((p) => ({ ...p, [job.id]: msg }))
    } finally {
      setSubmitting((p) => ({ ...p, [job.id]: null }))
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <header className="border-b border-surface-3 bg-surface-1">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-slate-100">DocFlow AI</span>
          <nav className="flex items-center gap-1">
            <Link to="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <Link to="/pipelines" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Pipelines
            </Link>
            <Link to="/review" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-100 bg-surface-3 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Review
            </Link>
            <Link to="/analytics" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" /> Analytics
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Review Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Jobs that scored under 80% confidence. Verify and correct fields before approving.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-surface-1 border border-surface-3 animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-900/20 border border-emerald-900/30 mb-5">
              <CheckCircle className="w-8 h-8 text-emerald-500 opacity-70" />
            </div>
            <h2 className="text-base font-semibold text-slate-300 mb-2">All caught up!</h2>
            <p className="text-sm text-slate-500 max-w-xs mx-auto leading-relaxed mb-1">
              No documents need review right now.
            </p>
            <p className="text-xs text-slate-600 max-w-xs mx-auto leading-relaxed mb-6">
              Jobs where AI confidence drops below 80% will appear here for manual verification.
            </p>
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-surface-3 text-slate-300 text-sm font-medium px-5 py-2.5 rounded-xl transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" /> Go to Dashboard
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => {
              const fields = job.result?.fields ?? {}
              const doc    = docMap[job.document]
              const busy   = submitting[job.id]
              const err    = errors[job.id]

              return (
                <div key={job.id} className="bg-surface-1 border border-amber-900/30 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="px-5 py-4 border-b border-surface-3 flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-100">
                        {doc?.name ?? `Document ${job.document?.slice(0, 8)}…`}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5 capitalize">
                        {doc?.doc_type ?? 'unknown'} · Job {job.id.slice(0, 8)}…
                      </p>
                    </div>
                    <div className="w-40 flex-shrink-0">
                      <p className="text-xs text-slate-500 mb-1.5">Overall confidence</p>
                      <ConfidenceBar score={job.confidence_score} />
                    </div>
                  </div>

                  {/* Fields */}
                  {Object.keys(fields).length === 0 ? (
                    <p className="px-5 py-4 text-xs text-slate-500">No extracted fields available.</p>
                  ) : (
                    <div className="divide-y divide-surface-3">
                      {Object.entries(fields).map(([fieldName, fieldData]) => {
                        const confidence = fieldData?.confidence ?? 0
                        const borderClass =
                          confidence < 0.6 ? 'border-red-900/60 focus:border-red-500/60'
                          : confidence < 0.8 ? 'border-amber-900/60 focus:border-amber-500/60'
                          : 'border-surface-3 focus:border-brand/60'

                        return (
                          <div key={fieldName} className="grid grid-cols-5 gap-4 items-center px-5 py-3">
                            <div className="col-span-2">
                              <p className="text-xs font-medium text-slate-300 capitalize mb-1">
                                {fieldName.replace(/_/g, ' ')}
                              </p>
                              <ConfidenceBar score={confidence} />
                            </div>
                            <div className="col-span-3">
                              <input
                                value={getFieldValue(job, fieldName)}
                                onChange={(e) => setFieldEdit(job.id, fieldName, e.target.value)}
                                className={`w-full bg-surface-2 border rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none transition-colors ${borderClass}`}
                              />
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Actions */}
                  <div className="px-5 py-3 border-t border-surface-3 flex items-center gap-3">
                    <button
                      onClick={() => handleApprove(job)}
                      disabled={!!busy}
                      className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {busy === 'approving' ? 'Approving…' : 'Approve'}
                    </button>
                    <button
                      onClick={() => handleReject(job)}
                      disabled={!!busy}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm px-4 py-2 rounded-lg hover:bg-red-900/20 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      {busy === 'rejecting' ? 'Rejecting…' : 'Reject'}
                    </button>
                    {err && (
                      <p className="text-xs text-red-400 ml-1">{err}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
