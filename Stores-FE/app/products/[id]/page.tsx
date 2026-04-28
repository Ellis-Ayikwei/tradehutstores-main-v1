'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { addToCart } from '@/store/cartSlice'
import { addToWishlist } from '@/store/wishListSlice'
import axiosInstance from '@/lib/axiosInstance'
import MainLayout from '@/components/Layouts/MainLayout'
import ProductCard from '@/components/Products/ProductCard'
import Image from 'next/image'
import Link from 'next/link'
import {
  ShoppingCart,
  Heart,
  Truck,
  ShieldCheck,
  RotateCcw,
  Star,
  Check,
  Home,
  ChevronRight,
  Minus,
  Plus,
  Share2,
  Package,
  BadgeCheck,
  Zap,
  Gavel,
  Tag,
  CreditCard,
  Eye,
  Camera,
  AlertCircle,
} from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'

// ─── helpers ───────────────────────────────────────────────────────────────

function normalizePrice(rawPrice: any) {
  const parsed = typeof rawPrice === 'string' ? parseFloat(rawPrice) : Number(rawPrice ?? 0)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeProduct(product: any, catalogMap: Record<string, any>, variants: any[] = [], images: any[] = []) {
  const catalogItem = catalogMap[String(product.id)] ?? {}
  const normalizedVariants = (variants ?? []).map((variant: any) => ({
    ...variant,
    id: String(variant.id),
    name: variant.name || variant.sku || `Variant ${variant.id}`,
    price: String(variant.price ?? '0'),
  }))

  const imageUrls = (images ?? [])
    .map((image: any) => image.image)
    .filter(Boolean)

  const fallbackImage = product.main_product_image || catalogItem.main_product_image
  const mergedImages = imageUrls.length > 0 ? imageUrls : [fallbackImage].filter(Boolean)
  const resolvedPrice = normalizePrice(catalogItem.price ?? product.price ?? normalizedVariants[0]?.price)
  const resolvedFinalPrice = normalizePrice(
    catalogItem.final_price ??
      (product.discount_percentage > 0
        ? resolvedPrice * (1 - Number(product.discount_percentage) / 100)
        : resolvedPrice)
  )

  return {
    ...product,
    id: String(product.id),
    name: product.name || catalogItem.name || 'Unnamed Product',
    category: catalogItem.category ?? 'Uncategorized',
    sub_category: catalogItem.sub_category ?? '',
    brand: catalogItem.brand ?? 'Unknown',
    price: String(resolvedPrice),
    final_price: resolvedFinalPrice,
    discount_percentage: Number(product.discount_percentage ?? catalogItem.discount_percentage ?? 0),
    main_product_image: fallbackImage,
    images: mergedImages,
    variants: normalizedVariants,
    average_rating: product.average_rating ?? catalogItem.rating ?? 0,
    rating: Number(product.average_rating ?? catalogItem.rating ?? 0),
    total_reviews: Number(product.total_reviews ?? catalogItem.total_reviews ?? 0),
    inventory_level: Number(product.inventory_level ?? 0),
    key_features: product.key_features ?? [],
    reviews: product.reviews ?? [],
  }
}

// ─── Star rating display ────────────────────────────────────────────────────
function StarRating({ value, max = 5 }: { value: number; max?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={`w-4 h-4 ${
            i < Math.round(value)
              ? 'fill-primary-container text-primary-container'
              : 'text-outline-variant'
          }`}
        />
      ))}
    </div>
  )
}

// ─── Tab definitions ─────────────────────────────────────────────────────────
const TAB_KEYS = ['description', 'specs', 'reviews', 'shipping'] as const
type TabKey = typeof TAB_KEYS[number]

const TAB_LABELS: Record<TabKey, string> = {
  description: 'Description',
  specs: 'Specifications',
  reviews: 'Reviews',
  shipping: 'Shipping & Returns',
}

// ─── Page component ──────────────────────────────────────────────────────────

export default function ProductDetailPage() {
  const params = useParams()
  const id = params.id as string
  const dispatch = useDispatch<AppDispatch>()
  const { formatCurrency } = useCurrency()

  const { cart } = useSelector((state: RootState) => state.cart)
  const { wishlist } = useSelector((state: RootState) => state.wishlist)

  const [quantity, setQuantity] = useState(1)
  const [selectedImage, setSelectedImage] = useState(0)
  const [selectedVariant, setSelectedVariant] = useState<any>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('description')
  const [isWishlisted, setIsWishlisted] = useState(false)
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const [productDetail, setProductDetail] = useState<any>(null)
  const [relatedProducts, setRelatedProducts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    const fetchProductData = async () => {
      if (!id) {
        setIsLoading(false)
        setProductDetail(null)
        setRelatedProducts([])
        return
      }

      setIsLoading(true)
      setLoadError(null)

      try {
        const [productRes, variantsRes, imagesRes, relatedRes, catalogRes] = await Promise.all([
          axiosInstance.get(`/products/${id}/`),
          axiosInstance.get(`/products/${id}/variants/`),
          axiosInstance.get(`/products/${id}/images/`),
          axiosInstance.get(`/products/${id}/related/`),
          axiosInstance.get('/products/catalog/'),
        ])

        const catalogItems = Array.isArray(catalogRes.data)
          ? catalogRes.data
          : (catalogRes.data?.results ?? [])
        const catalogMap = (catalogItems as any[]).reduce<Record<string, any>>((acc, item) => {
          if (item?.id != null) acc[String(item.id)] = item
          return acc
        }, {})

        const normalizedProduct = normalizeProduct(
          productRes.data,
          catalogMap,
          variantsRes.data,
          imagesRes.data
        )
        const normalizedRelated = (Array.isArray(relatedRes.data) ? relatedRes.data : [])
          .map((item: any) => normalizeProduct(item, catalogMap))
          .filter((item: any) => item?.id !== normalizedProduct.id)

        setProductDetail(normalizedProduct)
        setRelatedProducts(normalizedRelated)
      } catch {
        setProductDetail(null)
        setRelatedProducts([])
        setLoadError('Unable to load product details right now.')
      } finally {
        setIsLoading(false)
      }
    }

    fetchProductData()
  }, [id])

  // ── wishlist sync ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (wishlist.items && productDetail) {
      setIsWishlisted(
        wishlist.items.some(
          (item: any) =>
            item.product?.id === productDetail.id || item.product_id === productDetail.id
        )
      )
    }
  }, [wishlist, productDetail])

  // ── reset image on variant change ──────────────────────────────────────────
  useEffect(() => {
    if (selectedVariant?.images?.length > 0) setSelectedImage(0)
  }, [selectedVariant])

  // ── toast helper ───────────────────────────────────────────────────────────
  const showToast = (msg: string, type: 'success' | 'error') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }

  if (isLoading) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center bg-surface px-4">
          <div className="text-center space-y-3">
            <div className="mx-auto h-10 w-10 rounded-full border-2 border-outline-variant border-t-primary animate-spin" />
            <p className="text-sm text-on-surface-variant">Loading product details...</p>
          </div>
        </div>
      </MainLayout>
    )
  }

  // ── empty state ────────────────────────────────────────────────────────────
  if (!productDetail) {
    return (
      <MainLayout>
        <div className="min-h-[60vh] flex items-center justify-center bg-surface px-4">
          <div className="text-center space-y-6 max-w-sm">
            <div className="w-20 h-20 mx-auto rounded-2xl bg-surface-container-low flex items-center justify-center">
              <Package className="w-10 h-10 text-outline" />
            </div>
            <h2 className="font-syne text-2xl font-bold text-on-surface">Product Not Found</h2>
            <p className="text-on-surface-variant text-sm leading-relaxed">
              {loadError || "The product you're looking for doesn't exist or has been removed."}
            </p>
            <Link
              href="/products"
              className="inline-flex items-center gap-2 px-8 py-3 primary-gradient text-on-primary font-bold rounded-lg shadow-lg active:scale-95 transition-all"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </MainLayout>
    )
  }

  // ── derived values ─────────────────────────────────────────────────────────
  const images =
    selectedVariant?.images?.length > 0
      ? selectedVariant.images
      : productDetail.images ||
        (productDetail.variants?.length > 0
          ? productDetail.variants[0].images || [productDetail.main_product_image]
          : [productDetail.main_product_image])

  const price = selectedVariant
    ? typeof selectedVariant.price === 'string'
      ? parseFloat(selectedVariant.price)
      : selectedVariant.price
    : typeof productDetail.price === 'string'
    ? parseFloat(productDetail.price)
    : productDetail.price

  const finalPrice = selectedVariant
    ? productDetail.discount_percentage > 0
      ? price * (1 - productDetail.discount_percentage / 100)
      : price
    : productDetail.final_price || price

  const rating =
    typeof productDetail.average_rating === 'string'
      ? parseFloat(productDetail.average_rating)
      : productDetail.average_rating || 0

  // ── handlers ───────────────────────────────────────────────────────────────
  const handleAddToCart = () => {
    if (productDetail.variants?.length > 0 && !selectedVariant) {
      showToast('Please select a variant', 'error')
      return
    }
    dispatch(
      addToCart({
        cart_id: cart.id || undefined,
        product_id: productDetail.id,
        quantity,
        product_variant_id: selectedVariant?.id,
        product: productDetail,
        variant: selectedVariant,
      })
    )
      .unwrap()
      .then(() => showToast('Added to cart successfully!', 'success'))
      .catch(() => showToast('Failed to add to cart', 'error'))
  }

  const handleAddToWishlist = () => {
    dispatch(
      addToWishlist({
        wishlist_id: wishlist.id,
        product_id: productDetail.id,
      })
    )
      .unwrap()
      .then(() => {
        showToast('Added to wishlist!', 'success')
        setIsWishlisted(true)
      })
      .catch(() => showToast('Failed to add to wishlist', 'error'))
  }

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: productDetail.name, url: window.location.href })
    } else {
      navigator.clipboard?.writeText(window.location.href)
      showToast('Link copied to clipboard', 'success')
    }
  }

  // ── render ─────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-6 right-6 z-toast px-5 py-3 rounded-xl font-medium text-sm shadow-lg transition-all ${
            toast.type === 'success'
              ? 'bg-secondary-fixed text-on-secondary-fixed'
              : 'bg-error-container text-on-error-container'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="bg-surface min-h-screen">
        <div className="max-w-screen-2xl mx-auto px-4 md:px-8 py-4 md:py-8">

          {/* ── Breadcrumb ───────────────────────────────────────────────── */}
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-2 mb-6 md:mb-8 text-[10px] md:text-xs font-medium text-on-surface-variant uppercase tracking-widest overflow-x-auto whitespace-nowrap no-scrollbar"
          >
            <Link href="/" className="hover:text-primary transition-colors flex items-center gap-1">
              <Home className="w-3 h-3" />
              <span>Home</span>
            </Link>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <Link href="/products" className="hover:text-primary transition-colors">
              Products
            </Link>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <Link
              href={`/products?category=${productDetail.category}`}
              className="hover:text-primary transition-colors"
            >
              {productDetail.category}
            </Link>
            <ChevronRight className="w-3 h-3 flex-shrink-0" />
            <span className="text-on-surface truncate max-w-[180px]">{productDetail.name}</span>
          </nav>

          {/* ── Hero: row on mobile/tablet (image | details), grid on lg+ ── */}
          <div className="flex flex-row gap-3 sm:gap-4 md:gap-6 items-start lg:grid lg:grid-cols-10 lg:gap-8 xl:gap-12">

            {/* ── LEFT: Gallery ────────────────────────────────────────── */}
            <div className="w-[38%] max-w-[240px] shrink-0 space-y-3 sm:space-y-4 md:max-w-[280px] md:space-y-6 lg:col-span-6 lg:w-auto lg:max-w-none lg:sticky lg:top-24 lg:self-start">
              {/* Main image */}
              <div className="relative aspect-square overflow-hidden rounded-lg sm:rounded-xl bg-surface-container-lowest shadow-card group">
                {images[selectedImage] ? (
                  <Image
                    src={images[selectedImage]}
                    alt={productDetail.name}
                    fill
                    className="object-contain p-2 sm:p-4 md:p-6 lg:p-12 transition-transform duration-700 group-hover:scale-105"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-surface-container-low">
                    <Package className="w-20 h-20 text-outline" />
                  </div>
                )}

                {/* Discount badge */}
                {productDetail.discount_percentage > 0 && (
                  <span className="absolute top-4 left-4 px-2 py-1 bg-error text-on-error text-[10px] font-bold rounded uppercase tracking-tight">
                    -{productDetail.discount_percentage}%
                  </span>
                )}

                {/* Image counter */}
                <span className="absolute bottom-4 right-4 px-2 py-1 bg-inverse-surface/60 text-inverse-on-surface text-[10px] font-bold rounded-full backdrop-blur-sm">
                  {selectedImage + 1} / {images.length}
                </span>

                {/* Wishlist quick-action */}
                <button
                  onClick={handleAddToWishlist}
                  aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
                  className="absolute top-4 right-4 p-3 bg-surface/80 backdrop-blur-md rounded-full shadow-sm hover:text-primary active:scale-90 transition-all"
                >
                  <Heart
                    className={`w-5 h-5 ${
                      isWishlisted ? 'fill-error text-error' : 'text-on-surface-variant'
                    }`}
                  />
                </button>
              </div>

              {/* Thumbnail strip — horizontal scroll on mobile, 5-col grid on lg */}
              <div className="flex lg:grid lg:grid-cols-5 gap-3 overflow-x-auto pb-2 lg:pb-0 no-scrollbar">
                {images.map((img: string, index: number) => {
                  const isLast = index === images.length - 1 && images.length >= 5
                  return (
                    <button
                      key={index}
                      onClick={() => setSelectedImage(index)}
                      className={`flex-shrink-0 w-20 h-20 lg:w-auto lg:h-auto aspect-square rounded-lg overflow-hidden bg-surface-container-low ghost-border p-2 hover:bg-surface-container transition-all active:scale-95 relative ${
                        selectedImage === index
                          ? 'ring-2 ring-primary ring-offset-2'
                          : 'ring-0'
                      }`}
                    >
                      {img ? (
                        <Image
                          src={img}
                          alt={`${productDetail.name} view ${index + 1}`}
                          fill
                          className={`object-contain ${isLast ? 'blur-[2px] opacity-40' : ''}`}
                        />
                      ) : (
                        <Package className="w-6 h-6 text-outline m-auto" />
                      )}
                      {isLast && (
                        <div className="absolute inset-0 flex items-center justify-center text-on-surface font-bold text-sm">
                          +{images.length - 4}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── RIGHT: Buy box (fills remainder on small screens) ─────── */}
            <div className="min-w-0 flex-1 flex flex-col space-y-4 sm:space-y-5 md:space-y-6 lg:space-y-8 lg:col-span-4 lg:[position:-webkit-sticky] lg:sticky lg:top-[calc(env(safe-area-inset-top,0px)+5.5rem)] lg:self-start">

              {/* Title row */}
              <section>
                <div className="flex items-center gap-2 mb-4 flex-wrap min-w-0">
                  {productDetail.inventory_level > 0 ? (
                    <span className="px-3 py-1 bg-secondary-container text-on-secondary-container text-[10px] font-bold rounded-full tracking-wider uppercase">
                      In Stock
                    </span>
                  ) : (
                    <span className="px-3 py-1 bg-error-container text-on-error-container text-[10px] font-bold rounded-full tracking-wider uppercase">
                      Out of Stock
                    </span>
                  )}

                  <div className="flex items-center gap-1.5 text-on-surface-variant ml-auto min-w-0">
                    <StarRating value={rating} />
                    <span className="font-bold text-sm">{rating.toFixed(1)}</span>
                    <span className="text-xs opacity-60 truncate">({productDetail.total_reviews} Reviews)</span>
                  </div>
                </div>

                <h1 className="font-syne text-base sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl font-extrabold tracking-tight text-on-surface mb-2 leading-tight break-words">
                  {productDetail.name}
                </h1>
                <p className="text-on-surface-variant font-medium leading-relaxed text-sm md:text-base">
                  {productDetail.description?.split('.')[0]}.
                </p>

                {/* Seller chip + share */}
                <div className="flex items-center gap-3 mt-4 flex-wrap min-w-0">
                  {productDetail.seller && (
                    <Link
                      href={`/seller/${productDetail.seller.id}`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-surface-container rounded-full text-xs font-medium text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <BadgeCheck className="w-3.5 h-3.5 text-tertiary" />
                      {productDetail.seller.username}
                    </Link>
                  )}
                  <span className="text-xs text-on-surface-variant break-words">
                    Brand: <strong className="text-on-surface">{productDetail.brand}</strong>
                  </span>
                  <button
                    onClick={handleShare}
                    aria-label="Share product"
                    className="sm:ml-auto p-2 rounded-full bg-surface-container text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all active:scale-90"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </section>

              {/* Price block */}
              <section className="bg-surface-container-low p-3 sm:p-5 md:p-6 rounded-lg sm:rounded-xl space-y-2 sm:space-y-3">
                <div className="flex items-end gap-2 sm:gap-3 flex-wrap">
                  <span className="font-mono text-xl sm:text-3xl md:text-4xl font-bold text-primary tracking-tighter">
                    {formatCurrency(finalPrice)}
                  </span>
                  {productDetail.discount_percentage > 0 && (
                    <>
                      <span className="font-mono text-lg md:text-xl text-on-surface-variant line-through opacity-50 mb-0.5">
                        {formatCurrency(price)}
                      </span>
                      <span className="sm:ml-auto text-on-secondary-container font-bold text-sm bg-secondary-container px-2 py-1 rounded">
                        Save {productDetail.discount_percentage}%
                      </span>
                    </>
                  )}
                </div>
                {selectedVariant && (
                  <p className="text-xs text-on-surface-variant font-medium">
                    Selected: <span className="text-on-surface font-bold">{selectedVariant.name}</span>
                  </p>
                )}
                <div className="flex items-center gap-2 text-xs text-on-surface-variant font-medium">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  <span>Estimated financing available. See checkout for options.</span>
                </div>
              </section>

              {/* Variant pickers */}
              {productDetail.variants && productDetail.variants.length > 0 && (
                <section className="space-y-5">
                  <div>
                    <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-on-surface-variant">
                      Select Variant
                    </h3>
                    <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-2">
                      {productDetail.variants.map((variant: any) => (
                        <button
                          key={variant.id}
                          onClick={() => setSelectedVariant(variant)}
                          className={`flex flex-col p-4 rounded-lg bg-surface-container-lowest ghost-border text-left transition-all active:scale-[0.98] ${
                            selectedVariant?.id === variant.id
                              ? 'ring-2 ring-primary'
                              : 'hover:bg-surface-container-low'
                          }`}
                        >
                          <span
                            className={`font-bold text-sm ${
                              selectedVariant?.id === variant.id
                                ? 'text-on-surface'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            {variant.name}
                          </span>
                          <span
                            className={`font-mono text-xs mt-0.5 ${
                              selectedVariant?.id === variant.id
                                ? 'text-primary'
                                : 'text-on-surface-variant'
                            }`}
                          >
                            {formatCurrency(parseFloat(variant.price))}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* Quantity stepper */}
              <section>
                <h3 className="text-[10px] font-bold uppercase tracking-widest mb-4 text-on-surface-variant">
                  Quantity
                </h3>
                <div className="flex items-center gap-3 flex-wrap">
                  <div className="flex items-center gap-0 bg-surface-container rounded-xl overflow-hidden ghost-border">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors active:scale-90"
                      aria-label="Decrease quantity"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-12 text-center font-mono font-bold text-on-surface text-sm">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(productDetail.inventory_level, quantity + 1))}
                      disabled={quantity >= productDetail.inventory_level}
                      className="w-11 h-11 flex items-center justify-center text-on-surface-variant hover:text-primary disabled:opacity-30 transition-colors active:scale-90"
                      aria-label="Increase quantity"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-xs text-on-surface-variant">
                    {productDetail.inventory_level} available
                  </span>
                </div>
              </section>

              {/* CTA section */}
              <div className="space-y-4">
                {/* Mode switcher: Buy / Bid / Offer */}
                <div className="grid grid-cols-3 p-1 bg-surface-container rounded-xl overflow-hidden gap-1">
                  <button className="min-w-0 py-3 px-1 sm:px-2 rounded-lg bg-surface-container-lowest shadow-sm font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 transition-all active:scale-95">
                    <Zap className="w-4 h-4" />
                    Buy Now
                  </button>
                  <button className="min-w-0 py-3 px-1 sm:px-2 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 text-on-surface-variant hover:text-on-surface transition-all active:scale-95">
                    <Gavel className="w-4 h-4" />
                    Place Bid
                  </button>
                  <button className="min-w-0 py-3 px-1 sm:px-2 rounded-lg font-bold text-xs sm:text-sm flex items-center justify-center gap-1 sm:gap-2 text-on-surface-variant hover:text-on-surface transition-all active:scale-95">
                    <Tag className="w-4 h-4" />
                    Offer
                  </button>
                </div>

                {/* Primary actions: side-by-side on small screens, stacked on xl */}
                <div className="grid grid-cols-2 gap-2 sm:gap-3 xl:grid-cols-1 xl:gap-3">
                  <button
                    onClick={handleAddToCart}
                    disabled={productDetail.inventory_level === 0}
                    className="w-full py-3 sm:py-4 px-2 sm:px-4 bg-gradient-to-r from-primary to-primary-container text-on-primary font-bold text-xs sm:text-sm rounded-lg shadow-xl hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 sm:gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">Add to Cart</span>
                  </button>
                  <button
                    disabled={productDetail.inventory_level === 0}
                    className="w-full py-3 sm:py-4 px-2 sm:px-4 bg-secondary-fixed text-on-secondary-fixed font-bold text-xs sm:text-sm rounded-lg shadow-lg hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 sm:gap-3 disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                    <span className="truncate">Checkout</span>
                  </button>
                </div>
              </div>

              {/* Seller + delivery card */}
              <div className="bg-surface-container-low rounded-xl p-5 md:p-6 space-y-4">
                {productDetail.seller && (
                  <>
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0 bg-surface-container">
                        <div className="w-full h-full flex items-center justify-center text-on-surface-variant font-bold text-lg">
                          {productDetail.seller.username.charAt(0).toUpperCase()}
                        </div>
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/seller/${productDetail.seller.id}`}
                            className="font-bold hover:text-primary transition-colors"
                          >
                            {productDetail.seller.username}
                          </Link>
                          <BadgeCheck className="w-4 h-4 text-tertiary" />
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          Verified Seller • TradeHut Partner
                        </p>
                      </div>
                    </div>
                    <div className="h-px bg-outline-variant/30" />
                  </>
                )}

                {/* Trust rows */}
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <Truck className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">Free Express Delivery</span>
                      <p className="text-xs text-on-surface-variant">On orders over $50 · Standard 3–5 days</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <ShieldCheck className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">TradeHut Buyer Protection</span>
                      <p className="text-xs text-on-surface-variant">Money-back guarantee &amp; 1 yr warranty</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <RotateCcw className="w-5 h-5 text-on-surface-variant flex-shrink-0" />
                    <div className="flex-1">
                      <span className="font-medium">Easy 30-Day Returns</span>
                      <p className="text-xs text-on-surface-variant">Item must be unused and in original packaging</p>
                    </div>
                  </div>
                </div>
              </div>

            </div>
            {/* end buy box */}

          </div>
          {/* end two-col grid */}

          {/* ── Tab section ─────────────────────────────────────────────── */}
          <section className="mt-16 md:mt-24">
            {/* Tab bar */}
            <div className="flex gap-6 md:gap-12 border-b border-outline-variant/30 mb-8 md:mb-12 overflow-x-auto no-scrollbar whitespace-nowrap">
              {TAB_KEYS.map((key) => (
                <button
                  key={key}
                  onClick={() => setActiveTab(key)}
                  className={`pb-5 border-b-2 font-bold text-sm md:text-base transition-all whitespace-nowrap ${
                    activeTab === key
                      ? 'border-primary text-on-surface'
                      : 'border-transparent text-on-surface-variant hover:text-on-surface'
                  }`}
                >
                  {key === 'reviews'
                    ? `Reviews (${productDetail.total_reviews})`
                    : TAB_LABELS[key]}
                </button>
              ))}
            </div>

            {/* Tab panels */}
            {activeTab === 'description' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-16">
                <div className="space-y-6">
                  <h2 className="font-syne text-2xl md:text-3xl font-bold text-on-surface">
                    About {productDetail.name}
                  </h2>
                  <p className="text-on-surface-variant leading-relaxed text-sm md:text-base">
                    {productDetail.description}
                  </p>
                  {productDetail.key_features && productDetail.key_features.length > 0 && (
                    <div className="bg-surface-container-low p-6 md:p-8 rounded-2xl space-y-3">
                      <h4 className="font-bold flex items-center gap-2">
                        <Eye className="w-4 h-4 text-primary" />
                        Key Features
                      </h4>
                      <ul className="space-y-2">
                        {productDetail.key_features.map((feature: string, idx: number) => (
                          <li key={idx} className="flex items-start gap-2 text-sm text-on-surface-variant">
                            <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                            {feature}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div className="bg-surface-container-low p-6 md:p-8 rounded-2xl space-y-3">
                    <h4 className="font-bold flex items-center gap-2">
                      <Camera className="w-4 h-4 text-primary" />
                      Premium Quality
                    </h4>
                    <p className="text-sm text-on-surface-variant leading-relaxed">
                      Every product on TradeHut is vetted for quality. Sellers are verified partners who uphold our standards for craftsmanship, authenticity, and customer satisfaction.
                    </p>
                  </div>
                </div>
                <div className="relative h-64 md:h-full min-h-[300px] md:min-h-[400px] rounded-3xl overflow-hidden shadow-card bg-surface-container-low">
                  <div className="absolute inset-0 bg-gradient-to-t from-inverse-surface/80 to-transparent flex items-end p-8 md:p-12">
                    <div className="text-inverse-on-surface space-y-2">
                      <p className="font-mono text-[10px] md:text-sm uppercase tracking-widest text-primary-fixed-dim">
                        {productDetail.category}
                      </p>
                      <h3 className="font-syne text-xl md:text-3xl font-bold">
                        {productDetail.name}
                      </h3>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="max-w-2xl">
                <h2 className="font-syne text-2xl md:text-3xl font-bold text-on-surface mb-8">
                  Specifications
                </h2>
                <div className="rounded-2xl overflow-hidden ghost-border divide-y divide-outline-variant/20">
                  {[
                    ['Brand', productDetail.brand],
                    ['Category', productDetail.category],
                    ['Condition', 'New'],
                    ['Stock', `${productDetail.inventory_level} units`],
                    ['Average Rating', `${rating.toFixed(1)} / 5`],
                    ['Total Reviews', productDetail.total_reviews.toString()],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center px-6 py-4 odd:bg-surface-container-lowest even:bg-surface-container-low">
                      <span className="w-40 text-xs font-bold uppercase tracking-widest text-on-surface-variant flex-shrink-0">
                        {label}
                      </span>
                      <span className="text-sm font-medium text-on-surface">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-8 max-w-3xl">
                {/* Summary */}
                <div className="bg-surface-container-low rounded-2xl p-6 flex items-center gap-8 flex-wrap">
                  <div className="text-center">
                    <div className="font-mono text-5xl font-bold text-on-surface">{rating.toFixed(1)}</div>
                    <StarRating value={rating} />
                    <p className="text-xs text-on-surface-variant mt-1">
                      {productDetail.total_reviews} reviews
                    </p>
                  </div>
                  <div className="flex-1 space-y-2 min-w-[160px]">
                    {[5, 4, 3, 2, 1].map((star) => (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs text-on-surface-variant w-4">{star}</span>
                        <Star className="w-3 h-3 text-primary-container fill-primary-container flex-shrink-0" />
                        <div className="flex-1 h-1.5 bg-outline-variant/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary-container rounded-full"
                            style={{ width: star === Math.round(rating) ? '60%' : `${(star / 5) * 40}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Review list */}
                <div className="space-y-6">
                  {productDetail.reviews?.map((review: any) => (
                    <div
                      key={review.id}
                      className="bg-surface-container-lowest rounded-2xl p-6 shadow-card ghost-border"
                    >
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center font-bold text-on-surface-variant flex-shrink-0">
                          {review.user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <h4 className="font-bold text-on-surface">{review.user.username}</h4>
                            <span className="text-xs text-on-surface-variant">
                              {new Date(review.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </div>
                          <StarRating value={review.rating} />
                          <p className="mt-2 text-sm text-on-surface-variant leading-relaxed">
                            {review.comment}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="px-8 py-3 primary-gradient text-on-primary font-bold rounded-lg shadow-lg active:scale-95 transition-all">
                  Write a Review
                </button>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="max-w-2xl space-y-8">
                <div>
                  <h3 className="font-syne text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-primary" />
                    Shipping Information
                  </h3>
                  <div className="space-y-3">
                    {[
                      'Free shipping on orders over $50',
                      'Standard delivery: 3–5 business days',
                      'Express delivery: 1–2 business days',
                      'International shipping available to 60+ countries',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 bg-surface-container-low rounded-xl px-5 py-4">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-on-surface-variant">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h3 className="font-syne text-xl font-bold text-on-surface mb-6 flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-primary" />
                    Return Policy
                  </h3>
                  <div className="space-y-3">
                    {[
                      '30-day return policy from delivery date',
                      'Item must be unused and in original packaging',
                      'Free returns on defective or wrong items',
                      'Refund processed within 5–7 business days',
                    ].map((item) => (
                      <div key={item} className="flex items-start gap-3 bg-surface-container-low rounded-xl px-5 py-4">
                        <Check className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-sm text-on-surface-variant">{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Related products ────────────────────────────────────────── */}
          {relatedProducts.length > 0 && (
            <section className="mt-20 md:mt-28">
              <div className="flex items-end justify-between gap-4 mb-8 md:mb-10 flex-wrap">
                <div className="space-y-1">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-on-surface-variant">
                    You may also like
                  </p>
                  <h2 className="font-syne text-2xl md:text-3xl font-bold tracking-tight text-on-surface">
                    Related Products
                  </h2>
                </div>
                <Link
                  href={`/products?category=${productDetail.category}`}
                  className="text-sm font-bold text-primary hover:text-primary-container transition-colors flex items-center gap-1"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Mobile: horizontal scroll rail; md+: grid */}
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 md:grid md:grid-cols-2 lg:grid-cols-4 md:overflow-visible md:pb-0 snap-x snap-mandatory md:snap-none">
                {relatedProducts.slice(0, 4).map((product: any) => (
                  <div
                    key={product.id}
                    className="flex-shrink-0 w-[calc(85vw-2rem)] sm:w-[calc(50vw-2rem)] md:w-auto snap-start"
                  >
                    <ProductCard product={product} />
                  </div>
                ))}
              </div>
            </section>
          )}

        </div>
        {/* end container */}
      </div>
    </MainLayout>
  )
}
