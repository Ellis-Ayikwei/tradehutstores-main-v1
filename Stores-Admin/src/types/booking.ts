export interface Provider {
    id: string;
    name: string;
    rating: number;
    vehicle_type: string;
    profile_picture?: string;
    phone_number?: string;
    email?: string;
}

export interface Bid {
    id: string;
    provider: Provider;
    amount: number;
    created_at: string;
    status: 'pending' | 'accepted' | 'rejected';
    notes?: string;
}

export interface Location {
    id: string;
    address: string;
    address_line1: string;
    address_line2?: string;
    city: string;
    county?: string;
    postcode: string;
    contact_name: string;
    contact_phone: string;
    use_main_contact: boolean;
    latitude: number;
    longitude: number;
    special_instructions?: string;
}

export interface JourneyStop {
    id: string;
    type: 'pickup' | 'dropoff' | 'stop';
    location: Location;
    unit_number?: string;
    floor?: number;
    has_elevator?: boolean;
    parking_info?: string;
    instructions?: string;
    scheduled_time?: string;
    property_type?: string;
    number_of_rooms?: number;
    number_of_floors?: number;
    service_type?: string;
    sequence: number;
}

export interface RequestItem {
    id: string;
    name: string;
    description?: string;
    quantity: number;
    weight?: number;
    dimensions?: string;
    fragile: boolean;
    needs_disassembly: boolean;
    special_instructions?: string;
    photos?: string[];
    declared_value?: number;
    category?: {
        id: string;
        name: string;
    };
}

export interface MoveMilestone {
    id: string;
    milestone_type: 'preparation' | 'loading' | 'in_transit' | 'unloading' | 'setup' | 'completion';
    status: 'pending' | 'in_progress' | 'completed' | 'delayed';
    estimated_duration?: string;
    actual_duration?: string;
    scheduled_start?: string;
    actual_start?: string;
    actual_end?: string;
    notes?: string;
    delay_reason?: string;
    sequence: number;
}

export interface Driver {
    id: string;
    user?: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
    };
    license_number?: string;
    vehicle_type?: string;
    vehicle_registration?: string;
    rating?: number;
    profile_picture?: string;
}

export interface Category {
    id: string;
    name: string;
    requires_special_handling: boolean;
    restricted: boolean;
    insurance_required: boolean;
    price_multiplier: string;
    special_instructions?: string;
    icon: string;
    image: string;
}

export interface BookingItem {
    id: string;
    category: Category;
    name: string;
    description: string;
    quantity: number;
    weight: string;
    dimensions: string;
    fragile: boolean;
    needs_disassembly: boolean;
    special_instructions?: string;
    photos: string[];
    declared_value: number | null;
}

export interface Stop {
    id: string;
    request: string;
    location: Location;
    external_id: string;
    type: 'pickup' | 'dropoff';
    unit_number: string;
    floor: number;
    has_elevator: boolean;
    parking_info: string;
    instructions: string;
    scheduled_time: string | null;
    completed_time: string | null;
    property_type: string;
    number_of_rooms: number;
    number_of_floors: number;
    service_type: string;
    sequence: number;
    address?: string;
}

export interface Booking {
    id: string;
    user: string; // customerId
    driver: string | null; // providerId
    request_type: 'instant' | 'bidding';
    status: 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled' | 'accepted';
    service_type: string;
    contact_name: string;
    contact_phone: string;
    contact_email: string;
    preferred_pickup_date: string;
    preferred_pickup_time: string | null;
    preferred_delivery_date: string | null;
    preferred_delivery_time: string | null;
    is_flexible: boolean;
    estimated_completion_time: string | null;
    items_description: string;
    total_weight: number | null;
    dimensions: string | null;
    requires_special_handling: boolean;
    special_instructions: string;
    moving_items: any[]; // Legacy field
    photo_urls: string[];
    base_price: string | null;
    final_price: string; // amount
    price_factors: any;
    tracking_number: string;
    insurance_required: boolean;
    insurance_value: string | null;
    payment_status: 'paid' | 'pending' | 'refunded' | 'partial';
    cancellation_reason: string;
    cancellation_time: string | null;
    cancellation_fee: string | null;
    service_level: string;
    estimated_distance: number | null;
    route_waypoints: any;
    loading_time: number | null;
    unloading_time: number | null;
    price_breakdown: any;
    items: BookingItem[];
    all_locations: any[];
    created_at: string; // createdAt
    updated_at: string;
    stops: Stop[];
    milestones: any[];

    // Computed fields for backwards compatibility
    customerId?: string;
    customerName?: string;
    providerId?: string;
    providerName?: string;
    pickup_location?: string;
    deliveryLocation?: string;
    pickupDate?: string;
    deliveryDate?: string;
    amount?: number;
    createdAt?: string;
    notes?: string;

    // Additional fields for admin operations
    vehicle_type?: string;
    persons_required?: number;
    distance?: number;
    estimated_travel_time?: string;
    customerEmail?: string;
    customerPhone?: string;
    subtotal?: number;
    taxes?: number;
    fees?: number;
    total?: number;
    provider?: Provider & {
        avatar?: string;
        companyName?: string;
        phone?: string;
        email?: string;
        verifiedProvider?: boolean;
        verified?: boolean;
        vehicleType?: string;
        capacity?: string;
        serviceRadius?: number;
        reviewCount?: number;
        reviews?: any[];
        price?: number;
    };
    payments?: {
        id: string;
        type: 'deposit' | 'final' | 'additional';
        amount: number;
        currency?: string;
        status: 'paid' | 'pending' | 'overdue' | 'refunded';
        date?: string;
        dueDate?: string;
        paymentMethod?: string;
        receiptUrl?: string;
    }[];
}

export interface BookingFilters {
    status?: string;
    paymentStatus?: string;
    dateRange?: {
        startDate: string;
        endDate: string;
    };
    searchTerm?: string;
}

export interface BookingStats {
    total: number;
    completed: number;
    pending: number;
    inProgress: number;
    cancelled: number;
    totalRevenue: number;
}

// Helper function to transform backend data
export const transformBookingData = (rawBookings: any[]): Booking[] => {
    return rawBookings.map((booking: any) => {
        const pickupStop = booking.stops?.find((stop: any) => stop.type === 'pickup');
        const dropoffStop = booking.stops?.find((stop: any) => stop.type === 'dropoff');

        return {
            ...booking,
            // Computed fields for backwards compatibility
            customerId: booking.user,
            customerName: booking.contact_name || pickupStop?.location?.contact_name || 'Unknown',
            providerId: booking.provider?.id || 'Unassigned',
            providerName: booking.provider?.company_name || booking.provider?.name || 'Unassigned',
            pickup_location: pickupStop?.location?.address || 'N/A',
            deliveryLocation: dropoffStop?.location?.address || 'N/A',
            pickupDate: booking.preferred_pickup_date || booking.created_at,
            deliveryDate: booking.preferred_delivery_date || booking.created_at,
            amount: parseFloat(booking.final_price || '0'),
            createdAt: booking.created_at,
            notes: booking.special_instructions || booking.items_description || '',
        };
    });
};

// Legacy Item interface for backward compatibility
export interface Item extends RequestItem {}
