'use client'

import Image from 'next/image'
import { useEffect, useId, useState } from 'react'
import { CheckCircle2, FileText, RefreshCw, Trash2, Upload } from 'lucide-react'
import {
    ACCEPTED_DOC_ATTR,
    ACCEPTED_DOC_MIME,
    MAX_DOC_BYTES,
    type SellerDocument,
} from '@/lib/sellerOnboardingApi'

/** Returns an error message, or null when the file is acceptable. */
export function validateDocFile(file: File): string | null {
    const name = file.name.toLowerCase()
    const okType =
        ACCEPTED_DOC_MIME.includes(file.type) ||
        (!file.type && /\.(jpe?g|png|pdf)$/.test(name))
    if (!okType) return 'Use a JPG, PNG or PDF file.'
    if (file.size > MAX_DOC_BYTES) return 'File is larger than 10MB.'
    if (file.size === 0) return 'That file is empty.'
    return null
}

function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FilePreview({ file }: { file: File }) {
    const [url, setUrl] = useState<string | null>(null)
    const isImage = file.type.startsWith('image/')

    useEffect(() => {
        if (!isImage) return
        const objectUrl = URL.createObjectURL(file)
        setUrl(objectUrl)
        return () => URL.revokeObjectURL(objectUrl)
    }, [file, isImage])

    if (isImage && url) {
        return (
            <Image
                src={url}
                alt=""
                width={56}
                height={56}
                unoptimized
                className="h-14 w-14 shrink-0 rounded-md border border-gray-200 object-cover dark:border-gray-700"
            />
        )
    }
    return (
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
            <FileText className="h-6 w-6" aria-hidden />
        </span>
    )
}

export interface DocumentSlotProps {
    label: string
    hint?: string
    required?: boolean
    file: File | null
    /** Document already on file for this application (from GET sellers/me/). */
    existing?: SellerDocument
    /** True once this session's file was uploaded successfully. */
    uploaded?: boolean
    error?: string
    disabled?: boolean
    onSelect: (file: File | null) => void
}

export default function DocumentSlot({
    label,
    hint,
    required,
    file,
    existing,
    uploaded,
    error,
    disabled,
    onSelect,
}: DocumentSlotProps) {
    const inputId = useId()

    return (
        <div
            className={`rounded-xl border bg-white p-3 dark:bg-gray-900 ${
                error ? 'border-red-500' : 'border-gray-200 dark:border-gray-800'
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{label}</p>
                    {hint ? <p className="text-xs text-gray-500 dark:text-gray-400">{hint}</p> : null}
                </div>
                <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        required
                            ? 'bg-primary-50 text-primary-800 dark:bg-primary-900 dark:text-primary-100'
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300'
                    }`}
                >
                    {required ? 'Required' : 'Optional'}
                </span>
            </div>

            {file ? (
                <div className="mt-2 flex items-center gap-3">
                    <FilePreview file={file} />
                    <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-gray-900 dark:text-white">{file.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{formatSize(file.size)}</p>
                        {uploaded ? (
                            <p className="mt-0.5 inline-flex items-center gap-1 text-xs font-semibold text-green-700 dark:text-green-400">
                                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Uploaded
                            </p>
                        ) : null}
                    </div>
                    {!disabled ? (
                        <div className="flex shrink-0 items-center gap-1">
                            <label
                                htmlFor={inputId}
                                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-gray-800"
                                title="Replace file"
                            >
                                <RefreshCw className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Replace {label}</span>
                            </label>
                            <button
                                type="button"
                                onClick={() => onSelect(null)}
                                className="flex h-11 w-11 items-center justify-center rounded-lg border border-gray-300 bg-white text-red-600 hover:bg-red-50 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-800"
                                title="Remove file"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden />
                                <span className="sr-only">Remove {label}</span>
                            </button>
                        </div>
                    ) : null}
                </div>
            ) : (
                <div className="mt-2">
                    {existing ? (
                        <p className="mb-2 flex items-center gap-1.5 text-xs text-gray-700 dark:text-gray-300">
                            <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" aria-hidden />
                            <span>
                                On file{existing.status ? ` (${existing.status})` : ''}
                                {existing.note ? ` - ${existing.note}` : ''}
                            </span>
                        </p>
                    ) : null}
                    <label
                        htmlFor={inputId}
                        className={`flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 bg-gray-50 px-3 py-2 text-sm font-semibold text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 ${
                            disabled ? 'cursor-not-allowed !bg-gray-200 !text-gray-500 dark:!bg-gray-800 dark:!text-gray-500' : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    >
                        <Upload className="h-4 w-4" aria-hidden />
                        {existing ? 'Replace file' : 'Choose file'}
                        <span className="text-xs font-normal text-gray-500 dark:text-gray-400">JPG, PNG or PDF, max 10MB</span>
                    </label>
                </div>
            )}

            <input
                id={inputId}
                type="file"
                accept={ACCEPTED_DOC_ATTR}
                disabled={disabled}
                className="sr-only"
                onChange={(e) => {
                    const picked = e.target.files?.[0] ?? null
                    e.target.value = ''
                    if (picked) onSelect(picked)
                }}
            />

            {error ? (
                <p role="alert" className="mt-2 text-xs font-medium text-red-600 dark:text-red-400">
                    {error}
                </p>
            ) : null}
        </div>
    )
}
