'use client'

import { useState } from 'react'
import MainLayout from '@/components/Layouts/MainLayout'
import { Card, Tabs, Button, Table, Badge, Statistic, Progress, Empty, Modal, Form, Input, Select, InputNumber, Upload, message } from 'antd'
import { 
    Package, 
    TrendingUp, 
    ShoppingCart, 
    DollarSign,
    Users,
    BarChart3,
    Plus,
    Edit,
    Trash2,
    Eye,
    Settings,
    Store,
    FileText,
    Star,
    AlertCircle,
    UploadCloud
} from 'lucide-react'
import type { ColumnsType } from 'antd/es/table'
import Link from 'next/link'

interface Product {
    id: string
    name: string
    price: number
    stock: number
    category: string
    status: 'active' | 'draft' | 'out_of_stock'
    sales: number
    image: string
}

interface Order {
    id: string
    customer: string
    product: string
    amount: number
    status: 'pending' | 'processing' | 'shipped' | 'delivered'
    date: string
}

export default function SellerDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard')
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false)
    const [form] = Form.useForm()

    // Mock data
    const products: Product[] = [
        { id: '1', name: 'iPhone 13 Pro', price: 999, stock: 15, category: 'Electronics', status: 'active', sales: 45, image: '' },
        { id: '2', name: 'MacBook Pro', price: 2499, stock: 8, category: 'Computers', status: 'active', sales: 23, image: '' },
        { id: '3', name: 'AirPods Pro', price: 249, stock: 0, category: 'Accessories', status: 'out_of_stock', sales: 67, image: '' },
        { id: '4', name: 'iPad Air', price: 599, stock: 25, category: 'Tablets', status: 'active', sales: 34, image: '' },
    ]

    const orders: Order[] = [
        { id: '1001', customer: 'John Doe', product: 'iPhone 13 Pro', amount: 999, status: 'delivered', date: '2024-01-15' },
        { id: '1002', customer: 'Jane Smith', product: 'MacBook Pro', amount: 2499, status: 'shipped', date: '2024-01-16' },
        { id: '1003', customer: 'Bob Wilson', product: 'AirPods Pro', amount: 249, status: 'processing', date: '2024-01-17' },
        { id: '1004', customer: 'Alice Brown', product: 'iPad Air', amount: 599, status: 'pending', date: '2024-01-18' },
    ]

    const stats = {
        totalRevenue: 45678,
        totalOrders: 234,
        totalProducts: products.length,
        averageRating: 4.7,
        monthlyGrowth: 23.5,
        pendingOrders: 12,
        lowStockItems: 3,
        totalCustomers: 186
    }

    const productColumns: ColumnsType<Product> = [
        {
            title: 'Product',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center">
                        <Package className="h-5 w-5 text-gray-500" />
                    </div>
                    <div>
                        <div className="font-medium">{text}</div>
                        <div className="text-sm text-gray-500">{record.category}</div>
                    </div>
                </div>
            )
        },
        {
            title: 'Price',
            dataIndex: 'price',
            key: 'price',
            render: (price) => `$${price.toFixed(2)}`,
            sorter: (a, b) => a.price - b.price
        },
        {
            title: 'Stock',
            dataIndex: 'stock',
            key: 'stock',
            render: (stock) => (
                <div>
                    <span className={stock < 10 ? 'text-orange-500' : ''}>{stock}</span>
                    {stock === 0 && <Badge status="error" text="Out of stock" className="ml-2" />}
                    {stock > 0 && stock < 10 && <Badge status="warning" text="Low stock" className="ml-2" />}
                </div>
            ),
            sorter: (a, b) => a.stock - b.stock
        },
        {
            title: 'Sales',
            dataIndex: 'sales',
            key: 'sales',
            render: (sales) => (
                <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-500" />
                    {sales}
                </div>
            ),
            sorter: (a, b) => a.sales - b.sales
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const colors = {
                    active: 'success',
                    draft: 'warning',
                    out_of_stock: 'error'
                }
                const labels = {
                    active: 'Active',
                    draft: 'Draft',
                    out_of_stock: 'Out of Stock'
                }
                return <Badge status={colors[status] as any} text={labels[status]} />
            }
        },
        {
            title: 'Actions',
            key: 'actions',
            render: (_, record) => (
                <div className="flex gap-2">
                    <Button size="small" icon={<Eye className="h-4 w-4" />} />
                    <Button size="small" icon={<Edit className="h-4 w-4" />} />
                    <Button size="small" danger icon={<Trash2 className="h-4 w-4" />} />
                </div>
            )
        }
    ]

    const orderColumns: ColumnsType<Order> = [
        {
            title: 'Order ID',
            dataIndex: 'id',
            key: 'id',
            render: (id) => <span className="font-mono">#{id}</span>
        },
        {
            title: 'Customer',
            dataIndex: 'customer',
            key: 'customer'
        },
        {
            title: 'Product',
            dataIndex: 'product',
            key: 'product'
        },
        {
            title: 'Amount',
            dataIndex: 'amount',
            key: 'amount',
            render: (amount) => `$${amount.toFixed(2)}`,
            sorter: (a, b) => a.amount - b.amount
        },
        {
            title: 'Status',
            dataIndex: 'status',
            key: 'status',
            render: (status) => {
                const colors = {
                    pending: 'default',
                    processing: 'processing',
                    shipped: 'warning',
                    delivered: 'success'
                }
                return <Badge status={colors[status] as any} text={status.charAt(0).toUpperCase() + status.slice(1)} />
            }
        },
        {
            title: 'Date',
            dataIndex: 'date',
            key: 'date',
            sorter: (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        },
        {
            title: 'Actions',
            key: 'actions',
            render: () => (
                <Button type="link" size="small">View Details</Button>
            )
        }
    ]

    const handleAddProduct = (values: any) => {
        console.log('New product:', values)
        message.success('Product added successfully!')
        setIsAddProductModalOpen(false)
        form.resetFields()
    }

    const tabItems = [
        {
            key: 'dashboard',
            label: (
                <span className="flex items-center gap-2">
                    <BarChart3 className="h-4 w-4" />
                    Dashboard
                </span>
            ),
            children: (
                <div className="space-y-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <Card>
                            <Statistic
                                title="Total Revenue"
                                value={stats.totalRevenue}
                                prefix="$"
                                valueStyle={{ color: '#dc711a' }}
                            />
                            <Progress percent={stats.monthlyGrowth} size="small" strokeColor="#dc711a" />
                            <span className="text-xs text-gray-500">+{stats.monthlyGrowth}% from last month</span>
                        </Card>
                        
                        <Card>
                            <Statistic
                                title="Total Orders"
                                value={stats.totalOrders}
                                prefix={<ShoppingCart className="h-4 w-4" />}
                            />
                            <div className="mt-2 text-sm">
                                <Badge status="warning" text={`${stats.pendingOrders} pending`} />
                            </div>
                        </Card>
                        
                        <Card>
                            <Statistic
                                title="Total Products"
                                value={stats.totalProducts}
                                prefix={<Package className="h-4 w-4" />}
                            />
                            <div className="mt-2 text-sm">
                                <Badge status="error" text={`${stats.lowStockItems} low stock`} />
                            </div>
                        </Card>
                        
                        <Card>
                            <Statistic
                                title="Average Rating"
                                value={stats.averageRating}
                                prefix={<Star className="h-4 w-4 text-yellow-500" />}
                                precision={1}
                            />
                            <div className="mt-2 text-sm text-gray-500">
                                From {stats.totalCustomers} customers
                            </div>
                        </Card>
                    </div>

                    {/* Recent Orders */}
                    <Card 
                        title="Recent Orders" 
                        extra={<Button type="link">View All</Button>}
                    >
                        <Table
                            columns={orderColumns}
                            dataSource={orders.slice(0, 5)}
                            rowKey="id"
                            pagination={false}
                        />
                    </Card>

                    {/* Quick Actions */}
                    <Card title="Quick Actions">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Button 
                                type="dashed" 
                                icon={<Plus className="h-4 w-4" />}
                                onClick={() => setIsAddProductModalOpen(true)}
                                block
                            >
                                Add Product
                            </Button>
                            <Button 
                                type="dashed" 
                                icon={<FileText className="h-4 w-4" />}
                                block
                            >
                                View Reports
                            </Button>
                            <Button 
                                type="dashed" 
                                icon={<Users className="h-4 w-4" />}
                                block
                            >
                                Customers
                            </Button>
                            <Button 
                                type="dashed" 
                                icon={<Settings className="h-4 w-4" />}
                                block
                            >
                                Settings
                            </Button>
                        </div>
                    </Card>
                </div>
            )
        },
        {
            key: 'products',
            label: (
                <span className="flex items-center gap-2">
                    <Package className="h-4 w-4" />
                    Products
                </span>
            ),
            children: (
                <Card 
                    title="Manage Products"
                    extra={
                        <Button 
                            type="primary" 
                            icon={<Plus className="h-4 w-4" />}
                            onClick={() => setIsAddProductModalOpen(true)}
                            className="bg-primary-500 hover:bg-primary-600"
                        >
                            Add Product
                        </Button>
                    }
                >
                    <Table
                        columns={productColumns}
                        dataSource={products}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                    />
                </Card>
            )
        },
        {
            key: 'orders',
            label: (
                <span className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    Orders
                </span>
            ),
            children: (
                <Card title="Manage Orders">
                    <Table
                        columns={orderColumns}
                        dataSource={orders}
                        rowKey="id"
                        pagination={{ pageSize: 10 }}
                    />
                </Card>
            )
        },
        {
            key: 'storefront',
            label: (
                <span className="flex items-center gap-2">
                    <Store className="h-4 w-4" />
                    Storefront
                </span>
            ),
            children: (
                <div className="text-center py-12">
                    <Store className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Customize Your Storefront</h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                        Create a unique shopping experience for your customers
                    </p>
                    <Button type="primary" size="large" className="bg-primary-500 hover:bg-primary-600">
                        Customize Storefront
                    </Button>
                </div>
            )
        },
        {
            key: 'settings',
            label: (
                <span className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                </span>
            ),
            children: (
                <Card title="Seller Settings">
                    <div className="space-y-4 max-w-2xl">
                        <div>
                            <h3 className="font-semibold mb-2">Store Information</h3>
                            <Form layout="vertical">
                                <Form.Item label="Store Name">
                                    <Input defaultValue="Tech Haven Store" />
                                </Form.Item>
                                <Form.Item label="Store Description">
                                    <Input.TextArea rows={4} defaultValue="Premium electronics and gadgets" />
                                </Form.Item>
                                <Form.Item label="Business Email">
                                    <Input defaultValue="seller@techhaven.com" />
                                </Form.Item>
                            </Form>
                        </div>
                        
                        <div>
                            <h3 className="font-semibold mb-2">Payment Settings</h3>
                            <Form layout="vertical">
                                <Form.Item label="Bank Account">
                                    <Input placeholder="Enter bank account details" />
                                </Form.Item>
                                <Form.Item label="Payment Methods">
                                    <Select mode="multiple" defaultValue={['paypal', 'stripe']}>
                                        <Select.Option value="paypal">PayPal</Select.Option>
                                        <Select.Option value="stripe">Stripe</Select.Option>
                                        <Select.Option value="bank">Bank Transfer</Select.Option>
                                    </Select>
                                </Form.Item>
                            </Form>
                        </div>
                        
                        <Button type="primary" className="bg-primary-500 hover:bg-primary-600">
                            Save Settings
                        </Button>
                    </div>
                </Card>
            )
        }
    ]

    return (
        <MainLayout>
            <div className="container mx-auto px-4 py-8">
                <div className="mb-6">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Seller Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-2">
                        Manage your products, orders, and store settings
                    </p>
                </div>

                <Tabs
                    activeKey={activeTab}
                    onChange={setActiveTab}
                    items={tabItems}
                    size="large"
                />

                {/* Add Product Modal */}
                <Modal
                    title="Add New Product"
                    open={isAddProductModalOpen}
                    onCancel={() => {
                        setIsAddProductModalOpen(false)
                        form.resetFields()
                    }}
                    footer={null}
                    width={600}
                >
                    <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleAddProduct}
                    >
                        <Form.Item
                            name="name"
                            label="Product Name"
                            rules={[{ required: true, message: 'Please enter product name' }]}
                        >
                            <Input placeholder="Enter product name" />
                        </Form.Item>

                        <Form.Item
                            name="category"
                            label="Category"
                            rules={[{ required: true, message: 'Please select category' }]}
                        >
                            <Select placeholder="Select category">
                                <Select.Option value="electronics">Electronics</Select.Option>
                                <Select.Option value="clothing">Clothing</Select.Option>
                                <Select.Option value="home">Home & Garden</Select.Option>
                                <Select.Option value="sports">Sports</Select.Option>
                            </Select>
                        </Form.Item>

                        <div className="grid grid-cols-2 gap-4">
                            <Form.Item
                                name="price"
                                label="Price"
                                rules={[{ required: true, message: 'Please enter price' }]}
                            >
                                <InputNumber
                                    prefix="$"
                                    min={0}
                                    precision={2}
                                    style={{ width: '100%' }}
                                    placeholder="0.00"
                                />
                            </Form.Item>

                            <Form.Item
                                name="stock"
                                label="Stock Quantity"
                                rules={[{ required: true, message: 'Please enter stock quantity' }]}
                            >
                                <InputNumber
                                    min={0}
                                    style={{ width: '100%' }}
                                    placeholder="0"
                                />
                            </Form.Item>
                        </div>

                        <Form.Item
                            name="description"
                            label="Description"
                            rules={[{ required: true, message: 'Please enter description' }]}
                        >
                            <Input.TextArea rows={4} placeholder="Enter product description" />
                        </Form.Item>

                        <Form.Item
                            name="images"
                            label="Product Images"
                        >
                            <Upload.Dragger
                                multiple
                                listType="picture"
                                beforeUpload={() => false}
                            >
                                <p className="ant-upload-drag-icon">
                                    <UploadCloud className="h-8 w-8 mx-auto text-gray-400" />
                                </p>
                                <p className="ant-upload-text">Click or drag images to upload</p>
                                <p className="ant-upload-hint">Support for multiple images</p>
                            </Upload.Dragger>
                        </Form.Item>

                        <Form.Item className="mb-0">
                            <div className="flex gap-2 justify-end">
                                <Button onClick={() => {
                                    setIsAddProductModalOpen(false)
                                    form.resetFields()
                                }}>
                                    Cancel
                                </Button>
                                <Button type="primary" htmlType="submit" className="bg-primary-500 hover:bg-primary-600">
                                    Add Product
                                </Button>
                            </div>
                        </Form.Item>
                    </Form>
                </Modal>
            </div>
        </MainLayout>
    )
}