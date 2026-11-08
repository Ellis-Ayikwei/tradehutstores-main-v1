'use client'

import type { FormApi } from '../formApi'
import { mutedText, panelCls, Toggle } from '../ui'

export function ShippingStep({ form }: { form: FormApi }) {
    const { values, patch } = form
    return (
        <div className="space-y-3">
            <div className={`${panelCls} flex items-center justify-between gap-4`}>
                <div className="min-w-0">
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Free shipping</p>
                    <p className={`mt-0.5 text-xs ${mutedText}`}>Buyers see a free shipping label and pay no delivery fee when every item in their order has it on.</p>
                </div>
                <Toggle checked={values.free_shipping} onChange={(next) => patch({ free_shipping: next })} label="Free shipping" />
            </div>
            <p className={`text-sm ${mutedText}`}>Delivery methods and rates come from the store shipping settings. Weight and dimensions are not collected yet.</p>
        </div>
    )
}
