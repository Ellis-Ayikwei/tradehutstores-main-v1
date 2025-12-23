'use client'

import Image from 'next/image'
import Link from 'next/link'
import { Heart, ShoppingCart, Star, Eye, Clock } from 'lucide-react'
import { Card, Rate, Button, Tooltip, Progress, message } from 'antd'
import { useCurrency } from '@/contexts/CurrencyContext'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { addToCart } from '@/store/cartSlice'
import { addToWishlist } from '@/store/wishListSlice'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

interface ProductCardProps {
    product: {
        id: string | number
        name: string
        price: string | number
        original_price?: number
        final_price?: number
        image?: string
        main_product_image?: string
        average_rating?: string | number
        rating?: number
        total_reviews?: number
        reviews?: number
        discount_percentage?: number
        discount?: number
        category?: string
        brand?: string
        stock?: number
        flash_sale_end?: Date | string
    }
    variant?: 'default' | 'compact' | 'flash-sale'
    showTimer?: boolean
    showStock?: boolean
}

export default function ProductCard({ product }: ProductCardProps) {
    const { formatCurrency, convert } = useCurrency()
    const dispatch = useDispatch<AppDispatch>()
    const { cart } = useSelector((state: RootState) => state.cart)

    const handleAddToCart = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        
        dispatch(addToCart({
            cart_id: cart.id || undefined,
            product_id: product.id.toString(),
            quantity: 1,
            product: {
                id: product.id.toString(),
                name: product.name,
                price: price.toString(),
                final_price: finalPrice.toString(),
                main_product_image: product.main_product_image || product.image,
                image: product.image || product.main_product_image,
                brand: product.brand,
                category: product.category,
            }
        }))
        .unwrap()
        .then(() => {
            message.success('Added to cart!')
        })
        .catch(() => {
            message.error('Failed to add to cart')
        })
    }

    const handleAddToWishlist = (e: React.MouseEvent) => {
        e.preventDefault()
        e.stopPropagation()
        // Add to wishlist logic
    }

    // Calculate prices and discounts
    const price = typeof product.price === 'string' ? parseFloat(product.price) : product.price
    const originalPrice = product.original_price || price
    const finalPrice = product.final_price || price
    
    // Calculate discount percentage if not provided
    let discountPercentage = product.discount_percentage || product.discount
    if (!discountPercentage && originalPrice > finalPrice) {
        discountPercentage = Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
    }
    
    const hasDiscount = discountPercentage && discountPercentage > 0 && originalPrice > finalPrice
    const rating = typeof product.average_rating === 'string' ? parseFloat(product.average_rating) : product.average_rating

    return (
        <motion.div
            whileHover={{ y: -4 }}
            transition={{ duration: 0.2 }}
        >
            <Card
                hoverable
                className="h-full overflow-hidden dark:border-gray-700  hover:shadow-xl transition-shadow"
                cover={
                    <div className="relative group">
                        <Link href={`/products/${product.id}`}>
                            <div className="relative h-48 md:h-72 overflow-hidden bg-gray-100 dark:bg-gray-800">
                                {product.main_product_image ? (
                                    <Image
                                        src={product.main_product_image}
                                        alt={product.name}
                                        fill
                                        className="object-cover group-hover:scale-110 transition-transform duration-300"
                                    />
                                ) : (
                                    <div className="flex items-center justify-center h-full bg-gray-200">
                                        <span className="text-gray-400">No image</span>
                                    </div>
                                )}
                                
                                {/* Discount Badge */}
                                {hasDiscount && (
                                    <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-semibold z-10">
                                        -{discountPercentage}%
                                    </div>
                                )}

                                {/* Quick Action Buttons */}
                                <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center space-x-2">
                                    <Tooltip title="Quick View">
                                        <Button
                                            shape="circle"
                                            icon={<Eye className="h-4 w-4" />}
                                            className="bg-white hover:bg-primary-500 hover:text-white"
                                        />
                                    </Tooltip>
                                    <Tooltip title="Add to Wishlist">
                                        <Button
                                            shape="circle"
                                            icon={<Heart className="h-4 w-4" />}
                                            className="bg-white hover:bg-primary-500 hover:text-white"
                                            onClick={handleAddToWishlist}
                                        />
                                    </Tooltip>
                                    <Tooltip title="Add to Cart">
                                        <Button
                                            shape="circle"
                                            icon={<ShoppingCart className="h-4 w-4" />}
                                            className="bg-white hover:bg-primary-500 hover:text-white"
                                            onClick={handleAddToCart}
                                        />
                                    </Tooltip>
                                </div>
                            </div>
                        </Link>
                    </div>
                }
            >
                <div className="space-y-2">
                    {/* Category & Brand */}
                    <div className="flex items-center justify-between gap-2">
                        {product.category && (
                            <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">
                                {product.category}
                            </span>
                        )}
                        {product.brand && (
                            <span className="text-xs font-medium text-primary-500 truncate">
                                {product.brand}
                            </span>
                        )}
                    </div>

                    {/* Product Name */}
                    <Link href={`/products/${product.id}`}>
                        <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 hover:text-primary-500 line-clamp-2 min-h-[2.5rem]">
                            {product.name}
                        </h3>
                    </Link>

                    {/* Rating */}
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                                {rating ? rating.toFixed(1) : '0.0'}
                            </span>
                        </div>
                        {product.total_reviews && product.total_reviews > 0 && (
                            <span className="text-xs text-gray-500">
                                ({product.total_reviews.toLocaleString()})
                            </span>
                        )}
                    </div>

                    {/* Price & Discount */}
                    <div className="pt-3 border-t border-gray-100 dark:border-gray-800">
                        {hasDiscount ? (
                            <div className="space-y-2">
                                <span className="text-lg font-bold text-red-500">
                                    {formatCurrency(finalPrice)}
                                </span>
                                <div className="text-sm text-gray-400 line-through">
                                    {formatCurrency(originalPrice)}
                                </div>
                            </div>
                        ) : (
                            <span className="text-lg font-bold text-gray-900 dark:text-gray-100">
                                {formatCurrency(price)}
                            </span>
                        )}
                    </div>

                    {/* Add to Cart Button */}
                    {/* <Button
                        type="primary"
                        block
                        icon={<ShoppingCart className="h-4 w-4" />}
                        className="bg-primary-500 hover:bg-primary-600"
                        onClick={handleAddToCart}
                    >
                        Add to Cart
                    </Button> */}
                
                </div>
            </Card>
        </motion.div>
    )
}