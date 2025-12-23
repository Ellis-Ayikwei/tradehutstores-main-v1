'use client';

import { faCog, faHeart, faShoppingBag, faSignOut, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';

export default function Profile() {
    const [activeTab, setActiveTab] = useState('profile');

    const tabs = [
        { id: 'profile', name: 'Profile', icon: faUser, path: '/profile' },
        { id: 'orders', name: 'Orders', icon: faShoppingBag, path: '/profile/orders' },
        { id: 'wishlist', name: 'Wishlist', icon: faHeart, path: '/profile/wishlist' },
        { id: 'settings', name: 'Settings', icon: faCog, path: '/profile/settings' },
    ];

    return (
        <div className="max-w-screen-xl mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row gap-8">
                {/* Sidebar */}
                <aside className="w-full md:w-64 space-y-2">
                    {tabs.map((tab) => (
                        <Link
                            key={tab.id}
                            to={tab.path}
                            className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                                activeTab === tab.id ? 'bg-[#dc711a] text-white' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
                            }`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <FontAwesomeIcon icon={tab.icon} className="w-5 h-5" />
                            <span>{tab.name}</span>
                        </Link>
                    ))}

                    <button className="w-full flex items-center space-x-3 px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors">
                        <FontAwesomeIcon icon={faSignOut} className="w-5 h-5" />
                        <span>Logout</span>
                    </button>
                </aside>

                {/* Main Content */}
                <main className="flex-1 min-h-[500px] bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
