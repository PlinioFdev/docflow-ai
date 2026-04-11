import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Upload, Wifi, WifiOff, RefreshCw, GitBranch, ClipboardList, BarChart2 } from 'lucide-react'
import client from '../api/client'
import useWebSocket from '../hooks/useWebSocket'
import DocumentCard from '../components/DocumentCard'

const POLL_INTERVAL_MS = 2000
const ACTIVE_STATUSES  = new Set(['pending', 'processing'])

const workspaceId = localStorage.getItem('workspace_id') ?? ''

export default function Dashboard() {
  const [documents, setDocuments] = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const fileInputRef = useRef(null)
  // Map of docId → timeoutId for active polls
  const pollTimers = useRef({})

  const { lastMessage, status: wsStatus } = useWebSocket(workspaceId)

  const patchDoc = useCallback((updated) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }, [])

  // Poll a single document until it leaves pending/processing
  const scheduleDocPoll = useCallback((docId) => {
    const tick = async () => {
      try {
        const { data } = await client.get(`/api/v1/documents/${docId}/`)
        patchDoc(data)
        if (ACTIVE_STATUSES.has(data.status)) {
          pollTimers.current[docId] = setTimeout(tick, POLL_INTERVAL_MS)
        } else {
          delete pollTimers.current[docId]
        }
      } catch {
        delete pollTimers.current[docId]
      }
    }
    pollTimers.current[docId] = setTimeout(tick, POLL_INTERVAL_MS)
  }, [patchDoc])

  const fetchDocuments = useCallback(async () => {
    try {
      const { data } = await client.get('/api/v1/documents/')
      const list = data?.results ?? data ?? []
      setDocuments(list)
      // Resume polling for any already-active documents
      list.filter((d) => ACTIVE_STATUSES.has(d.status)).forEach((d) => {
        if (!pollTimers.current[d.id]) scheduleDocPoll(d.id)
      })
    } catch {
      // handled by axios interceptor on 401
    } finally {
      setLoading(false)
    }
  }, [scheduleDocPoll])

  useEffect(() => {
    fetchDocuments()
    return () => {
      // Cancel all polls on unmount
      Object.values(pollTimers.current).forEach(clearTimeout)
    }
  }, [fetchDocuments])

  // Apply real-time WS job updates to the matching document
  useEffect(() => {
    if (lastMessage?.type !== 'job_update') return
    const update = lastMessage?.data
    if (!update?.document_id || !update?.status) return
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === update.document_id ? { ...doc, status: update.status } : doc
      )
    )
  }, [lastMessage])

  const uploadFile = async (file) => {
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', file.name)
    fd.append('workspace', workspaceId)
    fd.append('doc_type', 'other')
    try {
      const { data } = await client.post('/api/v1/documents/', fd)
      setDocuments((prev) => [data, ...prev])
      scheduleDocPoll(data.id)
    } catch (err) {
      console.error('Upload failed', err)
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    uploadFile(e.dataTransfer.files[0])
  }

  const processingCount = documents.filter((d) => ACTIVE_STATUSES.has(d.status)).length
  const reviewCount     = documents.filter((d) => d.status === 'review').length

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="border-b border-surface-3 bg-surface-1">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-slate-100">DocFlow AI</span>
          <nav className="flex items-center gap-1">
            <Link to="/" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-100 bg-surface-3">
              Dashboard
            </Link>
            <Link to="/pipelines" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <GitBranch className="w-3.5 h-3.5" /> Pipelines
            </Link>
            <Link to="/review" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <ClipboardList className="w-3.5 h-3.5" /> Review
              {reviewCount > 0 && (
                <span className="ml-0.5 bg-amber-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                  {reviewCount}
                </span>
              )}
            </Link>
            <Link to="/analytics" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-surface-3 transition-colors flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" /> Analytics
            </Link>
          </nav>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            {wsStatus === 'connected'
              ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /> Live</>
              : <><WifiOff className="w-3.5 h-3.5 text-slate-600" /> Offline</>
            }
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-8">
        {processingCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-indigo-300 bg-indigo-900/20 border border-indigo-900/40 rounded-xl px-4 py-3">
            <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
            {processingCount} document{processingCount > 1 ? 's' : ''} processing…
          </div>
        )}

        {/* Upload area */}
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">Upload</h2>
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl px-6 py-12 cursor-pointer transition-colors ${
              dragOver
                ? 'border-brand bg-brand/5'
                : 'border-surface-3 hover:border-brand/40 hover:bg-surface-1'
            }`}
          >
            <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => uploadFile(e.target.files[0])} />
            {uploading
              ? <RefreshCw className="w-8 h-8 text-brand animate-spin" />
              : <Upload className="w-8 h-8 text-slate-500" />
            }
            <div className="text-center">
              <p className="text-sm text-slate-300">
                {uploading ? 'Uploading…' : 'Drop a file here or click to browse'}
              </p>
              <p className="text-xs text-slate-600 mt-1">PDF, DOCX, TXT, images</p>
            </div>
          </div>
        </section>

        {/* Document list */}
        <section>
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider mb-3">
            Documents
            <span className="ml-2 text-slate-600 normal-case font-normal">({documents.length})</span>
          </h2>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-surface-1 border border-surface-3 animate-pulse" />
              ))}
            </div>
          ) : documents.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-12">No documents yet. Upload one above.</p>
          ) : (
            <div className="space-y-2">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
