import type { PdpProduct } from './types'

/** schema.org Product built only from fields the API returned. */
export default function ProductJsonLd({ product, inStock }: { product: PdpProduct; inStock: boolean }) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
  }
  if (product.images.length > 0) data.image = product.images
  if (product.description) data.description = product.description
  if (product.sku) data.sku = product.sku
  if (product.brand) data.brand = { '@type': 'Brand', name: product.brand }
  if (product.final_price > 0) {
    data.offers = {
      '@type': 'Offer',
      price: product.final_price.toFixed(2),
      priceCurrency: product.pricing_currency,
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
    }
  }
  if (product.total_reviews > 0 && product.average_rating > 0) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: product.average_rating,
      reviewCount: product.total_reviews,
    }
  }
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  )
}
