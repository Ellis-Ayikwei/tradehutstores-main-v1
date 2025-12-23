'use client'

import { useSelector, useDispatch } from 'react-redux'
import { RootState, AppDispatch } from '@/store'
import MainLayout from '@/components/Layouts/MainLayout'
import { Button, InputNumber, Empty, Card, Divider } from 'antd'
import { Trash2, Plus, Minus, ShoppingBag, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useCurrency } from '@/contexts/CurrencyContext'
import { removeFromCart, updateCart } from '@/store/cartSlice'

export default function CartPage() {
    const dispatch = useDispatch<AppDispatch>()
    const { cart, isUpdating } = useSelector((state: RootState) => state.cart)
    const { formatCurrency } = useCurrency()

    const handleQuantityChange = (itemId: string, quantity: number) => {
        if (quantity > 0) {
            dispatch(updateCart({ cartItemId: itemId, quantity }))
        }
    }

    const handleRemoveItem = (itemId: string) => {
        dispatch(removeFromCart({ cartItemId: itemId }))
    }

    const calculateSubtotal = () => {
        return cart.items.reduce((total: number, item: any) => {
            return total + (item.product.final_price * item.quantity)
        }, 0)
    }

    const subtotal = calculateSubtotal()
    const shipping = subtotal > 50 ? 0 : 10
    const tax = subtotal * 0.1
    const total = subtotal + shipping + tax

    if (cart.items.length === 0) {
        return (
            <MainLayout>
                <div className="container mx-auto px-4 py-16">
                    <Empty
                        image={<ShoppingBag className="h-24 w-24 mx-auto text-gray-300" />}
                        description={
                            <div>
                                <p className="text-gray-600 dark:text-gray-400 mb-4">Your cart is empty</p>
                                <Link href="/products">
                                    <Button type="primary" className="bg-primary-500 hover:bg-primary-600">
                                        Continue Shopping
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
                <h1 className="text-3xl font-bold mb-8 text-gray-900 dark:text-white">Shopping Cart</h1>
                
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Cart Items */}
                    <div className="lg:col-span-2">
                        <Card className="shadow-lg">
                            {cart.items.map((item: any) => (
                                <div key={item.id} className="border-b last:border-0 p-6">
                                    <div className="flex gap-4">
                                        {/* Product Image */}
                                        <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                                            {item.product.main_product_image && (
                                                <Image
                                                    src={item.product.main_product_image}
                                                    alt={item.product.name}
                                                    fill
                                                    className="object-cover"
                                                />
                                            )}
                                        </div>

                                        {/* Product Details */}
                                        <div className="flex-1">
                                            <Link href={`/products/${item.product.id}`}>
                                                <h3 className="font-semibold text-gray-900 dark:text-white hover:text-primary-500">
                                                    {item.product.name}
                                                </h3>
                                            </Link>
                                            <p className="text-sm text-gray-500 mt-1">
                                                {item.product.category} | {item.product.brand}
                                            </p>
                                            
                                            {/* Quantity Controls */}
                                            <div className="flex items-center gap-4 mt-4">
                                                <div className="flex items-center gap-2">
                                                    <Button
                                                        size="small"
                                                        icon={<Minus className="h-3 w-3" />}
                                                        onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                                        disabled={item.quantity <= 1}
                                                    />
                                                    <InputNumber
                                                        min={1}
                                                        max={99}
                                                        value={item.quantity}
                                                        onChange={(value) => handleQuantityChange(item.id, value || 1)}
                                                        className="w-16"
                                                    />
                                                    <Button
                                                        size="small"
                                                        icon={<Plus className="h-3 w-3" />}
                                                        onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                                    />
                                                </div>
                                                
                                                <Button
                                                    type="text"
                                                    danger
                                                    icon={<Trash2 className="h-4 w-4" />}
                                                    onClick={() => handleRemoveItem(item.id)}
                                                >
                                                    Remove
                                                </Button>
                                            </div>
                                        </div>

                                        {/* Price */}
                                        <div className="text-right">
                                            <p className="text-lg font-semibold text-gray-900 dark:text-white">
                                                {formatCurrency(item.product.final_price * item.quantity)}
                                            </p>
                                            <p className="text-sm text-gray-500">
                                                {formatCurrency(item.product.final_price)} each
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </Card>
                    </div>

                    {/* Order Summary */}
                    <div>
                        <Card className="shadow-lg sticky top-20">
                            <h2 className="text-xl font-semibold mb-4">Order Summary</h2>
                            
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span>Subtotal</span>
                                    <span>{formatCurrency(subtotal)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Shipping</span>
                                    <span>{shipping === 0 ? 'Free' : formatCurrency(shipping)}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span>Tax</span>
                                    <span>{formatCurrency(tax)}</span>
                                </div>
                                
                                <Divider />
                                
                                <div className="flex justify-between text-lg font-semibold">
                                    <span>Total</span>
                                    <span className="text-primary-500">{formatCurrency(total)}</span>
                                </div>
                            </div>

                            <Button
                                type="primary"
                                size="large"
                                block
                                className="mt-6 bg-primary-500 hover:bg-primary-600 h-12"
                                icon={<ArrowRight className="h-4 w-4" />}
                            >
                                Proceed to Checkout
                            </Button>

                            <Link href="/products">
                                <Button type="link" block className="mt-2">
                                    Continue Shopping
                                </Button>
                            </Link>
                        </Card>
                    </div>
                </div>
            </div>
        </MainLayout>
    )
}