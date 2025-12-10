'use client';

import { faBox, faChartLine, faCog, faEdit, faList, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AddProductModal from '../components/Seller/AddProductModal';
import EditProductModal from '../components/Seller/EditProductModal';
import OrdersManagement from '../components/Seller/OrdersManagement';
import SellerSettings from '../components/Seller/SellerSettings';

interface Product {
    id: string;
    name: string;
    price: number;
    stock: number;
    category: string;
    status: 'active' | 'draft';
    discount: number;
    image: string;
}

export default function SellerDashboard() {
    const [activeTab, setActiveTab] = useState('dashboard');
    const [products, setProducts] = useState<Product[]>([
        {
            id: '1',
            name: 'iPhone 13 Pro',
            price: 999,
            stock: 50,
            category: 'Phones',
            status: 'active',
            discount: 0,
            image: '',
        },
        // Add more products
    ]);
    const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
    const [isEditProductModalOpen, setIsEditProductModalOpen] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Product | null>(null);

    const stats = {
        totalSales: 15000,
        totalOrders: 150,
        averageRating: 4.8,
        activeListings: products.length,
    };

    // const handleAddProduct = (newProduct: Product) => {
    //     setProducts([...products, { id: Date.now().toString(), ...newProduct }]);
    //     setIsAddProductModalOpen(false);
    // };

    const handleDeleteProduct = (id: string) => {
        setProducts(products.filter((product) => product.id !== id));
    };

    const handleToggleProductStatus = (id: string) => {
        setProducts(products.map((product) => (product.id === id ? { ...product, status: product.status === 'active' ? 'draft' : 'active' } : product)));
    };

    const handleEditProduct = (updatedProduct: Product) => {
        setProducts(products.map((product) => (product.id === updatedProduct.id ? updatedProduct : product)));
        setIsEditProductModalOpen(false);
        setCurrentProduct(null);
    };

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard':
                return (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm">Total Sales</h3>
                                <p className="text-2xl font-bold dark:text-white">${stats.totalSales}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm">Total Orders</h3>
                                <p className="text-2xl font-bold dark:text-white">{stats.totalOrders}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm">Average Rating</h3>
                                <p className="text-2xl font-bold dark:text-white">{stats.averageRating}</p>
                            </div>
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow">
                                <h3 className="text-gray-500 dark:text-gray-400 text-sm">Active Listings</h3>
                                <p className="text-2xl font-bold dark:text-white">{stats.activeListings}</p>
                            </div>
                        </div>
                    </div>
                );
            case 'products':
                return (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center">
                            <h2 className="text-2xl font-bold dark:text-white">Products</h2>
                            <button onClick={() => setIsAddProductModalOpen(true)} className="bg-[#dc711a] text-white px-4 py-2 rounded-lg hover:bg-[#dc711a]/90 transition-colors">
                                <FontAwesomeIcon icon={faPlus} className="mr-2" />
                                Add Product
                            </button>
                        </div>
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-700">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Product</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Price</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stock</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                    {products.map((product) => (
                                        <tr key={product.id}>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</div>
                                                <div className="text-sm text-gray-500 dark:text-gray-400">{product.category}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">${product.price}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-900 dark:text-white">{product.stock}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                                        product.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                                    }`}
                                                >
                                                    {product.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex space-x-2">
                                                    <Link to={`/products/${product.id}`} className="text-blue-500 hover:text-blue-700">
                                                        <FontAwesomeIcon icon={faEdit} />
                                                    </Link>
                                                    <button onClick={() => handleDeleteProduct(product.id)} className="text-red-500 hover:text-red-700">
                                                        <FontAwesomeIcon icon={faTrash} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                );
            case 'orders':
                return <OrdersManagement />;
            case 'settings':
                return <SellerSettings />;
            default:
                return null;
        }
    };

    return (
        <>
            <div className="max-w-screen-xl mx-auto px-4 py-8">
                <div className="flex flex-col md:flex-row gap-8">
                    {/* Sidebar */}
                    <aside className="w-full md:w-64 space-y-2">
                        <button
                            onClick={() => setActiveTab('dashboard')}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                activeTab === 'dashboard' ? 'bg-[#dc711a] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <FontAwesomeIcon icon={faChartLine} />
                            <span>Dashboard</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                activeTab === 'products' ? 'bg-[#dc711a] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <FontAwesomeIcon icon={faBox} />
                            <span>Products</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('orders')}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                activeTab === 'orders' ? 'bg-[#dc711a] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <FontAwesomeIcon icon={faList} />
                            <span>Orders</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('settings')}
                            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                activeTab === 'settings' ? 'bg-[#dc711a] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                        >
                            <FontAwesomeIcon icon={faCog} />
                            <span>Settings</span>
                        </button>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1">
                        <nav className="space-x-4">
                            <button onClick={() => setActiveTab('dashboard')} className={`${activeTab === 'dashboard' ? 'text-[#dc711a]' : 'text-gray-600'}`}>
                                <FontAwesomeIcon icon={faChartLine} className="mr-2" />
                                Dashboard
                            </button>
                            <button onClick={() => setActiveTab('products')} className={`${activeTab === 'products' ? 'text-[#dc711a]' : 'text-gray-600'}`}>
                                <FontAwesomeIcon icon={faBox} className="mr-2" />
                                Products
                            </button>
                            <button onClick={() => setActiveTab('settings')} className={`${activeTab === 'settings' ? 'text-[#dc711a]' : 'text-gray-600'}`}>
                                <FontAwesomeIcon icon={faCog} className="mr-2" />
                                Settings
                            </button>
                        </nav>
                        {renderContent()}
                    </main>
                </div>
            </div>
            {/* <AddProductModal isOpen={isAddProductModalOpen} onClose={() => setIsAddProductModalOpen(false)} onSubmit={handleAddProduct} /> */}
            {/* <EditProductModal isOpen={isEditProductModalOpen} onClose={() => setIsEditProductModalOpen(false)} product={currentProduct} onSubmit={handleEditProduct} /> */}
        </>
    );
}
