import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Upload, Wifi, WifiOff, RefreshCw, GitBranch, ClipboardList, BarChart2, LogOut, ChevronDown } from 'lucide-react'
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

function getWorkspaceId() {
  return localStorage.getItem('workspace_id') ?? ''
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [documents, setDocuments]     = useState([])
  const [loading, setLoading]         = useState(true)
  const [dragOver, setDragOver]       = useState(false)
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedDoc, setSelectedDoc]   = useState(null)
  const [docType, setDocType]           = useState('auto')
  // Batch upload progress: null | { current: number, total: number }
  const [uploadProgress, setUploadProgress] = useState(null)
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

  const uploadSingleFile = async (file, resolvedType) => {
    const fd = new FormData()
    fd.append('file', file)
    fd.append('name', file.name)
    fd.append('workspace', getWorkspaceId())
    fd.append('doc_type', resolvedType === 'auto' ? 'other' : resolvedType)
    const { data } = await client.post('/api/v1/documents/', fd)
    setDocuments((prev) => [data, ...prev])
    scheduleDocPoll(data.id)
    return data
  }

  const uploadFiles = async (files) => {
    if (!files.length) return
    const resolvedType = docType
    setUploadProgress({ current: 0, total: files.length })
    for (let i = 0; i < files.length; i++) {
      setUploadProgress({ current: i + 1, total: files.length })
      try {
        await uploadSingleFile(files[i], resolvedType)
      } catch (err) {
        console.error(`Upload failed for ${files[i].name}:`, err)
      }
    }
    setUploadProgress(null)
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
    const files = Array.from(e.dataTransfer.files)
    uploadFiles(files)
  }

  const onFileChange = (e) => {
    const files = Array.from(e.target.files)
    e.target.value = ''   // reset so same file can be re-selected
    uploadFiles(files)
  }

  const filteredDocuments = statusFilter === 'all'
    ? documents
    : statusFilter === 'processing'
    ? documents.filter((d) => ACTIVE_STATUSES.has(d.status))
    : documents.filter((d) => d.status === statusFilter)

  const processingCount = documents.filter((d) => ACTIVE_STATUSES.has(d.status)).length
  const reviewCount     = documents.filter((d) => d.status === 'review').length
  const isUploading     = uploadProgress !== null
  const selectedTypeOption = DOC_TYPE_OPTIONS.find((o) => o.value === docType)

  return (
    <div className="min-h-screen bg-surface">
      {/* Top bar */}
      <header className="border-b border-surface-3 bg-surface-1">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-lg font-bold tracking-tight text-slate-100">DocFlow AI</span>

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
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Upload</h2>

          {/* Document type selector */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500">Document type:</span>
            <div className="relative">
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                className="appearance-none bg-surface-2 border border-surface-3 text-sm text-slate-200 rounded-lg pl-3 pr-8 py-1.5 focus:outline-none focus:border-brand/60 transition-colors cursor-pointer"
              >
                {DOC_TYPE_OPTIONS.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
              <ChevronDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            </div>
            {docType !== 'auto' && (
              <span className={`text-xs px-2.5 py-1 rounded-full border font-medium capitalize ${TYPE_COLORS[docType]}`}>
                {selectedTypeOption?.label}
              </span>
            )}
            {docType === 'auto' && (
              <span className="text-xs text-slate-600 italic">Type will be set to "other"; detect via pipeline</span>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`flex flex-col items-center justify-center gap-3 border-2 border-dashed rounded-2xl px-6 py-12 transition-colors ${
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
                  {/* Progress bar */}
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
