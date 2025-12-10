import React from 'react';

const AdminDashboardSkeleton = () => {
    return (
        <div className="space-y-6 animate-pulse">
            {/* Header Skeleton */}
            <div className="flex items-center justify-between">
                <div>
                    <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded-lg mt-2"></div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    <div className="flex gap-2">
                        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                </div>
            </div>

            {/* Key Metrics Cards Skeleton */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
                {[...Array(6)].map((_, index) => (
                    <div key={index} className="bg-gray-200 dark:bg-gray-700 rounded-xl p-4">
                        <div className="flex items-center justify-between">
                            <div className="space-y-2">
                                <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                                <div className="h-6 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                                <div className="h-3 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
                            </div>
                            <div className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded-lg"></div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Booking Analytics Chart Skeleton */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div className="space-y-2">
                            <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                    <div className="h-[380px] bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>

                {/* Job Performance Skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="mb-6 space-y-2">
                        <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="h-[280px] bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                </div>

                {/* Real-time Activity Skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div className="space-y-2">
                            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-4 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                        <div className="h-3 w-3 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                    </div>
                    <div className="space-y-4">
                        {[...Array(5)].map((_, index) => (
                            <div key={index} className="flex items-start gap-3 p-3">
                                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-3 w-1/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Revenue Chart Skeleton */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-6">
                    <div className="space-y-2">
                        <div className="h-6 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        <div className="h-4 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="flex gap-2">
                        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                </div>
                <div className="h-[320px] bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
            </div>

            {/* Bottom Section Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recent Bookings Skeleton */}
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div className="space-y-2">
                            <div className="h-6 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-4 w-48 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                        <div className="h-8 w-32 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                    </div>
                    <div className="space-y-4">
                        {[...Array(4)].map((_, index) => (
                            <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="h-12 w-12 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                </div>
                                <div className="h-8 w-20 bg-gray-200 dark:bg-gray-700 rounded-lg"></div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Top Performers Skeleton */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div className="space-y-2">
                            <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
                            <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded"></div>
                        </div>
                        <div className="h-4 w-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
                    </div>
                    <div className="space-y-4">
                        {[...Array(4)].map((_, index) => (
                            <div key={index} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                                <div className="h-8 w-8 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded"></div>
                                    <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboardSkeleton; 