'use client'

/**
 * /search — TradeHut Search Results
 *
 * Grid view sourced from: tradehut_search_results_1/code.html
 * List view sourced from:  tradehut_search_results_2/code.html  (mobile drawer +
 *                          responsive improvements; list-row layout is derived
 *                          from the same card data laid out horizontally)
 *
 * TODO: Replace mock PRODUCTS data with real fetch:
 *       GET /api/search/?q=...&filters=...&page=...&sort=...
 * TODO: Wire price-range slider inputs (currently static decorative).
 * TODO: Connect activeFilters chips to real filter state.
 * TODO: Wire sort buttons to sort state.
 */

import { useState, useCallback, useEffect, Suspense } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
  Search,
  SearchX,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ChevronRight,
  Heart,
  MapPin,
  Clock,
  Gavel,
  Star,
  X,
  ArrowUpRight,
  Loader2,
} from 'lucide-react'
import MainLayout from '@/components/Layouts/MainLayout'
import Pagination from '@/components/common/Pagination'

// ─── Types ────────────────────────────────────────────────────────────────────

type ListingType = 'fixed' | 'auction' | 'rfq'

interface Product {
  id: string
  slug: string
  title: string
  seller: string
  imageUrl: string
  imageAlt: string
  listingType: ListingType
  price?: number           // fixed price or starting/current bid
  originalPrice?: number   // for showing discount
  inStock?: boolean
  isLive?: boolean         // auction currently live
  timeLeft?: string        // "04h 22m" or "Ending in 14m"
  condition?: string       // "Excellent", "Mint", "Good"
  location?: string
  rating?: number
  ratingCount?: number
}

// ─── Mock data (replace with API call) ───────────────────────────────────────

const PRODUCTS: Product[] = [
  {
    id: '1',
    slug: 'omni-phased-modulator-v2',
    title: 'Omni-Phased Modulator v2',
    seller: 'Helix Industries',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCh3mWSnWJy08sGKTU-se_WwA8HtDrrHXxGcFrTHaFqrsg0rI_8J7nSX-SnnGuEp8JuPNwylEHuAaXfyLH2U5WUAJdphpHqImqRqD_3GCvYCrmxIl3-AA1M9dMYs4yKoe1Dle-aF4VZRJEjrGgvqiHYUesSFuwWaLzWMDVJ0LPeoAFBrFQTFffwlS4HfOes_cZ4umI-Rr0FyK_6AWtxyJWjI7PC2Tj-XRgjK55mEO41mKwC24DPJIbhcUdJHn_cLr8cvEbeHnH8ZOM',
    imageAlt: 'Industrial machinery parts',
    listingType: 'auction',
    price: 4250,
    isLive: true,
    timeLeft: '04h 22m',
    condition: 'Excellent',
    location: 'North America',
    rating: 4.8,
    ratingCount: 94,
  },
  {
    id: '2',
    slug: 'spectral-diffuser-grid',
    title: 'Spectral Diffuser Grid',
    seller: 'Zenith Labs',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBytUWCJwRH38Yk1fc2P6DDiHeanHUInFffaU_j-8LUnw2W_vtRXjcGGQnttr3da9vaQua6OrIGHxquEKgVUcOs2SGRv4JccpdhbBuE9r7uzpvEgVarDpUJv-rTg5SSRxSbuLhUHI2f4xDPR-79fx3DLrYMjAF9h4uE0yEMtaMxoaxGimh_lMmZXhP84YbXmu06gneexZxJhHYt3Tcutcv42c3EuZ8at-DOAUYvIbDfrFQclKoKTO9zqoobNr9_h6Nf3TaQCBpa1lc',
    imageAlt: 'Modern tech installation',
    listingType: 'fixed',
    price: 1800,
    inStock: true,
    condition: 'Mint',
    location: 'Europe (EU)',
    rating: 4.6,
    ratingCount: 47,
  },
  {
    id: '3',
    slug: 'industrial-torque-assembly',
    title: 'Industrial Torque Assembly',
    seller: 'Titan Heavy',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBTXUvHp2fZeQa0jVHvAUfx034F6G-Y9KFlIG9k2KPYpaeQJUcfDtaLZSlkc-sVoS_Ec5S4QYSJY0J4qEW6CiXodiETv7Qhu2fO89Nf6-YGHcLo0AcNcNiY2fPcFYFHbLRAnr7nQCjo9ozW8kx8Eulfzz-y0QWc90Dx2w5VFIL2oRX5g-04xa0VCwQ_2Et9t3_aMNl8ZDCQyw5hktlmp-EInlpdHnT_1mJZ4-qsaBQTOWv2uizvAF8ZPw1Qs_ze4Z7dr75a6-e7cNk',
    imageAlt: 'Heavy industrial machinery detail',
    listingType: 'rfq',
    condition: 'Good',
    location: 'Asia Pacific',
    rating: 4.2,
    ratingCount: 18,
  },
  {
    id: '4',
    slug: 'core-processing-array-x9',
    title: 'Core Processing Array X-9',
    seller: 'Logic Stream',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCUsqI9eUXqKoUSgCTFTk9H6Cp2FLfYtl5rXpsfXp6zpxFbHs0jaUpsudylxnX-ELZuWOHWqXKGLD2amBHRGYbhhheD0wAwg04sR6mROKK1r-8dZqNT91gHAdJKRlfjL4vyU85KFAS9SFriCJ_6rIgN86RBFg_nYROZbTdj1QLODwZRReiIeCoqJ7xQ6uJpE_F8NNE3snwySNQhw8wpL-loiyXKry3tin2yqlQRX1VT0Jrf0uj5nBnLwkmeB8G_LP-RtjT_Q-MctSQ',
    imageAlt: 'Electronic circuit board',
    listingType: 'auction',
    price: 15200,
    isLive: false,
    timeLeft: '12:04:45',
    condition: 'Excellent',
    location: 'North America',
    rating: 4.9,
    ratingCount: 203,
  },
  {
    id: '5',
    slug: 'quantum-bridge-connector',
    title: 'Quantum Bridge Connector',
    seller: 'Optic Core',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA9rkY6c7496A-hd1dTcZY4l-b_hAAxJG0yZTka41uPC_4BMSu-0JE3ePgRw27n_E7fP2IcXe9v7f4UoLE4QrKrymAARSfp9mjPgh-aZ1ArQqpaxefhvbQoqgoGuhyWEJq3NiDxs-Slk6LrCqinNbkrpZTtQnRI6PVMDkzBdSZmJ3-M1YdhYmKzBNKv13ioQAlPBLI9_92flpJ79SQVXhUhL37cK4UWstRfrg2AhP-TCWim38V8552EiBHD3DmB_D7jmZkZtw5BrbA',
    imageAlt: 'High-precision fiber optic connectors',
    listingType: 'fixed',
    price: 750,
    inStock: true,
    condition: 'Mint',
    location: 'Global Shipping',
    rating: 4.4,
    ratingCount: 62,
  },
  {
    id: '6',
    slug: 'liquid-motion-sculpture-04',
    title: 'Liquid Motion Sculpture 04',
    seller: 'Flux Studios',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAZIcz6tB2fDtXaE1dJvR3cAEMfktN3--H1QTpVYaQ7T82J5kQZOOkc-oVXYYSAEzAppwhgdlm-q3qoSSOgibx0qEgL-dlaTG80QqwBf6IXR5-kQz46kgUylpfER7NMRhCFu1G1ULV4aeLDPr-f1rj98AF3p9EpnYhBYQWq-W816R1vjDGzD4zRDbn5Fl9jgM6B7oI4bmUDqKuc2uvmQXLQJaDNiWX3cVPmoPYqqhbVOBsJ--7a3zPNGVp_6twh2r0sgnWT7MkSQjk',
    imageAlt: 'Abstract chrome flowing sculpture',
    listingType: 'auction',
    price: 22400,
    isLive: true,
    timeLeft: 'Ending in 14m',
    condition: 'Excellent',
    location: 'Europe (EU)',
    rating: 4.7,
    ratingCount: 156,
  },
  {
    id: '7',
    slug: 'server-node-cluster-alpha',
    title: 'Server Node Cluster Alpha',
    seller: 'Omni-Net',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBA_suymxL-U_sku9ab8CMoh7PKNQUREeY3O8h1H4lg_OG35Fu9IsXZSJu66gyNncBg8C_8OeJbYyXBDIySYqFG3mRbWZXJtq-jz9n_VMMRTK0VMUovnmZJgzrATSbOCtbQe59BT3gR7RIrH6rtX0HAnWBZD818e-hu2xaAku-d5WpgC7FKwrrwjeHy7KFxoJISa-qtxNGr7tCXI2YiQdxJS5-DpI7hhibZV8eiQbJJyLxs5hm-nn1KKzR72hG9_u3iJ2AZAjR5zD8',
    imageAlt: 'Advanced computer circuitry',
    listingType: 'rfq',
    condition: 'Good',
    location: 'Global Shipping',
    rating: 4.1,
    ratingCount: 29,
  },
  {
    id: '8',
    slug: 'resonance-plate-mk-iii',
    title: 'Resonance Plate Mk III',
    seller: 'Sonic Horizon',
    imageUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCS27PQOH5yAD1j-bKOHeMUREJz8c7UxdZtNA47eDMn_q9FlxV8-uQqeOq45KvODqyLP8EoLpzUJfsiMXSM_L2eJPIjtU9M26A3ywpQXts_UdrMBIYZZL5YbATe5y8mm7tu7OMmjYqeQTD2yZHPlLk6ZNdHdlGeFhfiKghGohLIVueIjn5spv8JIyC5IdrR8_a7m_C6fNO84W4AEyvJ0Vv3cFBQxFpIqLeKvZZA-X5cfldAAMjrNVNHH1sBq9_2lWUR2tYG__ds-lY',
    imageAlt: 'High-end audio speaker driver',
    listingType: 'fixed',
    price: 3400,
    inStock: false,
    condition: 'Good',
    location: 'North America',
    rating: 4.3,
    ratingCount: 81,
  },
]

const TOTAL_RESULTS = 1284
const PAGE_SIZE = 8

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  return n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 })
}

function StarRating({ rating, count }: { rating: number; count: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map(star => (
          <Star
            key={star}
            className="w-3.5 h-3.5"
            style={rating >= star ? { fill: 'currentColor' } : undefined}
          />
        ))}
      </div>
      <span className="text-[11px] text-on-surface-variant font-medium">({count})</span>
    </div>
  )
}

// ─── Listing type badge ───────────────────────────────────────────────────────

function ListingBadge({ type, isLive }: { type: ListingType; isLive?: boolean }) {
  if (type === 'auction') {
    return (
      <div className="flex flex-col gap-1">
        <span className="bg-black/80 text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm flex items-center gap-1">
          <Gavel className="w-2.5 h-2.5" />
          Auction
        </span>
        {isLive && (
          <span className="bg-bid-green text-white text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
            Live
          </span>
        )}
      </div>
    )
  }
  if (type === 'rfq') {
    return (
      <span className="bg-tertiary text-on-tertiary text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
        RFQ Only
      </span>
    )
  }
  return (
    <span className="bg-surface-container-highest text-on-surface text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
      Fixed Price
    </span>
  )
}

// ─── Price block ──────────────────────────────────────────────────────────────

function PriceBlock({ product }: { product: Product }) {
  if (product.listingType === 'rfq') {
    return (
      <Link
        href="/rfq"
        className="block w-full text-center py-3 bg-surface-container-high hover:bg-tertiary hover:text-on-tertiary transition-all text-[11px] font-bold uppercase tracking-widest rounded-lg active:scale-95"
      >
        Request Quote
      </Link>
    )
  }
  if (product.listingType === 'auction') {
    return (
      <div className="flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-[9px] font-bold text-on-surface-variant uppercase">
            {product.isLive ? 'Current Bid' : 'Starting At'}
          </span>
          <span
            className={`font-mono text-lg font-bold tracking-tighter ${
              product.isLive ? 'text-bid-green' : 'text-on-surface'
            }`}
          >
            {product.price ? formatPrice(product.price) : '—'}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[9px] font-bold text-on-surface-variant uppercase">
            {product.isLive ? 'Time Left' : 'Starts In'}
          </span>
          <span
            className={`font-mono text-sm font-medium ${
              product.timeLeft?.startsWith('Ending') ? 'text-error' : ''
            }`}
          >
            {product.timeLeft}
          </span>
        </div>
      </div>
    )
  }
  // fixed
  return (
    <div className="flex items-center justify-between">
      <div className="flex flex-col">
        <span className="text-[9px] font-bold text-on-surface-variant uppercase">Price</span>
        <span className="font-mono text-lg font-bold text-on-surface tracking-tighter">
          {product.price ? formatPrice(product.price) : '—'}
        </span>
      </div>
      {product.inStock != null && (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-sm ${
            product.inStock
              ? 'text-bid-green bg-bid-green/10'
              : 'text-on-surface-variant bg-surface-container'
          }`}
        >
          {product.inStock ? 'In Stock' : 'Out of Stock'}
        </span>
      )}
    </div>
  )
}

// ─── Grid card (from search_results_1) ───────────────────────────────────────

function GridCard({ product }: { product: Product }) {
  return (
    <Link href={`/products/${product.slug}`} className="group block">
      <div className="relative aspect-[3/4] bg-surface-container-low rounded-2xl overflow-hidden mb-5">
        <Image
          src={product.imageUrl}
          alt={product.imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 25vw"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute top-4 left-4">
          <ListingBadge type={product.listingType} isLive={product.isLive} />
        </div>
        {product.listingType !== 'rfq' && (
          <button
            className="absolute bottom-4 right-4 h-10 w-10 bg-surface-container-lowest/90 backdrop-blur-md rounded-full flex items-center justify-center text-on-surface shadow-sm opacity-0 group-hover:opacity-100 transition-opacity active:scale-95"
            aria-label="Add to wishlist"
          >
            <Heart className="w-4.5 h-4.5" />
          </button>
        )}
      </div>
      <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
        {product.seller}
      </p>
      <h5 className="font-syne font-bold text-lg leading-tight mt-1 group-hover:text-primary transition-colors">
        {product.title}
      </h5>
      {product.rating != null && (
        <div className="mt-1">
          <StarRating rating={product.rating} count={product.ratingCount ?? 0} />
        </div>
      )}
      <div className="mt-4">
        <PriceBlock product={product} />
      </div>
    </Link>
  )
}

// ─── List row card (from search_results_2 — horizontal layout with more meta) ─

function ListCard({ product }: { product: Product }) {
  return (
    <article className="group bg-surface-container-lowest rounded-2xl shadow-card hover:shadow-card-hover transition-all duration-300 overflow-hidden flex flex-col sm:flex-row">
      {/* Image */}
      <Link
        href={`/products/${product.slug}`}
        className="relative w-full sm:w-44 lg:w-56 shrink-0 aspect-[4/3] sm:aspect-auto"
      >
        <Image
          src={product.imageUrl}
          alt={product.imageAlt}
          fill
          sizes="(max-width: 640px) 100vw, 224px"
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          unoptimized
        />
        <div className="absolute top-3 left-3">
          <ListingBadge type={product.listingType} isLive={product.isLive} />
        </div>
      </Link>

      {/* Content */}
      <div className="flex flex-col justify-between p-5 flex-1 min-w-0">
        <div>
          <div className="flex items-start justify-between gap-2 mb-1">
            <p className="text-[10px] font-bold text-on-surface-variant/50 uppercase tracking-widest">
              {product.seller}
            </p>
            {product.condition && (
              <span className="text-[9px] font-bold uppercase tracking-widest px-2 py-0.5 bg-surface-container rounded-sm text-on-surface-variant shrink-0">
                {product.condition}
              </span>
            )}
          </div>
          <Link href={`/products/${product.slug}`}>
            <h5 className="font-syne font-bold text-base md:text-lg leading-tight group-hover:text-primary transition-colors mb-1">
              {product.title}
            </h5>
          </Link>
          {product.rating != null && (
            <div className="mb-3">
              <StarRating rating={product.rating} count={product.ratingCount ?? 0} />
            </div>
          )}
          {/* Meta pills */}
          <div className="flex flex-wrap gap-2">
            {product.location && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
                <MapPin className="w-3.5 h-3.5" />
                {product.location}
              </span>
            )}
            {product.listingType === 'auction' && product.timeLeft && (
              <span
                className={`inline-flex items-center gap-1 text-xs font-medium px-3 py-1 rounded-full ${
                  product.timeLeft.startsWith('Ending')
                    ? 'text-error bg-error-container/30'
                    : 'text-on-surface-variant bg-surface-container-low'
                }`}
              >
                <Clock className="w-3.5 h-3.5" />
                {product.timeLeft}
              </span>
            )}
            {product.listingType === 'auction' && (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-on-surface-variant bg-surface-container-low px-3 py-1 rounded-full">
                <Gavel className="w-3.5 h-3.5" />
                Live Auction
              </span>
            )}
          </div>
        </div>

        {/* Price + CTA row */}
        <div className="mt-4 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-3">
          <div>
            {product.listingType === 'rfq' ? (
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-widest">
                Request for Quote
              </span>
            ) : (
              <div>
                <span className="text-[9px] font-bold text-on-surface-variant uppercase block">
                  {product.listingType === 'auction'
                    ? product.isLive
                      ? 'Current Bid'
                      : 'Starting At'
                    : 'Price'}
                </span>
                <span
                  className={`font-mono text-xl font-bold tracking-tighter ${
                    product.listingType === 'auction' && product.isLive
                      ? 'text-bid-green'
                      : 'text-primary'
                  }`}
                >
                  {product.price ? formatPrice(product.price) : '—'}
                </span>
                {product.originalPrice && (
                  <span className="font-mono text-xs text-outline line-through ml-2">
                    {formatPrice(product.originalPrice)}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {product.listingType !== 'rfq' && (
              <button
                className="h-9 w-9 rounded-full flex items-center justify-center bg-surface-container-low hover:bg-surface-container text-on-surface-variant transition-all active:scale-95"
                aria-label="Add to wishlist"
              >
                <Heart className="w-4.5 h-4.5" />
              </button>
            )}
            <Link
              href={product.listingType === 'rfq' ? '/rfq' : `/products/${product.slug}`}
              className="px-5 py-2.5 bg-primary text-on-primary text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-primary-container active:scale-95 transition-all"
            >
              {product.listingType === 'rfq'
                ? 'Request Quote'
                : product.listingType === 'auction'
                ? product.isLive
                  ? 'Place Bid'
                  : 'View Auction'
                : 'View Item'}
            </Link>
          </div>
        </div>
      </div>
    </article>
  )
}

// ─── Filter sidebar content (shared by desktop + mobile drawer) ───────────────

function FilterSidebarContent() {
  const [resetKey, setResetKey] = useState(0)

  return (
    <form
      key={resetKey}
      className="space-y-8"
      onSubmit={(e) => e.preventDefault()}
    >
      {/* Transaction Type */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">
          Transaction Type
        </p>
        <div className="space-y-3">
          {['Fixed Price', 'Live Auction', 'RFQ Technical'].map(label => (
            <label key={label} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="checkbox"
                defaultChecked={label === 'Fixed Price'}
                className="rounded-sm border-outline-variant text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium group-hover:text-primary transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">
          Price Range (USD)
        </p>
        {/* Decorative range track — TODO: wire to real range input */}
        <div className="px-2 mb-2">
          <div className="h-1 bg-surface-container-high rounded-full relative">
            <div className="absolute h-full w-2/3 bg-primary-container left-4 rounded-full" />
            <div className="absolute h-4 w-4 bg-primary-container rounded-full -top-1.5 left-4 shadow-sm border-2 border-surface-container-lowest" />
            <div className="absolute h-4 w-4 bg-primary-container rounded-full -top-1.5 right-1/4 shadow-sm border-2 border-surface-container-lowest" />
          </div>
        </div>
        <div className="flex items-center justify-between font-mono text-[11px] text-on-surface-variant">
          <span>$500</span>
          <span>$25,000+</span>
        </div>
      </div>

      {/* Condition */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">
          Condition
        </p>
        <div className="grid grid-cols-2 gap-2">
          {[
            { label: 'Mint', active: false },
            { label: 'Excellent', active: true },
            { label: 'Good', active: false },
            { label: 'Fair', active: false },
          ].map(({ label, active }) => (
            <button
              key={label}
              className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all active:scale-95 ${
                active
                  ? 'bg-surface-container-lowest border-primary/20 text-primary'
                  : 'bg-surface-container-low border-transparent hover:border-primary/20 text-on-surface'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Brands */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">
          Brands
        </p>
        <div className="space-y-3">
          {['Aura Dynamics', 'Vortex Labs', 'Prism Heavy', 'Logic Stream', 'Optic Core'].map(
            brand => (
              <label key={brand} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  defaultChecked={brand === 'Vortex Labs'}
                  className="rounded-sm border-outline-variant text-primary focus:ring-primary"
                />
                <span className="text-sm font-medium group-hover:text-primary transition-colors">
                  {brand}
                </span>
              </label>
            )
          )}
        </div>
      </div>

      {/* Seller type */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">
          Seller Type
        </p>
        <div className="space-y-3">
          {['All Sellers', 'Verified Only', 'Top Rated'].map(label => (
            <label key={label} className="flex items-center gap-3 cursor-pointer group">
              <input
                type="radio"
                name="seller-type"
                defaultChecked={label === 'All Sellers'}
                className="border-outline-variant text-primary focus:ring-primary"
              />
              <span className="text-sm font-medium group-hover:text-primary transition-colors">
                {label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Delivery Origin */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest text-on-surface-variant/60 mb-3">
          Delivery Origin
        </p>
        <select className="w-full bg-surface-container-low border-none rounded-lg text-sm font-medium py-3 px-4 focus:ring-1 focus:ring-primary text-on-surface">
          <option>Global Shipping</option>
          <option>North America</option>
          <option>Europe (EU)</option>
          <option>Asia Pacific</option>
        </select>
      </div>

      {/* Clear filters */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setResetKey((v) => v + 1)}
          className="w-full py-2.5 rounded-lg border border-outline-variant/25 text-xs font-bold uppercase tracking-widest text-on-surface-variant hover:text-primary hover:border-primary/30 transition-all active:scale-95"
        >
          Clear Filters
        </button>
      </div>
    </form>
  )
}

// ─── Sponsored bento cards (from search_results_1 + _2) ───────────────────────

function SponsoredRow() {
  const items = [
    {
      title: 'VORTEX PRO 900',
      desc: 'High-frequency industrial oscillator featuring dual-core magnetic stabilization and titanium housing.',
      price: '$12,450.00',
      slug: 'vortex-pro-900',
      imgUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAIkLFUiYQ3gBcT4e-z07-oGTYBQCvWDS5Tc_GlQDvrMVcIJbhAI1cSV2FQ54jY0yveWrByCFvzmgJU7f-inPGjxVcn0KRCyCUI0BcY-Mp7TkXIuQZDyaYrrvNDFt82mOyNhOKInTtsZvKjdJESs4p6sWzb3cQq6EsahavcYd6zuPu4Q9NrY3-kiSrST_YRAoVCQYIvBZzGkJjGdKBSWOWVO-sDwJlcmkJA48Bk8LYzcpXFu33KIai-zvZbNsNayaq2-c6pmHVHMrc',
      imgAlt: 'Precision technical machinery closeup',
    },
    {
      title: 'AURA SYNC-X',
      desc: 'Modular synchronization array for large-scale installations and technical labs.',
      price: '$8,900.00',
      slug: 'aura-sync-x',
      imgUrl:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuAvfO9ibLVsraEpcJLgrncqy7bDXWiaEFPCWebceg8A9A-nQ_SBihIArSTdSLkHgorsdj_BEXlPKTH1l32OyyBqBQjjz1hAetcSPaK55nZVB5Yu7jemfHA26fVYgGa_gPr7OEP4Dnh5Il7ByDl-SddPnB2f-_gJrMQ8BKzAcdL9ENx42rxQ-SDybGotz7gBxkkjk2Y9ByMcsTR_GGeBD_hvP4BqqxTMDFaNinaVlt9kvv583n46Wh3qA8PNXQlbqxzmehvZlqabbLI',
      imgAlt: 'Modern engine component in bright lighting',
    },
  ]

  return (
    <div className="mb-12">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-px bg-outline-variant/30 flex-grow" />
        <span className="bg-primary/10 text-primary text-[9px] font-black uppercase tracking-widest px-3 py-1 rounded-full whitespace-nowrap">
          Featured Partners
        </span>
        <div className="h-px bg-outline-variant/30 flex-grow" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
        {items.map(item => (
          <Link
            key={item.slug}
            href={`/products/${item.slug}`}
            className="group relative bg-surface-container-low rounded-3xl overflow-hidden flex flex-col sm:flex-row h-auto sm:h-[280px]"
          >
            <div className="w-full sm:w-1/2 overflow-hidden relative aspect-video sm:aspect-auto">
              <Image
                src={item.imgUrl}
                alt={item.imgAlt}
                fill
                sizes="(max-width: 640px) 100vw, 50vw"
                className="object-cover grayscale group-hover:grayscale-0 transition-all duration-700"
                unoptimized
              />
              <div className="hidden sm:block absolute inset-0 bg-gradient-to-r from-transparent to-surface-container-low" />
            </div>
            <div className="w-full sm:w-1/2 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <span className="bg-surface-container-highest text-on-surface-variant text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-sm">
                  Sponsored
                </span>
                <h4 className="font-syne font-bold text-2xl mt-3 tracking-tighter group-hover:text-primary transition-colors">
                  {item.title}
                </h4>
                <p className="text-sm text-on-surface-variant/70 mt-2 line-clamp-2">{item.desc}</p>
              </div>
              <div className="flex items-end justify-between mt-4 sm:mt-0">
                <div className="font-mono text-xl font-bold tracking-tight text-primary">
                  {item.price}
                </div>
                <span className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-on-primary shadow-lg shadow-primary/20 transition-transform group-hover:scale-110">
                  <ArrowUpRight className="w-5 h-5" />
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ query }: { query: string }) {
  const suggestions = [
    'Industrial Motors',
    'Servo Actuators',
    'Hydraulic Pumps',
    'PLC Controllers',
    'Sensor Arrays',
  ]
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6 text-center">
      <div className="w-20 h-20 rounded-3xl bg-surface-container flex items-center justify-center">
        <SearchX className="w-12 h-12 text-on-surface-variant/40" />
      </div>
      <div>
        <p className="font-syne font-bold text-xl text-on-surface mb-2">
          No results for &ldquo;{query}&rdquo;
        </p>
        <p className="text-sm text-on-surface-variant max-w-sm">
          Try broadening your search or explore related categories below.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {suggestions.map(s => (
          <Link
            key={s}
            href={`/search?q=${encodeURIComponent(s)}`}
            className="inline-flex items-center gap-1.5 text-xs font-medium text-on-surface-variant bg-surface-container-low px-4 py-2 rounded-full hover:bg-surface-container hover:text-primary transition-colors active:scale-95"
          >
            <Search className="w-3.5 h-3.5" />
            {s}
          </Link>
        ))}
      </div>
    </div>
  )
}

// ─── Sort toggle ──────────────────────────────────────────────────────────────

type SortOption = 'relevance' | 'price' | 'newest'

function SortBar({
  value,
  onChange,
}: {
  value: SortOption
  onChange: (v: SortOption) => void
}) {
  const options: { key: SortOption; label: string }[] = [
    { key: 'relevance', label: 'Relevance' },
    { key: 'price', label: 'Price' },
    { key: 'newest', label: 'Newest' },
  ]
  return (
    <div className="flex bg-surface-container-low p-1 rounded-lg overflow-x-auto no-scrollbar">
      {options.map(o => (
        <button
          key={o.key}
          onClick={() => onChange(o.key)}
          className={`px-4 py-2 text-[11px] font-bold whitespace-nowrap rounded-md transition-all active:scale-95 ${
            value === o.key
              ? 'bg-surface-container-lowest text-on-surface shadow-sm'
              : 'text-on-surface-variant/60 hover:text-on-surface'
          }`}
        >
          {o.label.toUpperCase()}
        </button>
      ))}
    </div>
  )
}

// ─── Inner page (needs useSearchParams) ───────────────────────────────────────

function SearchPageInner() {
  const searchParams = useSearchParams()
  const rawQuery = searchParams.get('q') ?? ''

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<SortOption>('relevance')
  const [currentPage, setCurrentPage] = useState(1)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [queryInput, setQueryInput] = useState(rawQuery)

  // Sync query input when URL param changes
  useEffect(() => {
    setQueryInput(rawQuery)
    setCurrentPage(1)
  }, [rawQuery])

  // Lock body scroll when drawer open
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.style.overflow = drawerOpen ? 'hidden' : ''
    }
    return () => {
      if (typeof document !== 'undefined') document.body.style.overflow = ''
    }
  }, [drawerOpen])

  const totalPages = Math.ceil(TOTAL_RESULTS / PAGE_SIZE)
  const hasResults = PRODUCTS.length > 0

  const handlePageChange = useCallback(
    (p: number) => {
      if (p >= 1 && p <= totalPages) {
        setCurrentPage(p)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    },
    [totalPages]
  )

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* ── Mobile filter drawer overlay (from search_results_2) ── */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-60 lg:hidden"
          onClick={() => setDrawerOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* ── Mobile filter drawer (from search_results_2) ── */}
      <aside
        className={`fixed top-0 right-0 h-full w-[300px] bg-surface z-70 shadow-2xl transition-transform duration-300 lg:hidden p-8 overflow-y-auto ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Filters"
      >
        <div className="flex justify-between items-center mb-8">
          <h3 className="font-syne font-bold text-lg uppercase tracking-tight">Refine Search</h3>
          <button
            onClick={() => setDrawerOpen(false)}
            className="text-on-surface-variant hover:text-primary transition-colors active:scale-95"
            aria-label="Close filters"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <FilterSidebarContent />
        <button
          onClick={() => setDrawerOpen(false)}
          className="mt-8 w-full py-4 bg-primary text-on-primary font-bold rounded-xl active:scale-95 transition-all"
        >
          Apply Filters
        </button>
      </aside>

      <main className="max-w-screen-xl mx-auto px-4 md:px-6 lg:px-8 py-8 flex flex-col lg:flex-row gap-8 lg:gap-12">

        {/* ── Desktop sidebar filters (from search_results_1 + _2) ── */}
        <aside className="hidden lg:block w-[260px] shrink-0 lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <h3 className="font-syne font-bold text-lg uppercase tracking-tight mb-6">
            Refine Search
          </h3>
          <FilterSidebarContent />
        </aside>

        {/* ── Main content area ── */}
        <section className="flex-grow min-w-0">

          {/* Breadcrumb */}
          <nav
            className="flex items-center flex-wrap gap-y-2 gap-x-2 text-[10px] font-bold uppercase tracking-[0.2em] text-on-surface-variant/40 mb-6"
            aria-label="Breadcrumb"
          >
            <Link href="/" className="hover:text-primary transition-colors">
              TradeHut
            </Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/products" className="hover:text-primary transition-colors">
              Products
            </Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-on-surface">{rawQuery || 'All Results'}</span>
          </nav>

          {/* Search bar + result count (top bar with query prefilled) */}
          <div className="bg-surface-container-high/50 p-4 md:p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div className="flex items-center gap-3 flex-1">
              <Search className="w-5 h-5 text-primary shrink-0" />
              <input
                type="search"
                value={queryInput}
                onChange={e => setQueryInput(e.target.value)}
                placeholder="Search TradeHut marketplace..."
                className="bg-transparent border-none focus:ring-0 text-sm font-body text-on-surface placeholder:text-outline flex-1 min-w-0"
                aria-label="Search query"
              />
            </div>
            <div className="text-[11px] font-bold text-on-surface-variant/60 uppercase whitespace-nowrap shrink-0">
              {hasResults
                ? `${TOTAL_RESULTS.toLocaleString()} results${rawQuery ? ` for "${rawQuery}"` : ''}`
                : 'No results found'}
            </div>
          </div>

          {/* Toolbar: active filter chips + sort + view-mode toggle */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">

            {/* Active filter chips */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-on-surface-variant/40 uppercase">
                Filters:
              </span>
              {/* TODO: map real active filters */}
              {['Excellent Condition', 'Vortex Labs'].map(chip => (
                <div
                  key={chip}
                  className="bg-surface-container-lowest shadow-sm border border-outline-variant/20 px-4 py-2 rounded-full flex items-center gap-2"
                >
                  <span className="text-[11px] font-bold uppercase">{chip}</span>
                  <button
                    className="hover:text-error transition-colors active:scale-95"
                    aria-label={`Remove ${chip} filter`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <button className="text-[10px] font-bold uppercase text-primary hover:underline underline-offset-2 px-2 active:scale-95 transition-all">
                Clear All
              </button>

              {/* Mobile: filter trigger button (from search_results_2) */}
              <button
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden ml-auto flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container-low border border-outline-variant/20 text-[11px] font-bold text-on-surface-variant hover:text-primary hover:border-primary/20 transition-all active:scale-95"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                Filters
              </button>
            </div>

            {/* Sort + view-mode toggle */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-bold text-on-surface-variant/40 uppercase shrink-0">
                Sort by:
              </span>
              <SortBar value={sortBy} onChange={setSortBy} />

              {/* Grid / List toggle (view-mode state) */}
              <div className="flex bg-surface-container-low p-1 rounded-lg shrink-0">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded-md transition-all active:scale-95 ${
                    viewMode === 'grid'
                      ? 'bg-surface-container-lowest shadow-sm text-on-surface'
                      : 'text-on-surface-variant/60 hover:text-on-surface'
                  }`}
                  aria-label="Grid view"
                  aria-pressed={viewMode === 'grid'}
                >
                  <LayoutGrid className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-md transition-all active:scale-95 ${
                    viewMode === 'list'
                      ? 'bg-surface-container-lowest shadow-sm text-on-surface'
                      : 'text-on-surface-variant/60 hover:text-on-surface'
                  }`}
                  aria-label="List view"
                  aria-pressed={viewMode === 'list'}
                >
                  <List className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Sponsored / featured partner bento row */}
          <SponsoredRow />

          {/* Product results */}
          {!hasResults ? (
            <EmptyState query={rawQuery} />
          ) : viewMode === 'grid' ? (
            /* ── Grid view (from search_results_1) ── */
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 sm:gap-x-6 gap-y-8 sm:gap-y-12">
              {PRODUCTS.map(product => (
                <GridCard key={product.id} product={product} />
              ))}
            </div>
          ) : (
            /* ── List view (from search_results_2 — horizontal rows with more meta) ── */
            <div className="flex flex-col gap-4">
              {PRODUCTS.map(product => (
                <ListCard key={product.id} product={product} />
              ))}
            </div>
          )}

          {/* Pagination */}
          {hasResults && (
            <Pagination
              current={currentPage}
              total={TOTAL_RESULTS}
              pageSize={PAGE_SIZE}
              onChange={handlePageChange}
              className="mt-16 md:mt-20 flex flex-col items-center gap-4"
              baseBtnClassName="h-10 md:h-12 w-10 md:w-12 flex items-center justify-center rounded-lg text-sm font-bold transition-colors active:scale-95"
              activeBtnClassName="bg-primary-container text-on-primary"
              inactiveBtnClassName="text-on-surface-variant hover:bg-surface-container-low"
              navGapClassName="flex items-center gap-1"
              ellipsisClassName="px-2 md:px-4 text-on-surface-variant/40"
              summaryClassName="text-[11px] font-bold text-on-surface-variant/40 uppercase tracking-widest"
              summary={
                <>
                  Displaying {PAGE_SIZE} of {TOTAL_RESULTS.toLocaleString()} results
                </>
              }
            />
          )}
        </section>
      </main>
    </div>
  )
}

// ─── Page export (Suspense required for useSearchParams in App Router) ─────────

export default function SearchPage() {
  return (
    <MainLayout>
      <Suspense
        fallback={
          <div className="flex items-center justify-center min-h-[40vh]">
            <Loader2 className="w-12 h-12 text-on-surface-variant/30 animate-spin" />
          </div>
        }
      >
        <SearchPageInner />
      </Suspense>
    </MainLayout>
  )
}
