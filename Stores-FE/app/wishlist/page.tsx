'use client'

import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { AppDispatch, RootState } from '@/store'
import { getWishlist, removeFromWishlist } from '@/store/wishListSlice'
import { addToCart } from '@/store/cartSlice'
import MainLayout from '@/components/Layouts/MainLayout'
import LoadingSpinner from '@/components/common/LoadingSpinner'
import { Button, Card, Empty, message, Breadcrumb, Badge } from 'antd'
import { Heart, ShoppingCart, Trash2, Home, ArrowRight } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useCurrency } from '@/contexts/CurrencyContext'
import { motion } from 'framer-motion'

export default function WishlistPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { wishlist, isUpdating } = useSelector((state: RootState) => state.wishlist)
    const { cart } = useSelector((state: RootState) => state.cart)
    const { formatCurrency } = useCurrency()

    useEffect(() => {
        dispatch(getWishlist())
    }, [dispatch])

    const handleRemoveFromWishlist = (itemId: string) => {
        dispatch(removeFromWishlist({ wishlistItemId: itemId }))
            .unwrap()
            .then(() => {
                message.success('Removed from wishlist')
            })
            .catch(() => {
                message.error('Failed to remove from wishlist')
            })
    }

    const handleMoveToCart = (item: any) => {
        dispatch(addToCart({
            cart_id: cart.id,
            product_id: item.product.id,
            quantity: 1,
            product_variant_id: item.product_variant?.id
        }))
        .unwrap()
        .then(() => {
            message.success('Added to cart!')
            handleRemoveFromWishlist(item.id)
        })
        .catch(() => {
            message.error('Failed to add to cart')
        })
    }

    if (isUpdating) {
        return (
            <MainLayout>
                <div className="container mx-auto px-4 py-16">
                    <LoadingSpinner text="Loading wishlist..." />
                </div>
            </MainLayout>
        )
    }

    if (!wishlist.items || wishlist.items.length === 0) {
        return (
            <MainLayout>
                <div className="container mx-auto px-4 py-16">
                    <Empty
                        image={<Heart className="h-24 w-24 mx-auto text-gray-300" />}
                        description={
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">Your wishlist is empty</p>
                                <Link href="/products">
                                    <Button type="primary" className="bg-primary-500 hover:bg-primary-600">
                                        Browse Products
                                    </Button>
                                </Link>
                            </div>
                        }
                    />
                </div>
            </MainLayout>
        )
    }

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
                    <Breadcrumb.Item>Wishlist</Breadcrumb.Item>
                </Breadcrumb>

                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                        <Heart className="h-8 w-8 text-red-500" />
                        My Wishlist
                        <Badge count={wishlist.item_count} className="ml-2" />
                    </h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Save your favorite items for later
                    </p>
                </div>

                {/* Wishlist Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {wishlist.items.map((item: any, index: number) => (
                        <motion.div
                            key={item.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.1 }}
                        >
                            <Card
                                hoverable
                                className="h-full"
                                cover={
                                    <Link href={`/products/${item.product.id}`}>
                                        <div className="relative h-64 overflow-hidden bg-gray-100">
                                            {item.product.main_product_image ? (
                                                <Image
                                                    src={item.product.main_product_image}
                                                    alt={item.product.name}
                                                    fill
                                                    className="object-cover hover:scale-110 transition-transform duration-300"
                                                />
                                            ) : (
                                                <div className="flex items-center justify-center h-full bg-gray-200">
                                                    <span className="text-gray-400">No image</span>
                                                </div>
                                            )}
                                            
                                            {item.product.discount_percentage > 0 && (
                                                <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-md text-sm font-semibold">
                                                    -{item.product.discount_percentage}%
                                                </div>
                                            )}

                                            {/* Remove from wishlist button */}
                                            <button
                                                onClick={(e) => {
                                                    e.preventDefault()
                                                    e.stopPropagation()
                                                    handleRemoveFromWishlist(item.id)
                                                }}
                                                className="absolute top-2 right-2 p-2 bg-white rounded-full shadow-lg hover:bg-red-50 transition-colors"
                                            >
                                                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
                                            </button>
                                        </div>
                                    </Link>
                                }
                            >
                                <div className="space-y-3">
                                    {/* Product Info */}
                                    <div>
                                        <Link href={`/products/${item.product.id}`}>
                                            <h3 className="font-semibold text-gray-900 dark:text-white hover:text-primary-500 line-clamp-2">
                                                {item.product.name}
                                            </h3>
                                        </Link>
                                        <p className="text-sm text-gray-500 mt-1">
                                            {item.product.category} | {item.product.brand}
                                        </p>
                                    </div>

                                    {/* Price */}
                                    <div className="flex items-center justify-between">
                                        <div>
                                            {item.product.discount_percentage > 0 ? (
                                                <>
                                                    <span className="text-lg font-bold text-primary-500">
                                                        {formatCurrency(item.product.final_price)}
                                                    </span>
                                                    <span className="ml-2 text-sm text-gray-500 line-through">
                                                        {formatCurrency(parseFloat(item.product.price))}
                                                    </span>
                                                </>
                                            ) : (
                                                <span className="text-lg font-bold text-gray-900 dark:text-white">
                                                    {formatCurrency(parseFloat(item.product.price))}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Stock Status */}
                                    {item.product.inventory_level > 0 ? (
                                        <Badge status="success" text="In Stock" />
                                    ) : (
                                        <Badge status="error" text="Out of Stock" />
                                    )}

                                    {/* Actions */}
                                    <div className="flex gap-2">
                                        <Button
                                            type="primary"
                                            block
                                            icon={<ShoppingCart className="h-4 w-4" />}
                                            onClick={() => handleMoveToCart(item)}
                                            disabled={item.product.inventory_level === 0}
                                            className="bg-primary-500 hover:bg-primary-600"
                                        >
                                            Move to Cart
                                        </Button>
                                        <Button
                                            danger
                                            icon={<Trash2 className="h-4 w-4" />}
                                            onClick={() => handleRemoveFromWishlist(item.id)}
                                        />
                                    </div>
                                </div>
                            </Card>
                        </motion.div>
                    ))}
                </div>

                {/* Continue Shopping */}
                <div className="text-center mt-12">
                    <Link href="/products">
                        <Button 
                            size="large" 
                            icon={<ArrowRight className="h-5 w-5" />}
                            className="text-primary-500 border-primary-500 hover:bg-primary-50"
                        >
                            Continue Shopping
                        </Button>
                    </Link>
                </div>
            </div>
        </MainLayout>
    )
}