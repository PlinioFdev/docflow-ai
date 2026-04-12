import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Upload, Wifi, WifiOff, RefreshCw, GitBranch, ClipboardList,
  BarChart2, LogOut, ChevronDown, User, Search, X, FileText, File,
} from 'lucide-react'
import client from '../api/client'
import useWebSocket from '../hooks/useWebSocket'
import useToast from '../hooks/useToast'
import DocumentCard from '../components/DocumentCard'
import DocumentResultModal from '../components/DocumentResultModal'
import Toast from '../components/Toast'

const POLL_INTERVAL_MS = 2000
const ACTIVE_STATUSES  = new Set(['pending', 'processing'])

const STATUS_FILTERS = [
  { id: 'all',        label: 'All' },
  { id: 'processing', label: 'Processing' },
  { id: 'completed',  label: 'Completed' },
  { id: 'review',     label: 'Needs Review' },
  { id: 'failed',     label: 'Failed' },
]

const DOC_TYPE_OPTIONS = [
  { value: 'auto',     label: 'Auto-detect' },
  { value: 'invoice',  label: 'Invoice' },
  { value: 'contract', label: 'Contract' },
  { value: 'report',   label: 'Report' },
  { value: 'other',    label: 'Other' },
]

const TYPE_COLORS = {
  invoice:  'bg-indigo-900/50 text-indigo-300 border-indigo-800/50',
  contract: 'bg-violet-900/50 text-violet-300 border-violet-800/50',
  report:   'bg-sky-900/50 text-sky-300 border-sky-800/50',
  other:    'bg-slate-700/60 text-slate-300 border-slate-600/50',
}

const PENDING_TYPE_ICONS = {
  invoice:  <FileText className="w-4 h-4 text-indigo-400" />,
  contract: <FileText className="w-4 h-4 text-violet-400" />,
  report:   <FileText className="w-4 h-4 text-sky-400" />,
  other:    <File     className="w-4 h-4 text-slate-400" />,
  auto:     <File     className="w-4 h-4 text-slate-400" />,
}

function getWorkspaceId() {
  return localStorage.getItem('workspace_id') ?? ''
}

function stripExtension(filename) {
  return filename.replace(/\.[^.]+$/, '')
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { toasts, addToast, removeToast } = useToast()

  const [documents, setDocuments]         = useState([])
  const [loading, setLoading]             = useState(true)
  const [dragOver, setDragOver]           = useState(false)
  const [statusFilter, setStatusFilter]   = useState('all')
  const [searchQuery, setSearchQuery]     = useState('')
  const [selectedDoc, setSelectedDoc]     = useState(null)
  const [docType, setDocType]             = useState('auto')
  const [uploadProgress, setUploadProgress] = useState(null)
  // Staged uploads: [{id, file, name, docType}]
  const [pendingUploads, setPendingUploads] = useState([])

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
    setSelectedDoc((prev) =>
      prev?.id === update.document_id ? { ...prev, status: update.status } : prev
    )
  }, [lastMessage])

  const uploadSingleFile = async (file, name, resolvedType) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', name || file.name)
    fd.append('workspace', getWorkspaceId())
    fd.append('doc_type', resolvedType === 'auto' ? 'other' : resolvedType)
    const { data } = await client.post('/api/v1/documents/', fd)
    setDocuments((prev) => [data, ...prev])
    scheduleDocPoll(data.id)
    return data
  }

  const stageFiles = (files) => {
    const newPending = files.map((file) => ({
      id: crypto.randomUUID(),
      file,
      name: stripExtension(file.name),
      docType,
    }))
    setPendingUploads((prev) => [...prev, ...newPending])
  }

  const uploadPending = async () => {
    if (!pendingUploads.length) return
    const uploads = [...pendingUploads]
    setPendingUploads([])
    setUploadProgress({ current: 0, total: uploads.length })
    let successCount = 0
    for (let i = 0; i < uploads.length; i++) {
      const { file, name, docType: dt } = uploads[i]
      setUploadProgress({ current: i + 1, total: uploads.length })
      try {
        await uploadSingleFile(file, name, dt)
        successCount++
      } catch {
        addToast('error', `Failed to upload "${file.name}"`)
      }
    }
    setUploadProgress(null)
    if (successCount > 0) {
      addToast('success', `${successCount} document${successCount > 1 ? 's' : ''} uploaded`)
    }
  }

  const handleDelete = async (docId) => {
    try {
      await client.delete(`/api/v1/documents/${docId}/`)
      setDocuments((prev) => prev.filter((d) => d.id !== docId))
      addToast('success', 'Document deleted')
    } catch {
      addToast('error', 'Failed to delete document')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('refresh_token')
    localStorage.removeItem('workspace_id')
    localStorage.removeItem('user_email')
    navigate('/login')
  }

  const onDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    stageFiles(Array.from(e.dataTransfer.files))
  }

  const onFileChange = (e) => {
    stageFiles(Array.from(e.target.files))
    e.target.value = ''
  }

  const updatePending = (id, patch) =>
    setPendingUploads((prev) => prev.map((u) => u.id === id ? { ...u, ...patch } : u))

  const removePending = (id) =>
    setPendingUploads((prev) => prev.filter((u) => u.id !== id))

  const filteredDocuments = documents
    .filter((d) =>
      statusFilter === 'all'        ? true :
      statusFilter === 'processing' ? ACTIVE_STATUSES.has(d.status) :
      d.status === statusFilter
    )
    .filter((d) =>
      !searchQuery || d.name.toLowerCase().includes(searchQuery.toLowerCase())
    )

  const processingCount    = documents.filter((d) => ACTIVE_STATUSES.has(d.status)).length
  const reviewCount        = documents.filter((d) => d.status === 'review').length
  const isUploading        = uploadProgress !== null
  const selectedTypeOption = DOC_TYPE_OPTIONS.find((o) => o.value === docType)

  return (
    <div className="min-h-screen bg-surface">
      <Toast toasts={toasts} onRemove={removeToast} />

      {/* Top bar */}
      <header className="border-b border-surface-3 bg-surface-1">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/landing" className="text-lg font-bold tracking-tight text-slate-100 hover:text-brand-light transition-colors">DocFlow AI</Link>

          <nav className="flex items-center gap-1">
            <Link to="/dashboard" className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-100 bg-surface-3">
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

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              {wsStatus === 'connected'
                ? <><Wifi className="w-3.5 h-3.5 text-emerald-400" /> Live</>
                : <><WifiOff className="w-3.5 h-3.5 text-slate-600" /> Offline</>
              }
            </span>
            <Link
              to="/profile"
              className="flex items-center gap-1.5 text-slate-400 hover:text-slate-100 hover:bg-surface-3 text-xs px-2.5 py-1.5 rounded-lg transition-colors"
            >
              <User className="w-3.5 h-3.5" />
            </Link>
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
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Upload</h2>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl px-6 py-10 transition-colors ${
              isUploading
                ? 'border-brand/40 cursor-default'
                : dragOver
                ? 'border-brand bg-brand/5 cursor-pointer'
                : 'border-surface-3 hover:border-brand/40 hover:bg-surface-1 cursor-pointer'
            }`}
          >
            <input ref={fileInputRef} type="file" multiple className="hidden" onChange={onFileChange} />
            {isUploading
              ? <RefreshCw className="w-8 h-8 text-brand animate-spin" />
              : <Upload className="w-8 h-8 text-slate-500" />
            }
            <div className="text-center">
              {isUploading ? (
                <>
                  <p className="text-sm font-medium text-indigo-300">
                    Uploading {uploadProgress.current} of {uploadProgress.total}…
                  </p>
                  <div className="mt-2 w-48 h-1.5 bg-surface-3 rounded-full overflow-hidden mx-auto">
                    <div
                      className="h-full bg-brand rounded-full transition-all duration-300"
                      style={{ width: `${(uploadProgress.current / uploadProgress.total) * 100}%` }}
                    />
                  </div>
                </>
              ) : (
                <>
                  <p className="text-sm text-slate-300">Drop files here or click to browse</p>
                  <p className="text-xs text-slate-600 mt-1">Multiple files supported · PDF, DOCX, TXT, images</p>
                </>
              )}
            </div>
          </div>

          {/* Staged uploads */}
          {pendingUploads.length > 0 && (
            <div className="bg-surface-1 border border-brand/20 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Ready to upload · {pendingUploads.length} file{pendingUploads.length > 1 ? 's' : ''}
                </p>
                <button
                  onClick={() => setPendingUploads([])}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  Clear all
                </button>
              </div>

              <div className="space-y-2">
                {pendingUploads.map((u) => (
                  <div key={u.id} className="flex items-center gap-3 bg-surface-2 border border-surface-3 rounded-xl px-3 py-2.5">
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-surface-3 flex items-center justify-center">
                      {PENDING_TYPE_ICONS[u.docType] ?? PENDING_TYPE_ICONS.auto}
                    </div>
                    <input
                      value={u.name}
                      onChange={(e) => updatePending(u.id, { name: e.target.value })}
                      placeholder="Document name"
                      className="flex-1 min-w-0 bg-transparent text-sm text-slate-100 focus:outline-none placeholder-slate-600"
                    />
                    <div className="relative flex-shrink-0">
                      <select
                        value={u.docType}
                        onChange={(e) => updatePending(u.id, { docType: e.target.value })}
                        className="appearance-none bg-surface-3 border border-surface-3 text-xs text-slate-300 rounded-lg pl-2.5 pr-6 py-1 focus:outline-none cursor-pointer"
                      >
                        {DOC_TYPE_OPTIONS.map(({ value, label }) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-500" />
                    </div>
                    <button
                      onClick={() => removePending(u.id)}
                      className="flex-shrink-0 text-slate-600 hover:text-red-400 transition-colors"
                      aria-label="Remove"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  onClick={uploadPending}
                  className="bg-brand hover:bg-brand-hover text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  Upload {pendingUploads.length} file{pendingUploads.length > 1 ? 's' : ''}
                </button>
                <button
                  onClick={() => setPendingUploads([])}
                  className="text-slate-400 hover:text-slate-100 text-sm px-4 py-2 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
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

          {/* Search */}
          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search documents…"
              className="w-full bg-surface-1 border border-surface-3 rounded-lg pl-9 pr-9 py-2 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-brand/60 transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-surface-1 border border-surface-3 animate-pulse" />
              ))}
            </div>
          ) : filteredDocuments.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-12">
              {documents.length === 0
                ? 'No documents yet. Upload one above.'
                : searchQuery
                ? `No documents match "${searchQuery}"`
                : 'No documents match this filter.'
              }
            </p>
          ) : (
            <div className="space-y-2">
              {filteredDocuments.map((doc) => (
                <DocumentCard
                  key={doc.id}
                  document={doc}
                  onClick={() => setSelectedDoc(doc)}
                  onDelete={handleDelete}
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
