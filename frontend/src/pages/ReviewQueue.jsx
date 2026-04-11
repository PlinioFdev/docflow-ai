import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CheckCircle, XCircle, LayoutDashboard, GitBranch, ClipboardList } from 'lucide-react'
import client from '../api/client'
import ConfidenceBar from '../components/ConfidenceBar'

export default function ReviewQueue() {
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  // Track edits per job: { [jobId]: { [fieldName]: editedValue } }
  const [edits, setEdits] = useState({})
  const [submitting, setSubmitting] = useState({})

  const fetchJobs = useCallback(async () => {
    try {
      const { data } = await client.get('/api/v1/processing-jobs/')
      const all = data?.results ?? data ?? []
      setJobs(all.filter((j) => j.needs_review && j.status === 'completed'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchJobs() }, [fetchJobs])

  const setFieldEdit = (jobId, fieldName, value) =>
    setEdits((prev) => ({
      ...prev,
      [jobId]: { ...(prev[jobId] ?? {}), [fieldName]: value },
    }))

  const getFieldValue = (job, fieldName) =>
    edits[job.id]?.[fieldName] ?? job.result?.fields?.[fieldName]?.value ?? ''

  const handleConfirm = async (job) => {
    setSubmitting((p) => ({ ...p, [job.id]: 'confirming' }))
    try {
      // Merge edits back into result and mark reviewed
      const updatedResult = {
        ...job.result,
        fields: Object.fromEntries(
          Object.entries(job.result?.fields ?? {}).map(([k, v]) => [
            k,
            { ...v, value: edits[job.id]?.[k] ?? v.value, reviewed: true },
          ])
        ),
        reviewed: true,
      }
      await client.patch(`/api/v1/processing-jobs/${job.id}/`, { result: updatedResult })
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
    } catch (err) {
      console.error(err)
    } finally {
      setSubmitting((p) => ({ ...p, [job.id]: null }))
    }
  }

  const handleReject = async (job) => {
    setSubmitting((p) => ({ ...p, [job.id]: 'rejecting' }))
    try {
      await client.patch(`/api/v1/processing-jobs/${job.id}/`, { status: 'failed' })
      setJobs((prev) => prev.filter((j) => j.id !== job.id))
    } catch (err) {
      console.error(err)
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
            <Link to="/" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <Link to="/pipelines" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Pipelines
            </Link>
            <Link to="/review" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-100 bg-surface-3 flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Review
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <div>
          <h1 className="text-xl font-semibold text-slate-100">Review Queue</h1>
          <p className="text-sm text-slate-500 mt-1">
            Jobs below scored under 80% confidence. Verify and correct fields before confirming.
          </p>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-surface-1 border border-surface-3 animate-pulse" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-20 text-slate-600">
            <ClipboardList className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nothing to review — queue is clear.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {jobs.map((job) => {
              const fields = job.result?.fields ?? {}
              const busy = submitting[job.id]
              return (
                <div
                  key={job.id}
                  className="bg-surface-1 border border-amber-900/30 rounded-2xl overflow-hidden"
                >
                  {/* Job header */}
                  <div className="px-5 py-4 border-b border-surface-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-medium text-slate-100">Job {job.id.slice(0, 8)}…</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Document: {job.document_id?.slice(0, 8)}…
                      </p>
                    </div>
                    <div className="w-36">
                      <p className="text-xs text-slate-500 mb-1">Overall confidence</p>
                      <ConfidenceBar score={job.confidence_score} />
                    </div>
                  </div>

                  {/* Fields */}
                  <div className="px-5 py-4 space-y-3">
                    {Object.entries(fields).map(([fieldName, fieldData]) => {
                      const confidence = fieldData?.confidence ?? 0
                      return (
                        <div key={fieldName} className="grid grid-cols-3 gap-3 items-center">
                          <div>
                            <p className="text-xs font-medium text-slate-300 capitalize">
                              {fieldName.replace(/_/g, ' ')}
                            </p>
                            <ConfidenceBar score={confidence} />
                          </div>
                          <div className="col-span-2">
                            <input
                              value={getFieldValue(job, fieldName)}
                              onChange={(e) => setFieldEdit(job.id, fieldName, e.target.value)}
                              className={`w-full bg-surface-2 border rounded-lg px-3 py-1.5 text-sm text-slate-100 focus:outline-none transition-colors ${
                                confidence < 0.6
                                  ? 'border-red-900/60 focus:border-red-500/60'
                                  : confidence < 0.8
                                  ? 'border-amber-900/60 focus:border-amber-500/60'
                                  : 'border-surface-3 focus:border-brand/60'
                              }`}
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>

                  {/* Actions */}
                  <div className="px-5 py-3 border-t border-surface-3 flex gap-3">
                    <button
                      onClick={() => handleConfirm(job)}
                      disabled={!!busy}
                      className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {busy === 'confirming' ? 'Confirming…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => handleReject(job)}
                      disabled={!!busy}
                      className="flex items-center gap-1.5 text-slate-400 hover:text-red-400 disabled:opacity-50 disabled:cursor-not-allowed text-sm px-4 py-2 rounded-lg hover:bg-red-900/20 transition-colors"
                    >
                      <XCircle className="w-4 h-4" />
                      {busy === 'rejecting' ? 'Rejecting…' : 'Reject'}
                    </button>
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
