import { useState } from 'react'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Search, ShieldCheck, Wand2, Send, X, ChevronDown, ChevronUp, Plus } from 'lucide-react'

const TYPE_META = {
  extract:   { icon: <Search className="w-4 h-4" />,      color: 'text-indigo-400 bg-indigo-900/40',  badge: 'bg-indigo-700/60 hover:bg-indigo-700 text-indigo-200' },
  validate:  { icon: <ShieldCheck className="w-4 h-4" />, color: 'text-emerald-400 bg-emerald-900/40', badge: 'bg-emerald-700/60 hover:bg-emerald-700 text-emerald-200' },
  transform: { icon: <Wand2 className="w-4 h-4" />,       color: 'text-amber-400 bg-amber-900/40',    badge: 'bg-amber-700/60 hover:bg-amber-700 text-amber-200' },
  deliver:   { icon: <Send className="w-4 h-4" />,         color: 'text-sky-400 bg-sky-900/40',        badge: 'bg-sky-700/60 hover:bg-sky-700 text-sky-200' },
}

const TRANSFORM_OPS = ['uppercase', 'lowercase', 'strip_currency', 'date_format']

export default function PipelineStageCard({ stage, index, onRemove, onUpdate }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: stage.id })

  const [expanded, setExpanded] = useState(true)
  const [editingName, setEditingName] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [transformField, setTransformField] = useState('')
  const [transformOp, setTransformOp] = useState('uppercase')

  const meta = TYPE_META[stage.type] ?? TYPE_META.extract

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  }

  const updateConfig = (patch) =>
    onUpdate(stage.id, { config: { ...stage.config, ...patch } })

  // Extract helpers
  const addExtractField = () => {
    const val = tagInput.trim()
    if (!val) return
    const fields = stage.config.fields ?? []
    if (!fields.includes(val)) updateConfig({ fields: [...fields, val] })
    setTagInput('')
  }
  const removeExtractField = (f) =>
    updateConfig({ fields: (stage.config.fields ?? []).filter((x) => x !== f) })

  // Validate helpers
  const addRequiredField = () => {
    const val = tagInput.trim()
    if (!val) return
    const rf = stage.config.required_fields ?? []
    if (!rf.includes(val)) updateConfig({ required_fields: [...rf, val] })
    setTagInput('')
  }
  const removeRequiredField = (f) =>
    updateConfig({ required_fields: (stage.config.required_fields ?? []).filter((x) => x !== f) })

  // Transform helpers
  const setTransformRule = (field, op) => {
    const rules = { ...(stage.config.rules ?? {}) }
    if (op === '') { delete rules[field] } else { rules[field] = op }
    updateConfig({ rules })
  }
  const addTransformRule = () => {
    const field = transformField.trim()
    if (!field) return
    setTransformRule(field, transformOp)
    setTransformField('')
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="rounded-lg bg-surface-2 border border-surface-3 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-3 py-2.5 group">
        <button
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing text-slate-600 hover:text-slate-400 flex-shrink-0"
          aria-label="Drag to reorder"
        >
          <GripVertical className="w-4 h-4" />
        </button>

        <span className="text-xs font-mono text-slate-500 w-4 flex-shrink-0">{index + 1}</span>

        <div className={`flex-shrink-0 p-1.5 rounded-md ${meta.color}`}>{meta.icon}</div>

        <div className="flex-1 min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={stage.name}
              onChange={(e) => onUpdate(stage.id, { name: e.target.value })}
              onBlur={() => setEditingName(false)}
              onKeyDown={(e) => e.key === 'Enter' && setEditingName(false)}
              className="w-full bg-surface-3 rounded px-2 py-0.5 text-sm text-slate-100 focus:outline-none border border-brand/40"
            />
          ) : (
            <p
              className="text-sm font-medium text-slate-200 truncate cursor-pointer hover:text-white"
              title="Click to rename"
              onClick={() => setEditingName(true)}
            >
              {stage.name}
            </p>
          )}
          <p className="text-xs text-slate-500 capitalize">{stage.type}</p>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-slate-600 hover:text-slate-300 flex-shrink-0 transition-colors"
          aria-label={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        <button
          onClick={() => onRemove(stage.id)}
          className="opacity-0 group-hover:opacity-100 text-slate-600 hover:text-red-400 transition-all flex-shrink-0"
          aria-label="Remove stage"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Config panel */}
      {expanded && (
        <div className="border-t border-surface-3 px-4 py-3 space-y-3">
          {/* Extract */}
          {stage.type === 'extract' && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Fields to extract</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(stage.config.fields ?? []).map((f) => (
                  <span
                    key={f}
                    className="flex items-center gap-1 text-xs bg-indigo-900/40 text-indigo-300 border border-indigo-800/40 rounded-full px-2.5 py-0.5"
                  >
                    {f}
                    <button onClick={() => removeExtractField(f)} className="hover:text-red-400 leading-none">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {(stage.config.fields ?? []).length === 0 && (
                  <span className="text-xs text-slate-600 italic">No fields — AI auto-detects all</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addExtractField() } }}
                  placeholder="e.g. invoice_number"
                  className="flex-1 bg-surface-3 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand/60"
                />
                <button
                  onClick={addExtractField}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${meta.badge}`}
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>
          )}

          {/* Validate */}
          {stage.type === 'validate' && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Required fields</p>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {(stage.config.required_fields ?? []).map((f) => (
                  <span
                    key={f}
                    className="flex items-center gap-1 text-xs bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 rounded-full px-2.5 py-0.5"
                  >
                    {f}
                    <button onClick={() => removeRequiredField(f)} className="hover:text-red-400 leading-none">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                {(stage.config.required_fields ?? []).length === 0 && (
                  <span className="text-xs text-slate-600 italic">No required fields set</span>
                )}
              </div>
              <div className="flex gap-2">
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addRequiredField() } }}
                  placeholder="e.g. amount"
                  className="flex-1 bg-surface-3 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand/60"
                />
                <button
                  onClick={addRequiredField}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${meta.badge}`}
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>
          )}

          {/* Transform */}
          {stage.type === 'transform' && (
            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Field transformations</p>
              {Object.entries(stage.config.rules ?? {}).map(([field, op]) => (
                <div key={field} className="flex items-center gap-2 mb-1.5">
                  <span className="flex-1 text-xs text-slate-300 font-mono truncate">{field}</span>
                  <select
                    value={op}
                    onChange={(e) => setTransformRule(field, e.target.value)}
                    className="bg-surface-3 border border-surface-3 rounded px-2 py-1 text-xs text-slate-100 focus:outline-none"
                  >
                    {TRANSFORM_OPS.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <button
                    onClick={() => setTransformRule(field, '')}
                    className="text-slate-600 hover:text-red-400"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
              {Object.keys(stage.config.rules ?? {}).length === 0 && (
                <p className="text-xs text-slate-600 italic mb-2">No transform rules</p>
              )}
              <div className="flex gap-2 mt-2">
                <input
                  value={transformField}
                  onChange={(e) => setTransformField(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTransformRule() } }}
                  placeholder="field name"
                  className="flex-1 bg-surface-3 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand/60"
                />
                <select
                  value={transformOp}
                  onChange={(e) => setTransformOp(e.target.value)}
                  className="bg-surface-3 border border-surface-3 rounded-lg px-2 py-1.5 text-xs text-slate-100 focus:outline-none"
                >
                  {TRANSFORM_OPS.map((o) => <option key={o} value={o}>{o}</option>)}
                </select>
                <button
                  onClick={addTransformRule}
                  className={`flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg transition-colors ${meta.badge}`}
                >
                  <Plus className="w-3 h-3" /> Add
                </button>
              </div>
            </div>
          )}

          {/* Deliver */}
          {stage.type === 'deliver' && (
            <div>
              <label className="text-xs font-medium text-slate-400 mb-2 block">Destination</label>
              <input
                value={stage.config.destination ?? 'internal'}
                onChange={(e) => updateConfig({ destination: e.target.value })}
                placeholder="internal or webhook URL"
                className="w-full bg-surface-3 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand/60"
              />
              <p className="text-xs text-slate-600 mt-1.5">
                Use <span className="font-mono text-slate-500">internal</span> to store results, or paste a webhook URL
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
