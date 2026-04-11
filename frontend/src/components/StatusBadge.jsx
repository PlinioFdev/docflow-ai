const CONFIG = {
  pending:    { label: 'Pending',      classes: 'bg-slate-700 text-slate-300' },
  processing: { label: 'Processing',   classes: 'bg-indigo-900/60 text-indigo-300' },
  review:     { label: 'Needs Review', classes: 'bg-amber-900/60 text-amber-300' },
  completed:  { label: 'Completed',    classes: 'bg-emerald-900/60 text-emerald-300' },
  failed:     { label: 'Failed',       classes: 'bg-red-900/60 text-red-300' },
}

export default function StatusBadge({ status }) {
  const { label, classes } = CONFIG[status] ?? { label: status, classes: 'bg-slate-700 text-slate-300' }
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${classes}`}>
      {status === 'processing' && (
        <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse flex-shrink-0" />
      )}
      {label}
    </span>
  )
}
