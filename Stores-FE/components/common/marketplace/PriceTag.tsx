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
     * Fixed two-line layout for cards: the price on a 24px line, then a 16px line with the discount text and
     * the struck-through list price (the second line is always reserved, even without a discount).
     */
    stacked?: boolean
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

/** Intl-based splitter for the fallback path; works for any ISO currency code. */
function splitWithIntl(amount: number, currencyCode: string): PriceParts {
    try {
        const parts = new Intl.NumberFormat('en', {
            style: 'currency',
            currency: currencyCode,
            currencyDisplay: 'narrowSymbol',
        }).formatToParts(amount)
        const out: PriceParts = { prefix: '', whole: '', decimals: '', suffix: '' }
        let seenNumber = false
        let decimalSep = ''
        for (const part of parts) {
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
    } catch {
        return { prefix: currencyCode, whole: amount.toFixed(0), decimals: '', suffix: '' }
    }
}

/** Whole-number discount percentage, 0 when there is no real discount. */
export function discountPercent(price: number, originalPrice?: number): number {
    if (!originalPrice || originalPrice <= price || originalPrice <= 0) return 0
    return Math.round((1 - price / originalPrice) * 100)
}

const WHOLE_SIZE = { sm: 'text-base', md: 'text-lg sm:text-xl', lg: 'text-3xl sm:text-4xl' } as const
const SMALL_SIZE = { sm: 'text-[11px]', md: 'text-xs', lg: 'text-sm sm:text-base' } as const
const META_SIZE = { sm: 'text-xs', md: 'text-xs', lg: 'text-sm' } as const

export default function PriceTag({
    price,
    originalPrice,
    formatPrice,
    currencyCode = 'GHS',
    size = 'md',
    showDiscount = false,
    showListLabel = false,
    stacked = false,
    className,
}: PriceTagProps) {
    const parts = (amount: number): PriceParts =>
        formatPrice ? splitFormattedPrice(formatPrice(amount)) : splitWithIntl(amount, currencyCode)
    const plain = (amount: number): string => {
        const p = parts(amount)
        return `${p.prefix}${p.prefix && /[A-Za-z]$/.test(p.prefix) ? ' ' : ''}${p.whole}${p.decimals}${p.suffix ? ` ${p.suffix}` : ''}`
    }

    const pct = discountPercent(price, originalPrice)
    const onSale = pct > 0
    const main = parts(price)
    const list = onSale ? parts(originalPrice as number) : null

    const mainEl = (
        <span
            aria-hidden="true"
            className="whitespace-nowrap font-bold leading-none tabular-nums text-zinc-900 dark:text-zinc-50"
        >
            {main.prefix ? (
                <span className={cx('mr-0.5 align-super font-semibold leading-none', SMALL_SIZE[size])}>
                    {main.prefix}
                </span>
            ) : null}
            <span className={cx('leading-none', WHOLE_SIZE[size])}>{main.whole}</span>
            {main.decimals ? (
                <span className={cx('align-super font-semibold leading-none', SMALL_SIZE[size])}>
                    {main.decimals}
                </span>
            ) : null}
            {main.suffix ? (
                <span className={cx('ml-0.5 font-semibold leading-none', SMALL_SIZE[size])}>{main.suffix}</span>
            ) : null}
        </span>
    )
    const discountEl =
        onSale && showDiscount ? (
            <span
                className={cx(
                    'whitespace-nowrap font-semibold text-red-600 dark:text-red-400',
                    META_SIZE[size]
                )}
            >
                -{pct}%
            </span>
        ) : null
    const listEl = list ? (
        <>
            <span className="sr-only">Original price {plain(originalPrice as number)}</span>
            <s
                aria-hidden="true"
                className={cx('whitespace-nowrap tabular-nums text-zinc-500 dark:text-zinc-400', META_SIZE[size])}
            >
                {showListLabel ? 'List: ' : ''}
                {plain(originalPrice as number)}
            </s>
        </>
    ) : null

    if (stacked) {
        return (
            <span className={cx('flex min-w-0 flex-col', className)}>
                <span className="sr-only">{onSale ? `Sale price ${plain(price)}` : `Price ${plain(price)}`}</span>
                <span className="block h-6 overflow-x-clip leading-6">{mainEl}</span>
                <span className="flex h-4 items-center gap-1.5 overflow-hidden leading-4">
                    {discountEl}
                    {listEl}
                </span>
            </span>
        )
    }

    return (
        <span className={cx('inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0', className)}>
            <span className="sr-only">{onSale ? `Sale price ${plain(price)}` : `Price ${plain(price)}`}</span>
            {mainEl}
            {discountEl}
            {listEl}
        </span>
    )
}
