'use client';

import { faBars, faFilter, faHeart, faHome, faShoppingCart, faTag, faTimes, faUser } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import Navbar from '../Navigation/Navbar';
import Sidebar from '../Navigation/Sidebar';
import Footer from './Footer';

interface MenuItem {
    icon: any;
    label: string;
    path: string;
}

export default function MainLayout() {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const location = useLocation();

    const menuItems: MenuItem[] = [
        { icon: faHome, label: 'Home', path: '/' },
        { icon: faUser, label: 'Profile', path: '/profile' },
        { icon: faHeart, label: 'Wishlist', path: '/wishlist' },
        { icon: faShoppingCart, label: 'Cart', path: '/cart' },
        { icon: faTag, label: 'Deals', path: '/deals' },
    ];

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen flex flex-col">
            <div className="flex flex-1">
                {/* Sidebar */}
                <Sidebar isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />
                
                {/* Main Content */}
                <div className="flex flex-col flex-1">
                    <Navbar />
                    <main className="flex-1 container mx-auto px-4 py-8">
                        <Outlet />
                    </main>
                    <Footer />
                </div>
            </div>
        </div>
    );
}
