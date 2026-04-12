import { useEffect } from 'react'
import { CheckCircle, XCircle, Info, X } from 'lucide-react'

const TYPE_STYLES = {
  success: {
    container: 'bg-emerald-900/95 border-emerald-800/60 text-emerald-100',
    icon: <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />,
  },
  error: {
    container: 'bg-red-900/95 border-red-800/60 text-red-100',
    icon: <XCircle className="w-4 h-4 text-red-400 flex-shrink-0" />,
  },
  info: {
    container: 'bg-indigo-900/95 border-indigo-800/60 text-indigo-100',
    icon: <Info className="w-4 h-4 text-indigo-400 flex-shrink-0" />,
  },
}

function ToastItem({ toast, onRemove }) {
  useEffect(() => {
    const t = setTimeout(() => onRemove(toast.id), 3000)
    return () => clearTimeout(t)
  }, [toast.id, onRemove])

  const styles = TYPE_STYLES[toast.type] ?? TYPE_STYLES.info

  return (
    <div
      className={`flex items-center gap-3 pl-4 pr-3 py-3 rounded-xl border shadow-xl backdrop-blur-sm text-sm max-w-sm w-full animate-fade-in ${styles.container}`}
    >
      {styles.icon}
      <span className="flex-1 leading-snug">{toast.message}</span>
      <button
        onClick={() => onRemove(toast.id)}
        className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity ml-1"
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

export default function Toast({ toasts, onRemove }) {
  if (!toasts.length) return null
  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 items-end pointer-events-none">
      {toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={onRemove} />
        </div>
      ))}
    </div>
  )
}
