'use client'

import { createPortal } from 'react-dom'
import type { SellerOrderDetail } from '@/lib/seller/orders'
import { addressLines, buyerName, formatDate, formatMoney, isCod, shortId } from './orderUi'

const SLIP_ID = 'seller-packing-slip'

/** On print, hide everything in <body> except the slip. No dependency, just a print stylesheet. */
const PRINT_CSS = `
#${SLIP_ID} { display: none; }
@media print {
  @page { margin: 12mm; }
  html, body { background: #fff !important; }
  body > *:not(#${SLIP_ID}) { display: none !important; }
  #${SLIP_ID} { display: block !important; }
}
`

/**
 * Printable packing slip for one order. Mounted into <body> (outside the app root) so the print
 * stylesheet can hide the rest of the page. Only real order fields are printed. Always black on white.
 */
export function PackingSlip({ order }: { order: SellerOrderDetail }) {
    if (typeof document === 'undefined') return null
    const name = buyerName(order)
    const address = order.shipping_address ?? null
    const lines = addressLines(address)
    const phone = address?.phone?.trim()
    const shipment = order.shipments?.[0]
    const codDue = isCod(order) && order.payment_status !== 'paid'

    return createPortal(
        <div id={SLIP_ID} className="bg-white p-0 text-sm text-black">
            <style>{PRINT_CSS}</style>
            <div className="flex items-start justify-between border-b border-zinc-400 pb-3">
                <div>
                    <h1 className="text-xl font-bold">Packing slip</h1>
                    <p className="mt-1">Order #{shortId(order.id)}</p>
                    <p>Placed {formatDate(order.placed_at)}</p>
                </div>
                {order.seller?.business_name ? <p className="text-right font-semibold">{order.seller.business_name}</p> : null}
            </div>

            <div className="grid grid-cols-2 gap-6 py-3">
                <div>
                    <h2 className="mb-1 text-sm font-bold">Ship to</h2>
                    {name ? <p className="font-semibold">{name}</p> : null}
                    {lines.map((line) => (
                        <p key={line}>{line}</p>
                    ))}
                    {phone ? <p>Tel: {phone}</p> : null}
                    {!name && lines.length === 0 && !phone ? <p>No address on this order.</p> : null}
                </div>
                <div>
                    <h2 className="mb-1 text-sm font-bold">Shipment</h2>
                    {shipment ? (
                        <>
                            <p>{shipment.carrier}</p>
                            <p>Tracking: {shipment.tracking_number}</p>
                        </>
                    ) : (
                        <p>Not shipped yet</p>
                    )}
                    {codDue ? <p className="mt-2 font-bold">Cash on delivery: collect {formatMoney(order.total_amount, order.currency)}</p> : null}
                </div>
            </div>

            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-y border-zinc-400 text-left text-sm">
                        <th className="py-1.5 pr-2">Item</th>
                        <th className="py-1.5 pr-2">SKU</th>
                        <th className="py-1.5 text-right">Qty</th>
                    </tr>
                </thead>
                <tbody>
                    {order.items.map((item, index) => (
                        <tr key={item.id ?? `${item.variant_id ?? item.product_id ?? 'item'}-${index}`} className="border-b border-zinc-300">
                            <td className="py-1.5 pr-2">{item.title}</td>
                            <td className="py-1.5 pr-2">{item.sku || '-'}</td>
                            <td className="py-1.5 text-right font-semibold">{item.quantity}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>,
        document.body
    )
}
