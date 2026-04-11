import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Search, ShieldCheck, Wand2, Send, X } from 'lucide-react'

const TYPE_META = {
  extract:   { icon: <Search className="w-4 h-4" />,      color: 'text-indigo-400 bg-indigo-900/40' },
  validate:  { icon: <ShieldCheck className="w-4 h-4" />, color: 'text-emerald-400 bg-emerald-900/40' },
  transform: { icon: <Wand2 className="w-4 h-4" />,       color: 'text-amber-400 bg-amber-900/40' },
  deliver:   { icon: <Send className="w-4 h-4" />,         color: 'text-sky-400 bg-sky-900/40' },
}

export default function PipelineStageCard({ stage, index, onRemove }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id })

  const meta = TYPE_META[stage.type] ?? TYPE_META.extract

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-surface-2 border border-surface-3 group"
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 flex-shrink-0"
        aria-label="Drag to reorder"
      >
        <GripVertical className="w-4 h-4" />
      </button>

      <span className="text-xs font-mono text-slate-500 w-4 flex-shrink-0">{index + 1}</span>

      <div className={`flex-shrink-0 p-1.5 rounded-md ${meta.color}`}>
        {meta.icon}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-slate-200 truncate">{stage.name}</p>
        <p className="text-xs text-slate-500 capitalize">{stage.type}</p>
      </div>

      <button
        onClick={() => onRemove(stage.id)}
        className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all flex-shrink-0"
        aria-label="Remove stage"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
