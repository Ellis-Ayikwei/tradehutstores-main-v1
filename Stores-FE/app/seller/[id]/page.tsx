import { Suspense } from 'react'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import StoreHeader from '@/components/seller/StoreHeader'
import StoreTabs from '@/components/seller/StoreTabs'
import { deriveRating, getStoreData } from '@/components/seller/storeData'
import { resolveMediaSrc } from '@/lib/mediaUrl'

interface PageProps {
    params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
    const { id } = await params
    const { seller, products, notFound: missing } = await getStoreData(id)
    if (missing) return { title: 'Store not found | TradeHut' }

    const name = seller?.business_name ?? 'Seller store'
    const description =
        seller?.business_description?.slice(0, 160) ??
        (products.length > 0
            ? `Shop ${products.length} product${products.length === 1 ? '' : 's'} from ${name} on TradeHut.`
            : `Visit ${name} on TradeHut.`)
    const image = resolveMediaSrc(seller?.store_banner ?? seller?.store_logo)

    return {
        title: `${name} | TradeHut`,
        description,
        openGraph: {
            title: `${name} | TradeHut`,
            description,
            type: 'website',
            ...(image ? { images: [{ url: image }] } : {}),
        },
    }
}

export default async function SellerStorePage({ params }: PageProps) {
    const { id } = await params
    const store = await getStoreData(id)
    if (store.notFound) notFound()

    const { seller, products, productsError } = store

    const fromSeller =
        seller && seller.rating !== null && seller.rating > 0 && seller.total_reviews && seller.total_reviews > 0
            ? { value: seller.rating, count: seller.total_reviews }
            : null
    const derived = deriveRating(products)
    const rating = fromSeller ?? (derived ? { value: derived.rating, count: derived.count } : null)

    return (
        <>
            <div className="mx-auto max-w-screen-2xl px-3 pt-3 sm:px-4 lg:px-6">
                <StoreHeader
                    storeId={seller?.id ?? id}
                    seller={seller}
                    productCount={products.length}
                    rating={rating}
                />
            </div>
            <Suspense fallback={null}>
                <StoreTabs
                    storeId={id}
                    seller={seller}
                    products={products}
                    productsError={productsError}
                    reviewCount={rating?.count ?? null}
                />
            </Suspense>
        </>
    )
}
