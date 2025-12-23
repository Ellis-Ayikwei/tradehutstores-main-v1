import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    IconArrowLeft,
    IconBox,
    IconCalendar,
    IconCircleCheck,
    IconChevronDown,
    IconChevronRight,
    IconClock,
    IconMessage,
    IconCurrency,
    IconAlertTriangle,
    IconFileText,
    IconInfoCircle,
    IconMapPin,
    IconCurrencyDollar,
    IconPhone,
    IconStar,
    IconTruck,
    IconUser,
    IconEdit,
    IconBan,
    IconEye,
    IconCamera,
    IconShield,
    IconX,
    IconMap,
    IconPackage,
    IconHelp,
    IconPrinter,
    IconCheck,
    IconMail,
    IconGavel,
    IconRoute,
    IconCar,
    IconBuilding,
    IconDoor,
    IconStairs,
    IconElevator,
    IconHome,
    IconTools,
    IconExternalLink,
    IconMessages,
    IconBell,
    IconDownload,
    IconClipboardList,
    IconThumbUp,
} from '@tabler/icons-react';
import { format, parseISO, formatDistanceToNow } from 'date-fns';
import useAuthUser from 'react-auth-kit/hooks/useAuthUser';
import useSWR from 'swr';
import fetcher from '../../services/fetcher';
import ProviderModal from '../Provider/ProviderPopup';
import IconLoader from '../Icon/IconLoader';
import paymentService from '../../services/paymentService';

// Types
interface ItemDetail {
    name: string;
    quantity: number;
    dimensions: string;
    weight: string;
    photos?: string[];
    specialInstructions?: string;
}

interface Address {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    additionalInfo?: string;
}

interface Provider {
    id: string;
    name: string;
    companyName: string;
    phone: string;
    email: string;
    avatar?: string;
    profileImage?: string;
    rating: number;
    reviewCount: number;
    verifiedProvider: boolean;
    verified: boolean;
    vehicleType: string;
    capacity: string;
    serviceRadius: number | string;
    reviews: any[];
    price?: number;
}

interface BookingMilestone {
    id: string;
    milestone_type: string;
    title?: string;
    status: 'completed' | 'current' | 'upcoming';
    scheduled_start?: string;
    actual_start?: string;
    actual_end?: string;
    notes?: string;
    description?: string;
    datetime?: string;
}

interface PaymentDetail {
    id: string;
    type: 'deposit' | 'final' | 'additional';
    amount: number;
    currency: string;
    status: 'paid' | 'pending' | 'overdue' | 'refunded';
    date?: string;
    dueDate?: string;
    paymentMethod?: string;
    receiptUrl?: string;
}

interface Message {
    id: string;
    sender: 'customer' | 'provider' | 'system';
    senderName: string;
    content: string;
    timestamp: string;
    attachments?: {
        url: string;
        name: string;
        type: string;
    }[];
}

interface Bidder {
    id: string;
    name: string;
    companyName: string;
    avatar?: string;
    rating: number;
    reviewCount: number;
    verifiedProvider: boolean;
}

interface Bid {
    id: string;
    bidder: Bidder;
    amount: number;
    currency: string;
    estimatedTime: string;
    message?: string;
    createdAt: string;
    expires?: string;
    isInstantBook?: boolean;
    status: 'pending' | 'accepted' | 'rejected' | 'expired';
}

interface Booking {
    id: string;
    tracking_number: string;
    status: 'draft' | 'bidding' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'pending_payment' | 'processing_payment';
    created_at: string;
    request_type: string;
    service_type: string;
    vehicle_type: string;
    persons_required: number;
    estimated_travel_time: string;
    items: {
        id: string;
        name: string;
        quantity: number;
        dimensions?: string;
        weight?: string;
        photos?: string[];
        special_instructions?: string;
        needs_disassembly?: boolean;
        fragile?: boolean;
    }[];
    all_locations: {
        address: string;
        type: string;
        items_count: number;
        instructions: string;
    }[];

    // Locations
    pickupAddress: Address;
    deliveryAddress: Address;
    distance: number;

    // Timing
    pickupDate: string;
    pickupWindow: string;
    deliveryDate: string;
    deliveryWindow: string;

    // Items
    itemDetails: ItemDetail[];
    totalVolume: string;

    // Provider
    provider?: Provider;

    // Customer
    customerName: string;
    customerPhone: string;
    customerEmail: string;

    // Other details
    specialInstructions?: string;
    milestones: BookingMilestone[];

    // Financial
    subtotal: number;
    taxes: number;
    fees: number;
    total: number;
    currency: string;
    payments: PaymentDetail[];

    // Communication
    messages: Message[];

    // Bids
    bids?: Bid[];
    totalBids?: number;

    // Stops
    stops: {
        type: 'pickup' | 'dropoff' | 'waypoint';
        address: string;
        property_type?: string;
        unit_number?: string;
        floor?: string;
        has_elevator?: boolean;
        parking_info?: string;
        number_of_rooms?: string;
        instructions?: string;
    }[];
    estimated_distance?: string;
    special_instructions?: string;

    // Missing properties for compatibility
    date?: string;
    pickupLocation?: string;
    dropoffLocation?: string;
    estimatedDeliveryTime?: string;
    trackingUpdates?: any[];
    itemType?: string;
    itemSize?: string;
    description?: string;
    price?: number;
}

interface AuthUser {
    user: {
        id: string;
        user_type: string;
    };
}

const BookingDetail: React.FC = () => {
    const auth = useAuthUser<AuthUser>();
    const user = auth?.user;
    console.log('user', user);
    const { id } = useParams<{ id: string }>();
    const [booking, setBooking] = useState<Booking | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [newMessage, setNewMessage] = useState('');
    const [expandedSections, setExpandedSections] = useState({
        details: true,
        items: true,
        timeline: true,
        payments: true,
        messages: true,
        bids: true,
    });
    const [activeTab, setActiveTab] = useState<'details' | 'messages' | 'tracking' | 'documents'>('details');
    const [userRole, setUserRole] = useState<'customer' | 'provider'>('customer');
    const [showProviderModal, setShowProviderModal] = useState(false);
    const [paymentLoading, setPaymentLoading] = useState(false);
    const [paymentError, setPaymentError] = useState<string | null>(null);

    // Add default values for potentially undefined properties
    const getBookingPrice = (booking: Booking | null) => {
        return booking?.total || 0;
    };

    const getBookingDate = (booking: Booking | null) => {
        return booking?.created_at ? new Date(booking.created_at) : new Date();
    };

    const getProviderRating = (provider: Provider | undefined) => {
        return provider?.rating || 0;
    };

    // Add status color definitions
    const getStatusColors = (status: string) => {
        switch (status) {
            case 'draft':
                return {
                    statusColor: 'gray',
                    statusColorDark: 'gray',
                    statusTextColor: 'gray-800',
                    statusTextColorDark: 'gray-300',
                    statusBgColor: 'gray-100',
                    statusBgColorDark: 'gray-800',
                };
            case 'bidding':
                return {
                    statusColor: 'yellow',
                    statusColorDark: 'yellow',
                    statusTextColor: 'yellow-800',
                    statusTextColorDark: 'yellow-300',
                    statusBgColor: 'yellow-100',
                    statusBgColorDark: 'yellow-900',
                };
            case 'confirmed':
                return {
                    statusColor: 'blue',
                    statusColorDark: 'blue',
                    statusTextColor: 'blue-800',
                    statusTextColorDark: 'blue-300',
                    statusBgColor: 'blue-100',
                    statusBgColorDark: 'blue-900',
                };
            case 'in_progress':
                return {
                    statusColor: 'purple',
                    statusColorDark: 'purple',
                    statusTextColor: 'purple-800',
                    statusTextColorDark: 'purple-300',
                    statusBgColor: 'purple-100',
                    statusBgColorDark: 'purple-900',
                };
            case 'completed':
                return {
                    statusColor: 'green',
                    statusColorDark: 'green',
                    statusTextColor: 'green-800',
                    statusTextColorDark: 'green-300',
                    statusBgColor: 'green-100',
                    statusBgColorDark: 'green-900',
                };
            case 'cancelled':
                return {
                    statusColor: 'red',
                    statusColorDark: 'red',
                    statusTextColor: 'red-800',
                    statusTextColorDark: 'red-300',
                    statusBgColor: 'red-100',
                    statusBgColorDark: 'red-900',
                };
            default:
                return {
                    statusColor: 'gray',
                    statusColorDark: 'gray',
                    statusTextColor: 'gray-800',
                    statusTextColorDark: 'gray-300',
                    statusBgColor: 'gray-100',
                    statusBgColorDark: 'gray-800',
                };
        }
    };

    // Get current status colors
    const statusColors = booking ? getStatusColors(booking.status) : getStatusColors('draft');
    const { statusColor, statusColorDark, statusTextColor, statusTextColorDark, statusBgColor, statusBgColorDark } = statusColors;

    const { data: bookingData, isLoading: bookkingLoading } = useSWR(`/requests/${id}/?user_id=${user?.id}`, fetcher);

    useEffect(() => {
        if (bookingData) {
            console.log('booking data', bookingData);
        }
    }, [bookingData]);
    const navigate = useNavigate();

    useEffect(() => {
        if (bookingData) {
            setBooking(bookingData);
        }
    }, [bookingData]);

    useEffect(() => {
        // Determine user role (in a real app, this would come from auth context)
        // For demo, let's add a URL param ?role=provider to test provider view
        const params = new URLSearchParams(window.location.search);
        if (params.get('role') === 'provider') {
            setUserRole('provider');
        }

        fetchBookingDetails();
    }, [id]);

    const fetchBookingDetails = async () => {
        try {
            setLoading(true);
            // Simulate API delay
            await new Promise((resolve) => setTimeout(resolve, 1000));

            // Conditional mock data based on a query parameter for testing
            const params = new URLSearchParams(window.location.search);
            let mockStatus = params.get('request_type') || 'bidding';

            // Validate the status
            if (!['pending', 'bidding', 'confirmed', 'in_progress', 'completed', 'cancelled'].includes(mockStatus)) {
                mockStatus = 'confirmed';
            }

            const mockBooking: Booking = {
                id: 'BK-12345',
                tracking_number: 'MV-89735462',
                status: mockStatus as any,
                created_at: '2025-03-15T10:30:00Z',
                request_type: 'Residential Moving',
                service_type: 'Large Van (3.5t Luton)',
                vehicle_type: 'Large Van (3.5t Luton)',
                persons_required: 2,
                estimated_travel_time: '4 hours 30 minutes',
                items: [
                    { id: 'item-001', name: 'Sofa (3-seater)', quantity: 1 },
                    { id: 'item-002', name: 'Dining Table', quantity: 1 },
                    { id: 'item-003', name: 'Dining Chairs', quantity: 6 },
                    { id: 'item-004', name: 'Bedroom Wardrobe', quantity: 1 },
                    { id: 'item-005', name: 'Queen-size Bed', quantity: 1 },
                    { id: 'item-006', name: 'Boxes (small)', quantity: 10 },
                    { id: 'item-007', name: 'Boxes (medium)', quantity: 8 },
                    { id: 'item-008', name: 'Television (50-inch)', quantity: 1 },
                ],
                all_locations: [
                    { address: '123 Main Street, Manchester, Greater Manchester, M1 2WD', type: 'pickup', items_count: 3, instructions: 'Ring the doorbell at entrance, 3rd floor' },
                    { address: 'Intermediate Stop 1', type: 'waypoint', items_count: 5, instructions: 'Please call ahead for access' },
                    { address: 'Intermediate Stop 2', type: 'waypoint', items_count: 3, instructions: 'Please bring your keys' },
                    { address: '456 Park Avenue, London, Greater London, W1T 7HF', type: 'dropoff', items_count: 2, instructions: 'Building has elevator access' },
                ],

                // Locations
                pickupAddress: {
                    street: '123 Main Street',
                    city: 'Manchester',
                    state: 'Greater Manchester',
                    zipCode: 'M1 2WD',
                    additionalInfo: 'Ring the doorbell at entrance, 3rd floor',
                },
                deliveryAddress: {
                    street: '456 Park Avenue',
                    city: 'London',
                    state: 'Greater London',
                    zipCode: 'W1T 7HF',
                    additionalInfo: 'Building has elevator access',
                },
                distance: 257,

                // Timing
                pickupDate: '2025-04-10',
                pickupWindow: '12:00 PM - 3:00 PM',
                deliveryDate: '2025-04-10',
                deliveryWindow: '6:00 PM - 9:00 PM',

                // Items
                itemDetails: [
                    { name: 'Sofa (3-seater)', quantity: 1, dimensions: '220 × 90 × 80 cm', weight: '45 kg', photos: ['https://via.placeholder.com/150'] },
                    { name: 'Dining Table', quantity: 1, dimensions: '180 × 90 × 75 cm', weight: '30 kg' },
                    { name: 'Dining Chairs', quantity: 6, dimensions: '45 × 50 × 90 cm', weight: '5 kg each' },
                    { name: 'Bedroom Wardrobe', quantity: 1, dimensions: '150 × 58 × 200 cm', weight: '65 kg', specialInstructions: 'Needs to be disassembled' },
                    { name: 'Queen-size Bed', quantity: 1, dimensions: '160 × 200 × 40 cm', weight: '50 kg' },
                    { name: 'Boxes (small)', quantity: 10, dimensions: '40 × 40 × 40 cm', weight: '5-10 kg each' },
                    { name: 'Boxes (medium)', quantity: 8, dimensions: '60 × 60 × 60 cm', weight: '10-15 kg each' },
                    { name: 'Television (50-inch)', quantity: 1, dimensions: '112 × 10 × 65 cm', weight: '15 kg', specialInstructions: 'Fragile' },
                ],
                totalVolume: '22.5 cubic meters',

                // Provider
                provider: {
                    id: 'PRV-789',
                    name: 'Michael Johnson',
                    companyName: 'Express Movers Ltd',
                    phone: '+44 7700 900123',
                    email: 'contact@expressmovers.co.uk',
                    avatar: 'https://randomuser.me/api/portraits/men/32.jpg',
                    profileImage: 'https://via.placeholder.com/150',
                    rating: 4.8,
                    reviewCount: 176,
                    verifiedProvider: true,
                    verified: true,
                    vehicleType: 'Large Van (3.5t Luton)',
                    capacity: '3.5t',
                    serviceRadius: 100,
                    reviews: [],
                    price: 0,
                },

                // Customer
                customerName: 'Emma Wilson',
                customerPhone: '+44 7700 900456',
                customerEmail: 'emma.wilson@example.com',

                // Other details
                specialInstructions:
                    'Please handle the TV with extra care. The wardrobe needs to be disassembled before moving. Both buildings have elevators, but please bring furniture protection blankets for the walls just in case.',
                milestones: [
                    { id: 'm1', milestone_type: 'Booking Created', status: 'completed', scheduled_start: '2025-03-15T10:30:00Z', description: 'Booking was created and confirmed' },
                    { id: 'm2', milestone_type: 'Driver Assigned', status: 'completed', scheduled_start: '2025-03-16T14:22:00Z', description: 'Professional mover assigned to your booking' },
                    { id: 'm3', milestone_type: 'Pickup', status: 'upcoming', scheduled_start: '2025-04-10T12:00:00Z', description: 'Items will be collected from origin' },
                    { id: 'm4', milestone_type: 'In Transit', status: 'upcoming', description: 'Your items are being transported' },
                    { id: 'm5', milestone_type: 'Delivery', status: 'upcoming', scheduled_start: '2025-04-10T18:00:00Z', description: 'Items will be delivered to destination' },
                    { id: 'm6', milestone_type: 'Completed', status: 'upcoming', description: 'Booking completed successfully' },
                ],

                // Financial
                subtotal: 375.0,
                taxes: 75.0,
                fees: 25.0,
                total: 475.0,
                currency: 'GBP',
                payments: [
                    { id: 'pay1', type: 'deposit', amount: 95.0, currency: 'GBP', status: 'paid', date: '2025-03-15T10:45:00Z', paymentMethod: 'Credit Card (Visa **** 1234)', receiptUrl: '#' },
                    { id: 'pay2', type: 'final', amount: 380.0, currency: 'GBP', status: 'pending', dueDate: '2025-04-10T12:00:00Z' },
                ],

                // Communication
                messages: [
                    {
                        id: 'msg1',
                        sender: 'system',
                        senderName: 'TradeHut System',
                        content: 'Your booking has been confirmed. Your confirmation number is MV-89735462.',
                        timestamp: '2025-03-15T10:35:00Z',
                    },
                    {
                        id: 'msg2',
                        sender: 'provider',
                        senderName: 'Michael Johnson',
                        content: "Hello! I'm Michael and I'll be handling your move. Do you have any specific requirements I should know about?",
                        timestamp: '2025-03-16T15:10:00Z',
                    },
                    {
                        id: 'msg3',
                        sender: 'customer',
                        senderName: 'Emma Wilson',
                        content: 'Hi Michael, thanks for reaching out! Yes, the TV is quite new and expensive, so extra padding would be appreciated.',
                        timestamp: '2025-03-16T15:45:00Z',
                    },
                    {
                        id: 'msg4',
                        sender: 'provider',
                        senderName: 'Michael Johnson',
                        content: "No problem at all. We'll bring extra protective materials for the TV. Looking forward to helping with your move!",
                        timestamp: '2025-03-16T16:20:00Z',
                        attachments: [{ url: 'https://via.placeholder.com/150', name: 'packing_guide.pdf', type: 'application/pdf' }],
                    },
                ],

                // Stops
                stops: [
                    {
                        type: 'pickup',
                        address: '123 Main Street, Manchester, Greater Manchester, M1 2WD',
                        property_type: 'Residential',
                        unit_number: '3rd floor',
                        floor: 'Ground',
                        has_elevator: true,
                        parking_info: 'Building has elevator access',
                        number_of_rooms: '2',
                        instructions: 'Ring the doorbell at entrance',
                    },
                    {
                        type: 'waypoint',
                        address: 'Intermediate Stop 1',
                        property_type: 'Commercial',
                        unit_number: 'Unit 101',
                        floor: '2nd floor',
                        has_elevator: true,
                        parking_info: 'Parking available',
                        number_of_rooms: '5',
                        instructions: 'Please call ahead for access',
                    },
                    {
                        type: 'waypoint',
                        address: 'Intermediate Stop 2',
                        property_type: 'Residential',
                        unit_number: '4th floor',
                        floor: '3rd floor',
                        has_elevator: true,
                        parking_info: 'Building has elevator access',
                        number_of_rooms: '3',
                        instructions: 'Please bring your keys',
                    },
                    {
                        type: 'dropoff',
                        address: '456 Park Avenue, London, Greater London, W1T 7HF',
                        property_type: 'Residential',
                        unit_number: 'Apartment 123',
                        floor: '1st floor',
                        has_elevator: true,
                        parking_info: 'Building has elevator access',
                        number_of_rooms: '2',
                        instructions: 'Building has elevator access',
                    },
                ],
                estimated_distance: '257km',
                special_instructions: 'Handle TV with care, disassemble wardrobe, bring furniture protection blankets.',

                // Missing properties for compatibility
                date: '2025-03-15T10:30:00Z',
                pickupLocation: '123 Main Street, Manchester, Greater Manchester, M1 2WD',
                dropoffLocation: '456 Park Avenue, London, Greater London, W1T 7HF',
                estimatedDeliveryTime: '2025-04-10T18:00:00Z',
                trackingUpdates: [
                    { status: 'confirmed', description: 'Booking confirmed', timestamp: '2025-03-15T10:35:00Z' },
                    { status: 'picked_up', description: 'Items picked up from origin', timestamp: '2025-04-10T12:00:00Z' },
                    { status: 'in_transit', description: 'Items in transit', timestamp: '2025-04-10T14:00:00Z' },
                    { status: 'delivered', description: 'Items delivered to destination', timestamp: '2025-04-10T18:00:00Z' },
                ],
                itemType: 'Residential Moving',
                itemSize: 'Large Van (3.5t Luton)',
                description: 'Moving from Manchester to London',
                price: 475.0,
            };

            // setBooking(mockBooking);
            setLoading(false);
        } catch (err) {
            console.error('Error fetching booking details:', err);
            setError('Failed to load booking details. Please try again.');
            setLoading(false);
        }
    };

    const handleSendMessage = (e: React.FormEvent) => {
        e.preventDefault();

        if (!newMessage.trim() || !booking) return;

        // Generate a new message
        const newMsg: Message = {
            id: `msg-${Date.now()}`,
            sender: userRole,
            senderName: userRole === 'customer' ? booking.customerName : booking.provider?.name || 'Provider',
            content: newMessage,
            timestamp: new Date().toISOString(),
        };

        // Update state with the new message
        setBooking({
            ...booking,
            messages: [...booking.messages, newMsg],
        });

        // Clear the input field
        setNewMessage('');
    };

    const toggleSection = (section: keyof typeof expandedSections) => {
        setExpandedSections({
            ...expandedSections,
            [section]: !expandedSections[section],
        });
    };

    const getStatusColor = (status?: string) => {
        switch (status) {
            case 'draft':
                return 'bg-gray-100 text-gray-800';
            case 'bidding':
                return 'bg-yellow-100 text-yellow-800';
            case 'confirmed':
                return 'bg-blue-100 text-blue-800';
            case 'in_progress':
                return 'bg-purple-100 text-purple-800';
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'cancelled':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const formatStatus = (status: string): string => {
        switch (status) {
            case 'draft':
                return 'Draft';
            case 'bidding':
                return 'Bidding';
            case 'confirmed':
                return 'Confirmed';
            case 'in_progress':
                return 'In Progress';
            case 'completed':
                return 'Completed';
            case 'cancelled':
                return 'Cancelled';
            default:
                return status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ');
        }
    };

    // Add handlers for booking actions
    const handleCancelBooking = async () => {
        if (!booking) return;

        const confirmed = window.confirm('Are you sure you want to cancel this booking? This action cannot be undone.');
        if (!confirmed) return;

        try {
            // In a real app, this would make an API call
            console.log('Cancelling booking:', booking.id);
            // You would call your API here like:
            // await axiosInstance.post(`/requests/${booking.id}/cancel`);

            // For now, just show a success message
            alert('Booking cancelled successfully. You will be redirected to your bookings page.');
            navigate('/account/bookings');
        } catch (error) {
            console.error('Error cancelling booking:', error);
            alert('Failed to cancel booking. Please try again or contact support.');
        }
    };

    const handleModifyBooking = () => {
        if (!booking) return;

        // Navigate to the edit request page with the booking data
        navigate(`/service-request/edit/${booking.id}`, {
            state: {
                bookingData: booking,
                isModification: true,
            },
        });
    };

    const handleContactDriver = () => {
        if (!booking?.provider?.phone) {
            alert('Driver contact information is not available.');
            return;
        }

        const confirmed = window.confirm(`Call ${booking.provider.name} at ${booking.provider.phone}?`);
        if (confirmed) {
            window.open(`tel:${booking.provider.phone}`);
        }
    };

    const handleLeaveReview = () => {
        navigate(`/account/bookings/${booking?.id}/review`);
    };

    const handleViewReceipt = () => {
        navigate(`/account/bookings/${booking?.id}/receipt`);
    };

    // Enhanced payment handler that updates booking status and initiates Stripe Checkout
    const handlePayNow = async (amount?: number) => {
        if (!booking || !user) return;

        try {
            setPaymentLoading(true);
            setPaymentError(null);

            const paymentAmount = amount || booking.total || booking.price || 0;

            if (paymentAmount <= 0) {
                throw new Error('Invalid payment amount');
            }

            // Update booking status to indicate payment is being processed
            try {
                // Optional: Update booking status to 'processing_payment' or similar
                // This depends on your backend API
                await fetcher(`/requests/${booking.id}/`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        status: 'processing_payment', // or whatever status indicates payment in progress
                        payment_initiated_at: new Date().toISOString(),
                    }),
                });
            } catch (updateError) {
                console.warn('Failed to update booking status, continuing with payment:', updateError);
                // Continue with payment even if status update fails
            }

            // Create checkout session and redirect to Stripe
            const session = await paymentService.createCheckoutSession({
                request_id: booking.id,
                amount: paymentAmount,
                currency: booking.currency || 'USD',
                success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
                cancel_url: `${window.location.origin}/payment/cancel?booking_id=${booking.id}`,
                description: `Payment for ${booking.request_type} - Booking ${booking.tracking_number}`,
            });

            // Immediately redirect to Stripe Checkout (no modal needed)
            window.location.href = session.url;
        } catch (error) {
            console.error('Payment error:', error);
            setPaymentError(error instanceof Error ? error.message : 'Failed to initiate payment');
            setPaymentLoading(false);
        }
        // Note: We don't set setPaymentLoading(false) in finally because we're redirecting
    };

    // Updated "Book Now" button handler - handles both booking AND payment in one action
    const handleBookNow = async () => {
        if (!booking || !user) return;

        try {
            setPaymentLoading(true);
            setPaymentError(null);

            const paymentAmount = booking.total || booking.price || 0;

            if (paymentAmount <= 0) {
                throw new Error('Invalid payment amount');
            }

            // Step 1: Confirm booking if it's in draft status
            if (booking.status === 'draft') {
                try {
                    await fetcher(`/requests/${booking.id}/`, {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            status: 'confirmed',
                            confirmed_at: new Date().toISOString(),
                        }),
                    });
                } catch (updateError) {
                    console.error('Failed to confirm booking:', updateError);
                    throw new Error('Failed to confirm booking. Please try again.');
                }
            }

            // Step 2: Update status to processing payment
            try {
                await fetcher(`/requests/${booking.id}/`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        status: 'processing_payment',
                        payment_initiated_at: new Date().toISOString(),
                    }),
                });
            } catch (updateError) {
                console.warn('Failed to update payment status, continuing with payment:', updateError);
            }

            // Step 3: Create Stripe Checkout session and redirect
            const session = await paymentService.createCheckoutSession({
                request_id: booking.id,
                amount: paymentAmount,
                currency: booking.currency || 'USD',
                success_url: `${window.location.origin}/payment/success?session_id={CHECKOUT_SESSION_ID}&booking_id=${booking.id}`,
                cancel_url: `${window.location.origin}/payment/cancel?booking_id=${booking.id}`,
                description: `Book & Pay for ${booking.request_type} - Booking ${booking.tracking_number}`,
            });

            // Immediately redirect to Stripe Checkout
            window.location.href = session.url;
        } catch (error) {
            console.error('Book now error:', error);
            setPaymentError(error instanceof Error ? error.message : 'Failed to process booking');
            setPaymentLoading(false);
        }
    };

    const getStatusActions = () => {
        if (!booking) return null;

        if (user?.user_type === 'customer') {
            switch (booking?.status) {
                case 'draft':
                case 'pending_payment':
                    return (
                        <div className="flex flex-wrap gap-3">
                            {/* Primary "Book Now" button that handles everything */}
                            {(booking.total || booking.price) && (booking.total > 0 || (booking.price && booking.price > 0)) && (
                                <button
                                    onClick={handleBookNow}
                                    disabled={paymentLoading}
                                    className="inline-flex items-center bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 disabled:from-green-300 disabled:to-emerald-400 text-white px-8 py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-xl hover:shadow-2xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
                                >
                                    {paymentLoading ? (
                                        <>
                                            <IconLoader className="w-6 h-6 mr-3 animate-spin" />
                                            {booking.status === 'draft' ? 'Booking & Redirecting to Payment...' : 'Redirecting to Payment...'}
                                        </>
                                    ) : (
                                        <>
                                            <IconCircleCheck className="w-6 h-6 mr-3" />
                                            Book Now - {renderPrice(booking.total || booking.price || 0)}
                                        </>
                                    )}
                                </button>
                            )}

                            {/* Secondary actions */}
                            <button
                                onClick={() => navigate(`/account/bids/${booking?.id}`)}
                                className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <IconEye className="w-4 h-4 mr-2" />
                                View Bids
                            </button>
                            <button
                                onClick={handleModifyBooking}
                                className="inline-flex items-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <IconEdit className="w-4 h-4 mr-2" />
                                Edit Request
                            </button>
                            <button
                                onClick={handleCancelBooking}
                                className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <IconBan className="w-4 h-4 mr-2" />
                                Cancel
                            </button>
                        </div>
                    );
                case 'bidding':
                    return (
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => navigate(`/account/bids/${booking?.id}`)}
                                className="inline-flex items-center bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                                <IconEye className="w-5 h-5 mr-2" />
                                View & Accept Bids
                            </button>
                            <button
                                onClick={handleModifyBooking}
                                className="inline-flex items-center bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <IconEdit className="w-4 h-4 mr-2" />
                                Edit Request
                            </button>
                        </div>
                    );
                case 'confirmed':
                    return (
                        <div className="flex flex-wrap gap-3">
                            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 flex items-center">
                                <IconCircleCheck className="w-5 h-5 text-green-600 dark:text-green-400 mr-2" />
                                <span className="text-green-800 dark:text-green-200 font-medium">Booking Confirmed & Paid</span>
                            </div>
                            <button
                                onClick={handleModifyBooking}
                                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <IconEdit className="w-4 h-4 mr-2" />
                                Modify Details
                            </button>
                            <button
                                onClick={handleCancelBooking}
                                className="inline-flex items-center bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <IconBan className="w-4 h-4 mr-2" />
                                Cancel Booking
                            </button>
                        </div>
                    );
                case 'in_progress':
                    return (
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleContactDriver}
                                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <IconPhone className="w-4 h-4 mr-2" />
                                Contact Driver
                            </button>
                        </div>
                    );
                case 'completed':
                    return (
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={handleLeaveReview}
                                className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <IconStar className="w-4 h-4 mr-2" />
                                Leave Review
                            </button>
                            <button
                                onClick={handleViewReceipt}
                                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <IconFileText className="w-4 h-4 mr-2" />
                                View Receipt
                            </button>
                            <Link
                                to={`/disputes?bookingId=${booking?.id}`}
                                className="inline-flex items-center bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md"
                            >
                                <IconGavel className="w-4 h-4 mr-2" />
                                Raise Dispute
                            </Link>
                        </div>
                    );
                default:
                    return null;
            }
        } else {
            // Provider actions remain the same
            switch (booking?.status) {
                case 'bidding':
                    return (
                        <div className="flex flex-wrap gap-3">
                            <button className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md">
                                <IconCurrency className="w-4 h-4 mr-2" />
                                Submit Bid
                            </button>
                            <button className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md">
                                <IconEye className="w-4 h-4 mr-2" />
                                View Job Details
                            </button>
                        </div>
                    );
                case 'confirmed':
                    return (
                        <div className="flex flex-wrap gap-3">
                            <button className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md">
                                <IconCircleCheck className="w-4 h-4 mr-2" />
                                Complete Job
                            </button>
                        </div>
                    );
                case 'in_progress':
                    return (
                        <div className="flex flex-wrap gap-3">
                            <button className="inline-flex items-center bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md">
                                <IconCamera className="w-4 h-4 mr-2" />
                                Upload Photos
                            </button>
                            <button className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md">
                                <IconCircleCheck className="w-4 h-4 mr-2" />
                                Complete Job
                            </button>
                        </div>
                    );
                case 'completed':
                    return (
                        <div className="flex flex-wrap gap-3">
                            <button className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 shadow-sm hover:shadow-md">
                                <IconFileText className="w-4 h-4 mr-2" />
                                View Job Summary
                            </button>
                        </div>
                    );
                default:
                    return null;
            }
        }
    };

    const formatDate = (dateString?: string) => {
        try {
            const date = parseISO(dateString || '');
            return format(date, 'PPP');
        } catch (e) {
            return dateString || '';
        }
    };

    const formatTime = (dateString?: string) => {
        try {
            const date = parseISO(dateString || '');
            return format(date, 'p');
        } catch (e) {
            return '';
        }
    };

    const formatDateTime = (dateString?: string) => {
        try {
            const date = parseISO(dateString || '');
            return format(date, 'PPp');
        } catch (e) {
            return dateString || '';
        }
    };

    const getRelativeTime = (dateString?: string) => {
        try {
            const date = parseISO(dateString || '');
            return formatDistanceToNow(date, { addSuffix: true });
        } catch (e) {
            return '';
        }
    };

    // Update the price display sections
    const renderPrice = (price: number | undefined) => {
        return `GHS ${(price || 0).toFixed(2)}`;
    };

    // Add helper functions for provider data
    const getProviderProfileImage = (provider: Provider | undefined) => {
        return provider?.profileImage || provider?.avatar || 'https://via.placeholder.com/60';
    };

    const getProviderName = (provider: Provider | undefined) => {
        return provider?.name || 'Unknown Provider';
    };

    const getProviderPhone = (provider: Provider | undefined) => {
        return provider?.phone || '';
    };

    const getProviderVehicleType = (provider: Provider | undefined) => {
        return provider?.vehicleType || 'Not specified';
    };

    const getProviderReviewsCount = (provider: Provider | undefined) => {
        return provider?.reviewCount || 0;
    };

    if (loading) {
        return (
            <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 flex justify-center items-center p-4">
                <div className="text-center">
                    <IconLoader className="animate-spin" />
                </div>
            </div>
        );
    }

    if (error || !booking) {
        return (
            <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900 p-4">
                <div className="max-w-7xl mx-auto py-16">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-red-200 dark:border-red-800 rounded-2xl p-12 text-center shadow-xl dark:shadow-gray-900/50"
                    >
                        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                            <IconAlertTriangle className="w-8 h-8 text-red-600 dark:text-red-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-red-800 dark:text-red-200 mb-3">Unable to load booking</h3>
                        <p className="text-red-600 dark:text-red-300 mb-8 text-lg">{error || 'Booking not found'}</p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <button
                                onClick={() => navigate(-1)}
                                className="inline-flex items-center px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 transition-all duration-300 font-semibold"
                            >
                                <IconArrowLeft className="w-5 h-5 mr-2" />
                                Go Back
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl transition-all duration-300 font-semibold"
                            >
                                Try Again
                            </button>
                        </div>
                    </motion.div>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-slate-900">
            <div className="max-w-7xl mx-auto px-4 py-8">
                {/* Payment error alert */}
                {paymentError && (
                    <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                        <div className="flex items-center">
                            <IconAlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mr-3" />
                            <div>
                                <h3 className="text-red-800 dark:text-red-200 font-medium">Payment Error</h3>
                                <p className="text-red-700 dark:text-red-300 text-sm">{paymentError}</p>
                            </div>
                            <button onClick={() => setPaymentError(null)} className="ml-auto text-red-400 hover:text-red-600">
                                <IconX className="w-5 h-5" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Mobile tabs */}
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="md:hidden mb-6">
                    <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl dark:shadow-gray-900/50 border border-white/20 dark:border-gray-700/50 rounded-2xl overflow-hidden">
                        <div className="flex">
                            <button
                                className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-300 ${
                                    activeTab === 'details'
                                        ? 'bg-secondary-500 text-white shadow-lg'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                onClick={() => setActiveTab('details')}
                            >
                                <IconInfoCircle className="w-5 h-5 mx-auto mb-1" />
                                Details
                            </button>
                            <button
                                className={`flex-1 py-4 px-6 text-center font-semibold transition-all duration-300 ${
                                    activeTab === 'messages'
                                        ? 'bg-secondary-500 text-white shadow-lg'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                                }`}
                                onClick={() => setActiveTab('messages')}
                            >
                                <IconMessages className="w-5 h-5 mx-auto mb-1" />
                                Messages
                                <span className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs rounded-full px-2 py-0.5 font-bold">{booking?.messages?.length || 0}</span>
                            </button>
                        </div>
                    </div>
                </motion.div>

                {/* Main content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Main column - booking details */}
                    <div className={`lg:col-span-2 space-y-6 ${activeTab !== 'details' && 'hidden md:block'}`}>
                        {/* Enhanced Booking header with integrated timeline */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-gradient-to-br from-secondary-400 via-secondary-500 to-secondary-600 dark:from-secondary-600 dark:via-secondary-700 dark:to-secondary-800 rounded-2xl shadow-xl dark:shadow-gray-900/50 overflow-hidden"
                        >
                            {/* Main header content */}
                            <div className="p-6 text-white">
                                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6">
                                    <div className="flex items-center gap-4">
                                        {/* Back navigation integrated into header */}
                                        <Link
                                            to={userRole === 'customer' ? '/account/bookings' : '/provider/jobs'}
                                            className="inline-flex items-center p-2 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl text-white hover:bg-white/30 transition-all duration-300 shadow-lg hover:shadow-xl dark:shadow-gray-900/30 dark:hover:shadow-gray-900/50 transform hover:-translate-y-0.5"
                                        >
                                            <IconArrowLeft className="w-5 h-5" />
                                        </Link>
                                        <div>
                                            <h1 className="text-3xl font-bold text-white mb-2">Booking #{booking?.tracking_number}</h1>
                                            <p className="text-white/90 text-lg">Created on {formatDateTime(booking?.created_at)}</p>
                                        </div>
                                    </div>
                                    <div className="mt-2 sm:mt-0 px-4 py-2 rounded-full text-sm font-semibold bg-white/20 backdrop-blur-sm border border-white/30 text-white">
                                        {booking?.request_type?.charAt(0).toUpperCase() + booking?.request_type?.slice(1).replace('_', ' ')}
                                    </div>
                                </div>

                                {/* Journey stats with glass morphism */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                                <IconMapPin className="text-white w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/80">Stops</p>
                                                <p className="font-semibold text-white text-lg">{booking?.stops?.length || 0}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                                <IconBox className="text-white w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/80">Total Items</p>
                                                <p className="font-semibold text-white text-lg">{booking?.items?.length || 0}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                                <IconTruck className="text-white w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/80">Service Type</p>
                                                <p className="font-semibold text-white text-sm">{booking?.service_type || 'Standard'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                                        <div className="flex items-center">
                                            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center mr-3">
                                                <IconCircleCheck className="text-white w-5 h-5" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-white/80">Status</p>
                                                <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold bg-white/20 text-white border border-white/30">
                                                    {booking?.status?.charAt(0).toUpperCase() + booking?.status?.slice(1).replace(/_/g, ' ')}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Additional details row */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl flex items-center border border-white/20">
                                        <IconTruck className="text-white mr-3 w-5 h-5" />
                                        <div>
                                            <div className="text-xs text-white/80">Vehicle Type</div>
                                            <div className="text-sm font-semibold text-white">{booking?.vehicle_type || 'Standard Van'}</div>
                                        </div>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl flex items-center border border-white/20">
                                        <IconUser className="text-white mr-3 w-5 h-5" />
                                        <div>
                                            <div className="text-xs text-white/80">Staff Required</div>
                                            <div className="text-sm font-semibold text-white">{booking?.persons_required || 1}</div>
                                        </div>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl flex items-center border border-white/20">
                                        <IconRoute className="text-white mr-3 w-5 h-5" />
                                        <div>
                                            <div className="text-xs text-white/80">Distance</div>
                                            <div className="text-sm font-semibold text-white">{booking?.distance || 0}km</div>
                                        </div>
                                    </div>

                                    <div className="bg-white/10 backdrop-blur-sm p-4 rounded-xl flex items-center border border-white/20">
                                        <IconClock className="text-white mr-3 w-5 h-5" />
                                        <div>
                                            <div className="text-xs text-white/80">Est. Travel Time</div>
                                            <div className="text-sm font-semibold text-white">{booking?.estimated_travel_time || 'Calculating...'}</div>
                                        </div>
                                    </div>
                                </div>

                                {/* Status actions */}
                                <div className="flex flex-wrap gap-3">{getStatusActions()}</div>
                            </div>
                        </motion.div>

                        {/* Journey summary - Enhanced for item-specific pickup/dropoff points */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 p-6 mb-6">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                                Move Summary - {booking?.request_type === 'instant' ? 'Instant Booking' : booking?.request_type || 'Residential Moving'} • {booking?.service_type || 'Standard Service'}
                            </h2>

                            {/* Journey route visualization with stops */}
                            <div className="relative mb-6">
                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-100 dark:bg-blue-800"></div>

                                {/* Stop items in sequence */}
                                <div className="space-y-6">
                                    {booking?.stops?.map((stop, index) => (
                                        <div key={stop.type + index} className="relative pl-10">
                                            {/* Timeline marker */}
                                            <div
                                                className={`absolute left-0 top-0 w-8 h-8 rounded-full flex items-center justify-center shadow-lg ${
                                                    stop.type === 'pickup' ? 'bg-blue-500 text-white' : stop.type === 'dropoff' ? 'bg-green-500 text-white' : 'bg-orange-500 text-white'
                                                }`}
                                            >
                                                <span className="text-xs font-bold">{index + 1}</span>
                                            </div>

                                            {/* Stop details */}
                                            <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 mb-2 border border-gray-200 dark:border-gray-700">
                                                <div className="w-full">
                                                    <div className="flex items-center mb-3">
                                                        <span
                                                            className={`px-3 py-1 text-xs font-semibold rounded-full ${
                                                                stop.type === 'pickup'
                                                                    ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                                    : stop.type === 'dropoff'
                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                    : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                                            }`}
                                                        >
                                                            {stop.type.charAt(0).toUpperCase() + stop.type.slice(1)}
                                                        </span>
                                                        <h3 className="ml-3 font-semibold text-gray-900 dark:text-white">
                                                            {stop.address && stop.address.trim() !== ''
                                                                ? stop.address
                                                                : stop.type === 'pickup'
                                                                ? booking?.pickupAddress
                                                                    ? `${booking.pickupAddress.street}, ${booking.pickupAddress.city}, ${booking.pickupAddress.state} ${booking.pickupAddress.zipCode}`
                                                                    : 'Pickup location to be confirmed'
                                                                : stop.type === 'dropoff'
                                                                ? booking?.deliveryAddress
                                                                    ? `${booking.deliveryAddress.street}, ${booking.deliveryAddress.city}, ${booking.deliveryAddress.state} ${booking.deliveryAddress.zipCode}`
                                                                    : 'Delivery location to be confirmed'
                                                                : 'Location to be confirmed'}
                                                        </h3>
                                                    </div>

                                                    {/* Property Details in a more compact grid */}
                                                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                                                        <div className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                                                            <div className="flex items-center">
                                                                <IconBuilding className="text-gray-400 dark:text-gray-500 mr-1 w-3 h-3" />
                                                                <span className="text-gray-500 dark:text-gray-400 text-xs">Property:</span>
                                                            </div>
                                                            <span className="font-medium text-gray-900 dark:text-white text-xs">
                                                                {stop.property_type ? stop.property_type.charAt(0).toUpperCase() + stop.property_type.slice(1) : 'Residential'}
                                                            </span>
                                                        </div>

                                                        <div className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                                                            <div className="flex items-center">
                                                                <IconStairs className="text-gray-400 dark:text-gray-500 mr-1 w-3 h-3" />
                                                                <span className="text-gray-500 dark:text-gray-400 text-xs">Floor:</span>
                                                            </div>
                                                            <span className="font-medium text-gray-900 dark:text-white text-xs">{stop.floor || 'Ground Floor'}</span>
                                                        </div>

                                                        <div className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                                                            <div className="flex items-center">
                                                                <IconElevator className="text-gray-400 dark:text-gray-500 mr-1 w-3 h-3" />
                                                                <span className="text-gray-500 dark:text-gray-400 text-xs">Elevator:</span>
                                                            </div>
                                                            <span className={`font-medium text-xs ${stop.has_elevator ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                                                                {stop.has_elevator ? 'Available' : 'Not Available'}
                                                            </span>
                                                        </div>

                                                        {stop.unit_number && (
                                                            <div className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                                                                <div className="flex items-center">
                                                                    <IconDoor className="text-gray-400 dark:text-gray-500 mr-1 w-3 h-3" />
                                                                    <span className="text-gray-500 dark:text-gray-400 text-xs">Unit:</span>
                                                                </div>
                                                                <span className="font-medium text-gray-900 dark:text-white text-xs">{stop.unit_number}</span>
                                                            </div>
                                                        )}

                                                        {stop.parking_info && stop.parking_info !== 'Not specified' && (
                                                            <div className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                                                                <div className="flex items-center">
                                                                    <IconCar className="text-gray-400 dark:text-gray-500 mr-1 w-3 h-3" />
                                                                    <span className="text-gray-500 dark:text-gray-400 text-xs">Parking:</span>
                                                                </div>
                                                                <span className="font-medium text-gray-900 dark:text-white text-xs">{stop.parking_info}</span>
                                                            </div>
                                                        )}

                                                        {stop.number_of_rooms && stop.number_of_rooms !== 'Not specified' && (
                                                            <div className="bg-white dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                                                                <div className="flex items-center">
                                                                    <IconHome className="text-gray-400 dark:text-gray-500 mr-1 w-3 h-3" />
                                                                    <span className="text-gray-500 dark:text-gray-400 text-xs">Rooms:</span>
                                                                </div>
                                                                <span className="font-medium text-gray-900 dark:text-white text-xs">{stop.number_of_rooms}</span>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Additional Instructions */}
                                                    {stop.instructions && stop.instructions.trim() !== '' && (
                                                        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                                                            <div className="flex items-start">
                                                                <IconInfoCircle className="text-blue-500 dark:text-blue-400 mr-2 w-4 h-4 flex-shrink-0 mt-0.5" />
                                                                <div>
                                                                    <span className="text-blue-800 dark:text-blue-200 font-medium text-sm">Special Instructions:</span>
                                                                    <p className="mt-1 text-blue-700 dark:text-blue-300 text-sm">{stop.instructions}</p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Items at this stop - shown when available */}
                                            {index === 0 && booking?.items && booking?.items.length > 0 && (
                                                <div className="ml-4 mt-3 mb-4">
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                                        <IconBox className="text-blue-500 mr-2 w-4 h-4" />
                                                        Items to be picked up
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {booking?.items?.map((item) => (
                                                            <div key={item.id} className="bg-blue-50 dark:bg-blue-900/20 p-3 border border-blue-200 dark:border-blue-800 rounded-lg">
                                                                <div className="flex items-start">
                                                                    <IconBox className="text-blue-500 dark:text-blue-400 mr-2 w-4 h-4 flex-shrink-0 mt-0.5" />
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">{item.name}</p>
                                                                        <p className="text-xs text-blue-700 dark:text-blue-300">Quantity: {item.quantity}</p>
                                                                        {item.dimensions && (
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    {(() => {
                                        const dims = item.dimensions;
                                        if (!dims) return 'N/A';
                                        
                                        if (typeof dims === 'string') {
                                            // Try to parse string format
                                            const match = dims.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
                                            if (match) {
                                                const [, width, height, length, unit] = match;
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit}`;
                                            }
                                            return dims;
                                        }
                                        
                                        if (typeof dims === 'object') {
                                            const { unit, width, height, length } = dims as any;
                                            if (width && height && length) {
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
                                            }
                                        }
                                        
                                        return 'N/A';
                                    })()}
                                </p>
                            )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}

                                            {/* For dropoff stops, indicate what items will be dropped off */}
                                            {stop.type === 'dropoff' && booking?.items && booking?.items.length > 0 && (
                                                <div className="ml-4 mt-3 mb-4">
                                                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center">
                                                        <IconBox className="text-green-500 mr-2 w-4 h-4" />
                                                        Items to be delivered
                                                    </h4>
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                                        {booking.items.map((item) => (
                                                            <div key={item.id} className="bg-green-50 dark:bg-green-900/20 p-3 border border-green-200 dark:border-green-800 rounded-lg">
                                                                <div className="flex items-start">
                                                                    <IconBox className="text-green-500 dark:text-green-400 mr-2 w-4 h-4 flex-shrink-0 mt-0.5" />
                                                                    <div className="flex-1">
                                                                        <p className="text-sm font-medium text-green-900 dark:text-green-100">{item.name}</p>
                                                                        <p className="text-xs text-green-700 dark:text-green-300">Quantity: {item.quantity}</p>
                                                                        {item.dimensions && (
                                <p className="text-xs text-green-600 dark:text-green-400">
                                    {(() => {
                                        const dims = item.dimensions;
                                        if (!dims) return 'N/A';
                                        
                                        if (typeof dims === 'string') {
                                            // Try to parse string format
                                            const match = dims.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
                                            if (match) {
                                                const [, width, height, length, unit] = match;
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit}`;
                                            }
                                            return dims;
                                        }
                                        
                                        if (typeof dims === 'object') {
                                            const { unit, width, height, length } = dims as any;
                                            if (width && height && length) {
                                                const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
                                            }
                                        }
                                        
                                        return 'N/A';
                                    })()}
                                </p>
                            )}
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Advanced Journey Details - only if available and meaningful */}
                            {booking?.all_locations &&
                                booking?.all_locations.length > 0 &&
                                booking.all_locations.some(
                                    (location) =>
                                        (location.items_count && location.items_count > 0) ||
                                        (location.instructions && location.instructions.trim() !== '' && location.instructions !== 'No special instructions')
                                ) && (
                                    <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
                                        <h3 className="text-md font-medium text-gray-900 dark:text-white mb-3">Item-Specific Locations</h3>
                                        <div className="overflow-auto">
                                            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                <thead className="bg-gray-50 dark:bg-gray-800">
                                                    <tr>
                                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                            Location
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                            Type
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                            Items
                                                        </th>
                                                        <th scope="col" className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                            Instructions
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                    {booking.all_locations
                                                        .filter(
                                                            (location) =>
                                                                (location.items_count && location.items_count > 0) ||
                                                                (location.instructions && location.instructions.trim() !== '' && location.instructions !== 'No special instructions')
                                                        )
                                                        .map((location, idx) => (
                                                            <tr key={idx} className={idx % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-750'}>
                                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900 dark:text-white">{location.address || 'Unknown'}</td>
                                                                <td className="px-3 py-2 whitespace-nowrap">
                                                                    <span
                                                                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
                                                                            location.type === 'pickup'
                                                                                ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                                                                : location.type === 'dropoff'
                                                                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                                                                        }`}
                                                                    >
                                                                        {location.type}
                                                                    </span>
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                                                    {location.items_count && location.items_count > 0 ? `${location.items_count} items` : '-'}
                                                                </td>
                                                                <td className="px-3 py-2 whitespace-normal text-sm text-gray-500 dark:text-gray-400 max-w-xs">
                                                                    {location.instructions && location.instructions.trim() !== '' && location.instructions !== 'No special instructions'
                                                                        ? location.instructions
                                                                        : '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                )}
                        </div>

                        {/* Item details */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Items to Move</h2>
                                    <button
                                        onClick={() => toggleSection('items')}
                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors duration-200"
                                    >
                                        <IconChevronDown className="w-5 h-5" />
                                    </button>
                                </div>

                                {expandedSections.items && (
                                    <div>
                                        <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
                                            <div className="overflow-x-auto">
                                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                                    <thead className="bg-gray-50 dark:bg-gray-800">
                                                        <tr>
                                                            <th
                                                                scope="col"
                                                                className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider sticky left-0 bg-gray-50 dark:bg-gray-800"
                                                            >
                                                                Item
                                                            </th>
                                                            <th scope="col" className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                Qty
                                                            </th>
                                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                Dimensions
                                                            </th>
                                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                Weight
                                                            </th>
                                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                Photos
                                                            </th>
                                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                Fragile
                                                            </th>
                                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                Needs Disassembly
                                                            </th>
                                                            <th scope="col" className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                                                Special Requirements
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                                        {booking?.items?.map((item, i) => (
                                                            <tr key={i} className={i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}>
                                                                <td
                                                                    className={`px-4 py-3 whitespace-nowrap sticky left-0 ${i % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50 dark:bg-gray-700'}`}
                                                                >
                                                                    <div className="flex items-center">
                                                                        <IconBox className="text-gray-400 dark:text-gray-500 mr-2 w-4 h-4" />
                                                                        <span className="text-sm font-medium text-gray-900 dark:text-white">{item?.name}</span>
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap text-center">
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{item?.quantity}</span>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">
                                                                        {(() => {
                                                                            const dims = item?.dimensions;
                                                                            if (!dims) return '-';
                                                                            
                                                                            if (typeof dims === 'string') {
                                                                                // Try to parse string format
                                                                                const match = dims.match(/(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*×\s*(\d+(?:\.\d+)?)\s*(\w+)/);
                                                                                if (match) {
                                                                                    const [, width, height, length, unit] = match;
                                                                                    const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                                                    return `${volume.toFixed(0)} cubic ${unit}`;
                                                                                }
                                                                                return dims;
                                                                            }
                                                                            
                                                                            if (typeof dims === 'object') {
                                                                                const { unit, width, height, length } = dims as any;
                                                                                if (width && height && length) {
                                                                                    const volume = parseFloat(width) * parseFloat(height) * parseFloat(length);
                                                                                    return `${volume.toFixed(0)} cubic ${unit || 'cm'}`;
                                                                                }
                                                                            }
                                                                            
                                                                            return '-';
                                                                        })()}
                                                                    </span>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <span className="text-sm text-gray-700 dark:text-gray-300">{item?.weight || '-'}</span>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    <div className="flex flex-wrap gap-2">
                                                                        {item?.photos && item?.photos?.length > 0 ? (
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                                <IconCamera className="mr-1 w-3 h-3" />
                                                                                {item.photos.length} photos
                                                                            </span>
                                                                        ) : (
                                                                            <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    {item?.fragile ? (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                                                                            <IconAlertTriangle className="mr-1 w-3 h-3" />
                                                                            Fragile
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    {item?.needs_disassembly ? (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                                                                            <IconTools className="mr-1 w-3 h-3" />
                                                                            Needs Disassembly
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 whitespace-nowrap">
                                                                    {item?.special_instructions ? (
                                                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                                                                            <IconInfoCircle className="mr-1 w-3 h-3" />
                                                                            {item.special_instructions}
                                                                        </span>
                                                                    ) : (
                                                                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                                                                    )}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>

                                        {/* Summary Section */}
                                        <div className="mt-4 bg-gray-50 dark:bg-gray-700 p-4 rounded-md border border-gray-200 dark:border-gray-600">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Items</p>
                                                    <p className="text-lg font-medium text-gray-900 dark:text-white">{booking?.items?.reduce((acc, item) => acc + (item?.quantity || 0), 0)} items</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Volume</p>
                                                    <p className="text-lg font-medium text-gray-900 dark:text-white">{booking?.totalVolume || 'Calculating...'}</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Fragile Items</p>
                                                    <p className="text-lg font-medium text-gray-900 dark:text-white">{booking?.items?.filter((item) => item?.fragile).length || 0} items</p>
                                                </div>
                                                <div>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400">Items Needing Disassembly</p>
                                                    <p className="text-lg font-medium text-gray-900 dark:text-white">{booking?.items?.filter((item) => item?.needs_disassembly).length || 0} items</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Move timeline */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl dark:shadow-gray-900/50 border border-white/20 dark:border-gray-700/50 overflow-hidden"
                        >
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-xl bg-gradient-to-r from-emerald-500 to-blue-500 flex items-center justify-center mr-3">
                                            <IconClock className="w-5 h-5 text-white" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Move Timeline</h2>
                                    </div>
                                    <motion.button
                                        onClick={() => toggleSection('timeline')}
                                        className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <IconChevronDown className="w-5 h-5" />
                                    </motion.button>
                                </div>

                                <AnimatePresence>
                                    {expandedSections.timeline && (
                                        <motion.div
                                            initial={{ opacity: 0, height: 0 }}
                                            animate={{ opacity: 1, height: 'auto' }}
                                            exit={{ opacity: 0, height: 0 }}
                                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                                        >
                                            {booking?.milestones && booking?.milestones.length > 0 ? (
                                                <div className="relative">
                                                    {/* Modern timeline line with gradient */}
                                                    <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-emerald-500 via-blue-500 to-purple-500 rounded-full shadow-sm"></div>

                                                    {/* Milestone items */}
                                                    <div className="space-y-8">
                                                        {booking.milestones.map((milestone, index) => (
                                                            <motion.div
                                                                key={milestone?.id}
                                                                className="relative"
                                                                initial={{ opacity: 0, x: -20 }}
                                                                animate={{ opacity: 1, x: 0 }}
                                                                transition={{ delay: index * 0.1 }}
                                                            >
                                                                {/* Modern timeline circle with glow effect */}
                                                                <div
                                                                    className={`absolute left-6 mt-1 w-4 h-4 rounded-full border-3 shadow-lg transition-all duration-300 ${
                                                                        milestone?.status === 'completed'
                                                                            ? 'bg-emerald-500 border-emerald-400 shadow-emerald-500/50'
                                                                            : milestone?.status === 'current'
                                                                            ? 'bg-blue-500 border-blue-400 shadow-blue-500/50 animate-pulse'
                                                                            : 'bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 shadow-gray-300/30'
                                                                    }`}
                                                                >
                                                                    {milestone?.status === 'completed' && <IconCheck className="text-white w-2.5 h-2.5 absolute inset-0 m-auto" />}
                                                                    {milestone?.status === 'current' && <div className="w-2 h-2 bg-white rounded-full absolute inset-0 m-auto animate-ping"></div>}
                                                                </div>

                                                                {/* Modern milestone card */}
                                                                <div className="ml-16 bg-gradient-to-r from-white to-gray-50/50 dark:from-gray-700 dark:to-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-200/60 dark:border-gray-600/60 p-4 shadow-sm hover:shadow-md transition-all duration-300">
                                                                    <div className="flex items-start justify-between">
                                                                        <div className="flex-1">
                                                                            <h3
                                                                                className={`text-lg font-semibold mb-2 ${
                                                                                    milestone?.status === 'current'
                                                                                        ? 'text-blue-600 dark:text-blue-400'
                                                                                        : milestone?.status === 'completed'
                                                                                        ? 'text-emerald-600 dark:text-emerald-400'
                                                                                        : 'text-gray-700 dark:text-gray-300'
                                                                                }`}
                                                                            >
                                                                                {milestone?.milestone_type?.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                                                                            </h3>

                                                                            {milestone?.description && (
                                                                                <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 leading-relaxed">{milestone.description}</p>
                                                                            )}

                                                                            <div className="flex flex-wrap gap-3 text-xs">
                                                                                {milestone?.scheduled_start && (
                                                                                    <div className="flex items-center bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full">
                                                                                        <IconCalendar className="w-3 h-3 mr-1" />
                                                                                        Scheduled: {formatDateTime(milestone.scheduled_start)}
                                                                                    </div>
                                                                                )}
                                                                                {milestone?.actual_start && (
                                                                                    <div className="flex items-center bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-3 py-1 rounded-full">
                                                                                        <IconClock className="w-3 h-3 mr-1" />
                                                                                        Started: {formatDateTime(milestone.actual_start)}
                                                                                    </div>
                                                                                )}
                                                                                {milestone?.actual_end && (
                                                                                    <div className="flex items-center bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full">
                                                                                        <IconCircleCheck className="w-3 h-3 mr-1" />
                                                                                        Completed: {formatDateTime(milestone.actual_end)}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {milestone?.notes && (
                                                                                <div className="mt-3 bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-200 dark:border-amber-700 p-3 rounded-r-lg">
                                                                                    <p className="text-amber-800 dark:text-amber-200 text-sm italic flex items-start">
                                                                                        <IconInfoCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                                                                        {milestone.notes}
                                                                                    </p>
                                                                                </div>
                                                                            )}
                                                                        </div>

                                                                        {/* Status badge */}
                                                                        <div
                                                                            className={`px-3 py-1 rounded-full text-xs font-medium ml-4 ${
                                                                                milestone?.status === 'completed'
                                                                                    ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700'
                                                                                    : milestone?.status === 'current'
                                                                                    ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-200 dark:border-blue-700'
                                                                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-600'
                                                                            }`}
                                                                        >
                                                                            {milestone?.status?.charAt(0).toUpperCase() + milestone?.status?.slice(1)}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </motion.div>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                /* Modern placeholder when no timeline data is available */
                                                <motion.div className="text-center py-10" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3 }}>
                                                    <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-800 flex items-center justify-center mx-auto mb-6 shadow-lg">
                                                        <IconClock className="text-gray-400 dark:text-gray-500 w-10 h-10" />
                                                    </div>
                                                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-3">Timeline Coming Soon</h3>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm mb-6 max-w-md mx-auto leading-relaxed">
                                                        Your detailed move timeline will appear here once your booking is confirmed and assigned to a professional provider.
                                                    </p>

                                                    {/* Modern status-based timeline */}
                                                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6 mx-auto max-w-lg">
                                                        <div className="text-left">
                                                            <div className="flex items-center mb-4">
                                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center mr-3">
                                                                    <IconTruck className="w-4 h-4 text-white" />
                                                                </div>
                                                                <h4 className="text-blue-900 dark:text-blue-100 font-semibold">Current Progress</h4>
                                                            </div>

                                                            <div className="relative">
                                                                {/* Modern timeline line */}
                                                                <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-300 to-indigo-300 dark:from-blue-600 dark:to-indigo-600 rounded-full"></div>

                                                                <div className="space-y-6">
                                                                    <motion.div
                                                                        className="flex items-center relative pl-10"
                                                                        initial={{ opacity: 0, x: -10 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: 0.1 }}
                                                                    >
                                                                        <div className="absolute left-2.5 w-3 h-3 bg-gradient-to-r from-emerald-400 to-emerald-500 rounded-full shadow-md"></div>
                                                                        <div className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-lg p-3 border border-white/40 dark:border-gray-600/40 shadow-sm flex-1">
                                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">Booking Created</p>
                                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{formatDate(booking?.created_at)}</p>
                                                                        </div>
                                                                    </motion.div>

                                                                    <motion.div
                                                                        className="flex items-center relative pl-10"
                                                                        initial={{ opacity: 0, x: -10 }}
                                                                        animate={{ opacity: 1, x: 0 }}
                                                                        transition={{ delay: 0.2 }}
                                                                    >
                                                                        <div
                                                                            className={`absolute left-2.5 w-3 h-3 rounded-full shadow-md ${
                                                                                ['confirmed', 'in_progress', 'completed'].includes(booking?.status || '')
                                                                                    ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                                                                    : booking?.status === 'bidding'
                                                                                    ? 'bg-gradient-to-r from-yellow-400 to-orange-500 animate-pulse'
                                                                                    : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
                                                                            }`}
                                                                        ></div>
                                                                        <div className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-lg p-3 border border-white/40 dark:border-gray-600/40 shadow-sm flex-1">
                                                                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                                                                {booking?.status === 'draft'
                                                                                    ? 'Awaiting Confirmation'
                                                                                    : booking?.status === 'bidding'
                                                                                    ? 'Provider Matching'
                                                                                    : booking?.status === 'confirmed'
                                                                                    ? 'Booking Confirmed'
                                                                                    : booking?.status === 'in_progress'
                                                                                    ? 'Move in Progress'
                                                                                    : booking?.status === 'completed'
                                                                                    ? 'Move Completed'
                                                                                    : 'Status Update'}
                                                                            </p>
                                                                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                                                {booking?.status === 'draft'
                                                                                    ? 'Your request is being prepared'
                                                                                    : booking?.status === 'bidding'
                                                                                    ? 'Providers are bidding on your request'
                                                                                    : booking?.status === 'confirmed'
                                                                                    ? 'Provider assigned and confirmed'
                                                                                    : booking?.status === 'in_progress'
                                                                                    ? 'Your move is currently underway'
                                                                                    : booking?.status === 'completed'
                                                                                    ? 'Your move has been completed'
                                                                                    : 'Waiting for status update'}
                                                                            </p>
                                                                        </div>
                                                                    </motion.div>

                                                                    {booking?.pickupDate && (
                                                                        <motion.div
                                                                            className="flex items-center relative pl-10"
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: 0.3 }}
                                                                        >
                                                                            <div
                                                                                className={`absolute left-2.5 w-3 h-3 rounded-full shadow-md ${
                                                                                    ['in_progress', 'completed'].includes(booking?.status || '')
                                                                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                                                                        : booking?.status === 'confirmed'
                                                                                        ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                                                                                        : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
                                                                                }`}
                                                                            ></div>
                                                                            <div className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-lg p-3 border border-white/40 dark:border-gray-600/40 shadow-sm flex-1">
                                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Scheduled Pickup</p>
                                                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                                                    {formatDate(booking.pickupDate)}
                                                                                    {booking?.pickupWindow && (
                                                                                        <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-xs">
                                                                                            {booking.pickupWindow}
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}

                                                                    {booking?.deliveryDate && (
                                                                        <motion.div
                                                                            className="flex items-center relative pl-10"
                                                                            initial={{ opacity: 0, x: -10 }}
                                                                            animate={{ opacity: 1, x: 0 }}
                                                                            transition={{ delay: 0.4 }}
                                                                        >
                                                                            <div
                                                                                className={`absolute left-2.5 w-3 h-3 rounded-full shadow-md ${
                                                                                    booking?.status === 'completed'
                                                                                        ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                                                                                        : ['in_progress'].includes(booking?.status || '')
                                                                                        ? 'bg-gradient-to-r from-blue-400 to-blue-500'
                                                                                        : 'bg-gradient-to-r from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-700'
                                                                                }`}
                                                                            ></div>
                                                                            <div className="bg-white/70 dark:bg-gray-700/70 backdrop-blur-sm rounded-lg p-3 border border-white/40 dark:border-gray-600/40 shadow-sm flex-1">
                                                                                <p className="text-sm font-semibold text-gray-900 dark:text-white">Scheduled Delivery</p>
                                                                                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                                                                    {formatDate(booking.deliveryDate)}
                                                                                    {booking?.deliveryWindow && (
                                                                                        <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-full text-xs">
                                                                                            {booking.deliveryWindow}
                                                                                        </span>
                                                                                    )}
                                                                                </p>
                                                                            </div>
                                                                        </motion.div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </motion.div>

                        {/* Payment details */}
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Payment Details</h2>
                                    <button onClick={() => toggleSection('payments')} className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300">
                                        <IconChevronDown />
                                    </button>
                                </div>

                                {expandedSections.payments && (
                                    <div>
                                        {/* Check if financial data exists */}
                                        {booking?.subtotal !== undefined || booking?.total !== undefined || booking?.price !== undefined ? (
                                            <>
                                                {/* Payment summary */}
                                                <div className="bg-gray-50 dark:bg-gray-750 p-4 rounded-md mb-4 border border-gray-200 dark:border-gray-600">
                                                    <div className="grid grid-cols-2 gap-4">
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Subtotal</p>
                                                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                                                                {booking?.currency || 'GBP'} {(booking?.subtotal || booking?.price || 0).toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm text-gray-500 dark:text-gray-400">Taxes & Fees</p>
                                                            <p className="text-lg font-medium text-gray-900 dark:text-white">
                                                                {booking?.currency || 'GBP'} {((booking?.taxes || 0) + (booking?.fees || 0)).toFixed(2)}
                                                            </p>
                                                        </div>
                                                        <div className="col-span-2">
                                                            <div className="border-t border-gray-300 dark:border-gray-600 my-2"></div>
                                                            <div className="flex justify-between items-center">
                                                                <p className="text-lg font-bold text-gray-900 dark:text-white">Total</p>
                                                                <p className="text-xl font-bold text-gray-900 dark:text-white">
                                                                    {booking?.currency || 'GBP'} {(booking?.total || booking?.price || 0).toFixed(2)}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Remove separate payment button - use only main "Book Now" action */}
                                                    {user?.user_type === 'customer' && !['completed', 'cancelled'].includes(booking?.status || '') && (booking?.total || booking?.price) && (
                                                        <div className="mt-4 pt-4 border-t border-gray-300 dark:border-gray-600">
                                                            <div className="text-center">
                                                                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                                                                    <div className="flex items-center justify-center mb-2">
                                                                        <IconCurrencyDollar className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                                                                        <span className="text-blue-900 dark:text-blue-100 font-semibold">
                                                                            Total: {renderPrice(booking?.total || booking?.price || 0)}
                                                                        </span>
                                                                    </div>
                                                                    <p className="text-blue-700 dark:text-blue-300 text-sm">
                                                                        Click "Book Now" above to confirm your booking and proceed with secure payment
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Payment transactions */}
                                                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Payment Transactions</h3>
                                                <div className="space-y-3">
                                                    {booking?.payments && booking?.payments?.length > 0 ? (
                                                        booking.payments.map((payment) => (
                                                            <div key={payment?.id} className="border border-gray-200 dark:border-gray-600 rounded-md p-3 bg-white dark:bg-gray-750">
                                                                <div className="flex justify-between items-start">
                                                                    <div>
                                                                        <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                                            {payment?.type?.charAt(0).toUpperCase() + payment?.type?.slice(1)} Payment
                                                                        </p>
                                                                        <p className="text-xs text-gray-500 dark:text-gray-400">
                                                                            {payment?.date
                                                                                ? `Paid on ${formatDate(payment?.date)}`
                                                                                : payment?.dueDate
                                                                                ? `Due on ${formatDate(payment?.dueDate)}`
                                                                                : 'Date to be confirmed'}
                                                                        </p>
                                                                        {payment?.paymentMethod && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{payment?.paymentMethod}</p>}
                                                                    </div>
                                                                    <div className="text-right">
                                                                        <p className="text-base font-medium text-gray-900 dark:text-white">
                                                                            {payment?.currency || booking?.currency || 'GBP'} {(payment?.amount || 0).toFixed(2)}
                                                                        </p>
                                                                        <span
                                                                            className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                                                                                payment?.status === 'paid'
                                                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                                                    : payment?.status === 'pending'
                                                                                    ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                                                    : payment?.status === 'overdue'
                                                                                    ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                                                                                    : payment?.status === 'refunded'
                                                                                    ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                                                                            }`}
                                                                        >
                                                                            {payment?.status?.charAt(0).toUpperCase() + payment?.status?.slice(1)}
                                                                        </span>
                                                                    </div>
                                                                </div>

                                                                {/* Remove individual payment actions - use main "Book Now" only */}
                                                                {payment?.status === 'pending' && userRole === 'customer' && (
                                                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                                        <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                                                                            <div className="flex items-center">
                                                                                <IconClock className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mr-2" />
                                                                                <p className="text-yellow-800 dark:text-yellow-200 text-sm font-medium">
                                                                                    Use "Book Now" button above to complete this payment
                                                                                </p>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}

                                                                {payment?.status === 'paid' && payment?.receiptUrl && (
                                                                    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                                                                        <a
                                                                            href={payment?.receiptUrl}
                                                                            className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm font-medium flex items-center transition-colors duration-200"
                                                                        >
                                                                            <IconFileText className="w-4 h-4 mr-1" />
                                                                            View Receipt
                                                                        </a>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <div className="text-center py-6 bg-gray-50 dark:bg-gray-750 rounded-lg border border-gray-200 dark:border-gray-600">
                                                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                                                                <IconCurrencyDollar className="text-gray-400 dark:text-gray-500" />
                                                            </div>
                                                            <p className="text-gray-500 dark:text-gray-400 text-sm">No payment transactions yet</p>
                                                            <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Payment information will appear here once processed</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        ) : (
                                            /* Show placeholder when no financial data is available */
                                            <div className="text-center py-8">
                                                <div className="w-16 h-16 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-4">
                                                    <IconCurrencyDollar className="text-gray-400 dark:text-gray-500 w-8 h-8" />
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">Payment Information Pending</h3>
                                                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                                                    Payment details will be available once the booking is confirmed and pricing is finalized.
                                                </p>
                                                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                                                    <div className="flex items-center">
                                                        <IconInfoCircle className="text-blue-500 dark:text-blue-400 mr-3 w-5 h-5" />
                                                        <div className="text-left">
                                                            <p className="text-blue-800 dark:text-blue-200 font-medium text-sm">Booking Status: {formatStatus(booking?.status || 'pending')}</p>
                                                            <p className="text-blue-600 dark:text-blue-300 text-xs mt-1">
                                                                {booking?.status === 'draft'
                                                                    ? 'Click "Book Now" to confirm and proceed with payment.'
                                                                    : booking?.status === 'bidding'
                                                                    ? 'Providers are currently bidding on your request.'
                                                                    : 'Payment information will be updated shortly.'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar column */}
                    <div className="space-y-6">
                        {/* Provider/Customer info */}
                        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden ${activeTab !== 'details' && 'hidden md:block'}`}>
                            <div className="p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{userRole === 'customer' ? 'Your Provider' : 'Customer Information'}</h2>

                                {userRole === 'customer' && booking?.provider ? (
                                    <div className="flex items-start">
                                        <img src={booking?.provider?.avatar || 'https://via.placeholder.com/60'} alt={booking?.provider?.name} className="w-12 h-12 rounded-full object-cover mr-4" />
                                        <div>
                                            <div className="flex items-center">
                                                <h3 className="font-medium text-gray-900 dark:text-white">{booking?.provider?.name}</h3>
                                                {booking?.provider?.verifiedProvider && (
                                                    <span className="ml-2 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs py-0.5 px-1.5 rounded-full flex items-center">
                                                        <IconShield className="mr-1" />
                                                        Verified
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-gray-600 dark:text-gray-400 text-sm">{booking?.provider?.companyName}</p>
                                            <div className="flex items-center mt-1">
                                                <div className="flex items-center">
                                                    {[...Array(5)].map((_, i) => (
                                                        <IconStar key={i} className={i < Math.floor(booking?.provider?.rating || 0) ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'} />
                                                    ))}
                                                </div>
                                                <span className="ml-2 text-gray-600 dark:text-gray-400 text-sm">
                                                    {booking?.provider?.rating} ({booking?.provider?.reviewCount} reviews)
                                                </span>
                                            </div>
                                            <div className="mt-3 space-y-2">
                                                <a
                                                    href={`tel:${booking?.provider?.phone}`}
                                                    className="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                                                >
                                                    <IconPhone className="mr-2" />
                                                    {booking?.provider?.phone}
                                                </a>
                                                <a
                                                    href={`mailto:${booking?.provider?.email}`}
                                                    className="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                                                >
                                                    <IconMail className="mr-2" />
                                                    {booking?.provider?.email}
                                                </a>
                                            </div>
                                        </div>
                                    </div>
                                ) : userRole === 'provider' ? (
                                    <div>
                                        <h3 className="font-medium text-gray-900 dark:text-white">{booking?.customerName}</h3>
                                        <div className="mt-3 space-y-2">
                                            <a
                                                href={`tel:${booking?.customerPhone}`}
                                                className="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                                            >
                                                <IconPhone className="mr-2" />
                                                {booking?.customerPhone}
                                            </a>
                                            <a
                                                href={`mailto:${booking?.customerEmail}`}
                                                className="flex items-center text-sm text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                                            >
                                                <IconMail className="mr-2" />
                                                {booking?.customerEmail}
                                            </a>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-gray-500 dark:text-gray-400">Provider information not available yet.</p>
                                )}

                                <div className="mt-4">
                                    <button className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                                        <IconMessage className="mr-2" />
                                        Send Message
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions Sidebar */}
                        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden ${activeTab !== 'details' && 'hidden md:block'}`}>
                            <div className="p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h2>
                                <div className="space-y-2">
                                    <button className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md flex items-center justify-center transition-colors duration-200">
                                        <IconFileText className="mr-2 text-gray-500 dark:text-gray-400" />
                                        View Booking Details
                                    </button>
                                    <button className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md flex items-center justify-center transition-colors duration-200">
                                        <IconPrinter className="mr-2 text-gray-500 dark:text-gray-400" />
                                        Print Booking Summary
                                    </button>
                                    <Link
                                        to={`/disputes?bookingId=${booking?.id}`}
                                        className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md flex items-center justify-center transition-colors duration-200"
                                    >
                                        <IconGavel className="mr-2 text-gray-500 dark:text-gray-400" />
                                        Raise or View Disputes
                                    </Link>
                                    <button className="w-full bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-md flex items-center justify-center transition-colors duration-200">
                                        <IconPhone className="mr-2 text-gray-500 dark:text-gray-400" />
                                        Contact Support
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Message section - always visible on mobile when messages tab is active */}
                        <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden ${activeTab !== 'messages' && 'hidden md:block'}`}>
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Messages</h2>
                                    <button
                                        onClick={() => toggleSection('messages')}
                                        className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hidden md:block transition-colors duration-200"
                                    >
                                        <IconChevronDown />
                                    </button>
                                </div>

                                {(expandedSections.messages || activeTab === 'messages') && (
                                    <div>
                                        <div className="space-y-4 max-h-96 overflow-y-auto mb-4">
                                            {booking?.messages?.length === 0 ? (
                                                <div className="text-center py-6">
                                                    <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                                                        <IconMessage className="text-gray-400 dark:text-gray-500 text-lg" />
                                                    </div>
                                                    <p className="text-gray-500 dark:text-gray-400 text-sm">No messages yet</p>
                                                </div>
                                            ) : (
                                                booking?.messages?.map((message) => (
                                                    <div
                                                        key={message?.id}
                                                        className={`p-3 rounded-lg ${
                                                            message?.sender === 'system'
                                                                ? 'bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600'
                                                                : message?.sender === userRole
                                                                ? 'bg-blue-100 dark:bg-blue-900/30 ml-6 border border-blue-200 dark:border-blue-700'
                                                                : 'bg-gray-100 dark:bg-gray-700 mr-6 border border-gray-200 dark:border-gray-600'
                                                        }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-1">
                                                            <span className="font-medium text-xs text-gray-900 dark:text-white">
                                                                {message?.senderName} {message?.sender === 'system' && '(System)'}
                                                            </span>
                                                            <span className="text-gray-500 dark:text-gray-400 text-xs">{getRelativeTime(message?.timestamp)}</span>
                                                        </div>
                                                        <p className="text-sm text-gray-800 dark:text-gray-200">{message?.content}</p>

                                                        {message?.attachments && message?.attachments?.length > 0 && (
                                                            <div className="mt-2 flex flex-wrap gap-2">
                                                                {message?.attachments?.map((attachment, i) => (
                                                                    <a
                                                                        key={i}
                                                                        href={attachment?.url}
                                                                        target="_blank"
                                                                        rel="noopener noreferrer"
                                                                        className="inline-flex items-center px-2 py-1 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors duration-200"
                                                                    >
                                                                        <IconEye className="mr-1" />
                                                                        {attachment?.name}
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))
                                            )}
                                        </div>

                                        <form onSubmit={handleSendMessage} className="mt-4">
                                            <div className="flex">
                                                <input
                                                    type="text"
                                                    value={newMessage}
                                                    onChange={(e) => setNewMessage(e.target.value)}
                                                    placeholder="Type your message..."
                                                    className="flex-1 border border-gray-300 dark:border-gray-600 rounded-l-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                                                />
                                                <button
                                                    type="submit"
                                                    disabled={!newMessage.trim()}
                                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-r-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                                                >
                                                    Send
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Need help section */}
                        <div
                            className={`bg-yellow-50 dark:bg-yellow-900/20 rounded-lg shadow-sm overflow-hidden border border-yellow-200 dark:border-yellow-800 ${
                                activeTab !== 'details' && 'hidden md:block'
                            }`}
                        >
                            <div className="p-6">
                                <h2 className="text-lg font-semibold text-yellow-800 dark:text-yellow-200 flex items-center mb-2">
                                    <IconHelp className="mr-2" />
                                    Need Help?
                                </h2>
                                <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-4">Our support team is available 24/7 to assist with any questions about your booking.</p>
                                <div className="space-y-2">
                                    <a
                                        href="tel:+447497603774"
                                        className="block bg-yellow-100 dark:bg-yellow-800/30 hover:bg-yellow-200 dark:hover:bg-yellow-700/40 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-md text-center transition-colors duration-200"
                                    >
                                        Call Support
                                    </a>
                                    <a
                                        href="/help-center"
                                        className="block bg-transparent hover:bg-yellow-100 dark:hover:bg-yellow-800/20 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-4 py-2 rounded-md text-center transition-colors duration-200"
                                    >
                                        Visit Help Center
                                    </a>
                                </div>
                            </div>
                        </div>

                        {/* Tracking History section */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className={`bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-xl border border-white/20 dark:border-gray-700/50 rounded-2xl overflow-hidden ${
                                activeTab !== 'details' && 'hidden md:block'
                            }`}
                        >
                            <div className="p-6">
                                <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center mb-4">
                                    <IconTruck className="mr-2 text-emerald-600" />
                                    Tracking History
                                </h2>

                                <div className="space-y-4 max-h-80 overflow-y-auto">
                                    {booking?.trackingUpdates && booking.trackingUpdates.length > 0 ? (
                                        booking.trackingUpdates.map((update, index) => (
                                            <div key={index} className="relative pl-6">
                                                {/* Timeline dot */}
                                                <div
                                                    className={`absolute left-0 top-2 w-3 h-3 rounded-full ${
                                                        index === 0 ? 'bg-emerald-600' : update.status === 'completed' ? 'bg-green-500' : 'bg-gray-300'
                                                    }`}
                                                ></div>

                                                {/* Timeline line */}
                                                {index < (booking?.trackingUpdates?.length || 0) - 1 && <div className="absolute left-1.5 top-5 w-0.5 h-8 bg-gray-200 dark:bg-gray-600"></div>}

                                                <div className="bg-gray-50 dark:bg-gray-750 rounded-lg p-3">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <span className={`font-medium text-sm ${index === 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-900 dark:text-white'}`}>
                                                            {formatStatus(update.status)}
                                                        </span>
                                                        <span className="text-xs text-gray-500 dark:text-gray-400">{new Date(update.timestamp).toLocaleDateString()}</span>
                                                    </div>
                                                    <p className="text-xs text-gray-600 dark:text-gray-400">{update.description}</p>

                                                    {/* Additional details */}
                                                    {update.status === 'picked_up' && booking?.pickupLocation && (
                                                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">From: {booking.pickupLocation}</p>
                                                        </div>
                                                    )}

                                                    {update.status === 'in_transit' && booking?.dropoffLocation && (
                                                        <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                                                            <p className="text-xs text-gray-500 dark:text-gray-400">To: {booking.dropoffLocation}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="text-center py-6">
                                            <div className="w-12 h-12 rounded-full bg-gray-100 dark:bg-gray-700 flex items-center justify-center mx-auto mb-3">
                                                <IconTruck className="text-gray-400 dark:text-gray-500" />
                                            </div>
                                            <p className="text-gray-500 dark:text-gray-400 text-sm">No tracking updates available</p>
                                        </div>
                                    )}
                                </div>

                                {/* View all tracking button */}
                                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                                    <button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl transition-all duration-300 font-semibold text-sm">
                                        View Full Tracking Details
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                </div>
            </div>
            {booking?.provider && (
                <ProviderModal
                    isOpen={showProviderModal}
                    onClose={() => setShowProviderModal(false)}
                    provider={{
                        ...booking.provider,
                        serviceRadius: String(booking.provider.serviceRadius), // Convert to string
                        profileImage: booking.provider.profileImage || booking.provider.avatar || '', // Ensure profileImage is defined
                        price: booking.provider.price || 0, // Add default price if missing
                    }}
                />
            )}
        </div>
    );
};

export default BookingDetail;
