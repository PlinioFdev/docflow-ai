import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { Plus, GitBranch, LayoutDashboard, ClipboardList, Play, BarChart2 } from 'lucide-react'
import client from '../api/client'
import PipelineStageCard from '../components/PipelineStageCard'

const workspaceId = localStorage.getItem('workspace_id') ?? ''

const STAGE_TYPES = ['extract', 'validate', 'transform', 'deliver']

const DEFAULT_CONFIG = {
  extract:   { fields: [] },
  validate:  { required_fields: [] },
  transform: { rules: {} },
  deliver:   { destination: 'internal' },
}

const STAGE_TYPE_META = {
  extract:   { color: 'bg-indigo-900/50 text-indigo-300 border-indigo-800/40' },
  validate:  { color: 'bg-emerald-900/50 text-emerald-300 border-emerald-800/40' },
  transform: { color: 'bg-amber-900/50 text-amber-300 border-amber-800/40' },
  deliver:   { color: 'bg-sky-900/50 text-sky-300 border-sky-800/40' },
}

function newStage(type) {
  return { id: crypto.randomUUID(), type, name: `${type} stage`, config: DEFAULT_CONFIG[type] ?? {} }
}

export default function PipelineBuilder() {
  const [pipelines, setPipelines] = useState([])
  const [documents, setDocuments] = useState([])
  const [loading, setLoading]     = useState(true)
  const [creating, setCreating]   = useState(false)
  const [pipelineName, setPipelineName] = useState('')
  const [stages, setStages]       = useState([])
  const [saving, setSaving]       = useState(false)
  // Per-pipeline run state: { [pipelineId]: { docId: '', msg: null, busy: false } }
  const [runState, setRunState]   = useState({})

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  const setRun = (pipelineId, patch) =>
    setRunState((prev) => ({ ...prev, [pipelineId]: { ...(prev[pipelineId] ?? {}), ...patch } }))

  const fetchData = useCallback(async () => {
    try {
      const [pRes, dRes] = await Promise.all([
        client.get('/api/v1/pipelines/'),
        client.get('/api/v1/documents/'),
      ])
      setPipelines(pRes.data?.results ?? pRes.data ?? [])
      setDocuments(dRes.data?.results ?? dRes.data ?? [])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleDragEnd = ({ active, over }) => {
    if (!over || active.id === over.id) return
    setStages((prev) => {
      const from = prev.findIndex((s) => s.id === active.id)
      const to   = prev.findIndex((s) => s.id === over.id)
      return arrayMove(prev, from, to)
    })
  }

  const addStage    = (type) => setStages((prev) => [...prev, newStage(type)])
  const removeStage = (id)   => setStages((prev) => prev.filter((s) => s.id !== id))

  const handleSave = async (e) => {
    e.preventDefault()
    if (!pipelineName.trim() || stages.length === 0) return
    setSaving(true)
    try {
      const { data } = await client.post('/api/v1/pipelines/', {
        workspace: workspaceId,
        name: pipelineName.trim(),
        stages: stages.map(({ type, name, config }) => ({ type, name, config })),
      })
      setPipelines((prev) => [data, ...prev])
      setCreating(false)
      setPipelineName('')
      setStages([])
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleRun = async (pipelineId) => {
    const docId = runState[pipelineId]?.docId ?? ''
    if (!docId) return
    setRun(pipelineId, { busy: true, msg: null })
    try {
      const { data } = await client.post(`/api/v1/pipelines/${pipelineId}/run/`, {
        document_id: docId,
      })
      setRun(pipelineId, { busy: false, msg: { type: 'ok', text: `Job created — status: ${data.status}` } })
    } catch (err) {
      const text = err.response?.data?.error ?? err.response?.data?.detail ?? 'Run failed.'
      setRun(pipelineId, { busy: false, msg: { type: 'err', text } })
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
            <Link to="/pipelines" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-100 bg-surface-3 flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Pipelines
            </Link>
            <Link to="/review" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Review
            </Link>
            <Link to="/analytics" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" /> Analytics
            </Link>
          </nav>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" /> New pipeline
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {/* Builder panel */}
        {creating && (
          <section className="bg-surface-1 border border-brand/30 rounded-2xl p-6 space-y-5">
            <h2 className="text-base font-semibold text-slate-100">New pipeline</h2>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Pipeline name</label>
              <input
                value={pipelineName}
                onChange={(e) => setPipelineName(e.target.value)}
                placeholder="e.g. Invoice extractor"
                className="w-full bg-surface-2 border border-surface-3 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand/60 transition-colors"
              />
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400 mb-2">Add stage</p>
              <div className="flex flex-wrap gap-2">
                {STAGE_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => addStage(type)}
                    className={`capitalize text-xs px-3 py-1.5 rounded-lg border transition-colors ${STAGE_TYPE_META[type].color}`}
                  >
                    + {type}
                  </button>
                ))}
              </div>
            </div>

            {stages.length > 0 && (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={stages.map((s) => s.id)} strategy={verticalListSortingStrategy}>
                  <div className="space-y-2">
                    {stages.map((stage, i) => (
                      <PipelineStageCard key={stage.id} stage={stage} index={i} onRemove={removeStage} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}

            {stages.length === 0 && (
              <p className="text-xs text-slate-600 text-center py-4 border border-dashed border-surface-3 rounded-xl">
                Add at least one stage above
              </p>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || !pipelineName.trim() || stages.length === 0}
                className="bg-brand hover:bg-brand-hover disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                {saving ? 'Saving…' : 'Save pipeline'}
              </button>
              <button
                onClick={() => { setCreating(false); setStages([]); setPipelineName('') }}
                className="text-slate-400 hover:text-slate-100 text-sm px-4 py-2 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </section>
        )}

        {/* Pipeline list */}
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Pipelines <span className="text-slate-600 normal-case font-normal">({pipelines.length})</span>
          </h2>

          {loading ? (
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-28 rounded-xl bg-surface-1 border border-surface-3 animate-pulse" />
              ))}
            </div>
          ) : pipelines.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-12">
              No pipelines yet. Click "New pipeline" to create one.
            </p>
          ) : (
            <div className="space-y-3">
              {pipelines.map((p) => {
                const rs  = runState[p.id] ?? {}
                return (
                  <div key={p.id} className="bg-surface-1 border border-surface-3 rounded-xl px-5 py-4 space-y-4">
                    {/* Pipeline info */}
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{p.name}</p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {p.stages?.length ?? 0} stages · {new Date(p.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {(p.stages ?? []).map((s, i) => {
                          const meta = STAGE_TYPE_META[s.type] ?? {}
                          return (
                            <span key={i} className={`text-xs px-2 py-0.5 rounded-full border capitalize ${meta.color}`}>
                              {s.type}
                            </span>
                          )
                        })}
                      </div>
                    </div>

                    {/* Run on document */}
                    <div className="space-y-2">
                      <p className="text-xs font-medium text-slate-400">Run on document</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={rs.docId ?? ''}
                          onChange={(e) => setRun(p.id, { docId: e.target.value, msg: null })}
                          className="flex-1 bg-surface-2 border border-surface-3 rounded-lg px-3 py-1.5 text-xs text-slate-100 focus:outline-none focus:border-brand/60 transition-colors appearance-none"
                        >
                          <option value="">Select a document…</option>
                          {documents.map((d) => (
                            <option key={d.id} value={d.id}>
                              {d.name} ({d.doc_type})
                            </option>
                          ))}
                        </select>
                        <button
                          onClick={() => handleRun(p.id)}
                          disabled={rs.busy || !rs.docId}
                          className="flex items-center gap-1.5 bg-emerald-700 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
                        >
                          <Play className="w-3 h-3" />
                          {rs.busy ? 'Running…' : 'Run'}
                        </button>
                      </div>
                      {rs.msg && (
                        <p className={`text-xs px-3 py-2 rounded-lg border ${
                          rs.msg.type === 'ok'
                            ? 'bg-emerald-900/20 text-emerald-300 border-emerald-900/40'
                            : 'bg-red-900/20 text-red-400 border-red-900/40'
                        }`}>
                          {rs.msg.text}
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
