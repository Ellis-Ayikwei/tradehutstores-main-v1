'use client'

import { useRef, useState, type DragEvent } from 'react'
import Image from 'next/image'
import { ArrowLeft, ArrowRight, ImagePlus, Star, X } from 'lucide-react'
import { ACCEPTED_IMAGE_ATTR, ACCEPTED_IMAGE_MIME, MAX_IMAGE_BYTES, type ImageItem } from './schema'
import { btnSecondary, btnSmall, cx, headingCls, mutedText } from './ui'

export const mb = (bytes: number) => `${Math.round(bytes / (1024 * 1024))} MB`

/** Splits dropped/chosen files into the ones that fit and a list of plain-language problems. */
export function checkImageFiles(files: File[], room: number): { accepted: File[]; problems: string[] } {
    const problems: string[] = []
    const valid: File[] = []
    for (const file of files) {
        if (!ACCEPTED_IMAGE_MIME.includes(file.type)) problems.push(`${file.name}: not a JPG, PNG or WebP image`)
        else if (file.size > MAX_IMAGE_BYTES) problems.push(`${file.name}: larger than ${mb(MAX_IMAGE_BYTES)}`)
        else valid.push(file)
    }
    const space = Math.max(0, room)
    const accepted = valid.slice(0, space)
    if (valid.length > accepted.length) problems.push(`Only ${space} more image${space === 1 ? '' : 's'} fit here; ${valid.length - accepted.length} skipped.`)
    return { accepted, problems }
}

interface ImageGroupSectionProps {
    /** Heading, e.g. the colour name. Omit for the plain gallery. */
    title?: string
    colorCode?: string
    /** The pictures in this group, in display order. */
    items: ImageItem[]
    /** How many more pictures this group can take. */
    room: number
    /** Key of the product's main image (the first picture overall). */
    mainKey?: string
    hint?: string
    /** Hide the drop zone (for the read-only "Other pictures" group). */
    noUpload?: boolean
    onAdd: (files: File[]) => void
    onRemove: (key: string) => void
    onMove: (key: string, direction: -1 | 1) => void
    onMakeMain: (key: string) => void
}

export function ImageGroupSection({ title, colorCode, items, room, mainKey, hint, noUpload, onAdd, onRemove, onMove, onMakeMain }: ImageGroupSectionProps) {
    const [problems, setProblems] = useState<string[]>([])
    const [dragging, setDragging] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

    const take = (list: FileList | File[] | null) => {
        const files = Array.from(list ?? [])
        if (files.length === 0) return
        const { accepted, problems: found } = checkImageFiles(files, room)
        setProblems(found)
        if (accepted.length) onAdd(accepted)
    }

    const onDrop = (e: DragEvent<HTMLDivElement>) => {
        e.preventDefault()
        setDragging(false)
        take(e.dataTransfer.files)
    }

    return (
        <div className="space-y-2">
            {title ? (
                <div className="flex items-center gap-2">
                    {colorCode ? <span className="h-4 w-4 shrink-0 rounded-full border border-zinc-400 dark:border-zinc-500" style={{ backgroundColor: colorCode }} aria-hidden="true" /> : null}
                    <h3 className={headingCls}>{title}</h3>
                    <span className={cx('text-xs', mutedText)}>
                        {items.length} picture{items.length === 1 ? '' : 's'}
                    </span>
                </div>
            ) : null}

            {noUpload ? null : (
                <div
                    onDragOver={(e) => {
                        e.preventDefault()
                        setDragging(true)
                    }}
                    onDragLeave={() => setDragging(false)}
                    onDrop={onDrop}
                    className={cx(
                        'flex flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed px-4 py-4 text-center',
                        dragging ? 'border-primary-700 bg-primary-50 dark:border-primary-400 dark:bg-primary-900' : 'border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-800'
                    )}
                >
                    <input
                        ref={inputRef}
                        type="file"
                        accept={ACCEPTED_IMAGE_ATTR}
                        multiple
                        className="sr-only"
                        tabIndex={-1}
                        aria-label={title ? `Add pictures for ${title}` : 'Add product images'}
                        onChange={(e) => {
                            take(e.target.files)
                            e.target.value = ''
                        }}
                    />
                    <ImagePlus className="h-5 w-5 text-zinc-500 dark:text-zinc-400" aria-hidden="true" />
                    <p className="text-sm text-zinc-900 dark:text-zinc-100">{dragging ? 'Drop the images here' : 'Drag images here, or choose them from your device'}</p>
                    <p className={cx('text-xs', mutedText)}>{hint ?? `JPG, PNG or WebP, up to ${mb(MAX_IMAGE_BYTES)} each.`}</p>
                    <button type="button" className={cx(btnSecondary, btnSmall)} onClick={() => inputRef.current?.click()} disabled={room <= 0}>
                        Choose images
                    </button>
                </div>
            )}
            {noUpload && hint ? <p className={cx('text-xs', mutedText)}>{hint}</p> : null}

            {problems.length > 0 ? (
                <ul role="alert" className="space-y-0.5 rounded-md border border-red-300 bg-red-50 p-2.5 text-sm text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
                    {problems.map((p) => (
                        <li key={p}>{p}</li>
                    ))}
                </ul>
            ) : null}

            {items.length > 0 ? (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                    {items.map((img, index) => (
                        <li key={img.key} className="overflow-hidden rounded-md border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
                            <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-800">
                                <Image
                                    src={img.url}
                                    alt={img.key === mainKey ? 'Main product image' : `${title ? `${title} ` : 'Product '}image ${index + 1}`}
                                    fill
                                    sizes="(min-width: 768px) 160px, (min-width: 640px) 30vw, 45vw"
                                    className="object-contain p-1"
                                />
                                {img.key === mainKey ? (
                                    <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-primary-700 px-1.5 py-0.5 text-xs font-semibold text-white">
                                        <Star className="h-3 w-3" aria-hidden="true" />
                                        Main
                                    </span>
                                ) : null}
                                {img.file ? <span className="absolute bottom-1.5 left-1.5 rounded-md bg-zinc-900 px-1.5 py-0.5 text-xs font-medium text-white dark:bg-zinc-100 dark:text-zinc-900">Not uploaded yet</span> : null}
                                <button
                                    type="button"
                                    onClick={() => onRemove(img.key)}
                                    aria-label={`Remove image ${index + 1}`}
                                    className="absolute right-1 top-1 inline-flex h-9 w-9 items-center justify-center rounded-md bg-white text-zinc-900 hover:bg-zinc-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-600 dark:bg-zinc-900 dark:text-zinc-100 dark:hover:bg-zinc-800"
                                >
                                    <X className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                            <div className="flex items-center justify-between gap-1 p-1">
                                <button
                                    type="button"
                                    onClick={() => onMove(img.key, -1)}
                                    disabled={index === 0}
                                    aria-label={`Move image ${index + 1} earlier`}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600 sm:h-9 sm:w-9"
                                >
                                    <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                                </button>
                                {img.key !== mainKey ? (
                                    <button type="button" onClick={() => onMakeMain(img.key)} className="min-h-11 rounded-md px-2 text-xs font-semibold text-primary-700 hover:bg-zinc-100 dark:text-primary-400 dark:hover:bg-zinc-800 sm:min-h-9">
                                        Make main
                                    </button>
                                ) : (
                                    <span className={cx('text-xs', mutedText)}>Main image</span>
                                )}
                                <button
                                    type="button"
                                    onClick={() => onMove(img.key, 1)}
                                    disabled={index === items.length - 1}
                                    aria-label={`Move image ${index + 1} later`}
                                    className="inline-flex h-11 w-11 items-center justify-center rounded-md text-zinc-700 hover:bg-zinc-100 disabled:text-zinc-300 dark:text-zinc-300 dark:hover:bg-zinc-800 dark:disabled:text-zinc-600 sm:h-9 sm:w-9"
                                >
                                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                                </button>
                            </div>
                        </li>
                    ))}
                </ul>
            ) : null}
        </div>
    )
}
