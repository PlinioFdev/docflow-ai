import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Upload, Wifi, WifiOff, RefreshCw, GitBranch, ClipboardList, BarChart2, LogOut } from 'lucide-react'
import client from '../api/client'
import useWebSocket from '../hooks/useWebSocket'
import DocumentCard from '../components/DocumentCard'
import DocumentResultModal from '../components/DocumentResultModal'

const POLL_INTERVAL_MS = 2000
const ACTIVE_STATUSES  = new Set(['pending', 'processing'])

const STATUS_FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'processing', label: 'Processing' },
  { id: 'completed',  label: 'Completed' },
  { id: 'review',     label: 'Needs Review' },
  { id: 'failed',     label: 'Failed' },
]

function getWorkspaceId() {
  return localStorage.getItem('workspace_id') ?? ''
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [documents, setDocuments] = useState([])
  const [loading, setLoading]     = useState(true)
  const [uploading, setUploading] = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDoc, setSelectedDoc]   = useState(null)
  const fileInputRef = useRef(null)
  const pollTimers   = useRef({})

  const { lastMessage, status: wsStatus } = useWebSocket(getWorkspaceId())

  const patchDoc = useCallback((updated) => {
    setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)))
  }, [])

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
      list.filter((d) => ACTIVE_STATUSES.has(d.status)).forEach((d) => {
        if (!pollTimers.current[d.id]) scheduleDocPoll(d.id)
      })
    } catch {
      // handled by 401 interceptor
    } finally {
      setLoading(false)
    }
  }, [scheduleDocPoll])

  useEffect(() => {
    fetchDocuments()
    return () => { Object.values(pollTimers.current).forEach(clearTimeout) }
  }, [fetchDocuments])

  useEffect(() => {
    if (lastMessage?.type !== 'job_update') return
    const update = lastMessage?.data
    if (!update?.document_id || !update?.status) return
    setDocuments((prev) =>
      prev.map((doc) =>
        doc.id === update.document_id ? { ...doc, status: update.status } : doc
      )
    )
    // Refresh modal if it's open for the updated document
    setSelectedDoc((prev) =>
      prev?.id === update.document_id ? { ...prev, status: update.status } : prev
    )
  }, [lastMessage])

  const uploadFile = async (file) => {
    if (!file) return
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', file.name)
    fd.append('workspace', getWorkspaceId())
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

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('workspace_id')
    navigate('/login')
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    uploadFile(e.dataTransfer.files[0])
  }

  const filteredDocuments = statusFilter === 'all'
    ? documents
    : statusFilter === 'processing'
    ? documents.filter((d) => ACTIVE_STATUSES.has(d.status))
    : documents.filter((d) => d.status === statusFilter)

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

          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              {wsStatus === 'connected'
                ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /> Live</>
                : <><WifiOff className="w-3.5 h-3.5 text-slate-600" /> Offline</>
              }
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 hover:bg-surface-3 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Logout
            </button>
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
          <div className="flex items-center justify-between gap-4 mb-3">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">
              Documents
              <span className="ml-2 text-slate-600 normal-case font-normal">({filteredDocuments.length})</span>
            </h2>

            {/* Status filter */}
            <div className="flex items-center gap-1 flex-wrap justify-end">
              {STATUS_FILTERS.map(({ id, label }) => {
                const count = id === 'all' ? documents.length
                  : id === 'processing' ? documents.filter((d) => ACTIVE_STATUSES.has(d.status)).length
                  : documents.filter((d) => d.status === id).length
                const isActive = statusFilter === id
                return (
                  <button
                    key={id}
                    onClick={() => setStatusFilter(id)}
                    className={`text-xs px-2.5 py-1 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-brand text-white font-medium'
                        : 'text-slate-400 hover:text-slate-100 hover:bg-surface-3'
                    }`}
                  >
                    {label}
                    {count > 0 && (
                      <span className={`ml-1 tabular-nums ${isActive ? 'opacity-75' : 'text-slate-600'}`}>
                        {count}
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-surface-1 border border-surface-3 animate-pulse" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-12">
              {documents.length === 0 ? 'No documents yet. Upload one above.' : 'No documents match this filter.'}
            </p>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onClick={() => setSelectedDoc(doc)}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {selectedDoc && (
        <DocumentResultModal
          document={selectedDoc}
          onClose={() => setSelectedDoc(null)}
        />
      )}
    </div>
  )
}
