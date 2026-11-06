import Image from 'next/image'
import Link from 'next/link'
import { ImageOff } from 'lucide-react'
import type { CheckoutLine, CheckoutMode } from './types'
import { Price, safeAmount } from './Money'
import { FOCUS, LINK_BTN } from './ui'

interface ReviewListProps {
    lines: CheckoutLine[]
    mode: CheckoutMode
    formatPrice: (n: number) => string
    /** variant id -> inline problem reported by the backend (stock, availability). */
    issues: Record<string, string>
    editHref: string
}

/** Section 4: the items being ordered, read-only. */
export default function ReviewList({ lines, mode, formatPrice, issues, editHref }: ReviewListProps) {
    return (
        <div>
            <ul className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {lines.map((line) => {
                    const issue = line.variantId ? issues[line.variantId] : undefined
                    const missingVariant = mode !== 'order' && !line.variantId
                    return (
                        <li key={line.key} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                            <Link
                                href={line.href}
                                aria-label={line.name}
                                className={`relative aspect-square w-16 shrink-0 self-start overflow-hidden rounded-md bg-zinc-50 dark:bg-zinc-800 sm:w-20 ${FOCUS}`}
                            >
                                {line.imageSrc ? (
                                    <Image
                                        src={line.imageSrc}
                                        alt={line.name}
                                        fill
                                        sizes="(min-width: 640px) 80px, 64px"
                                        className="object-contain p-1"
                                    />
                                ) : (
                                    <span className="flex h-full w-full items-center justify-center text-zinc-400 dark:text-zinc-500">
                                        <ImageOff className="h-6 w-6" aria-hidden="true" />
                                        <span className="sr-only">No image available</span>
                                    </span>
                                )}
                            </Link>
                            <div className="min-w-0 flex-1">
                                <p className="line-clamp-2 text-sm leading-snug text-zinc-900 dark:text-zinc-100">
                                    {line.name}
                                </p>
                                {line.variantText ? (
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">{line.variantText}</p>
                                ) : null}
                                {line.soldBy ? (
                                    <p className="text-xs text-zinc-600 dark:text-zinc-400">Sold by {line.soldBy}</p>
                                ) : null}
                                <p className="mt-0.5 text-xs text-zinc-600 dark:text-zinc-400">Qty: {line.quantity}</p>
                                {issue ? (
                                    <p role="alert" className="mt-1 text-sm font-medium text-red-700 dark:text-red-300">
                                        {issue}
                                    </p>
                                ) : null}
                                {missingVariant ? (
                                    <p role="alert" className="mt-1 text-sm font-medium text-red-700 dark:text-red-300">
                                        This item can’t be ordered online yet. Open the product and add it again with its
                                        options.
                                    </p>
                                ) : null}
                            </div>
                            <div className="shrink-0 text-right">
                                {line.unit !== undefined ? (
                                    <Price
                                        amount={safeAmount(line.unit) * line.quantity}
                                        format={formatPrice}
                                        size="sm"
                                    />
                                ) : (
                                    <span className="text-xs text-zinc-600 dark:text-zinc-400">Price at checkout</span>
                                )}
                            </div>
                        </li>
                    )
                })}
            </ul>
            {mode !== 'order' ? (
                <div className="mt-2">
                    <Link href={editHref} className={LINK_BTN}>
                        {mode === 'cart' ? 'Edit items in your cart' : 'Back to the product'}
                    </Link>
                </div>
            ) : null}
        </div>
    )
}
