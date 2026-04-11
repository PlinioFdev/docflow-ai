import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { LayoutDashboard, GitBranch, ClipboardList, BarChart2, Download } from 'lucide-react'
import client from '../api/client'

const STATUS_META = {
  completed:  { label: 'Completed',    color: 'bg-emerald-500' },
  processing: { label: 'Processing',   color: 'bg-indigo-500'  },
  review:     { label: 'Needs Review', color: 'bg-amber-500'   },
  pending:    { label: 'Pending',      color: 'bg-slate-500'   },
  failed:     { label: 'Failed',       color: 'bg-red-500'     },
}

export default function Analytics() {
  const [docs, setDocs]   = useState([])
  const [jobs, setJobs]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      client.get('/api/v1/documents/'),
      client.get('/api/v1/processing-jobs/'),
    ]).then(([dRes, jRes]) => {
      setDocs(dRes.data?.results ?? dRes.data ?? [])
      setJobs(jRes.data?.results ?? jRes.data ?? [])
    }).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const total = docs.length

  const byStatus = Object.fromEntries(
    Object.keys(STATUS_META).map((s) => [s, docs.filter((d) => d.status === s).length])
  )

  const completedJobs = jobs.filter((j) => j.confidence_score != null)
  const avgConfidence = completedJobs.length
    ? completedJobs.reduce((sum, j) => sum + j.confidence_score, 0) / completedJobs.length
    : null

  const todayStr = new Date().toISOString().slice(0, 10)
  const processedToday = docs.filter(
    (d) => d.status === 'completed' && d.updated_at?.slice(0, 10) === todayStr
  ).length

  const maxCount = Math.max(1, ...Object.values(byStatus))

  const handleExportCSV = () => {
    const jobMap = Object.fromEntries(jobs.map((j) => [j.document, j]))
    const rows = [
      ['document_name', 'doc_type', 'status', 'confidence_score', 'uploaded_at'],
      ...docs.map((d) => {
        const job = jobMap[d.id]
        return [
          `"${(d.name ?? '').replace(/"/g, '""')}"`,
          d.doc_type ?? '',
          d.status ?? '',
          job?.confidence_score != null ? Math.round(job.confidence_score * 100) + '%' : '',
          d.uploaded_at ? new Date(d.uploaded_at).toISOString().slice(0, 10) : '',
        ]
      }),
    ]
    const csv = rows.map((r) => r.join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'docflow-analytics.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const statCards = [
    { label: 'Total documents',     value: total,          color: 'text-slate-100' },
    { label: 'Completed',           value: byStatus.completed ?? 0,  color: 'text-emerald-400' },
    { label: 'Needs review',        value: byStatus.review ?? 0,     color: 'text-amber-400'   },
    { label: 'Failed',              value: byStatus.failed ?? 0,     color: 'text-red-400'     },
    {
      label: 'Avg. confidence',
      value: avgConfidence != null ? `${Math.round(avgConfidence * 100)}%` : '—',
      color: avgConfidence == null ? 'text-slate-500'
           : avgConfidence >= 0.8 ? 'text-emerald-400'
           : avgConfidence >= 0.6 ? 'text-amber-400'
           : 'text-red-400',
    },
    { label: 'Processed today',     value: processedToday,  color: 'text-indigo-400' },
  ]

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
            <Link to="/review" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Review
            </Link>
            <Link to="/analytics" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-100 bg-surface-3 flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" /> Analytics
            </Link>
          </nav>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-100">Analytics</h1>
          <button
            onClick={handleExportCSV}
            disabled={loading || docs.length === 0}
            className="flex items-center gap-2 bg-surface-1 hover:bg-surface-2 disabled:opacity-40 disabled:cursor-not-allowed border border-surface-3 text-slate-300 text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-24 rounded-2xl bg-surface-1 border border-surface-3 animate-pulse" />
            ))}
          </div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {statCards.map(({ label, value, color }) => (
                <div key={label} className="bg-surface-1 border border-surface-3 rounded-2xl px-5 py-4">
                  <p className="text-xs text-slate-500 mb-1">{label}</p>
                  <p className={`text-3xl font-bold tabular-nums ${color}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Bar chart */}
            <section className="bg-surface-1 border border-surface-3 rounded-2xl px-5 py-5 space-y-4">
              <h2 className="text-sm font-medium text-slate-300">Documents by status</h2>
              <div className="space-y-3">
                {Object.entries(STATUS_META).map(([status, { label, color }]) => {
                  const count = byStatus[status] ?? 0
                  const pct   = total === 0 ? 0 : Math.round((count / maxCount) * 100)
                  return (
                    <div key={status} className="flex items-center gap-3">
                      <span className="w-28 text-xs text-slate-400 text-right flex-shrink-0">{label}</span>
                      <div className="flex-1 h-5 bg-surface-3 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${color}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="w-6 text-xs text-slate-400 tabular-nums">{count}</span>
                    </div>
                  )
                })}
              </div>
              {total === 0 && (
                <p className="text-xs text-slate-600 text-center pt-2">No documents yet.</p>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  )
}
