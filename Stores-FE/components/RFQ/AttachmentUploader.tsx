'use client'

import { useRef, useState } from 'react'
import { FileText, Image as ImageIcon, Loader2, Paperclip, Trash2 } from 'lucide-react'
import { resolveMediaSrc } from '@/lib/mediaUrl'
import {
    RFQ_ATTACHMENT_ACCEPT,
    RFQ_LIMITS,
    deleteAttachment,
    formatBytes,
    parseRfqError,
    uploadAttachment,
    validateAttachmentFile,
    type RFQAttachment,
} from '@/lib/rfqApi'

const HINT = `Up to ${RFQ_LIMITS.attachmentsMax} files, 10 MB each. PDF, PNG, JPEG or WebP.`

const ADD_BTN =
    'inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-3 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-800 focus-within:ring-2 focus-within:ring-primary-700 dark:focus-within:ring-primary-400 disabled:opacity-60'

function FileIcon({ name }: { name: string }) {
    const Icon = /\.(png|jpe?g|webp)$/i.test(name) ? ImageIcon : FileText
    return <Icon className="h-4 w-4 shrink-0 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
}

function Errors({ items }: { items: string[] }) {
    if (items.length === 0) return null
    return (
        <ul role="alert" className="space-y-0.5 text-xs font-medium text-red-700 dark:text-red-400">
            {items.map((e) => (
                <li key={e}>{e}</li>
            ))}
        </ul>
    )
}

type QueueProps = {
    files: File[]
    onChange: (files: File[]) => void
    disabled?: boolean
}

/**
 * Local queue used by the post form: files are validated here (type, size, count)
 * and uploaded to R7 once the request exists.
 */
export default function AttachmentUploader({ files, onChange, disabled }: QueueProps) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [errors, setErrors] = useState<string[]>([])

    const addFiles = (incoming: FileList | null) => {
        if (!incoming) return
        const next = [...files]
        const errs: string[] = []
        for (const file of Array.from(incoming)) {
            if (next.length >= RFQ_LIMITS.attachmentsMax) {
                errs.push(`You can attach at most ${RFQ_LIMITS.attachmentsMax} files.`)
                break
            }
            const problem = validateAttachmentFile(file)
            if (problem) errs.push(problem)
            else if (!next.some((f) => f.name === file.name && f.size === file.size)) next.push(file)
        }
        setErrors(errs)
        onChange(next)
        if (inputRef.current) inputRef.current.value = ''
    }

    return (
        <div className="space-y-2">
            {files.length > 0 ? (
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    {files.map((f, i) => (
                        <li key={`${f.name}-${f.size}-${i}`} className="flex min-h-[44px] items-center gap-2 px-3">
                            <FileIcon name={f.name} />
                            <span className="min-w-0 flex-1 truncate text-sm text-zinc-900 dark:text-zinc-100">{f.name}</span>
                            <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{formatBytes(f.size)}</span>
                            <button
                                type="button"
                                disabled={disabled}
                                onClick={() => onChange(files.filter((_, idx) => idx !== i))}
                                aria-label={`Remove ${f.name}`}
                                className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 disabled:opacity-60"
                            >
                                <Trash2 className="h-4 w-4" aria-hidden="true" />
                            </button>
                        </li>
                    ))}
                </ul>
            ) : null}
            <label className={`${ADD_BTN} w-full cursor-pointer sm:w-auto ${disabled || files.length >= RFQ_LIMITS.attachmentsMax ? 'pointer-events-none opacity-60' : ''}`}>
                <Paperclip className="h-4 w-4" aria-hidden="true" />
                {files.length > 0 ? 'Add more files' : 'Attach files (optional)'}
                <input
                    ref={inputRef}
                    type="file"
                    multiple
                    accept={RFQ_ATTACHMENT_ACCEPT}
                    disabled={disabled}
                    onChange={(e) => addFiles(e.target.files)}
                    className="sr-only"
                />
            </label>
            <p className="text-xs text-zinc-500 dark:text-zinc-400">{HINT}</p>
            <Errors items={errors} />
        </div>
    )
}

type ManagerProps = {
    rfqId: string
    attachments: RFQAttachment[]
    /** Whether the request is still draft/open/quoting (R7 returns 409 otherwise). */
    editable: boolean
    onChanged: () => void
}

/** Detail-page version: lists stored attachments (R3) and adds/removes them immediately (R7). */
export function AttachmentManager({ rfqId, attachments, editable, onChanged }: ManagerProps) {
    const inputRef = useRef<HTMLInputElement | null>(null)
    const [busy, setBusy] = useState(false)
    const [errors, setErrors] = useState<string[]>([])

    const add = async (incoming: FileList | null) => {
        if (!incoming) return
        const errs: string[] = []
        let count = attachments.length
        setBusy(true)
        for (const file of Array.from(incoming)) {
            if (count >= RFQ_LIMITS.attachmentsMax) {
                errs.push(`You can attach at most ${RFQ_LIMITS.attachmentsMax} files.`)
                break
            }
            const problem = validateAttachmentFile(file)
            if (problem) {
                errs.push(problem)
                continue
            }
            try {
                await uploadAttachment(rfqId, file)
                count += 1
            } catch (err) {
                errs.push(`${file.name}: ${parseRfqError(err).message}`)
            }
        }
        setErrors(errs)
        setBusy(false)
        if (inputRef.current) inputRef.current.value = ''
        onChanged()
    }

    const remove = async (att: RFQAttachment) => {
        setBusy(true)
        try {
            await deleteAttachment(rfqId, att.id)
            setErrors([])
        } catch (err) {
            setErrors([`${att.filename}: ${parseRfqError(err).message}`])
        }
        setBusy(false)
        onChanged()
    }

    if (attachments.length === 0 && !editable) return null

    return (
        <div className="space-y-2">
            {attachments.length > 0 ? (
                <ul className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
                    {attachments.map((a) => (
                        <li key={a.id} className="flex min-h-[44px] items-center gap-2 px-3">
                            <FileIcon name={a.filename} />
                            <a
                                href={resolveMediaSrc(a.url)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="min-w-0 flex-1 truncate text-sm font-medium text-primary-700 dark:text-primary-400 hover:underline"
                            >
                                {a.filename}
                            </a>
                            <span className="shrink-0 text-xs text-zinc-500 dark:text-zinc-400">{formatBytes(a.size)}</span>
                            {editable ? (
                                <button
                                    type="button"
                                    disabled={busy}
                                    onClick={() => remove(a)}
                                    aria-label={`Remove ${a.filename}`}
                                    className="-mr-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-700 dark:focus-visible:ring-primary-400 disabled:opacity-60"
                                >
                                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                                </button>
                            ) : null}
                        </li>
                    ))}
                </ul>
            ) : null}
            {editable ? (
                <>
                    <label
                        className={`${ADD_BTN} cursor-pointer ${busy || attachments.length >= RFQ_LIMITS.attachmentsMax ? 'pointer-events-none opacity-60' : ''}`}
                    >
                        {busy ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                        ) : (
                            <Paperclip className="h-4 w-4" aria-hidden="true" />
                        )}
                        {busy ? 'Uploading…' : 'Add files'}
                        <input
                            ref={inputRef}
                            type="file"
                            multiple
                            accept={RFQ_ATTACHMENT_ACCEPT}
                            disabled={busy}
                            onChange={(e) => add(e.target.files)}
                            className="sr-only"
                        />
                    </label>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">{HINT}</p>
                </>
            ) : null}
            <Errors items={errors} />
        </div>
    )
}
