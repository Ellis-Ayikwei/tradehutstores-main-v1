import { memo, useMemo } from 'react'
import { cx } from './cx'

export interface PriceTagProps {
    price: number
    /** Original / list price. Shown struck through when higher than `price`. */
    originalPrice?: number
    /** Pass the CurrencyContext `formatDisplayPrice` to get converted, localised prices. */
    formatPrice?: (amount: number) => string
    /** Used only by the built-in fallback formatter. */
    currencyCode?: string
    size?: 'sm' | 'md' | 'lg'
    /** Show the red "-NN%" text next to the price (only when there is a real discount). */
    showDiscount?: boolean
    /** Prefix the struck-through price with "List:". */
    showListLabel?: boolean
    /**
     * Fixed two-line layout for cards: the price on a 24px line, then a 16px line with the struck-through list
     * price and the red "(-23%)" (the second line is always reserved, even without a discount).
     */
    stacked?: boolean
    /**
     * amazon: small currency symbol, large whole amount, small superscript decimals (no dot).
     * With `maxPrice` (> price) renders a range "$32.39-$35.99". Sizes: sm 20px, md 24px, lg 30px whole.
     */
    layout?: 'default' | 'amazon'
    /** amazon layout only: upper end of a variant price range. */
    maxPrice?: number
    className?: string
}

interface PriceParts {
    /** Currency symbol / code before the number, e.g. "GH₵". */
    prefix: string
    whole: string
    /** Decimal separator + digits, e.g. ".50". Empty when the amount has no decimals. */
    decimals: string
    /** Anything after the number (some locales put the symbol last). */
    suffix: string
}

/** "GH₵1,234.50" -> { prefix: "GH₵", whole: "1,234", decimals: ".50", suffix: "" }. */
const FORMATTED_RE = /^(\D*?)(\d[\d.,\s  ]*?)(?:([.,])(\d{1,2}))?(\D*)$/

/**
 * Splits an already formatted price string (e.g. the CurrencyContext output).
 * Falls back to rendering the whole string as the "whole" part when it does not look like a price.
 */
export function splitFormattedPrice(text: string): PriceParts {
    const m = FORMATTED_RE.exec(text.trim())
    if (!m) return { prefix: '', whole: text, decimals: '', suffix: '' }
    return {
        prefix: m[1].trim(),
        whole: m[2].trim(),
        decimals: m[3] && m[4] ? `${m[3]}${m[4]}` : '',
        suffix: m[5].trim(),
    }
}

/** One Intl formatter per currency code, built on first use and shared by every card. */
const INTL_BY_CURRENCY = new Map<string, Intl.NumberFormat | null>()

function intlFor(currencyCode: string): Intl.NumberFormat | null {
    let fmt = INTL_BY_CURRENCY.get(currencyCode)
    if (fmt === undefined) {
        try {
            fmt = new Intl.NumberFormat('en', {
                style: 'currency',
                currency: currencyCode,
                currencyDisplay: 'narrowSymbol',
            })
        } catch {
            fmt = null
        }
        INTL_BY_CURRENCY.set(currencyCode, fmt)
    }
    return fmt
}

/** Intl-based splitter for the fallback path; works for any ISO currency code. */
function splitWithIntl(amount: number, currencyCode: string): PriceParts {
    const fmt = intlFor(currencyCode)
    if (!fmt) return { prefix: currencyCode, whole: amount.toFixed(0), decimals: '', suffix: '' }
    const out: PriceParts = { prefix: '', whole: '', decimals: '', suffix: '' }
    let seenNumber = false
    let decimalSep = ''
    for (const part of fmt.formatToParts(amount)) {
        if (part.type === 'integer' || part.type === 'group') {
            out.whole += part.value
            seenNumber = true
        } else if (part.type === 'decimal') {
            decimalSep = part.value
            seenNumber = true
        } else if (part.type === 'fraction') {
            out.decimals = `${decimalSep}${part.value}`
            seenNumber = true
        } else if (part.type === 'currency' || part.type === 'literal' || part.type === 'minusSign') {
            if (seenNumber) out.suffix += part.value
            else out.prefix += part.value
        }
    }
    out.prefix = out.prefix.trim()
    out.suffix = out.suffix.trim()
    return out
}

/** Whole-number discount percentage, 0 when there is no real discount. */
export function discountPercent(price: number, originalPrice?: number): number {
    if (!originalPrice || originalPrice <= price || originalPrice <= 0) return 0
    return Math.round((1 - price / originalPrice) * 100)
}

function plainText(p: PriceParts): string {
    return `${p.prefix}${p.prefix && /[A-Za-z]$/.test(p.prefix) ? ' ' : ''}${p.whole}${p.decimals}${p.suffix ? ` ${p.suffix}` : ''}`
}

const WHOLE_SIZE = { sm: 'text-base', md: 'text-lg', lg: 'text-3xl sm:text-4xl' } as const
const META_SIZE = { sm: 'text-xs', md: 'text-xs', lg: 'text-sm' } as const

const AMAZON_WHOLE = { sm: 'text-xl', md: 'text-2xl', lg: 'text-3xl' } as const

function AmazonAmount({ parts, size }: { parts: PriceParts; size: 'sm' | 'md' | 'lg' }) {
    const cents = parts.decimals.replace(/^[.,]/, '')
    return (
        <span className="inline-flex items-start whitespace-nowrap leading-none tabular-nums text-zinc-900 dark:text-zinc-50">
            {parts.prefix ? <span className="mr-px pt-0.5 text-xs">{parts.prefix}</span> : null}
            <span className={cx('font-normal leading-none', AMAZON_WHOLE[size])}>{parts.whole}</span>
            {cents ? <span className="pt-0.5 text-xs">{cents}</span> : null}
            {parts.suffix ? <span className="ml-0.5 pt-0.5 text-xs">{parts.suffix}</span> : null}
        </span>
    )
}

function PriceTag({
    price,
    originalPrice,
    formatPrice,
    currencyCode = 'GHS',
    size = 'md',
    showDiscount = false,
    showListLabel = false,
    stacked = false,
    layout = 'default',
    maxPrice,
    className,
}: PriceTagProps) {
    const { main, list, pct } = useMemo(() => {
        const split = (amount: number): PriceParts =>
            formatPrice ? splitFormattedPrice(formatPrice(amount)) : splitWithIntl(amount, currencyCode)
        const discount = discountPercent(price, originalPrice)
        return {
            main: split(price),
            list: discount > 0 ? split(originalPrice as number) : null,
            pct: discount,
        }
    }, [price, originalPrice, formatPrice, currencyCode])

    if (layout === 'amazon') {
        const range = maxPrice !== undefined && maxPrice > price
        const upper = range ? (formatPrice ? splitFormattedPrice(formatPrice(maxPrice)) : splitWithIntl(maxPrice, currencyCode)) : null
        const spokenAmazon = range
            ? `Price from ${plainText(main)} to ${plainText(upper as PriceParts)}`
            : list
              ? `Sale price ${plainText(main)}, was ${plainText(list)}`
              : `Price ${plainText(main)}`
        const pctAmazon = !range && pct > 0 && showDiscount
        const showList = !range && list
        return (
            <span className={cx('flex flex-wrap items-baseline gap-x-1.5 gap-y-0', className)}>
                <span className="sr-only">{spokenAmazon}</span>
                <span aria-hidden="true" className="inline-flex items-baseline whitespace-nowrap">
                    <AmazonAmount parts={main} size={size} />
                    {upper ? (
                        <>
                            <span className="px-0.5 text-sm text-zinc-700 dark:text-zinc-300">-</span>
                            <AmazonAmount parts={upper} size={size} />
                        </>
                    ) : null}
                </span>
                {showList ? (
                    <s aria-hidden="true" className="whitespace-nowrap text-sm tabular-nums text-zinc-600 dark:text-zinc-400">
                        {showListLabel ? 'List: ' : ''}
                        {plainText(list as PriceParts)}
                    </s>
                ) : null}
                {pctAmazon ? (
                    <span aria-hidden="true" className="whitespace-nowrap text-sm font-medium text-red-700 dark:text-red-400">
                        -{pct}%
                    </span>
                ) : null}
            </span>
        )
    }

    const mainText = plainText(main)
    const listText = list ? plainText(list) : ''
    const spoken = list ? `Sale price ${mainText}, was ${listText}` : `Price ${mainText}`

    // Whole amount is a bare text node: it inherits the size and weight from this wrapper.
    const mainEl = (
        <span
            aria-hidden="true"
            className={cx(
                'whitespace-nowrap font-bold leading-none tabular-nums text-zinc-900 dark:text-zinc-50',
                WHOLE_SIZE[size]
            )}
        >
            {/* Same size and baseline for every part; only the whole amount is bold. */}
            {main.prefix ? <span className="mr-0.5 font-normal">{main.prefix}</span> : null}
            {main.whole}
            {main.decimals ? <span className="font-normal">{main.decimals}</span> : null}
            {main.suffix ? <span className="ml-0.5 font-normal">{main.suffix}</span> : null}
        </span>
    )

    const listEl = list ? (
        <s aria-hidden="true" className={cx('whitespace-nowrap tabular-nums text-zinc-500 dark:text-zinc-400', META_SIZE[size])}>
            {showListLabel ? 'List: ' : ''}
            {listText}
        </s>
    ) : null

    const discountClass = cx('whitespace-nowrap font-semibold text-red-600 dark:text-red-400', META_SIZE[size])
    const showPct = pct > 0 && showDiscount

    if (stacked) {
        return (
            <span className={cx('flex min-w-0 flex-col', className)}>
                <span className="sr-only">{spoken}</span>
                <span className="block h-6 overflow-x-clip leading-6">{mainEl}</span>
                <span className="flex h-4 items-center gap-1 overflow-hidden leading-4">
                    {listEl}
                    {showPct ? (
                        <span aria-hidden="true" className={discountClass}>
                            (-{pct}%)
                        </span>
                    ) : null}
                </span>
            </span>
        )
    }

    return (
        <span className={cx('inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0', className)}>
            <span className="sr-only">{spoken}</span>
            {mainEl}
            {showPct ? (
                <span aria-hidden="true" className={discountClass}>
                    -{pct}%
                </span>
            ) : null}
            {listEl}
        </span>
    )
}

export default memo(PriceTag)
