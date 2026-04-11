import { useEffect, useState } from 'react'
import { X, Loader2, AlertTriangle, FileText } from 'lucide-react'
import client from '../api/client'
import ConfidenceBar from './ConfidenceBar'
import StatusBadge from './StatusBadge'

export default function DocumentResultModal({ document, onClose }) {
  const [job, setJob]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)

  useEffect(() => {
    let cancelled = false
    const fetch = async () => {
      try {
        const { data } = await client.get('/api/v1/processing-jobs/')
        const jobs = (data?.results ?? data ?? [])
          .filter((j) => j.document === document.id)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        if (!cancelled) setJob(jobs[0] ?? null)
      } catch (err) {
        if (!cancelled) setError(err.response?.data?.detail ?? 'Failed to load results.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetch()
    return () => { cancelled = true }
  }, [document.id])

  const fields = job?.result?.fields ?? {}
  const hasFields = Object.keys(fields).length > 0

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-surface-1 border border-surface-3 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-start gap-4 px-6 py-5 border-b border-surface-3 flex-shrink-0">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center">
            <FileText className="w-5 h-5 text-brand-light" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base font-semibold text-slate-100 truncate">{document.name}</h2>
            <p className="text-xs text-slate-500 mt-0.5 capitalize">
              {document.doc_type} · uploaded {document.uploaded_at ? new Date(document.uploaded_at).toLocaleDateString() : '—'}
            </p>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            <StatusBadge status={document.status} />
            <button
              onClick={onClose}
              className="text-slate-500 hover:text-slate-200 hover:bg-surface-3 p-1.5 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin" />
              <p className="text-sm">Loading results…</p>
            </div>
          ) : error ? (
            <div className="flex items-center gap-3 text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          ) : document.status === 'failed' ? (
            <div className="flex items-center gap-3 text-red-400 bg-red-900/20 border border-red-900/40 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <p className="text-sm">Processing failed for this document. Please try uploading again.</p>
            </div>
          ) : !job ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-500">
              <Loader2 className="w-7 h-7 animate-spin" />
              <p className="text-sm">Waiting for processing to start…</p>
            </div>
          ) : !hasFields ? (
            <p className="text-sm text-slate-500 text-center py-12">No fields extracted yet.</p>
          ) : (
            <div className="space-y-4">
              {/* Overall confidence */}
              {job.confidence_score != null && (
                <div className="bg-surface-2 border border-surface-3 rounded-xl px-4 py-3">
                  <p className="text-xs text-slate-400 mb-2">Overall confidence</p>
                  <ConfidenceBar score={job.confidence_score} />
                </div>
              )}

              {/* Fields table */}
              <div className="rounded-xl border border-surface-3 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-2 border-b border-surface-3">
                      <th className="text-left text-xs font-medium text-slate-400 px-4 py-2.5 w-1/3">Field</th>
                      <th className="text-left text-xs font-medium text-slate-400 px-4 py-2.5 w-1/3">Value</th>
                      <th className="text-left text-xs font-medium text-slate-400 px-4 py-2.5 w-1/3">Confidence</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-3">
                    {Object.entries(fields).map(([fieldName, fieldData]) => (
                      <tr key={fieldName} className="hover:bg-surface-2/50 transition-colors">
                        <td className="px-4 py-3 text-slate-300 font-medium capitalize">
                          {fieldName.replace(/_/g, ' ')}
                        </td>
                        <td className="px-4 py-3 text-slate-100 max-w-0">
                          <span className="block truncate" title={fieldData?.value ?? '—'}>
                            {fieldData?.value ?? '—'}
                          </span>
                        </td>
                        <td className="px-4 py-3 w-40">
                          <ConfidenceBar score={fieldData?.confidence ?? 0} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
