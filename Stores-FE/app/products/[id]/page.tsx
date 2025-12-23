'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { fetchAProduct, fetchRelatedProducts } from '@/store/productSlice'
import { addToCart } from '@/store/cartSlice'
import { addToWishlist } from '@/store/wishListSlice'
import MainLayout from '@/components/Layouts/MainLayout'
import ProductCard from '@/components/Products/ProductCard'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { Button, Rate, Tabs, Badge, InputNumber, message, Breadcrumb, Carousel, Avatar, Tooltip } from 'antd'
import Image from 'next/image'
import Link from 'next/link'
import { 
    ShoppingCart, 
    Heart, 
    ArrowLeft,
    Truck,
    Shield,
    RefreshCw,
    Star,
    Check,
    Home,
    ChevronRight,
    Minus,
    Plus,
    Share2,
    Package
} from 'lucide-react'
import { useCurrency } from '@/contexts/CurrencyContext'
import { motion } from 'framer-motion'
import { dummyProducts, getRandomProducts } from '@/lib/dummyProducts'

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
    const [activeTab, setActiveTab] = useState('1')
    const [isWishlisted, setIsWishlisted] = useState(false)
    
    // Get dummy product by ID
    const getDummyProductById = (productId: string) => {
        const product = dummyProducts.find(p => p.id.toString() === productId || p.id === parseInt(productId))
        if (!product) return null
        
        // Transform dummy product to match expected structure
        const finalPrice = product.original_price ? product.price : product.price
        const discountPercentage = product.discount || 0
        
        // Create multiple images for the product (using the same image multiple times for demo)
        const productImages = [product.image, product.image, product.image, product.image]
        
        // Generate variants based on product category
        const generateVariants = () => {
            const variants: any[] = []
            
            // Electronics (phones, laptops, tablets) - Storage variants
            if (product.category === 'Electronics' && (product.name.toLowerCase().includes('phone') || 
                product.name.toLowerCase().includes('laptop') || product.name.toLowerCase().includes('ipad'))) {
                const storageOptions = ['128GB', '256GB', '512GB', '1TB']
                storageOptions.forEach((storage, index) => {
                    const variantPrice = product.price + (index * 200) // Increase price for higher storage
                    variants.push({
                        id: `variant-${product.id}-${index + 1}`,
                        name: `${storage} Storage`,
                        sku: `${product.brand?.toUpperCase() || 'PROD'}-${product.id}-${storage}`,
                        price: variantPrice.toString(),
                        quantity: Math.floor(product.stock / storageOptions.length),
                        min_buy_amount: 1,
                        attribute_values: [
                            { attribute: 'Storage', value: storage }
                        ],
                        images: [product.image, product.image], // Variant-specific images
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                })
            }
            // Fashion items - Size variants
            else if (product.category === 'Fashion') {
                const sizes = ['S', 'M', 'L', 'XL', 'XXL']
                sizes.forEach((size, index) => {
                    variants.push({
                        id: `variant-${product.id}-${index + 1}`,
                        name: `Size ${size}`,
                        sku: `${product.brand?.toUpperCase() || 'PROD'}-${product.id}-${size}`,
                        price: product.price.toString(),
                        quantity: Math.floor(product.stock / sizes.length),
                        min_buy_amount: 1,
                        attribute_values: [
                            { attribute: 'Size', value: size }
                        ],
                        images: [product.image],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                })
            }
            // Electronics with color variants
            else if (product.category === 'Electronics' && (product.name.toLowerCase().includes('headphone') || 
                product.name.toLowerCase().includes('camera'))) {
                const colors = ['Black', 'White', 'Silver', 'Blue']
                colors.forEach((color, index) => {
                    const variantPrice = product.price + (index * 50) // Slight price variation
                    variants.push({
                        id: `variant-${product.id}-${index + 1}`,
                        name: `${color}`,
                        sku: `${product.brand?.toUpperCase() || 'PROD'}-${product.id}-${color}`,
                        price: variantPrice.toString(),
                        quantity: Math.floor(product.stock / colors.length),
                        min_buy_amount: 1,
                        attribute_values: [
                            { attribute: 'Color', value: color }
                        ],
                        images: [product.image, product.image],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                })
            }
            // Home Appliances - Capacity variants
            else if (product.category === 'Home Appliances') {
                const capacities = ['Small', 'Medium', 'Large', 'Extra Large']
                capacities.forEach((capacity, index) => {
                    const variantPrice = product.price + (index * 300)
                    variants.push({
                        id: `variant-${product.id}-${index + 1}`,
                        name: `${capacity} Capacity`,
                        sku: `${product.brand?.toUpperCase() || 'PROD'}-${product.id}-${capacity}`,
                        price: variantPrice.toString(),
                        quantity: Math.floor(product.stock / capacities.length),
                        min_buy_amount: 1,
                        attribute_values: [
                            { attribute: 'Capacity', value: capacity }
                        ],
                        images: [product.image],
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                })
            }
            
            return variants
        }
        
        const variants = generateVariants()
        
        return {
            id: product.id.toString(),
            name: product.name,
            price: product.price.toString(),
            original_price: product.original_price,
            final_price: finalPrice,
            discount_percentage: discountPercentage,
            main_product_image: product.image,
            image: product.image,
            images: productImages,
            category: product.category,
            brand: product.brand || 'Unknown',
            average_rating: product.rating.toString(),
            rating: product.rating,
            total_reviews: product.reviews,
            inventory_level: product.stock,
            description: `Experience the ${product.name}. This premium product from ${product.brand || 'our store'} offers exceptional quality and performance. Perfect for your needs with ${product.stock} units in stock.${variants.length > 0 ? ' Available in multiple variants to suit your preferences.' : ''}`,
            key_features: [
                `High-quality ${product.category} product`,
                `Rated ${product.rating} stars by ${product.reviews} customers`,
                `${product.stock} units available`,
                discountPercentage > 0 ? `${discountPercentage}% discount available` : 'Best price guaranteed',
                variants.length > 0 ? `${variants.length} variants available` : 'Standard configuration'
            ],
            variants: variants,
            reviews: Array.from({ length: Math.min(product.reviews, 5) }, (_, i) => ({
                id: i + 1,
                user: {
                    username: `User${i + 1}`,
                    id: `user-${i + 1}`
                },
                rating: Math.floor(Math.random() * 2) + 4, // 4-5 stars
                comment: `Great product! Very satisfied with my purchase. ${i === 0 ? 'Highly recommend!' : 'Good quality and fast delivery.'}`,
                created_at: new Date(Date.now() - i * 86400000).toISOString()
            })),
            seller: {
                id: 'seller-1',
                username: product.brand || 'Official Store'
            }
        }
    }
    
    // Get related products (same category, excluding current product)
    const getRelatedProducts = (currentProduct: any) => {
        if (!currentProduct) return []
        return dummyProducts
            .filter(p => p.category === currentProduct.category && p.id.toString() !== currentProduct.id)
            .slice(0, 4)
            .map(p => ({
                id: p.id.toString(),
                name: p.name,
                price: p.price.toString(),
                original_price: p.original_price,
                final_price: p.original_price ? p.price : p.price,
                discount_percentage: p.discount || 0,
                main_product_image: p.image,
                average_rating: p.rating.toString(),
                total_reviews: p.reviews,
                category: p.category,
                brand: p.brand
            }))
    }
    
    const productDetail = id ? getDummyProductById(id) : null
    const relatedProducts = productDetail ? getRelatedProducts(productDetail) : []
    
    useEffect(() => {
        if (wishlist.items && productDetail) {
            setIsWishlisted(wishlist.items.some((item: any) => item.product?.id === productDetail.id || item.product_id === productDetail.id))
        }
    }, [wishlist, productDetail])
    
    const handleAddToCart = () => {
        if (!productDetail) return
        
        if (productDetail.variants?.length > 0 && !selectedVariant) {
            message.error('Please select a variant')
            return
        }
        
        dispatch(addToCart({
            cart_id: cart.id || undefined,
            product_id: productDetail.id,
            quantity: quantity,
            product_variant_id: selectedVariant?.id,
            product: productDetail,
            variant: selectedVariant
        }))
        .unwrap()
        .then(() => {
            message.success('Added to cart successfully!')
        })
        .catch(() => {
            message.error('Failed to add to cart')
        })
    }
    
    const handleAddToWishlist = () => {
        if (!productDetail) return
        
        dispatch(addToWishlist({
            wishlist_id: wishlist.id,
            product_id: productDetail.id
        }))
        .unwrap()
        .then(() => {
            message.success('Added to wishlist!')
            setIsWishlisted(true)
        })
        .catch(() => {
            message.error('Failed to add to wishlist')
        })
    }
    
    if (!productDetail) {
        return (
            <MainLayout>
                <div className="container mx-auto px-4 py-16">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Product Not Found</h2>
                        <p className="text-gray-600 dark:text-gray-400 mb-6">The product you're looking for doesn't exist.</p>
                        <Link href="/products">
                            <Button type="primary">Browse Products</Button>
                        </Link>
                    </div>
                </div>
            </MainLayout>
        )
    }
    
    // Update images when variant is selected
    useEffect(() => {
        if (selectedVariant?.images && selectedVariant.images.length > 0) {
            setSelectedImage(0) // Reset to first image when variant changes
        }
    }, [selectedVariant])
    
    const images = selectedVariant?.images && selectedVariant.images.length > 0
        ? selectedVariant.images
        : productDetail.images || 
          (productDetail.variants?.length > 0 
              ? productDetail.variants[0].images || [productDetail.main_product_image]
              : [productDetail.main_product_image])
    
    // Use variant price if selected, otherwise use product price
    const price = selectedVariant 
        ? (typeof selectedVariant.price === 'string' ? parseFloat(selectedVariant.price) : selectedVariant.price)
        : (typeof productDetail.price === 'string' 
            ? parseFloat(productDetail.price) 
            : productDetail.price)
    
    // Calculate final price with discount
    const finalPrice = selectedVariant
        ? (productDetail.discount_percentage > 0 
            ? price * (1 - productDetail.discount_percentage / 100)
            : price)
        : (productDetail.final_price || price)
    
    const rating = typeof productDetail.average_rating === 'string'
        ? parseFloat(productDetail.average_rating)
        : productDetail.average_rating || 0

    const tabItems = [
        {
            key: '1',
            label: 'Description',
            children: (
                <div className="prose max-w-none dark:prose-invert">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                        {productDetail.description}
                    </p>
                    
                    {productDetail.key_features && productDetail.key_features.length > 0 && (
                        <>
                            <h3 className="text-xl font-semibold mt-6 mb-4">Key Features</h3>
                            <ul className="space-y-2">
                                {productDetail.key_features.map((feature: string, index: number) => (
                                    <li key={index} className="flex items-start gap-2">
                                        <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                                        <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}
                </div>
            )
        },
        {
            key: '2',
            label: `Reviews (${productDetail.total_reviews})`,
            children: (
                <div className="space-y-6">
                    {/* Review Summary */}
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                        <div className="flex items-center gap-6">
                            <div className="text-center">
                                <div className="text-4xl font-bold text-gray-900 dark:text-white">
                                    {rating.toFixed(1)}
                                </div>
                                <Rate disabled value={rating} className="text-lg" />
                                <p className="text-sm text-gray-500 mt-1">
                                    {productDetail.total_reviews} reviews
                                </p>
                            </div>
                        </div>
                    </div>
                    
                    {/* Review List */}
                    <div className="space-y-4">
                        {productDetail.reviews?.map((review: any) => (
                            <div key={review.id} className="border-b dark:border-gray-700 pb-4">
                                <div className="flex items-start gap-4">
                                    <Avatar size={40}>
                                        {review.user.username[0]}
                                    </Avatar>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <h4 className="font-semibold text-gray-900 dark:text-white">
                                                {review.user.username}
                                            </h4>
                                            <span className="text-sm text-gray-500">
                                                {new Date(review.created_at).toLocaleDateString('en-US', {
                                                    year: 'numeric',
                                                    month: 'short',
                                                    day: 'numeric'
                                                })}
                                            </span>
                                        </div>
                                        <Rate disabled value={review.rating} className="text-sm" />
                                        <p className="mt-2 text-gray-700 dark:text-gray-300">
                                            {review.comment}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    
                    <Button type="primary" size="large" className="bg-primary-500 hover:bg-primary-600">
                        Write a Review
                    </Button>
                </div>
            )
        },
        {
            key: '3',
            label: 'Shipping & Returns',
            children: (
                <div className="space-y-6">
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <Truck className="h-5 w-5 text-primary-500" />
                            Shipping Information
                        </h3>
                        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                            <li>• Free shipping on orders over $50</li>
                            <li>• Standard delivery: 3-5 business days</li>
                            <li>• Express delivery: 1-2 business days</li>
                            <li>• International shipping available</li>
                        </ul>
                    </div>
                    
                    <div>
                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                            <RefreshCw className="h-5 w-5 text-primary-500" />
                            Return Policy
                        </h3>
                        <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                            <li>• 30-day return policy</li>
                            <li>• Item must be unused and in original packaging</li>
                            <li>• Free returns on defective items</li>
                            <li>• Refund processed within 5-7 business days</li>
                        </ul>
                    </div>
                </div>
            )
        }
    ]
    
    return (
        <MainLayout>
            <div className="container mx-auto px-4 py-8">
                {/* Breadcrumb */}
                <Breadcrumb className="mb-6">
                    <Breadcrumb.Item>
                        <Link href="/" className="flex items-center gap-1">
                            <Home className="h-4 w-4" />
                            Home
                        </Link>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>
                        <Link href="/products">Products</Link>
                    </Breadcrumb.Item>
                    <Breadcrumb.Item>{productDetail.category}</Breadcrumb.Item>
                    <Breadcrumb.Item>{productDetail.name}</Breadcrumb.Item>
                </Breadcrumb>
                
                {/* Main Product Section */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
                    {/* Product Images */}
                    <div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg p-4">
                            <div className="relative h-96 md:h-[500px] mb-4">
                                {images[selectedImage] ? (
                                    <Image
                                        src={images[selectedImage]}
                                        alt={productDetail.name}
                                        fill
                                        className="object-contain"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700">
                                        <Package className="h-20 w-20 text-gray-400" />
                                    </div>
                                )}
                                
                                {productDetail.discount_percentage > 0 && (
                                    <Badge 
                                        count={`-${productDetail.discount_percentage}%`}
                                        className="absolute top-4 left-4"
                                        style={{ backgroundColor: '#ef4444' }}
                                    />
                                )}
                            </div>
                            
                            {/* Thumbnail Images */}
                            <div className="flex gap-2 overflow-x-auto">
                                {images.map((img: string, index: number) => (
                                    <button
                                        key={index}
                                        onClick={() => setSelectedImage(index)}
                                        className={`relative w-20 h-20 border-2 rounded-lg overflow-hidden flex-shrink-0 ${
                                            selectedImage === index 
                                                ? 'border-primary-500' 
                                                : 'border-gray-200 dark:border-gray-700'
                                        }`}
                                    >
                                        {img ? (
                                            <Image
                                                src={img}
                                                alt={`${productDetail.name} ${index + 1}`}
                                                fill
                                                className="object-cover"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-center h-full bg-gray-100 dark:bg-gray-700">
                                                <Package className="h-6 w-6 text-gray-400" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    
                    {/* Product Information */}
                    <div className="space-y-6">
                        {/* Title and Rating */}
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                                {productDetail.name}
                            </h1>
                            <div className="flex items-center gap-4 mb-4">
                                <Rate disabled value={rating} />
                                <span className="text-gray-600 dark:text-gray-400">
                                    ({productDetail.total_reviews} reviews)
                                </span>
                                {productDetail.inventory_level > 0 ? (
                                    <Badge status="success" text="In Stock" />
                                ) : (
                                    <Badge status="error" text="Out of Stock" />
                                )}
                            </div>
                            
                            {/* Brand and Category */}
                            <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <span>Brand: <strong>{productDetail.brand}</strong></span>
                                <span>Category: <strong>{productDetail.category}</strong></span>
                            </div>
                        </div>
                        
                        {/* Price */}
                        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <div className="flex items-baseline gap-3 flex-wrap">
                                {productDetail.discount_percentage > 0 ? (
                                    <>
                                        <span className="text-3xl font-bold text-primary-500">
                                            {formatCurrency(finalPrice)}
                                        </span>
                                        <span className="text-xl text-gray-500 line-through">
                                            {formatCurrency(price)}
                                        </span>
                                        <span className="text-sm text-red-500 font-semibold">
                                            Save {productDetail.discount_percentage}%
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-3xl font-bold text-gray-900 dark:text-white">
                                        {formatCurrency(price)}
                                    </span>
                                )}
                            </div>
                            {selectedVariant && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    Selected: {selectedVariant.name}
                                </p>
                            )}
                        </div>
                        
                        {/* Variants */}
                        {productDetail.variants && productDetail.variants.length > 0 && (
                            <div>
                                <h3 className="text-lg font-semibold mb-3">Select Variant</h3>
                                <div className="grid grid-cols-2 gap-2">
                                    {productDetail.variants.map((variant: any) => (
                                        <button
                                            key={variant.id}
                                            onClick={() => setSelectedVariant(variant)}
                                            className={`p-3 border rounded-lg text-left transition-colors ${
                                                selectedVariant?.id === variant.id
                                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                                    : 'border-gray-200 dark:border-gray-700 hover:border-primary-300'
                                            }`}
                                        >
                                            <div className="font-medium">{variant.name}</div>
                                            <div className="text-sm text-gray-600 dark:text-gray-400">
                                                {formatCurrency(parseFloat(variant.price))}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* Quantity and Actions */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-4">
                                <span className="text-gray-700 dark:text-gray-300">Quantity:</span>
                                <div className="flex items-center gap-2">
                                    <Button
                                        icon={<Minus className="h-4 w-4" />}
                                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                                        disabled={quantity <= 1}
                                    />
                                    <InputNumber
                                        min={1}
                                        max={productDetail.inventory_level}
                                        value={quantity}
                                        onChange={(value) => setQuantity(value || 1)}
                                        className="w-20"
                                    />
                                    <Button
                                        icon={<Plus className="h-4 w-4" />}
                                        onClick={() => setQuantity(quantity + 1)}
                                        disabled={quantity >= productDetail.inventory_level}
                                    />
                                </div>
                            </div>
                            
                            <div className="flex gap-3">
                                <Button
                                    type="primary"
                                    size="large"
                                    icon={<ShoppingCart className="h-5 w-5" />}
                                    onClick={handleAddToCart}
                                    disabled={productDetail.inventory_level === 0}
                                    className="flex-1 h-12 bg-primary-500 hover:bg-primary-600"
                                >
                                    Add to Cart
                                </Button>
                                
                                <Tooltip title={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}>
                                    <Button
                                        size="large"
                                        icon={<Heart className={`h-5 w-5 ${isWishlisted ? 'fill-red-500' : ''}`} />}
                                        onClick={handleAddToWishlist}
                                        className={`h-12 ${isWishlisted ? 'text-red-500 border-red-500' : ''}`}
                                    />
                                </Tooltip>
                                
                                <Tooltip title="Share">
                                    <Button
                                        size="large"
                                        icon={<Share2 className="h-5 w-5" />}
                                        className="h-12"
                                    />
                                </Tooltip>
                            </div>
                        </div>
                        
                        {/* Product Highlights */}
                        <div className="border-t dark:border-gray-700 pt-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                        <Truck className="h-5 w-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Free Shipping</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">On orders over $50</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                        <Shield className="h-5 w-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Secure Payment</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">100% protected</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                        <RefreshCw className="h-5 w-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Easy Returns</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">30-day policy</p>
                                    </div>
                                </div>
                                
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                        <Star className="h-5 w-5 text-primary-500" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-gray-900 dark:text-white">Top Quality</p>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Premium products</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        {/* Seller Information */}
                        {productDetail.seller && (
                            <div className="border-t dark:border-gray-700 pt-6">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">Sold by</p>
                                        <Link href={`/seller/${productDetail.seller.id}`}>
                                            <p className="font-semibold text-primary-500 hover:text-primary-600">
                                                {productDetail.seller.username}
                                            </p>
                                        </Link>
                                    </div>
                                    <Button type="link" className="text-primary-500">
                                        View Seller Profile
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
                
                {/* Tabs Section */}
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 mb-12">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        items={tabItems}
                        size="large"
                    />
                </div>
                
                {/* Related Products */}
                {relatedProducts && relatedProducts.length > 0 && (
                    <section>
                        <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-white">
                            Related Products
                        </h2>
                        <div className="flex md:grid md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-x-auto md:overflow-visible pb-2 md:pb-0" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                            <style jsx>{`
                                div::-webkit-scrollbar {
                                    display: none;
                                }
                            `}</style>
                            {relatedProducts.slice(0, 4).map((product: any) => (
                                <div key={product.id} className="flex-shrink-0 w-[calc(100%-1rem)] sm:w-[calc(50%-0.5rem)] md:w-auto">
                                    <ProductCard product={product} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </MainLayout>
    )
}