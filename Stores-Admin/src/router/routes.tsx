import { lazy, useEffect, useState } from 'react';
import AdminDashboard from '../pages/admin/AdminDashboard';
// import Homepage from '../pages/website-preauth/Homepage';
// import HowItWorks from '../pages/website-preauth/HowItWorks';
// import About from '../pages/website-preauth/About';
// import Contact from '../pages/website-preauth/Contact';
import ProtectedRoute from '../components/Auth/ProtectedRoute';
import AuthRedirect from '../components/Auth/AuthRedirect';

// import AnalyticsPage from '../pages/analytics';
import Login from '../pages/auth/login';
import Register from '../pages/auth/register';
// import FAQPage from '../pages/help and support/faq';

import ServiceDetail from '../pages/service/ServiceDetail';
import BookingConfirmation from '../pages/user/BookingConfirmation';
import BookingTracking from '../pages/user/BookingTracking';
import ProviderListings from '../pages/user/ProviderListings';
import UserDashboard from '../pages/user/UserDashboard';
import UserSettings from '../pages/user/userAccoutSettings/UserSettings';
import MyBookings from '../pages/user/MyBookings';
import CustomerPayments from '../pages/user/MyPayments';
import NotificationsPage from '../pages/Notifications/NotificationsPage';
import NotificationDetail from '../pages/Notifications/NotificationDetail';
import BookingDetail from '../components/ServiceRequest/BookingDetail';
import BidSelection from '../pages/user/BidSelection';
import EditRequestForm from '../pages/EditRequestForm';
// import DisputesPage from '../pages/help and support/DisputesPage';
import SavedProviders from '../pages/user/SavedProvider';
import ChatPage from '../pages/chat/ChatPage';
import LeaveReviewPage from '../pages/user/LeaveAReview';
import Home from '../pages/Home';
import ServiceRequestForm from '../pages/ServiceRequest/ServiceRequestForm';
import UserManagement from '../pages/admin/usermanagment';
import ProviderManagement from '../pages/admin/ProviderManagement';
import RevenueManagement from '../pages/admin/RevenueManagement';
import ProviderPayments from '../pages/admin/ProviderPayments';
import SystemMaintenance from '../pages/admin/SystemMaintenance';

import TicketsManagement from '../pages/admin/support/TicketsManagement';
import TicketDetail from '../pages/admin/support/TicketDetail';
import ProviderDetail from '../pages/admin/ProviderManagement/ProviderDetail/ProviderDetail';
import UserDetail from '../pages/user/UserDetail';
import AdminSettings from '../pages/admin/AdminSettings';
import PaymentPage from '../pages/PaymentPage';
import ServiceRequestDetailPage from '../pages/ServiceRequestDetailPage';
import ProviderJobDetailPage from '../pages/ProviderJobDetailPage';
import PaymentDetail from '../components/Payment/PaymentDetail';
import UserBookingDetail from '../pages/user/UserBookingDetail';
import PaymentSuccess from '../pages/user/PaymentSuccess';
import PaymentCancel from '../pages/user/PaymentCancel';

// Import vehicle components
import VehicleDetail from '../components/vehicle/VehicleDetail';

import PricingAdmin from '../pages/admin/pricing';

import ForgotPassword from '../pages/auth/forgot-password';

// Import new user form pages
import CustomerForm from '../pages/admin/CustomerForm';
import ProviderForm from '../pages/admin/ProviderForm';
import AdminForm from '../pages/admin/AdminForm';

// Import new admin management pages
import JobManagement from '../pages/admin/JobManagement/JobManagement';
import AdminBookingDetail from '../pages/admin/BookingDetail';
import AdminJobDetail from '../pages/admin/JobManagement/JobDetails/JobDetail';
import EnhancedBookingDetail from '../pages/admin/BookingManagement/bookingDetail/EnhancedBookingDetail';
import UserView from '../pages/admin/usermanagment/UserView';
import DriverDetail from '../pages/admin/ProviderManagement/ProviderDetail/tabs/driversTab/DriverDetail';
import EditDriver from '../pages/admin/ProviderManagement/ProviderDetail/tabs/driversTab/EditDriver';
import CommonItems from '../pages/admin/CommonItems/index'
import AuditTrail from '../pages/admin/AuditTrail';
import ReviewManagement from '../pages/admin/ReviewManagement';

import CreateUser from '../pages/admin/usermanagment/createUser';
import CreateJob from '../pages/admin/CreateJob';
import SystemConfigurations from '../pages/admin/configurations';
import AddEditVehiclePage from '../pages/admin/ProviderManagement/ProviderDetail/tabs/vehiclesTab/AddEditVehiclePage';
import ViewVehiclePage from '../pages/admin/ProviderManagement/ProviderDetail/tabs/vehiclesTab/ViewVehiclePage';
import ProviderEdit from '../pages/admin/ProviderManagement/ProviderDetail/ProviderEdit';
import RolesPermissions from '../pages/admin/usermanagment/RolesPermissions';
import GroupPage from '../pages/admin/usermanagment/RolesPermissions/GroupPage';
import BookingManagement from '../pages/admin/BookingManagement/BookingManagement';
import AdminRequestEditor from '../pages/admin/RequestEditor/AdminRequestEditor';
import AdminNotificationsPage from '../pages/admin/notifications';
import DisputeDetail from '../pages/admin/disputes/DisputeDetail';
import DisputeManagement from '../pages/admin/disputes/DisputeManagement';

// E-commerce Management Pages
import ProductManagement from '../pages/admin/ProductManagement';
import AddProduct from '../pages/admin/ProductManagement/AddProduct';
import OrderManagement from '../pages/admin/OrderManagement';
import SearchOpsPage from '../pages/admin/Search';
import CategoryManagement from '../pages/admin/CategoryManagement';
import CustomerManagement from '../pages/admin/CustomerManagement';
import SellerManagement from '../pages/admin/SellerManagement';
import InventoryManagement from '../pages/admin/InventoryManagement';
import EcommerceDashboard from '../pages/admin/EcommerceDashboard';

// Revenue Management Pages
import RevenueOverview from '../pages/admin/RevenueManagement/RevenueOverview';
import RevenueTransactions from '../pages/admin/RevenueManagement/RevenueTransactions';
import RevenueRefunds from '../pages/admin/RevenueManagement/RevenueRefunds';

const userRole = localStorage.getItem('userRole') || '';
const isAdmin = userRole === 'ADMIN' || userRole === 'SUPER_ADMIN';

const ConditionalDashboard = () => {
    const [userRole, setUserRole] = useState('');

    useEffect(() => {
        const storedUserRole = localStorage.getItem('userRole');
        setUserRole(storedUserRole || '');
    }, []);

    if (!userRole) {
        return <div>Loading...</div>;
    }

    if (isAdmin) {
        return <AdminDashboard />;
    }

    // if (personalUsers.includes(userRole)) {
    //     return <MemberDashboard />;
    // }

    return <div>Unauthorized Access</div>;
};

const routes = [
    // Default route - E-commerce Dashboard
    {
        path: '/',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', "Finance Officers", "Inventory Managers", "Support"]}>
                <EcommerceDashboard />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    // Public routes (no authentication required)

    // Auth routes (redirect if already authenticated)
    {
        path: '/login',
        element: (
            <AuthRedirect>
                <Login />
            </AuthRedirect>
        ),
        layout: 'blank',
    },
    {
        path: '/register',
        element: (
            <AuthRedirect>
                <Register />
            </AuthRedirect>
        ),
        layout: 'blank',
    },
    {
        path: '/forgot-password',
        element: (
            <AuthRedirect>
                <ForgotPassword />
            </AuthRedirect>
        ),
        layout: 'blank',
    },

    // Protected routes for authenticated users
    {
        path: '/dashboard',
        element: (
            <ProtectedRoute allowedGroups={['Customers']}>
                <AdminDashboard />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/admin/support/tickets',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Support']}>
                <TicketsManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/support/tickets/:id',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Support']}>
                <TicketDetail />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/support/disputes',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Support']}>
                <DisputeManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    // FAQ route disabled: page not found
  
   

    // Customer routes
    {
        path: '/service-request',
        element: <ServiceRequestForm />,
        layout: 'flexible',
    },
    {
        path: '/service-request2',
        element: <ServiceRequestForm />,
        layout: 'flexible',
    },
    {
        path: '/service-requests/:id',
        element: (
            <ProtectedRoute>
                <ServiceRequestDetailPage />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/bookings/:bookingId/review',
        element: (
            <ProtectedRoute allowedGroups={['Customers']}>
                <LeaveReviewPage />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/edit-request/:id',
        element: (
            <ProtectedRoute allowedGroups={['Customers']}>
                <EditRequestForm />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/notifications',
        element: (
            <ProtectedRoute>
                <NotificationsPage />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/notifications/:id',
        element: (
            <ProtectedRoute>
                <NotificationDetail />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/saved-providers',
        element: (
            <ProtectedRoute allowedGroups={['Customers']}>
                <SavedProviders />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/chat',
        element: (
            <ProtectedRoute>
                <ChatPage />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/chat/:id',
        element: (
            <ProtectedRoute>
                <ChatPage />
            </ProtectedRoute>
        ),
        layout: 'default',
    },

    // My Moves/Bookings routes
    {
        path: '/my-bookings',
        element: (
            <ProtectedRoute allowedGroups={['Customers']}>
                <MyBookings />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/bookings/new',
        element: (
            <ProtectedRoute allowedGroups={['Customers']}>
                <ServiceRequestForm />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/bookings/:id',
        element: (
            <ProtectedRoute>
                <BookingDetail />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/bookings/:id/review',
        element: (
            <ProtectedRoute allowedGroups={['Customers']}>
                <LeaveReviewPage />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/bidding/:serviceId',
        element: (
            <ProtectedRoute allowedGroups={['Customers']}>
                <BidSelection />
            </ProtectedRoute>
        ),
        layout: 'default',
    },

    // Payment routes
    {
        path: '/payments',
        element: (
            <ProtectedRoute>
                <CustomerPayments />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/payment/:requestId?',
        element: (
            <ProtectedRoute>
                <PaymentPage />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/payment/detail/:requestId',
        element: (
            <ProtectedRoute>
                <PaymentDetail />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/payment/success',
        element: (
            <ProtectedRoute>
                <PaymentSuccess />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/payment/cancel',
        element: (
            <ProtectedRoute>
                <PaymentCancel />
            </ProtectedRoute>
        ),
        layout: 'default',
    },

   

    // Account settings
    {
        path: '/profile',
        element: (
            <ProtectedRoute>
                <UserSettings />
            </ProtectedRoute>
        ),
        layout: 'default',
    },

   
   
    {
        path: '/vehicle-management/add',
        element: (
            <ProtectedRoute>
                <AddEditVehiclePage />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/vehicle-management/edit/:vehicleId',
        element: (
            <ProtectedRoute>
                <AddEditVehiclePage />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/vehicle-management/view/:vehicleId',
        element: (
            <ProtectedRoute>
                <ViewVehiclePage />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
   
  
    {
        path: '/vehicles/:id',
        element: (
            <ProtectedRoute>
                <VehicleDetail />
            </ProtectedRoute>
        ),
        layout: 'default',
    },

    // Provider flow routes
    {
        path: '/providers/:requestId',
        element: (
            <ProtectedRoute allowedGroups={['Customers']}>
                <ProviderListings />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
   
    {
        path: '/booking-confirmation/:requestId/:providerId',
        element: (
            <ProtectedRoute allowedGroups={['Customers']}>
                <BookingConfirmation />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/tracking/:id',
        element: (
            <ProtectedRoute>
                <BookingTracking />
            </ProtectedRoute>
        ),
        layout: 'default',
    },

    // Admin routes
    {
        path: '/admin/dashboard',
        element: <EcommerceDashboard />,
        layout: 'admin',
    },

    // E-commerce Management Routes
    {
        path: '/admin/products/list',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Inventory Managers']}>
                <ProductManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/products/new',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Inventory Managers']}>
                <AddProduct />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/search',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Inventory Managers']}>
                <SearchOpsPage />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/orders/list',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Order Managers']}>
                <OrderManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/orders/pending',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Order Managers']}>
                <OrderManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/orders/completed',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Order Managers']}>
                <OrderManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/categories',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Inventory Managers']}>
                <CategoryManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/brands',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Inventory Managers']}>
                <CategoryManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/customers/list',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <CustomerManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/customers/new',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <CustomerManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/sellers/list',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <SellerManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/sellers/new',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <SellerManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/inventory/stock',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Inventory Managers']}>
                <InventoryManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/inventory/low-stock',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Inventory Managers']}>
                <InventoryManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },

    {
        path: '/admin/users',
        element: <UserManagement />,
        layout: 'default',
    },
    {
        path: '/admin/users/new',
        element: <CreateUser />,
        layout: 'default',
    },
    {
        path: '/admin/users/list',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <UserManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/users/roles',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <RolesPermissions />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/users/roles/group/:groupId',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <GroupPage />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/users/customers/new',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <CustomerForm />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/users/providers/new',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <ProviderForm />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/users/admins/new',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <AdminForm />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/users/:id',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <UserView />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/providers',
        element: <ProviderManagement />,
        layout: 'default',
    },
    {
        path: '/admin/providers/:id',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <ProviderDetail />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
        {
            path: '/admin/drivers/:id',
            element: (
                <ProtectedRoute allowedGroups={['Administrators']}>
                    <DriverDetail />
                </ProtectedRoute>
            ),
            layout: 'admin',
        },
        {
            path: '/admin/drivers/:id/edit',
            element: (
                <ProtectedRoute allowedGroups={['Administrators']}>
                    <EditDriver />
                </ProtectedRoute>
            ),
            layout: 'admin',
        },
    {
        path: '/admin/providers/list',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <ProviderManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/common-items',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <CommonItems />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/configurations',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <SystemConfigurations />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/audit-trail',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <AuditTrail />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/reviews',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <ReviewManagement />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/providers/:id/edit',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <ProviderEdit />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/bookings',
        element: (<ProtectedRoute allowedGroups={["Job Managers"]}><BookingManagement /></ProtectedRoute>),
        layout: 'default',
    },
    {
        path: '/admin/bookings/:id',
        element: (<ProtectedRoute allowedGroups={["Job Managers"]}><EnhancedBookingDetail /></ProtectedRoute>),
        layout: 'default',
    },
    {
        path: '/admin/requests/:id/edit',
        element: (<ProtectedRoute allowedGroups={["Job Managers"]}><AdminRequestEditor /></ProtectedRoute>),
        layout: 'default',
    },
    {
        path: '/admin/jobs',
        element: <JobManagement />,
        layout: 'default',
    },
    {
        path: '/admin/jobs/new',
        element: <CreateJob />,
        layout: 'default',
    },
    {
        path: '/admin/jobs/:id',
        element: (
            
                <AdminJobDetail />
        ),
        layout: 'admin',
    },
    {
        path: '/admin/jobs/:id/edit',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <AdminJobDetail />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/revenue',
        element: (
            <ProtectedRoute allowedGroups={['Administrators','Finance Officers']}>
                <RevenueManagement />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/admin/revenue/overview',
        element: (
            <ProtectedRoute allowedGroups={['Administrators','Finance Officers']}>
                <RevenueOverview />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/revenue/transactions',
        element: (
            <ProtectedRoute allowedGroups={['Administrators','Finance Officers']}>
                <RevenueTransactions />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/revenue/refunds',
        element: (
            <ProtectedRoute allowedGroups={['Administrators','Finance Officers']}>
                <RevenueRefunds />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
    {
        path: '/admin/revenue/provider-payments',
        element: (
            <ProtectedRoute allowedGroups={['Administrators','Finance Officers']}>
                <ProviderPayments />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/admin/pricing',
        element: (
            <ProtectedRoute allowedGroups={['Administrators','Pricing Officers']}>
                <PricingAdmin />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/admin/disputes',
        element: (
            <ProtectedRoute allowedGroups={['Administrators','support']}>
                <DisputeManagement />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/admin/settings',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <AdminSettings />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/admin/permissions',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <RolesPermissions />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/admin/maintenance',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <SystemMaintenance />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
   
    {
        path: '/admin/notifications',
        element: (
            <ProtectedRoute allowedGroups={['Administrators']}>
                <AdminNotificationsPage />
            </ProtectedRoute>
        ),
        layout: 'default',
    },
    {
        path: '/admin/disputes/:id',
        element: (
            <ProtectedRoute allowedGroups={['Administrators', 'Support']}>
                <DisputeDetail />
            </ProtectedRoute>
        ),
        layout: 'admin',
    },
];

export { routes };
