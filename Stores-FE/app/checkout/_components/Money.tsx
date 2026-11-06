/**
 * Theme-aware price used by the cart and checkout. Same visual hierarchy as the marketplace
 * `PriceTag` (small symbol, large whole amount, small decimals, struck list price, red discount)
 * with explicit light/dark text colours. Money never renders NaN.
 */

interface PriceParts {
    prefix: string
    whole: string
    decimals: string
    suffix: string
}

/** "GH₵1,234.50" -> { prefix: "GH₵", whole: "1,234", decimals: ".50", suffix: "" }. */
const FORMATTED_RE = /^(\D*?)(\d[\d.,\s  ]*?)(?:([.,])(\d{1,2}))?(\D*)$/

function splitFormattedPrice(text: string): PriceParts {
    const m = FORMATTED_RE.exec(text.trim())
    if (!m) return { prefix: '', whole: text, decimals: '', suffix: '' }
    return {
        prefix: m[1].trim(),
        whole: m[2].trim(),
        decimals: m[3] && m[4] ? `${m[3]}${m[4]}` : '',
        suffix: m[5].trim(),
    }
}

type Size = 'sm' | 'md' | 'lg'

const WHOLE: Record<Size, string> = { sm: 'text-base', md: 'text-xl sm:text-[22px]', lg: 'text-2xl sm:text-3xl' }
const SMALL: Record<Size, string> = { sm: 'text-[11px]', md: 'text-xs', lg: 'text-sm' }

export function safeAmount(n: number | null | undefined): number {
    return typeof n === 'number' && Number.isFinite(n) ? n : 0
}

export function Price({
    amount,
    original,
    format,
    size = 'md',
    showDiscount = false,
}: {
    amount: number
    original?: number
    format: (n: number) => string
    size?: Size
    showDiscount?: boolean
}) {
    const value = safeAmount(amount)
    const parts = splitFormattedPrice(format(value))
    const hasList = typeof original === 'number' && Number.isFinite(original) && original > value
    const pct = hasList ? Math.round((1 - value / (original as number)) * 100) : 0
    const plain = format(value)
    return (
        <span className="inline-flex flex-wrap items-baseline gap-x-1.5">
            <span className="sr-only">{hasList ? `Sale price ${plain}` : `Price ${plain}`}</span>
            <span
                aria-hidden="true"
                className="whitespace-nowrap font-bold leading-none tabular-nums text-zinc-900 dark:text-zinc-100"
            >
                {parts.prefix ? (
                    <span className={`mr-0.5 align-super font-semibold leading-none ${SMALL[size]}`}>{parts.prefix}</span>
                ) : null}
                <span className={`leading-none ${WHOLE[size]}`}>{parts.whole}</span>
                {parts.decimals ? (
                    <span className={`align-super font-semibold leading-none ${SMALL[size]}`}>{parts.decimals}</span>
                ) : null}
                {parts.suffix ? (
                    <span className={`ml-0.5 font-semibold leading-none ${SMALL[size]}`}>{parts.suffix}</span>
                ) : null}
            </span>
            {hasList && showDiscount && pct > 0 ? (
                <span className="whitespace-nowrap text-xs font-semibold text-red-600 dark:text-red-400">-{pct}%</span>
            ) : null}
            {hasList ? (
                <>
                    <span className="sr-only">Original price {format(original as number)}</span>
                    <s aria-hidden="true" className="whitespace-nowrap text-xs tabular-nums text-zinc-500 dark:text-zinc-400">
                        {format(original as number)}
                    </s>
                </>
            ) : null}
        </span>
    )
}

/** Plain money for summary rows. */
export function Money({ amount, format, className = '' }: { amount: number; format: (n: number) => string; className?: string }) {
    return <span className={`tabular-nums ${className}`}>{format(safeAmount(amount))}</span>
}

/** Formats `amount` in `currency` with no conversion (the currency the buyer is actually charged in). */
export function formatInCurrency(amount: number, currency: string): string {
    const value = safeAmount(amount)
    try {
        return new Intl.NumberFormat('en', { style: 'currency', currency, currencyDisplay: 'narrowSymbol' }).format(value)
    } catch {
        return `${currency} ${value.toFixed(2)}`
    }
}
