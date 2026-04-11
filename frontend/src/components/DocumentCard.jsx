import { FileText, BarChart2, File, Loader2 } from 'lucide-react'
import StatusBadge from './StatusBadge'

const TYPE_ICONS = {
  invoice:  <FileText  className="w-5 h-5 text-indigo-400" />,
  contract: <FileText  className="w-5 h-5 text-violet-400" />,
  report:   <BarChart2 className="w-5 h-5 text-sky-400" />,
  other:    <File      className="w-5 h-5 text-slate-400" />,
}

const ACTIVE_STATUSES = new Set(['pending', 'processing'])

export default function DocumentCard({ document, onClick }) {
  const { name, doc_type, status, uploaded_at } = document
  const icon = TYPE_ICONS[doc_type] ?? TYPE_ICONS.other
  const date = uploaded_at ? new Date(uploaded_at).toLocaleDateString() : '—'
  const isActive = ACTIVE_STATUSES.has(status)

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-4 px-4 py-3 rounded-xl bg-surface-1 border border-surface-3 transition-colors ${
        onClick ? 'cursor-pointer hover:border-brand/40 hover:bg-surface-2/50' : ''
      }`}
    >
      <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center">
        {icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-100 truncate">{name}</p>
        <p className="text-xs text-slate-500 mt-0.5 capitalize">{doc_type} · {date}</p>
      </div>

      {isActive ? (
        <div className="flex items-center gap-1.5 text-indigo-300">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span className="text-xs font-medium capitalize">{status}</span>
        </div>
      ) : (
        <StatusBadge status={status} />
      )}
    </div>
  )
}
