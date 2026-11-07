'use client'

import { memo, useRef, type KeyboardEvent } from 'react'
import Image from 'next/image'
import type { ColourGroup } from './cardVariants'
import { cx } from './cx'

export const MAX_SWATCHES = 6

interface VariantSwatchesProps {
    groups: ColourGroup[]
    selectedKey: string | null
    onSelect: (key: string) => void
    label: string
    className?: string
}

/**
 * Colour picker row for cards (radio-group semantics, arrow keys move + select). Visual circle is 24px;
 * the button is 32px wide and 44px tall to hit. The selected ring is a 2px primary border with a 2px gap
 * that shows the page colour. Must sit above the card's stretched link (z-10).
 */
function VariantSwatches({ groups, selectedKey, onSelect, label, className }: VariantSwatchesProps) {
    const refs = useRef<Array<HTMLButtonElement | null>>([])
    const shown = groups.slice(0, MAX_SWATCHES)
    const extra = groups.length - shown.length
    const tabbable = shown.some(g => g.key === selectedKey) ? selectedKey : shown[0]?.key

    const move = (index: number) => {
        const next = (index + shown.length) % shown.length
        refs.current[next]?.focus()
        onSelect(shown[next].key)
    }

    const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
        if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
            e.preventDefault()
            move(index + 1)
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
            e.preventDefault()
            move(index - 1)
        } else if (e.key === 'Home') {
            e.preventDefault()
            move(0)
        } else if (e.key === 'End') {
            e.preventDefault()
            move(shown.length - 1)
        }
    }

    return (
        <div role="radiogroup" aria-label={label} className={cx('relative z-10 flex flex-wrap items-center', className)}>
            {shown.map((g, i) => {
                const selected = g.key === selectedKey
                return (
                    <button
                        key={g.key}
                        ref={el => {
                            refs.current[i] = el
                        }}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        aria-label={g.name}
                        title={g.name}
                        tabIndex={g.key === tabbable ? 0 : -1}
                        onClick={() => onSelect(g.key)}
                        onKeyDown={e => onKeyDown(e, i)}
                        className={cx(
                            'relative flex h-8 min-w-8 shrink-0 items-center justify-center rounded-full border-2 p-0.5 before:absolute before:-inset-y-1.5 before:inset-x-0 before:content-[""]',
                            'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700 dark:focus-visible:outline-primary-400',
                            selected ? 'border-primary-700 dark:border-primary-400' : 'border-transparent'
                        )}
                    >
                        {g.hex ? (
                            <span
                                className="block h-6 w-6 rounded-full ring-1 ring-inset ring-zinc-300 dark:ring-zinc-600"
                                style={{ backgroundColor: g.hex }}
                            />
                        ) : g.imageUrl ? (
                            <span className="relative block h-6 w-6 overflow-hidden rounded-full bg-zinc-100 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-800 dark:ring-zinc-600">
                                <Image src={g.imageUrl} alt="" fill sizes="24px" className="object-cover" />
                            </span>
                        ) : (
                            <span className="block max-w-20 truncate rounded-full bg-zinc-100 px-2 text-xs leading-6 text-zinc-900 ring-1 ring-inset ring-zinc-300 dark:bg-zinc-800 dark:text-zinc-100 dark:ring-zinc-600">
                                {g.name}
                            </span>
                        )}
                    </button>
                )
            })}
            {extra > 0 ? <span className="ml-1 text-xs text-zinc-600 dark:text-zinc-400">+{extra}</span> : null}
        </div>
    )
}

export default memo(VariantSwatches)
