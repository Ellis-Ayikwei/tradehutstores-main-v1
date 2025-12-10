import { IconAlertTriangle, IconCar, IconCircleCheck, IconCurrencyDollar, IconEye, IconPackage, IconStar, IconTrendingUp, IconTruck, IconUserCheck, IconUsers } from '@tabler/icons-react';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { useEffect, useMemo } from 'react';
import ReactApexChart from 'react-apexcharts';
import { useDispatch, useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import useSWR from 'swr';
import Dropdown from '../../components/Dropdown';
import AdminDashboardSkeleton from '../../components/skeletons/AdminDashboardSkeleton';
import Pound from '../../helper/CurrencyFormatter';
import fetcher from '../../services/fetcher';
import { IRootState } from '../../store';
import { setPageTitle } from '../../store/themeConfigSlice';
import { Driver } from '../../types/driver';
import { Payment, Provider, User } from './ProviderManagement/ProviderDetail/types';
import { Booking } from '../../types/booking';

// Initialize dayjs plugins
dayjs.extend(relativeTime);

// API Response Types
interface ApiUser {
    id: string;
    name: string;
    email: string;
    user_type: 'user' | 'provider' | 'admin' | 'customer' | 'super_admin';
    status: 'active' | 'inactive' | 'pending';
    joinDate: string;
    phone?: string;
}

interface ApiRequest {
    id: string;
    user_id: string;
    user_name: string;
    provider_id?: string;
    provider_name?: string;
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
    date: string;
    amount: number;
    origin: string;
    destination: string;
    distance?: number;
    driver?: string | {
        name: string;
        id: string;
    };
    vehicle?: string;
    estimatedTime?: string;
    final_price?: number;
    base_price?: number;
    user?: {
        email: string;
        name: string;
    };
    provider?: string | {
        company_name: string;
        id: string;
    };
}

interface ApiPayment {
    id: string;
    amount: number;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    date: string;
    request_id: string;
}

// Add interfaces for provider stats and realtime activity
interface ProviderStats {
    [key: string]: {
        id: string;
        name: string;
        completedJobs: number;
        revenue: number;
        rating: number;
    };
}

interface RealtimeActivity {
    id: string;
    type: 'booking' | 'completion' | 'driver' | 'payment' | 'support' | 'partner' | 'customer' | 'admin' | 'super_admin';
    message: string;
    time: string;
    status: 'success' | 'pending' | 'alert' | 'new' | 'rejected' | 'verified' | 'unverified' | 'pending' | 'rejected';
}

const AdminDashboard = () => {
    const dispatch = useDispatch();
    useEffect(() => {
        dispatch(setPageTitle('MoreVans Admin Dashboard'));
    });

    const isDark = useSelector((state: IRootState) => state.themeConfig.theme === 'dark' || state.themeConfig.isDarkMode);
    const isRtl = useSelector((state: IRootState) => state.themeConfig.rtlClass) === 'rtl' ? true : false;

    // Fetch data using SWR
    const { data: usersData, isLoading: usersLoading } = useSWR<User[]>('users/', fetcher);
    const { data: requestsData, isLoading: requestsLoading } = useSWR<Booking[]>('requests/', fetcher);
    const { data: paymentsData, isLoading: paymentsLoading } = useSWR<Payment[]>('payments/', fetcher);
    const {data: providersData, isLoading: providersLoading} = useSWR<Provider[]>('/providers/', fetcher);
    console.log('the users data', usersData)
    console.log('the providers data', providersData)
    console.log('the requests data', requestsData)
    // Calculate dashboard metrics from real data
    const dashboardData = useMemo(() => {
        if (!usersData || !requestsData || !paymentsData) return null;

        const totalBookings = requestsData.length;
        const activeProviders = providersData?.filter((p) => p.verification_status === 'verified')?.length || 0;
        const totalRevenue = paymentsData.filter((p) => p.status === 'completed').reduce((sum, p) => sum + Number(p.amount), 0);
        const completedMoves = requestsData.filter((r) => r.status === 'completed').length;
        const pendingMoves = requestsData.filter((r) => r.status === 'pending').length;
        const inProgressMoves = requestsData.filter((r) => r.status === 'in_progress').length;
        const cancelledJobs = requestsData.filter((r) => r.status === 'cancelled').length;
        const totalVehicles = providersData?.reduce((sum: number, p: Provider) => sum + p.vehicle_count, 0) || 0;
        const totalCustomers = usersData.filter((u) => u.user_type === 'customer').length;
        const activeDrivers = usersData.filter((u) => u.user_type === 'provider' && u.status === 'active').length;

        console.log('the revenue', totalRevenue);

        // Calculate monthly growth
        const lastMonthDate = new Date();
        lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
        const thisMonthBookings = requestsData.filter((r) => new Date(r.created_at) >= lastMonthDate).length;
        const prevMonthBookings = requestsData.filter((r) => {
            const date = new Date(r.created_at);
            return date >= new Date(lastMonthDate.getFullYear(), lastMonthDate.getMonth() - 1, 1) && date < lastMonthDate;
        }).length;
        const monthlyGrowth = prevMonthBookings ? ((thisMonthBookings - prevMonthBookings) / prevMonthBookings) * 100 : 0;

        // Calculate average rating (if available in the API)
        const averageRating = 4.7; // This should come from the API if available

        // Calculate new signups today
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const newSignupsToday = usersData?.filter((u: User) => new Date(u.date_joined) >= today)?.length || 0;

        return {
            totalBookings,
            activeProviders,
            totalRevenue,
            completedMoves,
            pendingMoves,
            inProgressMoves,
            averageRating,
            monthlyGrowth,
            totalCustomers,
            activeDrivers,
            totalVehicles, // Assuming average 2 vehicles per provider
            customerSatisfaction: 94.2, // This should come from the API if available
            averageDeliveryTime: 2.4,
            cancelledJobs,
            disputesOpen: 12, // This should come from the API if available
            newSignupsToday,
        };
    }, [usersData, requestsData, paymentsData]);

    // Calculate booking analytics for the chart
    const bookingsChart = useMemo(() => {
        if (!requestsData) return null;

        const last12Months = Array.from({ length: 12 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            return {
                month: date.toLocaleString('default', { month: 'short' }),
                date: date,
            };
        }).reverse();

        const completedData = [];
        const pendingData = [];
        const inProgressData = [];
        const cancelledData = [];

        for (const { date } of last12Months) {
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthRequests = requestsData.filter((r) => {
                const requestDate = new Date(r.created_at);
                return requestDate >= startOfMonth && requestDate <= endOfMonth;
            });

            completedData.push(monthRequests.filter((r) => r.status === 'completed').length);
            pendingData.push(monthRequests.filter((r) => r.status === 'pending').length);
            inProgressData.push(monthRequests.filter((r) => r.status === 'in_progress').length);
            cancelledData.push(monthRequests.filter((r) => r.status === 'cancelled').length);
        }

        return {
            series: [
                {
                    name: 'Completed Moves',
                    data: completedData,
                },
                {
                    name: 'Pending Moves',
                    data: pendingData,
                },
                {
                    name: 'In Progress',
                    data: inProgressData,
                },
                {
                    name: 'Cancelled',
                    data: cancelledData,
                },
            ],
            options: {
                chart: {
                    height: 380,
                    type: 'bar' as const,
                    fontFamily: 'Nunito, sans-serif',
                    toolbar: {
                        show: false,
                    },
                    background: 'transparent',
                },
                dataLabels: {
                    enabled: false,
                },
                stroke: {
                    width: 2,
                    colors: ['transparent'],
                },
                colors: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
                dropShadow: {
                    enabled: true,
                    blur: 3,
                    color: '#515365',
                    opacity: 0.1,
                },
                plotOptions: {
                    bar: {
                        horizontal: false,
                        columnWidth: '55%',
                        borderRadius: 8,
                        borderRadiusApplication: 'end' as const,
                    },
                },
                legend: {
                    position: 'top' as const,
                    horizontalAlign: 'left' as const,
                    fontSize: '14px',
                    fontWeight: 500,
                    itemMargin: {
                        horizontal: 20,
                        vertical: 8,
                    },
                },
                grid: {
                    borderColor: isDark ? '#191e3a' : '#f1f5f9',
                    strokeDashArray: 3,
                    padding: {
                        left: 20,
                        right: 20,
                    },
                },
                xaxis: {
                    categories: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                    axisBorder: {
                        show: false,
                    },
                    axisTicks: {
                        show: false,
                    },
                },
                yaxis: {
                    tickAmount: 6,
                    opposite: isRtl ? true : false,
                    labels: {
                        offsetX: isRtl ? -10 : 0,
                    },
                },
                fill: {
                    type: 'gradient',
                    gradient: {
                        shade: isDark ? 'dark' : 'light',
                        type: 'vertical',
                        shadeIntensity: 0.3,
                        inverseColors: false,
                        opacityFrom: 0.9,
                        opacityTo: 0.8,
                        stops: [0, 100],
                    },
                },
                tooltip: {
                    y: {
                        formatter: (value: number) => `${value}`,
                    },
                },
            },
        };
    }, [requestsData, isDark, isRtl]);

    // Calculate revenue data for the chart
    const revenueChart = useMemo(() => {
        if (!paymentsData) return null;

        const last12Months = Array.from({ length: 12 }, (_, i) => {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            return {
                month: date.toLocaleString('default', { month: 'short' }),
                date: date,
            };
        }).reverse();

        const revenueData = [];
        const expensesData = []; // This should come from the API if available

        for (const { date } of last12Months) {
            const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
            const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);

            const monthlyRevenue = paymentsData
                .filter((p) => {
                    const paymentDate = new Date(p.date);
                    return p.status === 'completed' && paymentDate >= startOfMonth && paymentDate <= endOfMonth;
                })
                .reduce((sum, p) => sum + p.amount, 0);

            revenueData.push(monthlyRevenue);
            expensesData.push(monthlyRevenue * 0.7); // Assuming 70% expenses, should come from API
        }

        return {
            series: [
                {
                    name: 'Revenue',
                    data: revenueData,
                },
                {
                    name: 'Expenses',
                    data: expensesData,
                },
            ],
            options: {
                chart: {
                    height: 320,
                    type: 'area' as const,
                    fontFamily: 'Nunito, sans-serif',
                    zoom: {
                        enabled: false,
                    },
                    toolbar: {
                        show: false,
                    },
                    background: 'transparent',
                },
                dataLabels: {
                    enabled: false,
                },
                stroke: {
                    show: true,
                    curve: 'smooth' as const,
                    width: 3,
                    lineCap: 'round' as const,
                },
                dropShadow: {
                    enabled: true,
                    opacity: 0.1,
                    blur: 10,
                    left: 0,
                    top: 10,
                },
                colors: ['#10B981', '#8B5CF6'],
                markers: {
                    size: 0,
                    hover: {
                        size: 6,
                    },
                },
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],
                xaxis: {
                    axisBorder: {
                        show: false,
                    },
                    axisTicks: {
                        show: false,
                    },
                    labels: {
                        style: {
                            fontSize: '12px',
                            fontWeight: 500,
                        },
                    },
                },
                yaxis: {
                    tickAmount: 5,
                    labels: {
                        formatter: (value: number) => {
                            return '$' + value / 1000 + 'K';
                        },
                        style: {
                            fontSize: '12px',
                            fontWeight: 500,
                        },
                    },
                    opposite: isRtl ? true : false,
                },
                grid: {
                    borderColor: isDark ? '#191e3a' : '#f1f5f9',
                    strokeDashArray: 3,
                    padding: {
                        top: 0,
                        right: 0,
                        bottom: 0,
                        left: 0,
                    },
                },
                legend: {
                    position: 'top' as const,
                    horizontalAlign: 'left' as const,
                    fontSize: '14px',
                    fontWeight: 500,
                    itemMargin: {
                        horizontal: 20,
                        vertical: 8,
                    },
                },
                tooltip: {
                    marker: {
                        show: true,
                    },
                    theme: isDark ? 'dark' : 'light',
                },
                fill: {
                    type: 'gradient',
                    gradient: {
                        shadeIntensity: 1,
                        inverseColors: false,
                        opacityFrom: 0.4,
                        opacityTo: 0.1,
                        stops: [0, 100],
                    },
                },
            },
        };
    }, [paymentsData]);

    // Calculate performance chart data
    const performanceChart = useMemo(() => {
        if (!requestsData) return null;

        const completed = requestsData.filter((r) => r.status === 'completed').length;
        const pending = requestsData.filter((r) => r.status === 'pending').length;
        const inProgress = requestsData.filter((r) => r.status === 'in_progress').length;
        const cancelled = requestsData.filter((r) => r.status === 'cancelled').length;
        const total = requestsData.length;

        return {
            series: [Math.round((completed / total) * 100), Math.round((pending / total) * 100), Math.round((inProgress / total) * 100), Math.round((cancelled / total) * 100)],
            options: {
                chart: {
                    type: 'donut' as const,
                    height: 280,
                },
                labels: ['Completed', 'Pending', 'In Progress', 'Cancelled'],
                colors: ['#10B981', '#F59E0B', '#3B82F6', '#EF4444'],
                legend: {
                    position: 'bottom' as const,
                    horizontalAlign: 'center' as const,
                    fontSize: '14px',
                    markers: {
                        size: 6,
                        strokeWidth: 0,
                    },
                    itemMargin: {
                        horizontal: 15,
                        vertical: 8,
                    },
                },
                plotOptions: {
                    pie: {
                        donut: {
                            size: '65%',
                            labels: {
                                show: true,
                                total: {
                                    show: true,
                                    label: 'Total',
                                    formatter: () => total.toString(),
                                },
                            },
                        },
                    },
                },
                dataLabels: {
                    enabled: false,
                },
                responsive: [
                    {
                        breakpoint: 480,
                        options: {
                            legend: {
                                position: 'bottom',
                            },
                        },
                    },
                ],
                tooltip: {
                    y: {
                        formatter: (value: number) => `${value}%`,
                    },
                },
            },
        };
    }, [requestsData]);

    // Get recent bookings
    const recentBookings = useMemo(() => {
        if (!requestsData) return [];

        return requestsData
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 4)
            .map((booking) => ({
                id: booking.tracking_number,
                date: booking.created_at,
                customer: booking?.contact_name || 'Not Assigned',
                customerPhone: booking?.contact_phone || 'Not Assigned',
                origin: booking?.stops[0]?.location?.address || 'N/A',
                destination: booking?.stops[booking?.stops.length - 1]?.location?.address || 'N/A',
                distance: `${booking?.estimated_distance || 0}km`,
                amount: booking?.final_price,
                status: booking.status.toUpperCase(),
                provider: booking?.provider?.companyName || 'Not Assigned',
                driver: typeof booking?.driver === 'string' ? booking?.driver : booking?.driver?.name || 'Not Assigned',
                vehicle: booking?.vehicle?.registration_number || 'Not Assigned',
                estimatedTime: booking?.estimated_completion_time || 'TBD',
            }));
    }, [requestsData]);

    // Fix realtime activity data
    const realtimeActivity = useMemo<RealtimeActivity[]>(() => {
        if (!requestsData || !usersData) return [];

        const activities: RealtimeActivity[] = [];

        // Add recent bookings
        const recentBookings = requestsData.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 2);

        recentBookings.forEach((booking) => {
            activities.push({
                id: `booking-${booking.id}`,
                type: 'booking',
                message: `New booking from ${booking.contact_name}`,
                time: dayjs(booking.created_at).fromNow(),
                status: 'new',
            });
        });

        // Add recent user signups
        const recentSignups = usersData?.sort((a: User, b: User) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 2) || [];

        recentSignups.forEach((user) => {
            activities.push({
                id: `signup-${user.id}`,
                type: user.user_type as 'provider' | 'customer' | 'admin' | 'super_admin' | 'driver',
                message: `New ${user.user_type || 'customer'} signup: ${user.first_name} ${user.last_name}`,
                time: dayjs(user.date_joined).fromNow(),
                status: 'success',
            });
        });

        // Add recent completed bookings
        const recentCompletions = requestsData
            .filter((r) => r.status === 'completed')
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
            .slice(0, 2);

        recentCompletions.forEach((booking) => {
            activities.push({
                id: `completion-${booking.id}`,
                type: 'completion',
                message: `Booking #${booking.id} completed`,
                time: dayjs(booking.created_at).fromNow(),
                status: 'success',
            });
        });

        return activities.sort((a: RealtimeActivity, b: RealtimeActivity) => dayjs(b.time).unix() - dayjs(a.time).unix()).slice(0, 5);
    }, [requestsData, usersData]);

    // Calculate top performers
    const topPerformers = useMemo(() => {
        if (!requestsData || !usersData) return [];

        const providerStats = requestsData.reduce<ProviderStats>((acc, booking) => {
            if (!booking.providerId || !booking.providerName) return acc;

            if (!acc[booking.providerId]) {
                acc[booking.providerId] = {
                    id: booking.providerId,
                    name: booking.providerName,
                    completedJobs: 0,
                    revenue: 0,
                    rating: 0,
                };
            }

            if (booking.status === 'completed') {
                acc[booking.providerId].completedJobs++;
                acc[booking.providerId].revenue += booking.final_price || 0;
            }

            return acc;
        }, {});

        return Object.values(providerStats)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 4)
            .map((provider) => ({
                ...provider,
                rating: 4.5,
                growth: parseFloat(((provider.revenue / 1000) * Math.random()).toFixed(1)),
            }));
    }, [requestsData, usersData]);

    // Loading state
    if (usersLoading || requestsLoading || paymentsLoading || !dashboardData) {
        return <AdminDashboardSkeleton />;
    }

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'COMPLETED':
                return 'badge bg-success/20 text-success';
            case 'IN_PROGRESS':
                return 'badge bg-info/20 text-info';
            case 'PENDING':
                return 'badge bg-warning/20 text-warning';
            case 'CANCELLED':
                return 'badge bg-danger/20 text-danger';
            default:
                return 'badge bg-secondary/20 text-secondary';
        }
    };

    const getActivityIcon = (type: string) => {
        switch (type) {
            case 'booking':
                return <IconPackage className="w-4 h-4" />;
            case 'completion':
                return <IconCircleCheck className="w-4 h-4" />;
            case 'driver':
                return <IconUserCheck className="w-4 h-4" />;
            case 'payment':
                return <IconCurrencyDollar className="w-4 h-4" />;
            case 'support':
                return <IconAlertTriangle className="w-4 h-4" />;
            default:
                return <IconEye className="w-4 h-4" />;
        }
    };

    const getActivityColor = (status: string) => {
        switch (status) {
            case 'success':
                return 'text-green-600 bg-green-50 dark:bg-green-900/20';
            case 'pending':
                return 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20';
            case 'alert':
                return 'text-red-600 bg-red-50 dark:bg-red-900/20';
            case 'new':
                return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
            default:
                return 'text-gray-600 bg-gray-50 dark:bg-gray-900/20';
        }
    };

    return (
        <div className="space-y-6 p-2 md:p-4">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">MoreVans Dashboard</h1>
                    <p className="text-gray-600 dark:text-gray-400 mt-1">Comprehensive logistics management platform</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="text-sm text-gray-500 dark:text-gray-400">Last updated: {dayjs().format('MMM DD, YYYY HH:mm')}</div>
                    <div className="flex gap-2">
                        <button className="btn btn-outline-primary btn-sm">
                            <IconEye className="w-4 h-4 mr-1" />
                            Live View
                        </button>
                        <Link to="/admin/reports" className="btn btn-primary btn-sm">
                            Generate Report
                        </Link>
                    </div>
                </div>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* Total Bookings */}
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-xs font-medium mb-1">Total Bookings</p>
                            <h3 className="text-xl sm:text-2xl font-bold">{dashboardData.totalBookings.toLocaleString()}</h3>
                            <div className="flex items-center mt-1">
                                <IconTrendingUp className="w-3 h-3 mr-1" />
                                <span className="text-xs font-medium">+{dashboardData.monthlyGrowth}%</span>
                            </div>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <IconPackage className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>

                {/* Active Customers */}
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-emerald-100 text-xs font-medium mb-1">Active Customers</p>
                            <h3 className="text-xl sm:text-2xl font-bold">{dashboardData.totalCustomers.toLocaleString()}</h3>
                            <div className="flex items-center mt-1">
                                <IconUsers className="w-3 h-3 mr-1" />
                                <span className="text-xs font-medium">+{dashboardData.newSignupsToday} today</span>
                            </div>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <IconUsers className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>

                {/* Active Providers */}
                <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-purple-100 text-xs font-medium mb-1">Active Providers</p>
                            <h3 className="text-xl sm:text-2xl font-bold">{dashboardData.activeProviders}</h3>
                            <div className="flex items-center mt-1">
                                <IconStar className="w-3 h-3 mr-1" />
                                <span className="text-xs font-medium">{dashboardData.averageRating}/5.0 avg</span>
                            </div>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <IconTruck className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>

                {/* Total Vehicles */}
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-indigo-100 text-xs font-medium mb-1">Fleet Vehicles</p>
                            <h3 className="text-xl sm:text-2xl font-bold">{dashboardData.totalVehicles}</h3>
                            <div className="flex items-center mt-1">
                                <IconCar className="w-3 h-3 mr-1" />
                                <span className="text-xs font-medium">85% active</span>
                            </div>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <IconCar className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>

                {/* Total Revenue */}
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-green-100 text-xs font-medium mb-1">Total Revenue</p>
                            <h3 className="text-xl sm:text-2xl font-bold">{Pound(dashboardData.totalRevenue)}</h3>
                            <div className="flex items-center mt-1">
                                <IconTrendingUp className="w-3 h-3 mr-1" />
                                <span className="text-xs font-medium">+18.2% MTD</span>
                            </div>
                        </div>
                        <div className="bg-white/20 p-2 rounded-lg">
                            <IconCurrencyDollar className="w-5 h-5 sm:w-6 sm:h-6" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {/* Booking Analytics Chart */}
                <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Booking Analytics</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Monthly breakdown of job status</p>
                        </div>
                        <div className="dropdown">
                            <Dropdown offset={[0, 5]} placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`} btnClassName="btn btn-outline-primary btn-sm" button="2025">
                                <ul className="text-black dark:text-white-dark">
                                    <li>
                                        <button type="button">2025</button>
                                    </li>
                                    <li>
                                        <button type="button">2024</button>
                                    </li>
                                    <li>
                                        <button type="button">2023</button>
                                    </li>
                                    <li>
                                        <button type="button">2022</button>
                                    </li>
                                </ul>
                            </Dropdown>
                        </div>
                    </div>
                    {bookingsChart && (
                        <div className="w-full overflow-x-auto">
                            <ReactApexChart series={bookingsChart.series} options={bookingsChart.options} type="bar" height={380} />
                        </div>
                    )}
                </div>

                {/* Job Performance */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <div className="mb-6">
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Job Performance</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Current status breakdown</p>
                    </div>
                    {performanceChart && (
                        <div className="w-full overflow-x-auto">
                            <ReactApexChart series={performanceChart.series} options={performanceChart.options} type="donut" height={280} />
                        </div>
                    )}
                </div>

                {/* Real-time Activity */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Live Activity</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Real-time updates</p>
                        </div>
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                    </div>
                    <div className="space-y-4">
                        {realtimeActivity.map((activity) => (
                            <div key={activity.id} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                                <div className={`p-2 rounded-lg ${getActivityColor(activity.status)}`}>{getActivityIcon(activity.type)}</div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{activity.message}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.time}</p>
                                </div>
                            </div>
                        ))}
                        <Link to="/admin/audit-trail" className="block text-center py-2 text-sm text-primary hover:underline">
                            View all activity
                        </Link>
                    </div>
                </div>
            </div>

            {/* Revenue Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Financial Overview</h3>
                        <p className="text-gray-600 dark:text-gray-400 text-sm">Revenue vs expenses tracking</p>
                    </div>
                    <div className="flex gap-2">
                        <button className="btn btn-outline-primary btn-sm">Export</button>
                        <div className="dropdown">
                            <Dropdown offset={[0, 5]} placement={`${isRtl ? 'bottom-start' : 'bottom-end'}`} btnClassName="btn btn-outline-secondary btn-sm" button="Options">
                                <ul className="text-black dark:text-white-dark">
                                    <li>
                                        <button type="button">View Details</button>
                                    </li>
                                    <li>
                                        <button type="button">Download Report</button>
                                    </li>
                                    <li>
                                        <button type="button">Share</button>
                                    </li>
                                </ul>
                            </Dropdown>
                        </div>
                    </div>
                </div>
                {revenueChart && (
                    <div className="w-full overflow-x-auto">
                        <ReactApexChart series={revenueChart.series} options={revenueChart.options} type="area" height={320} />
                    </div>
                )}
            </div>

            {/* Bottom Section - Recent Bookings and Top Performers */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Recent Bookings */}
                <div className="xl:col-span-2 bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Recent Bookings</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Latest customer bookings and tracking</p>
                        </div>
                        <Link to="/admin/bookings" className="btn btn-primary btn-sm hover:shadow-lg transition-all duration-300">
                            View All Bookings
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <div className="min-w-full inline-block align-middle">
                            <div className="overflow-hidden">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                    <thead>
                                        <tr className="bg-gray-50 dark:bg-gray-700">
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white rounded-l-lg">
                                                Booking ID
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">
                                                Customer
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">
                                                Route
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">
                                                Provider
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-900 dark:text-white">
                                                Amount
                                            </th>
                                            <th scope="col" className="px-4 py-3 text-center text-xs font-semibold text-gray-900 dark:text-white rounded-r-lg">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                        {recentBookings.map((booking) => (
                                            <tr key={booking.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="font-medium text-gray-900 dark:text-white text-sm">{booking.id}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{dayjs(booking.date).format('MMM DD')}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-700 dark:text-gray-300 text-sm font-medium">{booking.customer}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{booking.customerPhone || 'N/A'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="text-sm">
                                                        <div className="text-gray-900 dark:text-white font-medium">{booking.origin}</div>
                                                        <div className="text-gray-500 dark:text-gray-400 text-xs">to {booking.destination}</div>
                                                        <div className="text-gray-400 dark:text-gray-500 text-xs">{booking.distance}</div>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <div className="flex flex-col">
                                                        <span className="text-gray-700 dark:text-gray-300 text-sm">{booking.provider || 'Not Assigned'}</span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{booking.driver || 'Not Assigned'}</span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 whitespace-nowrap">
                                                    <span className="font-semibold text-gray-900 dark:text-white">{Pound(booking.amount)}</span>
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <span className={`${getStatusBadge(booking.status)} px-2 py-1 rounded-full text-xs font-medium`}>{booking.status.replace('_', ' ')}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-6 shadow-lg">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white">Top Performers</h3>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Best providers this month</p>
                        </div>
                        <Link to="/admin/providers" className="text-primary hover:underline text-sm">
                            View All
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {topPerformers.map((performer, index) => (
                            <div key={performer.id} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors">
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white ${
                                        index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : index === 2 ? 'bg-orange-600' : 'bg-gray-300'
                                    }`}
                                >
                                    {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between">
                                        <h4 className="font-semibold text-gray-900 dark:text-white text-sm truncate">{performer.name}</h4>
                                        <div className="flex items-center gap-1">
                                            <IconStar className="w-3 h-3 text-yellow-500" />
                                            <span className="text-xs font-medium">{performer.rating}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-1">
                                        <span className="text-xs text-gray-600 dark:text-gray-400">{performer.completedJobs} jobs</span>
                                        <span className="text-xs font-semibold text-green-600">${(performer.revenue / 1000).toFixed(1)}K</span>
                                    </div>
                                    <div className="mt-2 bg-gray-200 dark:bg-gray-600 rounded-full h-1.5">
                                        <div className="bg-green-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${Math.min(performer.growth * 5, 100)}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
