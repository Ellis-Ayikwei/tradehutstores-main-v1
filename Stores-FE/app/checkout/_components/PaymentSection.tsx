'use client'

import { Banknote, CreditCard } from 'lucide-react'
import type { PaymentMethodId } from '@/lib/checkoutApi'
import { BTN_PRIMARY, Banner, OptionRow } from './ui'

interface PaymentSectionProps {
    paystack: boolean
    cod: boolean
    configLoading: boolean
    configReady: boolean
    /** Auction and RFQ orders are paid online only. */
    onlineOnly: boolean
    selected: PaymentMethodId | null
    onSelect: (id: PaymentMethodId) => void
    onContinue: () => void
}

export const PAYMENT_LABEL: Record<PaymentMethodId, string> = {
    paystack: 'Paystack (card or mobile money)',
    cod: 'Cash on delivery',
}

/** Only the payment methods the store config enables. There are no card fields in our UI at all. */
export default function PaymentSection({
    paystack,
    cod,
    configLoading,
    configReady,
    onlineOnly,
    selected,
    onSelect,
    onContinue,
}: PaymentSectionProps) {
    if (configLoading && !configReady) {
        return (
            <div role="status" aria-label="Loading payment options" className="animate-pulse space-y-2">
                {[0, 1].map((i) => (
                    <div key={i} className="h-[60px] rounded-lg bg-zinc-100 dark:bg-zinc-800" />
                ))}
            </div>
        )
    }

    const showCod = cod && !onlineOnly
    if (!configReady || (!paystack && !showCod)) {
        return (
            <Banner tone="warning">
                <p className="font-semibold">No payment method is available right now.</p>
                <p>
                    {configReady
                        ? 'The store has not enabled a payment method for this order.'
                        : 'We could not load the store’s payment options. Refresh the page to try again.'}
                </p>
            </Banner>
        )
    }

    return (
        <div className="space-y-3">
            <div role="radiogroup" aria-label="Payment method" className="space-y-2">
                {paystack ? (
                    <OptionRow
                        name="payment-method"
                        value="paystack"
                        selected={selected === 'paystack'}
                        onSelect={() => onSelect('paystack')}
                    >
                        <p className="flex items-center gap-2 font-semibold">
                            <CreditCard className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Paystack
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">
                            Pay online securely with Paystack (card or mobile money)
                        </p>
                    </OptionRow>
                ) : null}
                {showCod ? (
                    <OptionRow
                        name="payment-method"
                        value="cod"
                        selected={selected === 'cod'}
                        onSelect={() => onSelect('cod')}
                    >
                        <p className="flex items-center gap-2 font-semibold">
                            <Banknote className="h-4 w-4 shrink-0" aria-hidden="true" />
                            Cash on delivery
                        </p>
                        <p className="text-zinc-600 dark:text-zinc-400">Pay in cash when your order arrives.</p>
                    </OptionRow>
                ) : null}
            </div>
            {onlineOnly ? (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    This order was won through an auction or quote, so it is paid online.
                </p>
            ) : null}
            {paystack && selected === 'paystack' ? (
                <p className="text-xs text-zinc-600 dark:text-zinc-400">
                    You’ll be taken to Paystack to complete your payment.
                </p>
            ) : null}
            <div className="flex sm:justify-end">
                <button type="button" onClick={onContinue} disabled={!selected} className={`${BTN_PRIMARY} w-full sm:w-auto`}>
                    Use this payment method
                </button>
            </div>
        </div>
    )
}
