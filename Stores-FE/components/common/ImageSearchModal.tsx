'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
    Camera,
    Upload,
    Link as LinkIcon,
    X,
    ZoomIn,
    RotateCcw,
    Search,
    ImageIcon,
    Loader2,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react'
import { useRouter } from 'next/navigation'
import { imageSearch } from '@/lib/searchClient'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'upload' | 'camera' | 'url'
type State = 'idle' | 'previewing' | 'searching' | 'done' | 'error'

interface ImageSearchModalProps {
    open: boolean
    onClose: () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fileToDataURL(file: File): Promise<string> {
    return new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(r.result as string)
        r.onerror = rej
        r.readAsDataURL(file)
    })
}

function formatBytes(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']

// ─── Modal ────────────────────────────────────────────────────────────────────

export default function ImageSearchModal({ open, onClose }: ImageSearchModalProps) {
    const [tab, setTab] = useState<Tab>('upload')
    const [state, setState] = useState<State>('idle')
    const [preview, setPreview] = useState<string | null>(null)
    const [file, setFile] = useState<File | null>(null)
    const [urlInput, setUrlInput] = useState('')
    const [urlError, setUrlError] = useState('')
    const [dragOver, setDragOver] = useState(false)
    const [cameraReady, setCameraReady] = useState(false)
    const [cameraError, setCameraError] = useState('')
    const [errorMsg, setErrorMsg] = useState('')
    const [progress, setProgress] = useState(0)

    const fileRef = useRef<HTMLInputElement>(null)
    const videoRef = useRef<HTMLVideoElement>(null)
    const canvasRef = useRef<HTMLCanvasElement>(null)
    const streamRef = useRef<MediaStream | null>(null)
    const router = useRouter()

    // ── Reset on close ──────────────────────────────────────────────────────
    useEffect(() => {
        if (!open) {
            setTimeout(() => {
                setState('idle')
                setPreview(null)
                setFile(null)
                setUrlInput('')
                setUrlError('')
                setErrorMsg('')
                setProgress(0)
                setTab('upload')
                stopCamera()
            }, 200)
        }
    }, [open])

    // ── Escape key ──────────────────────────────────────────────────────────
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape' && open) handleClose() }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [open])

    // ── Camera ──────────────────────────────────────────────────────────────
    const startCamera = useCallback(async () => {
        setCameraError('')
        setCameraReady(false)
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
            })
            streamRef.current = stream
            if (videoRef.current) {
                videoRef.current.srcObject = stream
                videoRef.current.onloadedmetadata = () => {
                    videoRef.current?.play()
                    setCameraReady(true)
                }
            }
        } catch {
            setCameraError('Camera access denied. Please allow camera permissions and try again.')
        }
    }, [])

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(t => t.stop())
            streamRef.current = null
        }
        setCameraReady(false)
    }, [])

    useEffect(() => {
        if (tab === 'camera' && open) startCamera()
        else stopCamera()
    }, [tab, open])

    const capturePhoto = () => {
        if (!videoRef.current || !canvasRef.current) return
        const video = videoRef.current
        const canvas = canvasRef.current
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d')?.drawImage(video, 0, 0)
        const dataURL = canvas.toDataURL('image/jpeg', 0.92)
        setPreview(dataURL)
        setState('previewing')
        stopCamera()
    }

    // ── File handling ───────────────────────────────────────────────────────
    const handleFile = useCallback(async (f: File) => {
        if (!ACCEPTED.includes(f.type)) {
            setErrorMsg('Unsupported format. Please use JPG, PNG, WebP, GIF or AVIF.')
            return
        }
        if (f.size > 10 * 1024 * 1024) {
            setErrorMsg('File too large. Max size is 10 MB.')
            return
        }
        setErrorMsg('')
        setFile(f)
        const dataURL = await fileToDataURL(f)
        setPreview(dataURL)
        setState('previewing')
    }, [])

    const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (f) handleFile(f)
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setDragOver(false)
        const f = e.dataTransfer.files?.[0]
        if (f) handleFile(f)
    }

    // ── URL handling ────────────────────────────────────────────────────────
    const loadFromUrl = async () => {
        setUrlError('')
        try {
            new URL(urlInput) // validate
        } catch {
            setUrlError('Please enter a valid URL.')
            return
        }
        setPreview(urlInput)
        setState('previewing')
    }

    // ── Image search ────────────────────────────────────────────────────────
    // Uploads to /tradehut/api/v1/search/image/ when a file is available;
    // visual search is gated behind SEARCH_ENABLE_EMBEDDINGS on the backend,
    // so we degrade gracefully (the FE simply navigates to /search with the
    // image-search mode flag and the results page can render whatever it has).
    const runSearch = async () => {
        if (!preview) return
        setState('searching')
        setProgress(0)

        const tick = setInterval(() => {
            setProgress(p => {
                if (p >= 85) { clearInterval(tick); return 85 }
                return p + Math.random() * 18
            })
        }, 280)

        try {
            let resultsCount = 0
            if (file) {
                const apiResult = await imageSearch(file)
                if (apiResult) {
                    resultsCount = apiResult.total
                    if (typeof window !== 'undefined') {
                        try {
                            sessionStorage.setItem(
                                'imageSearchResults',
                                JSON.stringify({
                                    when: Date.now(),
                                    total: apiResult.total,
                                    results: apiResult.results,
                                }),
                            )
                        } catch { /* ignore storage failures */ }
                    }
                }
            }

            clearInterval(tick)
            setProgress(100)
            setState('done')
            setTimeout(() => {
                onClose()
                const params = new URLSearchParams({
                    mode: 'image-search',
                    source: file ? 'upload' : 'url',
                })
                if (resultsCount) params.set('count', String(resultsCount))
                router.push(`/products?${params.toString()}`)
            }, 600)
        } catch (err) {
            clearInterval(tick)
            setState('error')
            setErrorMsg(err instanceof Error ? err.message : 'Search failed. Please try again.')
        }
    }

    const reset = () => {
        setState('idle')
        setPreview(null)
        setFile(null)
        setUrlInput('')
        setErrorMsg('')
        setProgress(0)
        if (tab === 'camera') startCamera()
    }

    const handleClose = () => {
        stopCamera()
        onClose()
    }

    if (!open) return null

    return (
        <>
            <style>{`
                @keyframes modalIn {
                    from { opacity: 0; transform: scale(0.95) translateY(12px); }
                    to   { opacity: 1; transform: scale(1) translateY(0); }
                }
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes shimmer {
                    0%   { background-position: -200% 0; }
                    100% { background-position:  200% 0; }
                }
                .progress-shimmer {
                    background: linear-gradient(90deg, #f97316 0%, #fb923c 40%, #fdba74 60%, #f97316 100%);
                    background-size: 200% 100%;
                    animation: shimmer 1.2s linear infinite;
                }
            `}</style>

            {/* ── Backdrop ── */}
            <div
                className="fixed inset-0 z-[500] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
                onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
            >
                {/* ── Modal ── */}
                <div
                    className="relative w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden"
                    style={{ animation: 'modalIn 0.22s cubic-bezier(0.16,1,0.3,1) forwards' }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 pt-5 pb-4 border-b border-gray-100 dark:border-gray-800">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-orange-50 dark:bg-orange-900/30">
                                <Camera className="h-5 w-5 text-orange-500" />
                            </div>
                            <div>
                                <h2 className="text-base font-bold text-gray-900 dark:text-white leading-tight">Search by Image</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Upload, capture or paste a link</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    {/* Tab bar */}
                    {state === 'idle' && (
                        <div className="flex border-b border-gray-100 dark:border-gray-800">
                            {([
                                { id: 'upload', icon: Upload, label: 'Upload' },
                                { id: 'camera', icon: Camera, label: 'Camera' },
                                { id: 'url',    icon: LinkIcon, label: 'Paste URL' },
                            ] as { id: Tab; icon: React.ElementType; label: string }[]).map(({ id, icon: Icon, label }) => (
                                <button
                                    key={id}
                                    onClick={() => setTab(id)}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors border-b-2 -mb-px
                                        ${tab === id
                                            ? 'border-orange-500 text-orange-500'
                                            : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    {label}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Body */}
                    <div className="p-5">

                        {/* ── PREVIEW / SEARCHING / DONE / ERROR states ── */}
                        {state !== 'idle' && (
                            <div className="space-y-4">
                                {/* Image preview */}
                                {preview && (
                                    <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-800 aspect-video flex items-center justify-center">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img
                                            src={preview}
                                            alt="Search preview"
                                            className="max-h-full max-w-full object-contain"
                                            onError={() => {
                                                setState('idle')
                                                setUrlError('Could not load image from this URL.')
                                                setPreview(null)
                                            }}
                                        />

                                        {/* Searching overlay */}
                                        {state === 'searching' && (
                                            <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-3">
                                                <Loader2 className="h-8 w-8 text-white animate-spin" />
                                                <p className="text-white text-sm font-semibold">Analyzing image…</p>
                                            </div>
                                        )}

                                        {/* Done overlay */}
                                        {state === 'done' && (
                                            <div className="absolute inset-0 bg-emerald-500/80 flex flex-col items-center justify-center gap-2">
                                                <CheckCircle2 className="h-10 w-10 text-white" />
                                                <p className="text-white text-sm font-bold">Found matches!</p>
                                            </div>
                                        )}

                                        {/* File info badge */}
                                        {file && state === 'previewing' && (
                                            <div className="absolute bottom-2 left-2 right-2 flex items-center gap-2 bg-black/60 backdrop-blur-sm rounded-lg px-3 py-2">
                                                <ImageIcon className="h-3.5 w-3.5 text-white/70 shrink-0" />
                                                <span className="text-xs text-white/90 truncate flex-1">{file.name}</span>
                                                <span className="text-xs text-white/60 shrink-0">{formatBytes(file.size)}</span>
                                            </div>
                                        )}

                                        {/* Zoom hint */}
                                        {state === 'previewing' && (
                                            <div className="absolute top-2 right-2 flex gap-1.5">
                                                <a
                                                    href={preview}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="p-1.5 bg-black/50 backdrop-blur-sm rounded-lg text-white/80 hover:text-white transition-colors"
                                                    title="View full size"
                                                >
                                                    <ZoomIn className="h-3.5 w-3.5" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Progress bar */}
                                {state === 'searching' && (
                                    <div className="space-y-1.5">
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full progress-shimmer transition-all duration-300"
                                                style={{ width: `${Math.min(progress, 100)}%` }}
                                            />
                                        </div>
                                        <p className="text-xs text-gray-400 dark:text-gray-600 text-right">
                                            {Math.round(Math.min(progress, 100))}%
                                        </p>
                                    </div>
                                )}

                                {/* Error */}
                                {state === 'error' && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {errorMsg}
                                    </div>
                                )}

                                {/* Action buttons */}
                                {(state === 'previewing' || state === 'error') && (
                                    <div className="flex gap-2.5">
                                        <button
                                            onClick={reset}
                                            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 text-sm font-semibold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                                        >
                                            <RotateCcw className="h-4 w-4" />
                                            Retake
                                        </button>
                                        <button
                                            onClick={runSearch}
                                            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-bold text-sm transition-colors shadow-lg shadow-orange-200 dark:shadow-none"
                                        >
                                            <Search className="h-4 w-4" />
                                            Search with this image
                                        </button>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* ── IDLE: Upload tab ── */}
                        {state === 'idle' && tab === 'upload' && (
                            <div className="space-y-4">
                                {/* Drop zone */}
                                <div
                                    onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={onDrop}
                                    onClick={() => fileRef.current?.click()}
                                    className={`relative cursor-pointer rounded-xl border-2 border-dashed transition-all py-10 flex flex-col items-center gap-3
                                        ${dragOver
                                            ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 scale-[1.01]'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-orange-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
                                        }`}
                                >
                                    <div className={`p-4 rounded-2xl transition-colors ${dragOver ? 'bg-orange-100 dark:bg-orange-900/40' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                        <Upload className={`h-7 w-7 transition-colors ${dragOver ? 'text-orange-500' : 'text-gray-400'}`} />
                                    </div>
                                    <div className="text-center">
                                        <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                            {dragOver ? 'Drop it!' : 'Drag & drop an image'}
                                        </p>
                                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">or click to browse your files</p>
                                    </div>
                                    <p className="text-xs text-gray-400 dark:text-gray-600">JPG, PNG, WebP, GIF, AVIF — max 10 MB</p>
                                </div>

                                <input
                                    ref={fileRef}
                                    type="file"
                                    accept={ACCEPTED.join(',')}
                                    onChange={onFileInput}
                                    className="hidden"
                                />

                                {/* Error */}
                                {errorMsg && (
                                    <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                                        <AlertCircle className="h-4 w-4 shrink-0" />
                                        {errorMsg}
                                    </div>
                                )}

                                {/* Browse button */}
                                <button
                                    onClick={() => fileRef.current?.click()}
                                    className="w-full py-2.5 rounded-xl border-2 border-orange-200 dark:border-orange-800 text-orange-500 font-semibold text-sm hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-colors"
                                >
                                    Browse files
                                </button>
                            </div>
                        )}

                        {/* ── IDLE: Camera tab ── */}
                        {state === 'idle' && tab === 'camera' && (
                            <div className="space-y-4">
                                <div className="relative rounded-xl overflow-hidden bg-gray-900 aspect-video flex items-center justify-center">
                                    <video
                                        ref={videoRef}
                                        autoPlay
                                        playsInline
                                        muted
                                        className="w-full h-full object-cover"
                                    />
                                    <canvas ref={canvasRef} className="hidden" />

                                    {/* Viewfinder corners */}
                                    {cameraReady && (
                                        <>
                                            {[
                                                'top-3 left-3 border-t-2 border-l-2 rounded-tl',
                                                'top-3 right-3 border-t-2 border-r-2 rounded-tr',
                                                'bottom-3 left-3 border-b-2 border-l-2 rounded-bl',
                                                'bottom-3 right-3 border-b-2 border-r-2 rounded-br',
                                            ].map((cls, i) => (
                                                <div key={i} className={`absolute ${cls} w-6 h-6 border-orange-400`} />
                                            ))}
                                        </>
                                    )}

                                    {/* Loading overlay */}
                                    {!cameraReady && !cameraError && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/70">
                                            <Loader2 className="h-8 w-8 animate-spin" />
                                            <p className="text-sm">Starting camera…</p>
                                        </div>
                                    )}

                                    {/* Camera error overlay */}
                                    {cameraError && (
                                        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center">
                                            <AlertCircle className="h-8 w-8 text-red-400" />
                                            <p className="text-sm text-white/80">{cameraError}</p>
                                            <button
                                                onClick={startCamera}
                                                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold transition-colors"
                                            >
                                                Retry
                                            </button>
                                        </div>
                                    )}
                                </div>

                                {/* Capture button */}
                                <button
                                    onClick={capturePhoto}
                                    disabled={!cameraReady}
                                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-lg shadow-orange-200 dark:shadow-none"
                                >
                                    <Camera className="h-5 w-5" />
                                    Capture Photo
                                </button>
                            </div>
                        )}

                        {/* ── IDLE: URL tab ── */}
                        {state === 'idle' && tab === 'url' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                                        Image URL
                                    </label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                        <input
                                            type="url"
                                            value={urlInput}
                                            onChange={(e) => { setUrlInput(e.target.value); setUrlError('') }}
                                            onKeyDown={(e) => { if (e.key === 'Enter') loadFromUrl() }}
                                            placeholder="https://example.com/product-image.jpg"
                                            className="w-full pl-9 pr-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 text-sm text-gray-900 dark:text-white dark:bg-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-400 focus:border-transparent transition-shadow"
                                        />
                                    </div>
                                    {urlError && (
                                        <p className="text-xs text-red-500 flex items-center gap-1">
                                            <AlertCircle className="h-3 w-3" /> {urlError}
                                        </p>
                                    )}
                                </div>

                                <div className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                                    <p className="font-semibold text-gray-700 dark:text-gray-300 mb-1.5">Tips for best results</p>
                                    <p>• Use clear, well-lit product images</p>
                                    <p>• Plain or simple backgrounds work best</p>
                                    <p>• Supported: JPG, PNG, WebP, GIF, AVIF</p>
                                </div>

                                <button
                                    onClick={loadFromUrl}
                                    disabled={!urlInput.trim()}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold text-sm transition-colors shadow-lg shadow-orange-200 dark:shadow-none"
                                >
                                    <Search className="h-4 w-4" />
                                    Load & Search
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Footer hint */}
                    {state === 'idle' && (
                        <div className="px-5 pb-4 flex items-center gap-2 text-xs text-gray-400 dark:text-gray-600">
                            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                            <span>Powered by TradeHut Vision Search</span>
                            <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
                        </div>
                    )}
                </div>
            </div>
        </>
    )
}
