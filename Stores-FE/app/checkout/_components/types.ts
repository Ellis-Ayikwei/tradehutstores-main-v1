export type CheckoutMode = 'cart' | 'buynow' | 'order'

export interface CheckoutLine {
    /** Stable React key. */
    key: string
    /** Cart row id (cart mode only); used to clear the cart after a confirmed order. */
    cartLineId?: string
    productId: string
    /** Required to order through POST checkout/. */
    variantId?: string
    name: string
    href: string
    imageSrc: string
    unit?: number
    list?: number
    quantity: number
    variantText?: string
    soldBy?: string
    outOfStock?: boolean
}

export type LinesStatus = 'loading' | 'ready' | 'error'
